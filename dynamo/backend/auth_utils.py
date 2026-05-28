"""
Async helpers for the PostgreSQL auth stored procedures.
All logic that touches fs_login / fs_setsession lives here.
"""
import xml.etree.ElementTree as ET
from sqlalchemy import text

from config import settings
from database import AsyncSessionLocal


def parse_xml_response(xml_str: str) -> tuple[str | None, str | None, str | None]:
    """Parse fs_login XML result → (session_id, profil, error_message)."""
    root = ET.fromstring(xml_str)
    session_id = profil = error_message = None
    for child in root:
        if child.tag in ("success", "sucess"):
            txt = (child.text or "").strip()
            if ";" in txt:
                session_id, profil = txt.split(";", 1)
            else:
                session_id = txt
        elif child.tag == "error":
            error_message = (child.text or "").strip()
    return session_id, profil, error_message


async def do_login(username: str, password: str) -> dict:
    """
    Full async login flow:
      1. SELECT * FROM fs_login(:username, :password)  → XML
      2. SELECT fs_setsession(:session_id)
      3. SELECT * FROM vsl_client$self                 → user info
      4. SELECT COALESCE(interface, ...) FROM ts_client  → int[] of interface PKs
      5. SELECT interface_value FROM ts_interface WHERE pk = ANY(...)
    Returns a dict ready to embed in a JWT.
    """
    sp = settings.db_search_path

    # ── Step 1: call fs_login (its own session / commit) ─────────────────────
    async with AsyncSessionLocal() as session:
        await session.execute(text(f"SET search_path TO {sp}"))
        result = await session.execute(
            text("SELECT * FROM fs_login(:username, :password)"),
            {"username": username, "password": password},
        )
        xml_str = result.scalar()
        await session.commit()

    session_id, profil, error = parse_xml_response(xml_str or "")
    if error:
        raise ValueError(error)
    if not session_id:
        raise ValueError("Resposta inválida do procedimento de login.")

    sid = int(session_id)

    # ── Step 2-5: setsession + user info + permissions ───────────────────────
    async with AsyncSessionLocal() as session:
        await session.execute(text(f"SET search_path TO {sp}"))
        await session.execute(text("SELECT fs_setsession(:sid)"), {"sid": sid})

        user_row = await session.execute(text("SELECT * FROM vsl_client$self"))
        user = user_row.mappings().first()
        if not user:
            raise ValueError("Utilizador não encontrado após login.")

        ifaces_row = await session.execute(
            text("SELECT COALESCE(interface, ARRAY[]::integer[]) FROM ts_client WHERE pk = :pk"),
            {"pk": user["pk"]},
        )
        raw_interfaces: list[int] = ifaces_row.scalar() or []

        if raw_interfaces:
            perms_row = await session.execute(
                text("SELECT value FROM ts_interface WHERE pk = ANY(:pks)"),
                {"pks": raw_interfaces},
            )
            permissions = [r[0] for r in perms_row.fetchall()]
        else:
            permissions = []

        await session.commit()

    return {
        "user_id": user["pk"],
        "user_name": user["client_name"],
        "session_id": sid,
        "profil": str(profil or ""),
        "permissions": permissions,
    }
