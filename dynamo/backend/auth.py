from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from config import settings
from database import AsyncSessionLocal

bearer = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> dict:
    """
    Decode the JWT and return the embedded user dict.
    All claims (session_id, user_id, permissions, …) were written at login time.
    No DB round-trip needed here — the session is set up in get_authed_db.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")

    session_id = payload.get("session_id")
    user_id = payload.get("user_id")
    if session_id is None or user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    return {
        "user_id": user_id,
        "user_name": payload.get("user_name", ""),
        "session_id": session_id,
        "profil": payload.get("profil", ""),
        "permissions": payload.get("permissions", []),
    }


async def get_authed_db(
    current_user: dict = Depends(get_current_user),
) -> AsyncGenerator[AsyncSession, None]:
    """
    Yields an AsyncSession that has had SET search_path + fs_setsession called,
    so vbl_*/vbf_* views and session-aware DB functions work correctly.
    """
    async with AsyncSessionLocal() as session:
        await session.execute(text(f"SET search_path TO {settings.db_search_path}"))
        await session.execute(
            text("SELECT fs_setsession(:sid)"),
            {"sid": int(current_user["session_id"])},
        )
        yield session


def require_permission(permission: str):
    """Dependency factory — raises 403 if the user lacks the given permission string."""
    def guard(current_user: dict = Depends(get_current_user)) -> dict:
        if permission not in current_user["permissions"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
        return current_user
    return guard
