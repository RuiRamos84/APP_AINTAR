from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.utils.permissions_decorator import require_permission
from ..services.tasks_service import (
    list_tasks,
    create_task,
    add_task_note,
    update_task,
    close_task,
    update_task_status,
    get_task_history,
    get_notification_count,
    update_task_note_notification,
)
from ..utils.utils import token_required, set_session, db_session_manager
from app.utils.error_handler import api_error_handler


bp = Blueprint('tasks_routes', __name__)


@bp.route('/tasks', methods=['GET'])
@jwt_required()
@token_required
@require_permission("tasks.all")
@set_session
@api_error_handler
def get_tasks():
    """Listar todas as tarefas ativas"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return list_tasks(current_user)


@bp.route('/tasks', methods=['POST'])
@jwt_required()
@token_required
@require_permission("tasks.manage")
@set_session
@api_error_handler
def new_task():
    """Criar uma nova tarefa"""
    current_user = get_jwt_identity()
    data = request.get_json()
    # A validação dos campos é feita pelo Pydantic no serviço
    return create_task(data, current_user)


@bp.route('/tasks/<int:task_id>/notes', methods=['POST'])
@jwt_required()
@token_required
@require_permission("tasks.manage")
@set_session
@api_error_handler
def add_note(task_id):
    """Adicionar nota a uma tarefa"""
    current_user = get_jwt_identity()
    data = request.json
    # A validação do campo 'memo' é feita pelo Pydantic no serviço
    with db_session_manager(current_user):
        return add_task_note(task_id, data, current_user)


@bp.route('/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission("tasks.manage")
@set_session
@api_error_handler
def update_task_route(task_id):
    """Atualizar detalhes de uma tarefa"""
    current_user = get_jwt_identity()
    data = request.get_json()
    # A validação dos campos é feita pelo Pydantic no serviço
    return update_task(task_id, data, current_user)


@bp.route('/tasks/<int:task_id>/close', methods=['POST'])
@jwt_required()
@token_required
@require_permission("tasks.manage")
@set_session
@api_error_handler
def close_task_route(task_id):
    """Fechar uma tarefa"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return close_task(task_id, current_user)


@bp.route('/tasks/<int:task_id>/status', methods=['PUT'])
@jwt_required()
@token_required
@require_permission("tasks.manage")
@set_session
@api_error_handler
def update_task_status_route(task_id):
    """Atualizar status de uma tarefa"""
    current_user = get_jwt_identity()
    user_id = get_jwt()["user_id"]
    data = request.json
    status_id = data.get('status_id')

    if status_id is None:
        return jsonify({"error": "status_id is required"}), 400

    with db_session_manager(current_user):
        return update_task_status(task_id, status_id, user_id, current_user)


@bp.route('/tasks/<int:task_id>/history', methods=['GET'])
@jwt_required()
@token_required
@require_permission("tasks.all")
@set_session
@api_error_handler
def get_task_history_route(task_id):
    """Consultar histórico de notas de uma tarefa"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return get_task_history(task_id, current_user)


@bp.route('/tasks/<int:task_id>/notification', methods=['PUT'])
@jwt_required()
@token_required
@require_permission("tasks.manage")
@set_session
@api_error_handler
def update_task_notification(task_id):
    """Atualiza a notificação da tarefa (por exemplo, marca como lida)."""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return update_task_note_notification(task_id, current_user)


@bp.route('/notifications', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_notifications():
    """Obter a contagem de notificações não lidas."""
    current_user = get_jwt_identity()
    user_id = get_jwt()["user_id"]
    with db_session_manager(current_user):
        count = get_notification_count(current_user, user_id)
        return {"count": count}
