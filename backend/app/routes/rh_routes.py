from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.permissions_decorator import require_permission
from ..utils.utils import token_required, set_session, db_session_manager
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from sqlalchemy import text
from ..services.rh_service import (
    get_lookups,
    get_colaboradores, get_colaborador, get_saldo_ferias,
    registar_ponto_evento, get_ponto, submeter_ponto_mensal,
    get_ponto_mensal, corrigir_ponto,
    executar_workflow,
    criar_ferias, editar_ferias, get_ferias,
    criar_falta, editar_falta, get_faltas,
    criar_horario, editar_horario, get_horarios,
    upsert_config, get_config,
    get_piquete, gerar_escala_piquete, confirmar_piquete,
    get_ocorrencias, criar_ocorrencia, editar_ocorrencia,
    get_colaborador_perfil, upsert_colaborador_perfil,
    init_config_ano, init_config_ano_todos,
)

logger = get_logger(__name__)

bp = Blueprint('rh_routes', __name__)


def _get_user_pk(current_user, session):
    # get_jwt_identity() devolve session_id, não email.
    # fs_entity() usa a sessão activa (set_session) para devolver o pk do utilizador actual.
    return session.execute(text("SELECT fs_entity() AS pk")).scalar()


# ---------------------------------------------------------------------------
# Lookups
# ---------------------------------------------------------------------------

