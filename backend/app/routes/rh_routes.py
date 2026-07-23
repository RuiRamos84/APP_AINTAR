from flask import Blueprint, request, jsonify
from datetime import date
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.utils.permissions_decorator import require_permission
from ..utils.utils import token_required, set_session, db_session_manager
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from sqlalchemy import text
from ..services.rh_face_service import (
    get_face_status, enroll_face, verify_face, reset_face_templates, get_face_users_status,
    get_consent_status, register_consent, erase_face_data, compute_descriptor_from_photo,
)
from ..services.rh_gestao_service import (
    get_pendentes, get_equipa, workflow_bulk,
)
from ..services.rh_participacao_service import (
    get_motivos, get_participacoes, get_participacao_by_pk, criar_participacao,
    editar_participacao, executar_wf, upload_anexos, download_anexo, delete_anexo,
)
from ..services.rh_documento_service import (
    get_tipos_documento, get_documentos, upload_documento,
    download_documento, delete_documento,
)
from ..services.rh_service import (
    check_entrada,
    get_lookups,
    get_colaboradores, get_colaborador, get_saldo_ferias,
    registar_ponto_evento, get_ponto, submeter_ponto_mensal,
    get_ponto_mensal, corrigir_ponto, adicionar_ponto_admin,
    executar_workflow,
    criar_ferias, editar_ferias, get_ferias,
    get_conflitos_ferias, get_mapa_ferias,
    criar_falta, editar_falta, get_faltas,
    upload_anexos_falta, download_anexo_falta, delete_anexo_falta,
    criar_horario, editar_horario, get_horarios,
    upsert_config, get_config,
    get_piquete, gerar_escala_piquete, confirmar_piquete,
    criar_escala_piquete, editar_escala_piquete,
    get_piquete_regras, upsert_piquete_regras,
    get_ocorrencias, criar_ocorrencia, editar_ocorrencia,
    upsert_colaborador_perfil,
    init_config_ano, init_config_ano_todos,
    get_locais, criar_local, editar_local, eliminar_local,
    set_local_colaborador, get_ponto_alertas,
)

logger = get_logger(__name__)

bp = Blueprint('rh_routes', __name__)


def _get_user_pk(current_user, session):
    # get_jwt_identity() devolve session_id.
    # Em vez de fs_entity() (que retorna o ts_user.pk, ex: 1), obtemos o ts_client.pk do token
    claims = get_jwt()
    return claims.get('user_id')


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
    """Lista simplificada (pk + name) para dropdowns — usa vbl_rh_colaborador (filtro de perfis aplicado)."""
    current_user = get_jwt_identity()
    from flask import jsonify
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, name
            FROM vbl_rh_colaborador
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
    return get_saldo_ferias(pk, current_user, ano=request.args.get('ano', type=int))


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


