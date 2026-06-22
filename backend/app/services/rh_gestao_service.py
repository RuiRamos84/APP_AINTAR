from flask import jsonify, current_app
from sqlalchemy import text
from typing import Optional
from pydantic import BaseModel
from ..utils.utils import db_session_manager, format_message
from app.utils.error_handler import api_error_handler, APIError
from app.utils.logger import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class WorkflowBulkAction(BaseModel):
    tipo: str            # 'ferias' | 'faltas' | 'ponto' | 'participacao'
    pks: list[int]
    step: int
    ts_estado_fk: int
    notas: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_user_pk(current_user: str, session) -> int:
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    return claims.get('user_id')


def _get_superior_fk(current_user: str, session) -> Optional[int]:
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    user_pk = claims.get('user_id')
    row = session.execute(
        text("SELECT superior_fk FROM ts_rh_colaborador WHERE pk = :pk"),
        {'pk': user_pk},
    ).fetchone()
    return row.superior_fk if row else None


def _is_rh_admin(current_user: str, session) -> bool:
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    profile = claims.get('profile', -1)
    if profile == 0:
        return True
    user_pk = claims.get('user_id')
    row = session.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM ts_client c
            JOIN ts_interface i ON i.value IN ('rh.admin', 'rh.validate')
            WHERE c.pk = :pk AND c.interface @> ARRAY[i.pk]
        ) AS is_admin
    """), {'pk': user_pk}).fetchone()
    return bool(row.is_admin) if row else False


def _is_supervisor(current_user: str, session, user_pk: int) -> bool:
    """Verifica se o utilizador é superior direto de alguém."""
    row = session.execute(
        text("SELECT EXISTS(SELECT 1 FROM ts_rh_colaborador WHERE superior_fk = :pk) AS has_team"),
        {'pk': user_pk},
    ).fetchone()
    return bool(row.has_team) if row else False


# ---------------------------------------------------------------------------
# Serviços
# ---------------------------------------------------------------------------

@api_error_handler
def get_pendentes(current_user: str, tipo: Optional[str], user_fk_filter: Optional[int]):
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    caller_pk = claims.get('user_id')

    with db_session_manager(current_user) as session:
        is_admin = _is_rh_admin(current_user, session)

        filters = ['1=1']
        params: dict = {}

        if tipo:
            filters.append('tipo = :tipo')
            params['tipo'] = tipo

        if user_fk_filter:
            filters.append('tb_user_fk = :user_fk')
            params['user_fk'] = user_fk_filter
        elif not is_admin:
            # Supervisor: ver apenas a sua equipa direta
            filters.append('superior_fk = :superior_fk')
            params['superior_fk'] = caller_pk

        where = ' AND '.join(filters)
        rows = session.execute(
            text(f"""
                SELECT tipo, pk, tb_user_fk, colaborador_nome, superior_fk,
                       data_inicio, data_fim, mes, ano,
                       ts_estado_fk, estado_descr, estado_cor, notas,
                       created_at
                FROM vbl_rh_pendentes
                WHERE {where}
                ORDER BY created_at ASC
            """),
            params,
        ).mappings().all()

        return jsonify([dict(r) for r in rows]), 200


@api_error_handler
def get_equipa(current_user: str, user_fk_filter: Optional[int]):
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    caller_pk = claims.get('user_id')

    with db_session_manager(current_user) as session:
        is_admin = _is_rh_admin(current_user, session)

        filters = ['1=1']
        params: dict = {}

        if user_fk_filter:
            filters.append('pk = :user_fk')
            params['user_fk'] = user_fk_filter
        elif not is_admin:
            filters.append('superior_fk = :superior_fk')
            params['superior_fk'] = caller_pk

        where = ' AND '.join(filters)
        rows = session.execute(
            text(f"""
                SELECT pk, name, superior_fk,
                       tt_rh_equipa_fk, equipa_codigo, equipa_nome,
                       entrada_hoje, saida_hoje,
                       em_ferias_hoje, tem_falta_hoje,
                       piquete_semana_inicio,
                       dias_ferias_disponiveis, faltas_ano,
                       hora_entrada, hora_saida, horario_descr
                FROM vbl_rh_equipa_hoje
                WHERE {where}
                ORDER BY name ASC
            """),
            params,
        ).mappings().all()

        return jsonify([dict(r) for r in rows]), 200


@api_error_handler
def workflow_bulk(data: dict, current_user: str):
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    caller_pk = claims.get('user_id')

    payload = WorkflowBulkAction.model_validate(data)

    if not payload.pks:
        raise APIError('Nenhum item seleccionado', 400)

    # Mapeamento tipo → workflow tipo_ref (compatível com fbo_rh_workflow)
    tipo_map = {
        'ferias':       'ferias',
        'faltas':       'faltas',
        'ponto':        'ponto',
        'participacao': 'participacao',
    }
    tipo_ref = tipo_map.get(payload.tipo)
    if not tipo_ref:
        raise APIError(f'Tipo inválido: {payload.tipo}', 400)

    resultados = {'ok': [], 'erro': []}

    with db_session_manager(current_user) as session:
        for pk in payload.pks:
            try:
                result = session.execute(text("""
                    SELECT fbo_rh_workflow(
                        :tipo_ref, :ref_pk, :step, :user_fk, :ts_estado_fk, :notas
                    ) AS result
                """), {
                    'tipo_ref':     tipo_ref,
                    'ref_pk':       pk,
                    'step':         payload.step,
                    'user_fk':      caller_pk,
                    'ts_estado_fk': payload.ts_estado_fk,
                    'notas':        payload.notas,
                }).scalar()

                if result and ('<sucess>' in result.lower() or '<success>' in result.lower()):
                    resultados['ok'].append(pk)
                else:
                    resultados['erro'].append({'pk': pk, 'msg': result or 'Erro desconhecido'})
                    logger.warning(f'[Bulk WF] pk={pk} tipo={tipo_ref}: {result}')
            except Exception as e:
                resultados['erro'].append({'pk': pk, 'msg': str(e)})
                logger.error(f'[Bulk WF] Excepção pk={pk}: {e}')

    total = len(payload.pks)
    ok    = len(resultados['ok'])
    msg   = f'{ok}/{total} item(s) processados com sucesso.'

    if resultados['erro']:
        return jsonify({'message': msg, **resultados}), 207  # Multi-Status
    return jsonify({'message': msg, **resultados}), 200
