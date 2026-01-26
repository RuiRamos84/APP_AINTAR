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
    bulk_update_permissions

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
    data = request.get_json()
    email = data.get('email')
    subject = data.get('subject')
    message = data.get('message')
    send_email(email, subject, message)
    return {'message': 'Email enviado com sucesso.'}, 200


@bp.route('/create_user_ext', methods=['POST'])
@api_error_handler
def create_user():
    return create_user_ext(request.get_json())


@bp.route('/activation/<int:id>/<int:activation_code>', methods=['GET'])
@api_error_handler
def activate_user(id, activation_code):
    return activate_user_service(id, activation_code)


@bp.route('/user_info', methods=['GET', 'PUT'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def user_info():
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
    """Lista todos os utilizadores (admin)"""
    current_user = get_jwt_identity()
    return get_all_users(current_user)


@bp.route('/admin/users/<int:user_id>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def admin_get_user(user_id):
    """Obtém utilizador por ID (admin)"""
    current_user = get_jwt_identity()
    return get_user_by_id(user_id, current_user)


@bp.route('/admin/users', methods=['POST'])
@jwt_required()
@token_required
@require_permission(20)  # admin.users
@set_session
@api_error_handler
def admin_create_user():
    """Cria novo utilizador (admin)"""
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
