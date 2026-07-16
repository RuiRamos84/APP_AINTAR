from flask import jsonify, current_app
from sqlalchemy import text
from typing import Optional
from pydantic import BaseModel
from ..utils.utils import db_session_manager, format_message
from app.utils.error_handler import api_error_handler, APIError
from app.utils.logger import get_logger
from app.utils.serializers import serialize_rows
from app.services import audit_service

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


def _is_supervisor(current_user: str, session, user_pk: int) -> bool:
    """Verifica se o utilizador é superior direto de alguém."""
    row = session.execute(
        text("SELECT EXISTS(SELECT 1 FROM ts_rh_colaborador WHERE superior_fk = :pk) AS has_team"),
        {'pk': user_pk},
    ).fetchone()
    return bool(row.has_team) if row else False


def _is_full_rh_admin(session) -> bool:
    """Admin de sistema (profile=0) ou rh.admin — sem restrição de equipa.
    Usado para visibilidade/gestão de dados (ver/editar de qualquer
    colaborador, gerir locais, documentos, etc.). Para autorizar um PASSO de
    workflow específico usar _assert_pode_validar, não isto directamente —
    rh.admin não deve poder validar o nível de supervisor de uma equipa que
    não é sua só por ser RH."""
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    if claims.get('profile') == 0:
        return True
    row = session.execute(text("""
        SELECT EXISTS (
            SELECT 1 FROM ts_client c
            JOIN ts_interface i ON i.value = 'rh.admin'
            WHERE c.pk = :pk AND c.interface @> ARRAY[i.pk]
        ) AS is_admin
    """), {'pk': claims.get('user_id')}).fetchone()
    return bool(row.is_admin) if row else False


def _is_system_admin() -> bool:
    """Admin de sistema (profile=0) apenas — bypassa qualquer validação de
    workflow, incluindo o nível 1 (supervisor) mesmo sem ser o superior
    directo. rh.admin (RH) NÃO entra aqui — RH só valida o seu próprio nível."""
    from flask_jwt_extended import get_jwt
    return get_jwt().get('profile') == 0


def _is_direct_superior(session, employee_pk: int, supervisor_pk: int) -> bool:
    row = session.execute(
        text('SELECT 1 FROM ts_rh_colaborador WHERE pk = :emp AND superior_fk = :sup'),
        {'emp': employee_pk, 'sup': supervisor_pk},
    ).fetchone()
    return row is not None


_TIPO_TABELA_WORKFLOW = {
    'ferias':       'tb_rh_ferias',
    'faltas':       'tb_rh_faltas',
    'ponto':        'tb_rh_ponto_mensal',
    'participacao': 'tb_rh_participacao',
}


def _get_owner_fk(session, tipo_ref: str, ref_pk: int) -> Optional[int]:
    tabela = _TIPO_TABELA_WORKFLOW.get(tipo_ref)
    if not tabela:
        return None
    return session.execute(
        text(f'SELECT tb_user_fk FROM {tabela} WHERE pk = :pk'), {'pk': ref_pk}
    ).scalar()


def _assert_pode_validar(session, tipo_ref: str, ref_pk: int, step: int, caller_pk: int) -> None:
    """Cada papel só valida na sua própria condição:
    - Admin de sistema (profile=0): valida qualquer passo, sem restrição.
    - Nível 1 (supervisor): exige ser de facto o superior directo do
      colaborador — mesmo rh.admin não bypassa este nível só por ser RH;
      quem valida como supervisor tem de o ser realmente.
    - Níveis seguintes (RH): exigem rh.admin.
    """
    if _is_system_admin():
        return
    if step == 1:
        owner_fk = _get_owner_fk(session, tipo_ref, ref_pk)
        if owner_fk is None:
            raise APIError(f'Registo não encontrado: {ref_pk}', 404)
        if not _is_direct_superior(session, owner_fk, caller_pk):
            raise APIError('Só o superior directo do colaborador pode validar este registo', 403)
        return
    if not _is_full_rh_admin(session):
        raise APIError('Só o RH pode validar este passo do workflow', 403)


# ---------------------------------------------------------------------------
# Serviços
# ---------------------------------------------------------------------------

@api_error_handler
def get_pendentes(current_user: str, tipo: Optional[str], user_fk_filter: Optional[int]):
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    caller_pk = claims.get('user_id')

    with db_session_manager(current_user) as session:
        # Só Admin RH vê tudo — um supervisor (rh.validate) fica sempre
        # restringido à sua equipa directa, mesmo passando user_fk_filter.
        is_admin = _is_full_rh_admin(session)

        filters = ['1=1']
        params: dict = {}

        if tipo:
            filters.append('tipo = :tipo')
            params['tipo'] = tipo

        if not is_admin:
            filters.append('superior_fk = :superior_fk')
            params['superior_fk'] = caller_pk

        if user_fk_filter:
            filters.append('tb_user_fk = :user_fk')
            params['user_fk'] = user_fk_filter

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

        return jsonify(serialize_rows(rows)), 200


@api_error_handler
def get_equipa(current_user: str, user_fk_filter: Optional[int]):
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    caller_pk = claims.get('user_id')

    with db_session_manager(current_user) as session:
        # Só Admin RH vê a equipa toda — um supervisor (rh.validate) fica
        # sempre restringido aos seus subordinados directos.
        is_admin = _is_full_rh_admin(session)

        filters = ['1=1']
        params: dict = {}

        if not is_admin:
            filters.append('superior_fk = :superior_fk')
            params['superior_fk'] = caller_pk

        if user_fk_filter:
            filters.append('pk = :user_fk')
            params['user_fk'] = user_fk_filter

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

        return jsonify(serialize_rows(rows)), 200


@api_error_handler
def workflow_bulk(data: dict, current_user: str, ip: str = None):
    from flask_jwt_extended import get_jwt
    claims = get_jwt()
    caller_pk = claims.get('user_id')

    payload = WorkflowBulkAction.model_validate(data)

    if not payload.pks:
        raise APIError('Nenhum item seleccionado', 400)

    # Participações têm workflow de 3 níveis com estados-destino diferentes
    # por nível (fbo_rh_participacao_wf) — não há um único par (step,
    # ts_estado_fk) válido para uma selecção em massa. O redesenho da
    # validação exige rever motivo/documentos/evidência de ponto por item,
    # por isso este tipo é deliberadamente excluído da acção em massa.
    if payload.tipo == 'participacao':
        raise APIError(
            'Participações não suportam aprovação em massa — '
            'valide cada uma individualmente após rever os dados.',
            422,
        )

    # Mapeamento tipo → workflow tipo_ref (compatível com fbo_rh_workflow)
    tipo_map = {
        'ferias': 'ferias',
        'faltas': 'faltas',
        'ponto':  'ponto',
    }
    tipo_ref = tipo_map.get(payload.tipo)
    if not tipo_ref:
        raise APIError(f'Tipo inválido: {payload.tipo}', 400)

    resultados = {'ok': [], 'erro': []}

    with db_session_manager(current_user) as session:
        for pk in payload.pks:
            try:
                _assert_pode_validar(session, tipo_ref, pk, payload.step, caller_pk)
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
                    audit_service.record(
                        session, hist_client=caller_pk,
                        action=f'rh.{tipo_ref}.workflow', resource=tipo_ref, resource_id=pk,
                        meta={'step': payload.step, 'ts_estado_fk': payload.ts_estado_fk}, ip=ip,
                    )
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
