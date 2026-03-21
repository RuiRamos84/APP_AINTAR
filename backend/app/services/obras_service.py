from sqlalchemy.sql import text
from sqlalchemy.exc import IntegrityError
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
def list_obras(current_user: str):
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("SELECT * FROM vbl_obra ORDER BY pk DESC")
        ).mappings().all()
        rows = [_serialize_row(dict(r)) for r in result]
        return {'obras': rows}, 200


@api_error_handler
def list_obras_by_instalacao(current_user: str, tb_instalacao: int):
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("SELECT * FROM vbl_obra WHERE pk IN (SELECT pk FROM vbf_obra WHERE tb_instalacao = :pk) ORDER BY pk DESC"),
            {'pk': tb_instalacao}
        ).mappings().all()
        rows = [_serialize_row(dict(r)) for r in result]
        return {'obras': rows}, 200


@api_error_handler
def create_obra(current_user: str, data: dict):
    with db_session_manager(current_user) as session:
        pk_res = session.execute(text("SELECT fs_nextcode()")).scalar()

        try:
            session.execute(text("""
                INSERT INTO vbf_obra (
                    pk, nome, tb_instalacao, tt_tipoobra, ts_associate,
                    data_prevista, data_obra_inicio, data_obra_fim,
                    valor_estimado, valor_exec_aintar, valor_exec_subsidio,
                    valor_exec_municipio, tt_urgencia, estado, aviso, memo
                ) VALUES (
                    :pk, :nome, :tb_instalacao, :tt_tipoobra, :ts_associate,
                    :data_prevista, :data_obra_inicio, :data_obra_fim,
                    :valor_estimado, :valor_exec_aintar, :valor_exec_subsidio,
                    :valor_exec_municipio, :tt_urgencia, :estado, :aviso, :memo
                )
            """), {
                'pk': pk_res,
                'nome': data.get('nome'),
                'tb_instalacao': data.get('tb_instalacao') or None,
                'tt_tipoobra': data.get('tt_tipoobra'),
                'ts_associate': data.get('ts_associate'),
                'data_prevista': _parse_date(data.get('data_prevista')),
                'data_obra_inicio': _parse_date(data.get('data_obra_inicio')),
                'data_obra_fim': _parse_date(data.get('data_obra_fim')),
                'valor_estimado': data.get('valor_estimado') or None,
                'valor_exec_aintar': data.get('valor_exec_aintar') or None,
                'valor_exec_subsidio': data.get('valor_exec_subsidio') or None,
                'valor_exec_municipio': data.get('valor_exec_municipio') or None,
                'tt_urgencia': data.get('tt_urgencia') or None,
                'aviso': data.get('aviso') or None,
                'estado': 0,
                'memo': data.get('memo') or None,
            })
            session.commit()
        except IntegrityError:
            session.rollback()
            return {'message': f"Já existe uma obra com o nome \"{data.get('nome')}\"."}, 409

    return {'message': 'Obra registada com sucesso', 'pk': pk_res}, 201


@api_error_handler
def update_obra(current_user: str, pk: int, data: dict):
    allowed = [
        'nome', 'tb_instalacao', 'tt_tipoobra', 'ts_associate',
        'data_prevista', 'data_obra_inicio', 'data_obra_fim',
        'valor_estimado', 'valor_exec_aintar', 'valor_exec_subsidio',
        'valor_exec_municipio', 'tt_urgencia', 'aviso', 'memo',
    ]
    # Campos que podem ser explicitamente limpos (nullable)
    nullable = {'data_prevista', 'data_obra_inicio', 'data_obra_fim', 'valor_estimado',
                'valor_exec_aintar', 'valor_exec_subsidio', 'valor_exec_municipio',
                'tt_urgencia', 'aviso', 'memo'}
    update_fields = {
        k: v for k, v in data.items()
        if k in allowed and (v is not None or k in nullable)
    }

    for date_field in ('data_prevista', 'data_obra_inicio', 'data_obra_fim'):
        if date_field in update_fields:
            update_fields[date_field] = _parse_date(update_fields[date_field])

    if 'aviso' in update_fields:
        update_fields['estado'] = 0

    if not update_fields:
        return {'message': 'Nenhum campo válido para atualizar'}, 400

    set_clause = ', '.join(f"{k} = :{k}" for k in update_fields)
    update_fields['pk'] = pk

    with db_session_manager(current_user) as session:
        result = session.execute(
            text(f"UPDATE vbf_obra SET {set_clause} WHERE pk = :pk"),
            update_fields,
        )
        session.commit()

    if result.rowcount == 0:
        return {'message': f'Obra {pk} não encontrada'}, 404

    return {'message': 'Obra atualizada com sucesso'}, 200


@api_error_handler
def delete_obra(current_user: str, pk: int):
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("DELETE FROM vbf_obra WHERE pk = :pk"),
            {'pk': pk},
        )
        session.commit()

    if result.rowcount == 0:
        return {'message': f'Obra {pk} não encontrada'}, 404

    return {'message': 'Obra eliminada com sucesso'}, 200
