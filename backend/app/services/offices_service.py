from sqlalchemy.sql import text
from datetime import datetime
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler, ResourceNotFoundError, APIError
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Status IDs (ts_letterstatus)
STATUS_DRAFT     = 1   # Rascunho  → "aberto" / em curso
STATUS_ISSUED    = 2   # Emitido
STATUS_SIGNED    = 3   # Assinado
STATUS_CANCELLED = 4   # Cancelado → "fechado"


def _serialize_row(row: dict) -> dict:
    """Converte timestamps para ISO string."""
    result = dict(row)
    for key in ('emission_date', 'hist_time', 'sign_time'):
        if key in result and isinstance(result[key], datetime):
            result[key] = result[key].isoformat()
    return result


# ─── List ──────────────────────────────────────────────────────────────────────

@api_error_handler
def list_offices(current_user: str):
    """Lista todos os ofícios/cartas via vbl_letter."""
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, regnumber, subject,
                   ts_lettertype, ts_letterstatus,
                   emission_number, emission_date,
                   filename, hist_time
            FROM vbl_letter
            ORDER BY COALESCE(hist_time, emission_date) DESC NULLS LAST
        """)).mappings().all()

        return {'offices': [_serialize_row(r) for r in rows]}, 200


# ─── Open (reabrir → Rascunho) ─────────────────────────────────────────────────

@api_error_handler
def open_office(pk: int, current_user: str):
    """Reabre um ofício → status Rascunho (1)."""
    with db_session_manager(current_user) as session:
        if not session.execute(
            text("SELECT pk FROM vbl_letter WHERE pk = :pk"), {"pk": pk}
        ).fetchone():
            raise ResourceNotFoundError("Ofício", pk)

        session.execute(
            text("UPDATE vbf_letter SET ts_letterstatus = :s WHERE pk = :pk"),
            {"s": STATUS_DRAFT, "pk": pk}
        )
        logger.info(f"Ofício {pk} aberto (Rascunho) por {current_user}")
        return {'message': 'Ofício aberto com sucesso', 'pk': pk}, 200


# ─── Close (fechar → Cancelado) ────────────────────────────────────────────────

@api_error_handler
def close_office(pk: int, current_user: str):
    """Fecha/arquiva um ofício → status Cancelado (4)."""
    with db_session_manager(current_user) as session:
        if not session.execute(
            text("SELECT pk FROM vbl_letter WHERE pk = :pk"), {"pk": pk}
        ).fetchone():
            raise ResourceNotFoundError("Ofício", pk)

        session.execute(
            text("UPDATE vbf_letter SET ts_letterstatus = :s WHERE pk = :pk"),
            {"s": STATUS_CANCELLED, "pk": pk}
        )
        logger.info(f"Ofício {pk} fechado (Cancelado) por {current_user}")
        return {'message': 'Ofício fechado com sucesso', 'pk': pk}, 200


# ─── Replicate ─────────────────────────────────────────────────────────────────

@api_error_handler
def replicate_office(pk: int, current_user: str):
    """Replica um ofício criando uma cópia em Rascunho via fbf_letter."""
    with db_session_manager(current_user) as session:
        # Ler dados originais via vbf_letter (tem os IDs inteiros)
        original = session.execute(
            text("""
                SELECT tb_document, tb_letter_template, subject,
                       recipient_data, custom_data
                FROM vbf_letter WHERE pk = :pk
            """),
            {"pk": pk}
        ).mappings().fetchone()

        if not original:
            raise ResourceNotFoundError("Ofício", pk)

        # Novo PK
        new_pk = session.execute(text("SELECT fs_nextcode()")).scalar()
        if not new_pk:
            raise APIError("Falha ao gerar PK para replicação", 500)

        # Criar cópia via fbf_letter(pop=0 → INSERT)
        result = session.execute(text("""
            SELECT fbf_letter(
                0,              -- pop: INSERT
                :new_pk,        -- pnpk
                :tb_document,   -- pntb_document
                :tb_tmpl,       -- pntb_letter_template
                :status,        -- pnts_letterstatus (Rascunho)
                :subject,       -- pnsubject
                :recipient,     -- pnrecipient_data
                :custom,        -- pncustom_data
                NULL,           -- pnfilename
                NULL,           -- pnsign_client
                NULL,           -- pnsign_time
                NULL            -- pnsign_data
            )
        """), {
            "new_pk":      new_pk,
            "tb_document": original["tb_document"],
            "tb_tmpl":     original["tb_letter_template"],
            "status":      STATUS_DRAFT,
            "subject":     original["subject"],
            "recipient":   original["recipient_data"],
            "custom":      original["custom_data"],
        }).scalar()

        if not result:
            raise APIError("Falha ao replicar ofício", 500)

        logger.info(f"Ofício {pk} replicado → novo pk={new_pk} por {current_user}")
        return {'message': 'Ofício replicado com sucesso', 'pk': pk, 'new_pk': new_pk}, 201