@bp.route('/rh/lookups', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def lookups_route():
    current_user = get_jwt_identity()
    return get_lookups(current_user)


# ---------------------------------------------------------------------------
# Colaboradores
# ---------------------------------------------------------------------------

@bp.route('/rh/colaboradores', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def colaboradores_route():
    current_user = get_jwt_identity()
    return get_colaboradores(current_user)


@bp.route('/rh/colaboradores/lista', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def colaboradores_lista_route():
    """Lista simplificada (pk + name) para dropdowns — não depende da vbl_rh_colaborador."""
    current_user = get_jwt_identity()
    from flask import jsonify
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, name
            FROM ts_client
            WHERE ts_profile IN (0, 1, 6)
              AND COALESCE(active, 1) = 1
            ORDER BY name
        """)).mappings().all()
        return jsonify([dict(r) for r in rows]), 200


@bp.route('/rh/colaboradores/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def colaborador_detail_route(pk):
    current_user = get_jwt_identity()
    return get_colaborador(pk, current_user)


@bp.route('/rh/colaboradores/<int:pk>/saldo', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def saldo_ferias_route(pk):
    current_user = get_jwt_identity()
    return get_saldo_ferias(pk, current_user)


# ---------------------------------------------------------------------------
# Ponto
# ---------------------------------------------------------------------------

@bp.route('/rh/ponto/evento', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def ponto_evento_route():
    current_user = get_jwt_identity()
    return registar_ponto_evento(request.get_json(), current_user)


@bp.route('/rh/ponto', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def ponto_list_route():
    current_user = get_jwt_identity()
    return get_ponto(
        current_user,
        user_fk=request.args.get('user_fk', type=int),
        data_inicio=request.args.get('data_inicio'),
        data_fim=request.args.get('data_fim'),
    )


@bp.route('/rh/ponto/submeter', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def ponto_submeter_route():
    current_user = get_jwt_identity()
    return submeter_ponto_mensal(request.get_json(), current_user)


@bp.route('/rh/ponto/mensal', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def ponto_mensal_route():
    current_user = get_jwt_identity()
    return get_ponto_mensal(
        current_user,
        user_fk=request.args.get('user_fk', type=int),
        ano=request.args.get('ano', type=int),
        mes=request.args.get('mes', type=int),
        estado=request.args.get('estado', type=int),
    )


@bp.route('/rh/ponto/<int:pk>/corrigir', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def ponto_corrigir_route(pk):
    current_user = get_jwt_identity()
    return corrigir_ponto(pk, request.get_json(), current_user)


# ---------------------------------------------------------------------------
# Workflow (ponto / férias / faltas)
# ---------------------------------------------------------------------------

@bp.route('/rh/workflow', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.validate')
@set_session
@api_error_handler
def workflow_route():
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        user_pk = _get_user_pk(current_user, session)
    return executar_workflow(request.get_json(), user_pk, current_user)


# ---------------------------------------------------------------------------
# Férias
# ---------------------------------------------------------------------------

@bp.route('/rh/ferias', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def ferias_list_route():
    current_user = get_jwt_identity()
    return get_ferias(
        current_user,
        user_fk=request.args.get('user_fk', type=int),
        ano=request.args.get('ano', type=int),
        estado=request.args.get('estado', type=int),
    )


@bp.route('/rh/ferias', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def ferias_create_route():
    current_user = get_jwt_identity()
    return criar_ferias(request.get_json(), current_user)


@bp.route('/rh/ferias/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def ferias_update_route(pk):
    current_user = get_jwt_identity()
    return editar_ferias(pk, request.get_json(), current_user)


# ---------------------------------------------------------------------------
# Faltas
# ---------------------------------------------------------------------------

@bp.route('/rh/faltas', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def faltas_list_route():
    current_user = get_jwt_identity()
    return get_faltas(
        current_user,
        user_fk=request.args.get('user_fk', type=int),
        ano=request.args.get('ano', type=int),
        estado=request.args.get('estado', type=int),
    )


@bp.route('/rh/faltas', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def faltas_create_route():
    current_user = get_jwt_identity()
    return criar_falta(request.get_json(), current_user)


@bp.route('/rh/faltas/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def faltas_update_route(pk):
    current_user = get_jwt_identity()
    return editar_falta(pk, request.get_json(), current_user)


# ---------------------------------------------------------------------------
# Horários
# ---------------------------------------------------------------------------

@bp.route('/rh/horarios', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def horarios_list_route():
    current_user = get_jwt_identity()
    return get_horarios(
        current_user,
        user_fk=request.args.get('user_fk', type=int),
        apenas_activos=request.args.get('activos', 'false').lower() == 'true',
    )


@bp.route('/rh/horarios', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def horarios_create_route():
    current_user = get_jwt_identity()
    return criar_horario(request.get_json(), current_user)


@bp.route('/rh/horarios/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def horarios_update_route(pk):
    current_user = get_jwt_identity()
    return editar_horario(pk, request.get_json(), current_user)


# ---------------------------------------------------------------------------
# Config (saldo de férias)
# ---------------------------------------------------------------------------

@bp.route('/rh/config', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@api_error_handler
def config_list_route():
    current_user = get_jwt_identity()
    return get_config(
        current_user,
        user_fk=request.args.get('user_fk', type=int),
        ano=request.args.get('ano', type=int),
    )


@bp.route('/rh/config', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def config_upsert_route():
    current_user = get_jwt_identity()
    return upsert_config(request.get_json(), current_user)


# ---------------------------------------------------------------------------
# Piquete
# ---------------------------------------------------------------------------

@bp.route('/rh/piquete', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def piquete_list_route():
    current_user = get_jwt_identity()
    return get_piquete(
        current_user,
        ano=request.args.get('ano', type=int),
        mes=request.args.get('mes', type=int),
        user_fk=request.args.get('user_fk', type=int),
    )


@bp.route('/rh/piquete/gerar', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def piquete_gerar_route():
    current_user = get_jwt_identity()
    return gerar_escala_piquete(request.get_json(), current_user)


@bp.route('/rh/piquete/<int:pk>/confirmar', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def piquete_confirmar_route(pk):
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        user_pk = _get_user_pk(current_user, session)
    return confirmar_piquete(pk, user_pk, current_user)


@bp.route('/rh/piquete/ocorrencias', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def ocorrencias_list_route():
    current_user = get_jwt_identity()
    return get_ocorrencias(
        current_user,
        escala_fk=request.args.get('escala_fk', type=int),
        ano=request.args.get('ano', type=int),
        mes=request.args.get('mes', type=int),
    )


@bp.route('/rh/piquete/ocorrencias', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def ocorrencias_create_route():
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        user_pk = _get_user_pk(current_user, session)
    return criar_ocorrencia(request.get_json(), user_pk, current_user)


@bp.route('/rh/piquete/ocorrencias/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def ocorrencias_update_route(pk):
    current_user = get_jwt_identity()
    return editar_ocorrencia(pk, request.get_json(), current_user)


# ---------------------------------------------------------------------------
# Perfil RH do colaborador
# ---------------------------------------------------------------------------

@bp.route('/rh/colaboradores/<int:pk>/perfil', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def colaborador_perfil_get(pk):
    current_user = get_jwt_identity()
    return get_colaborador_perfil(pk, current_user)


@bp.route('/rh/colaboradores/perfil', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def colaborador_perfil_upsert():
    current_user = get_jwt_identity()
    return upsert_colaborador_perfil(request.get_json(), current_user)


@bp.route('/rh/config/ano/init', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def config_ano_init_route():
    """Inicializa saldo anual para um colaborador (cálculo automático por antiguidade)."""
    current_user = get_jwt_identity()
    return init_config_ano(request.get_json(), current_user)


@bp.route('/rh/config/ano/init-todos', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def config_ano_init_todos_route():
    """Inicializa saldo anual para TODOS os colaboradores com perfil RH."""
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    ano = data.get('ano', __import__('datetime').date.today().year)
    return init_config_ano_todos(ano, current_user)
