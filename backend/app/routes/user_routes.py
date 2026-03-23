from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.permissions_decorator import require_permission
from ..services.user_service import (
    send_email,
    create_user_ext,
    activate_user as activate_user_service,
    update_user_info,
    get_user_info,
    update_password,
    password_recovery,
    reset_password,
    fsf_client_vacationadd,
    fsf_client_vacationclean,
    get_all_users,
    get_user_by_id,
    create_user_admin,
    update_user_admin,
    delete_user_admin,
    reset_user_password_admin,
    toggle_user_status_admin,
    get_all_interfaces,
    update_user_permissions,
    bulk_update_permissions,
    get_permission_groups,
    sync_permission_group,
    rename_permission_group,
    delete_permission_group,
)
from ..utils.utils import set_session, token_required, db_session_manager
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger

logger = get_logger(__name__)


bp = Blueprint('user', __name__)


@bp.route('/send_mail', methods=['POST'])
@jwt_required()
@token_required
@api_error_handler
def send_mail():
    """
    Enviar Email (Interno)
    ---
    tags:
      - Utilizadores
    summary: Permite o envio de emails isolados usando a configuração base do sistema.
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: email_data
        required: true
        schema:
          type: object
          properties:
            email:
              type: string
            subject:
              type: string
            message:
              type: string
    responses:
      200:
        description: Email enviado com sucesso.
    """
    data = request.get_json()
    email = data.get('email')
    subject = data.get('subject')
    message = data.get('message')
    send_email(email, subject, message)
    return {'message': 'Email enviado com sucesso.'}, 200


@bp.route('/create_user_ext', methods=['POST'])
@api_error_handler
def create_user():
    """
    Registo Externo
    ---
    tags:
      - Utilizadores
    summary: Regista um novo utilizador a partir do formato público (não autenticado).
    parameters:
      - in: body
        name: user_data
        required: true
        schema:
          type: object
    responses:
      201:
        description: Utilizador criado com sucesso com necessidade de ativação.
    """
    return create_user_ext(request.get_json())


@bp.route('/activation/<int:id>/<int:activation_code>', methods=['GET'])
@api_error_handler
def activate_user(id, activation_code):
    """
    Ativar Nova Conta
    ---
    tags:
      - Utilizadores
    summary: Confirma o email inserido usando o ID e código transmitido.
    parameters:
      - name: id
        in: path
        type: integer
        required: true
        description: O ID do utilizador pendente
      - name: activation_code
        in: path
        type: integer
        required: true
        description: O código numérico recebido por e-mail
    responses:
      200:
        description: Conta validada e ativa.
    """
    return activate_user_service(id, activation_code)


