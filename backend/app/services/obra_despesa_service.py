from sqlalchemy.sql import text
from datetime import datetime, date
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _parse_date(value):
    if not value or value == "":
        return None
    if isinstance(value, (datetime, date)):
        return value
    try:
        return datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None


def _serialize_row(row: dict) -> dict:
    for k, v in row.items():
        if isinstance(v, (datetime, date)):
            row[k] = v.isoformat()
    return row


@api_error_handler
def list_obra_despesas_by_instalacao(current_user: str, instalacao_pk: int):
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("""
                SELECT * FROM vbl_obra_despesa
                WHERE tb_obra IN (SELECT pk FROM vbf_obra WHERE tb_instalacao = :pk)
                ORDER BY pk DESC
            """),
            {'pk': instalacao_pk}
        ).mappings().all()
        rows = [_serialize_row(dict(r)) for r in result]
        return {'despesas': rows}, 200


@api_error_handler
def list_obra_despesas(current_user: str):
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("SELECT * FROM vbl_obra_despesa ORDER BY pk DESC")
        ).mappings().all()
        rows = [_serialize_row(dict(r)) for r in result]
        return {'despesas': rows}, 200


@api_error_handler
def create_obra_despesa(current_user: str, data: dict):
    with db_session_manager(current_user) as session:
        pk_res = session.execute(text("SELECT fs_nextcode()")).scalar()
        session.execute(text("""
            INSERT INTO vbf_obra_despesa (pk, tb_obra, tt_despesaobra, data, valor, memo)
            VALUES (:pk, :tb_obra, :tt_despesaobra, :data, :valor, :memo)
        """), {
            'pk': pk_res,
            'tb_obra': data.get('tb_obra'),
            'tt_despesaobra': data.get('tt_despesaobra'),
            'data': _parse_date(data.get('data')),
            'valor': data.get('valor') or None,
            'memo': data.get('memo') or None,
        })
        session.commit()
    return {'message': 'Despesa registada com sucesso', 'pk': pk_res}, 201


@api_error_handler
def update_obra_despesa(current_user: str, pk: int, data: dict):
    allowed = ['tb_obra', 'tt_despesaobra', 'data', 'valor', 'memo']
    update_fields = {k: v for k, v in data.items() if k in allowed and v is not None}

    if 'data' in update_fields:
        update_fields['data'] = _parse_date(update_fields['data'])

    if not update_fields:
        return {'message': 'Nenhum campo válido para atualizar'}, 400

    set_clause = ', '.join(f"{k} = :{k}" for k in update_fields)
    update_fields['pk'] = pk

    with db_session_manager(current_user) as session:
        result = session.execute(
            text(f"UPDATE vbf_obra_despesa SET {set_clause} WHERE pk = :pk"),
            update_fields,
        )
        session.commit()

    if result.rowcount == 0:
        return {'message': f'Despesa {pk} não encontrada'}, 404

    return {'message': 'Despesa atualizada com sucesso'}, 200