@bp.route('/rh/ponto/check-entrada', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@api_error_handler
def ponto_check_entrada_route():
    current_user = get_jwt_identity()
    claims = get_jwt()
    user_fk = claims.get('user_id')
    return check_entrada(user_fk, current_user)


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
@require_permission('rh.edit')
@set_session
@api_error_handler
def ponto_corrigir_route(pk):
    # rh.edit chega: o serviço distingue auto-correcao (o próprio, nota
    # obrigatória) de correcao em nome de outrem (exige rh.admin/rh.validate
    # + equipa, validado dentro de corrigir_ponto).
    current_user = get_jwt_identity()
    return corrigir_ponto(pk, request.get_json(), current_user)


@bp.route('/rh/ponto/admin/evento', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def ponto_admin_evento_route():
    # Mesma lógica de ponto_corrigir_route — ver adicionar_ponto_admin.
    current_user = get_jwt_identity()
    return adicionar_ponto_admin(request.get_json(), current_user)


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


@bp.route('/rh/ferias/conflitos', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def ferias_conflitos_route():
    current_user = get_jwt_identity()
    user_fk    = request.args.get('user_fk', type=int)
    data_inicio = request.args.get('data_inicio')
    data_fim    = request.args.get('data_fim')
    excluir_pk  = request.args.get('excluir_pk', type=int)
    if not user_fk or not data_inicio or not data_fim:
        return jsonify([]), 200
    return get_conflitos_ferias(current_user, user_fk, data_inicio, data_fim, excluir_pk)


@bp.route('/rh/ferias/mapa', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def ferias_mapa_route():
    current_user = get_jwt_identity()
    ano       = request.args.get('ano', default=None, type=int) or __import__('datetime').date.today().year
    equipa_fk = request.args.get('equipa_fk', type=int)
    return get_mapa_ferias(current_user, ano, equipa_fk)


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


@bp.route('/rh/faltas/<int:pk>/anexos', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def faltas_upload_anexos_route(pk):
    current_user = get_jwt_identity()
    return upload_anexos_falta(pk, current_user)


@bp.route('/rh/faltas/<int:pk>/anexos/<path:filename>', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def faltas_download_anexo_route(pk, filename):
    current_user = get_jwt_identity()
    return download_anexo_falta(pk, filename, current_user)


@bp.route('/rh/faltas/<int:pk>/anexos/<path:filename>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def faltas_delete_anexo_route(pk, filename):
    current_user = get_jwt_identity()
    return delete_anexo_falta(pk, filename, current_user)


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


@bp.route('/rh/piquete', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def piquete_criar_route():
    current_user = get_jwt_identity()
    return criar_escala_piquete(request.get_json(), current_user)


@bp.route('/rh/piquete/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def piquete_editar_route(pk):
    current_user = get_jwt_identity()
    return editar_escala_piquete(pk, request.get_json(), current_user)


@bp.route('/rh/piquete/regras', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@api_error_handler
def regras_list_route():
    current_user = get_jwt_identity()
    return get_piquete_regras(current_user)


@bp.route('/rh/piquete/regras', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def regras_upsert_route():
    current_user = get_jwt_identity()
    return upsert_piquete_regras(request.get_json(), current_user)


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
    ano = data.get('ano', date.today().year)
    return init_config_ano_todos(ano, current_user)


# ---------------------------------------------------------------------------
# Geofencing — Locais predefinidos
# ---------------------------------------------------------------------------

@bp.route('/rh/locais', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def locais_list_route():
    return get_locais(get_jwt_identity())


@bp.route('/rh/locais', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def locais_create_route():
    return criar_local(request.get_json(), get_jwt_identity())


@bp.route('/rh/locais/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def locais_update_route(pk):
    return editar_local(pk, request.get_json(), get_jwt_identity())


@bp.route('/rh/locais/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def locais_delete_route(pk):
    return eliminar_local(pk, get_jwt_identity())


@bp.route('/rh/colaboradores/<int:pk>/local', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def colaborador_set_local_route(pk):
    data = request.get_json() or {}
    local_fk = data.get('local_fk')
    return set_local_colaborador(pk, local_fk, get_jwt_identity())


@bp.route('/rh/ponto/alertas', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.validate')
@set_session
@api_error_handler
def ponto_alertas_route():
    current_user = get_jwt_identity()
    user_fk     = request.args.get('user_fk',     type=int)
    data_inicio = request.args.get('data_inicio')
    data_fim    = request.args.get('data_fim')
    return get_ponto_alertas(current_user, user_fk, data_inicio, data_fim)


# ---------------------------------------------------------------------------
# Reconhecimento Facial
# ---------------------------------------------------------------------------

@bp.route('/rh/face/status', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@api_error_handler
def face_status_route():
    current_user = get_jwt_identity()
    claims = get_jwt()
    user_fk = request.args.get('user_fk', type=int) or claims.get('user_id')
    return get_face_status(user_fk, current_user)


@bp.route('/rh/face/consent', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@api_error_handler
def face_consent_status_route():
    current_user = get_jwt_identity()
    claims = get_jwt()
    user_fk = claims.get('user_id')
    return get_consent_status(user_fk, current_user)


@bp.route('/rh/face/consent', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def face_consent_register_route():
    current_user = get_jwt_identity()
    claims = get_jwt()
    user_fk = claims.get('user_id')
    return register_consent(request.get_json(), user_fk, current_user, ip=request.remote_addr)


@bp.route('/rh/face/enroll', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def face_enroll_route():
    current_user = get_jwt_identity()
    claims = get_jwt()
    user_fk = claims.get('user_id')
    return enroll_face(request.get_json(), user_fk, current_user)


@bp.route('/rh/face/descriptor', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@api_error_handler
def face_descriptor_route():
    claims = get_jwt()
    user_fk = claims.get('user_id')
    return compute_descriptor_from_photo(request.get_json(), user_fk)


@bp.route('/rh/face/verify', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def face_verify_route():
    current_user = get_jwt_identity()
    claims = get_jwt()
    user_fk = claims.get('user_id')
    return verify_face(request.get_json(), user_fk, current_user)


@bp.route('/rh/face/<int:user_fk>/reset', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def face_reset_route(user_fk):
    """Admin faz reset ao rosto de qualquer colaborador."""
    current_user = get_jwt_identity()
    claims = get_jwt()
    requester_fk = claims.get('user_id')
    return reset_face_templates(user_fk, current_user, requester_fk=requester_fk, ip=request.remote_addr)


@bp.route('/rh/face/<int:user_fk>/erase', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def face_erase_route(user_fk):
    """Apagamento físico dos dados biométricos (RGPD art.17) — offboarding ou pedido de titular."""
    current_user = get_jwt_identity()
    claims = get_jwt()
    requester_fk = claims.get('user_id')
    return erase_face_data(user_fk, current_user, requester_fk=requester_fk, ip=request.remote_addr)


@bp.route('/rh/face/users', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@api_error_handler
def face_users_route():
    """Lista colaboradores com estado de enrollment facial (admin)."""
    current_user = get_jwt_identity()
    return get_face_users_status(current_user)


# ---------------------------------------------------------------------------
# Participações de Ausências (faltas + parciais)
# ---------------------------------------------------------------------------

@bp.route('/rh/participacoes/motivos', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def participacoes_motivos_route():
    return get_motivos(get_jwt_identity())


@bp.route('/rh/participacoes', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def participacoes_list_route():
    current_user = get_jwt_identity()
    claims = get_jwt()
    user_fk_jwt = claims.get('user_id')
    # Utilizadores sem rh.admin só vêem as próprias participações
    from app.core.permissions import permission_manager
    user_profile = str(claims.get('profile', ''))
    user_interfaces = claims.get('interfaces', [])
    is_admin = permission_manager.check_permission('rh.admin', user_profile, user_interfaces)
    user_fk = request.args.get('user_fk', type=int)
    if not is_admin:
        user_fk = user_fk_jwt
    return get_participacoes(
        current_user,
        user_fk=user_fk,
        ano=request.args.get('ano', type=int),
        mes=request.args.get('mes', type=int),
        estado=request.args.get('estado', type=int),
        tipo=request.args.get('tipo'),
    )


@bp.route('/rh/participacoes/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def participacoes_detail_route(pk):
    """Detalhe de uma participação — usado pelo modal de revisão da Gestão
    Centralizada. Autorização (próprio/admin/superior directo) no serviço."""
    current_user = get_jwt_identity()
    return get_participacao_by_pk(pk, current_user)


@bp.route('/rh/participacoes', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def participacoes_create_route():
    current_user = get_jwt_identity()
    data = request.get_json()
    # Se não vier user_fk no payload, usa o do token
    if not data.get('user_fk'):
        claims = get_jwt()
        data['user_fk'] = claims.get('user_id')
    return criar_participacao(data, current_user)


@bp.route('/rh/participacoes/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def participacoes_update_route(pk):
    return editar_participacao(pk, request.get_json(), get_jwt_identity())


@bp.route('/rh/participacoes/workflow', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.validate')
@set_session
@api_error_handler
def participacoes_wf_route():
    current_user = get_jwt_identity()
    claims = get_jwt()
    user_fk = claims.get('user_id')
    return executar_wf(request.get_json(), user_fk, current_user)


@bp.route('/rh/participacoes/<int:pk>/anexos', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def participacoes_upload_route(pk):
    return upload_anexos(pk, get_jwt_identity())


@bp.route('/rh/participacoes/<int:pk>/anexos/<string:filename>', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@set_session
@api_error_handler
def participacoes_download_route(pk, filename):
    return download_anexo(pk, filename, get_jwt_identity())


@bp.route('/rh/participacoes/<int:pk>/anexos/<string:filename>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('rh.edit')
@set_session
@api_error_handler
def participacoes_delete_anexo_route(pk, filename):
    return delete_anexo(pk, filename, get_jwt_identity())


# ---------------------------------------------------------------------------
# Gestão Documental — pasta pessoal do colaborador, organizada por ano
# ---------------------------------------------------------------------------

@bp.route('/rh/documentos/tipos', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def documentos_tipos_route():
    return get_tipos_documento(get_jwt_identity())


@bp.route('/rh/documentos', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@api_error_handler
def documentos_list_route():
    current_user = get_jwt_identity()
    return get_documentos(
        current_user,
        user_fk=request.args.get('user_fk', type=int),
        ano=request.args.get('ano', type=int),
    )


@bp.route('/rh/documentos/<int:user_fk>', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def documentos_upload_route(user_fk):
    return upload_documento(user_fk, get_jwt_identity())


@bp.route('/rh/documentos/<int:pk>/download', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.view')
@set_session
@api_error_handler
def documentos_download_route(pk):
    return download_documento(pk, get_jwt_identity())


@bp.route('/rh/documentos/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('rh.admin')
@set_session
@api_error_handler
def documentos_delete_route(pk):
    return delete_documento(pk, get_jwt_identity())


# ---------------------------------------------------------------------------
# Gestão Centralizada RH (painel supervisor / admin)
# ---------------------------------------------------------------------------

@bp.route('/rh/gestao/pendentes', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.validate')
@api_error_handler
def gestao_pendentes_route():
    """Fila unificada de pendentes: férias, faltas, ponto e participações.
    Admins (rh.admin) vêem tudo; supervisores vêem apenas a equipa direta."""
    current_user = get_jwt_identity()
    return get_pendentes(
        current_user,
        tipo=request.args.get('tipo'),
        user_fk_filter=request.args.get('user_fk', type=int),
    )


@bp.route('/rh/gestao/equipa', methods=['GET'])
@jwt_required()
@token_required
@require_permission('rh.validate')
@api_error_handler
def gestao_equipa_route():
    """Snapshot diário de cada colaborador (check-in, férias, faltas, piquete)."""
    current_user = get_jwt_identity()
    return get_equipa(
        current_user,
        user_fk_filter=request.args.get('user_fk', type=int),
    )


@bp.route('/rh/gestao/workflow/bulk', methods=['POST'])
@jwt_required()
@token_required
@require_permission('rh.validate')
@set_session
@api_error_handler
def gestao_workflow_bulk_route():
    """Acção de workflow em massa: aprova/rejeita múltiplos itens de uma vez."""
    current_user = get_jwt_identity()
    return workflow_bulk(request.get_json(), current_user, ip=request.remote_addr)