@bp.route('/user_info', methods=['GET', 'PUT'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def user_info():
    """
    Obter ou Editar Perfil (Me)
    ---
    tags:
      - Utilizadores
    summary: Devolve os detalhes do Utilizador Ativo ou atualiza os próprios dados.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Devolve dados da sessão do utilizador logado.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        if request.method == 'GET':
            return get_user_info(current_user)
        elif request.method == 'PUT':
            data = request.get_json()
            return update_user_info(data, current_user)


@bp.route('/change_password', methods=['PUT'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def change_password_route():
    """
    Mudar a Própria Password
    ---
    tags:
      - Utilizadores
    summary: Exige validação da password atual antes de gravar a nova password.
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            oldPassword:
              type: string
            newPassword:
              type: string
    responses:
      200:
        description: Password alterada.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    old_password = data.get("oldPassword")
    new_password = data.get("newPassword")

    if not old_password or not new_password:
        return jsonify({"erro": "Passwords não fornecidas"}), 400

    result = update_password(data, current_user)
    return jsonify(result), 200


@bp.route('/password_recovery', methods=['POST'])
@api_error_handler
def password_recovery_route():
    return password_recovery(request.get_json())


@bp.route('/reset_password', methods=['POST'])
@api_error_handler
def reset_password_route():
    return reset_password(request.get_json())


@bp.route('/vacation_status', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def vacation_status():
    """
    Definir Estado de Ausência (Férias)
    ---
    tags:
      - Utilizadores
    summary: Assinala se o utilizador atual entrou num estado temporariamente ausente.
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            user_id:
              type: integer
            vacation:
              type: integer
              description: 1 ou 0
    responses:
      200:
        description: Estado modificado com sucesso.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        data = request.get_json()
        user_id = data.get('user_id')
        vacation = data.get('vacation')
        if vacation is None:
            return jsonify({"error": "Status de férias não fornecido"}), 400
        
        if vacation == 1:
            return fsf_client_vacationadd(user_id, current_user)
        else:
            return fsf_client_vacationclean(user_id, current_user)


@bp.route('/users', methods=['GET'])
@jwt_required()
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def get_users():
    current_user = get_jwt_identity()
    return get_all_users(current_user)


@bp.route('/interfaces', methods=['GET'])
@jwt_required()
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def get_interfaces():
    current_user = get_jwt_identity()
    return get_all_interfaces(current_user)


@bp.route('/users/<int:user_id>/interfaces', methods=['PUT'])
@jwt_required()
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def update_user_interfaces(user_id):
    current_user = get_jwt_identity()
    data = request.get_json()
    return update_user_permissions(user_id, data, current_user)


# ── Gestão de grupos / templates de permissões ────────────────────────────

@bp.route('/interfaces/groups', methods=['GET'])
@jwt_required()
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def list_permission_groups():
    """Lista todos os grupos com contagem de permissões."""
    current_user = get_jwt_identity()
    return get_permission_groups(current_user)


@bp.route('/interfaces/groups/<string:name>', methods=['POST'])
@jwt_required()
@require_permission(20)
@set_session
@api_error_handler
def create_or_sync_permission_group(name):
    """Cria ou actualiza um grupo sincronizando as suas permissões (operação atómica)."""
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    return sync_permission_group(name, data, current_user)


@bp.route('/interfaces/groups/<string:name>', methods=['PUT'])
@jwt_required()
@require_permission(20)
@set_session
@api_error_handler
def update_permission_group_name(name):
    """Renomeia um grupo em todas as permissões."""
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    return rename_permission_group(name, data, current_user)


@bp.route('/interfaces/groups/<string:name>', methods=['DELETE'])
@jwt_required()
@require_permission(20)
@set_session
@api_error_handler
def remove_permission_group(name):
    """Remove um grupo de todas as permissões."""
    current_user = get_jwt_identity()
    return delete_permission_group(name, current_user)


# ============================================
# ADMIN USER CRUD ENDPOINTS
# ============================================

@bp.route('/admin/users', methods=['GET'])
@jwt_required()
@token_required
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def admin_get_users():
    """
    Listar Todos os Utilizadores (Admin)
    ---
    tags:
      - Admin Users
    summary: Devolve todos os utilizadores existentes. (Exige premissão admin.users)
    security:
      - BearerAuth: []
    responses:
      200:
        description: Lista carregada com sucesso.
    """
    current_user = get_jwt_identity()
    return get_all_users(current_user)


@bp.route('/admin/users/<int:user_id>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def admin_get_user(user_id):
    """
    Detalhes de Utilizador Específico (Admin)
    ---
    tags:
      - Admin Users
    summary: Obtém um utilizador por ID.
    security:
      - BearerAuth: []
    parameters:
      - name: user_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Detalhes carregados.
    """
    current_user = get_jwt_identity()
    return get_user_by_id(user_id, current_user)


@bp.route('/admin/users', methods=['POST'])
@jwt_required()
@token_required
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def admin_create_user():
    """
    Registar Novo Utilizador (Admin)
    ---
    tags:
      - Admin Users
    summary: Cria novo utilizador ignorando certas validações públicas de Sign Up.
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      201:
        description: Criado.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_user_admin(data, current_user)


@bp.route('/admin/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def admin_update_user(user_id):
    """Atualiza utilizador (admin)"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return update_user_admin(user_id, data, current_user)


@bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def admin_delete_user(user_id):
    """Apaga utilizador (admin)"""
    current_user = get_jwt_identity()
    return delete_user_admin(user_id, current_user)


@bp.route('/admin/users/<int:user_id>/reset-password', methods=['POST'])
@jwt_required()
@token_required
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def admin_reset_user_password(user_id):
    """Reset password de utilizador (admin)"""
    current_user = get_jwt_identity()
    return reset_user_password_admin(user_id, current_user)


@bp.route('/admin/users/<int:user_id>/toggle-status', methods=['POST'])
@jwt_required()
@token_required
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def admin_toggle_user_status(user_id):
    """Ativa/Desativa utilizador (admin)"""
    current_user = get_jwt_identity()
    data = request.get_json()
    active = data.get('active', True)
    return toggle_user_status_admin(user_id, active, current_user)


@bp.route('/admin/users/<int:user_id>/permissions', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def admin_update_user_permissions(user_id):
    """Atualiza permissões de utilizador (admin)"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return update_user_permissions(user_id, data, current_user)


@bp.route('/admin/users/bulk-permissions', methods=['POST'])
@jwt_required()
@token_required
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def admin_bulk_update_permissions():
    """Atualiza permissões em massa para múltiplos utilizadores (admin)"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return bulk_update_permissions(data, current_user)


@bp.after_request
@api_error_handler
def cleanup_session(response):
    if hasattr(g, 'current_user'):
        delattr(g, 'current_user')
    if hasattr(g, 'current_session_id'):
        delattr(g, 'current_session_id')
    return response


# Adicione esta linha no final do arquivo auth_routes.py
bp.after_request(cleanup_session)
