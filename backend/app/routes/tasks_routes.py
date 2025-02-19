from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services.tasks_service import (
    list_tasks,
    create_task,
    add_task_note,
    update_task,
    close_task,
    update_task_status,
    get_task_history,
    update_task_note_notification,
)
from ..utils.utils import token_required, set_session, db_session_manager

bp = Blueprint('tasks_routes', __name__)


@bp.route('/tasks', methods=['GET'])
@jwt_required()
@token_required
@set_session
def get_tasks():
    """Listar todas as tarefas ativas"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return list_tasks(current_user)


@bp.route('/tasks', methods=['POST'])
@jwt_required()
@token_required
@set_session
def new_task():
    """Criar uma nova tarefa"""
    current_user = get_jwt_identity()
    data = request.json

    # Validate required fields
    required_fields = ['name', 'ts_client', 'ts_priority']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    return create_task(
        name=data['name'],
        ts_client=data['ts_client'],
        ts_priority=data['ts_priority'],
        memo=data.get('memo', ''),
        current_user=current_user
    )


@bp.route('/tasks/<int:task_id>/notes', methods=['POST'])
@jwt_required()
@token_required
@set_session
def add_note(task_id):
    """Adicionar nota a uma tarefa"""
    current_user = get_jwt_identity()
    data = request.json
    memo = data.get('memo')
    if not memo:
        return jsonify({"error": "Memo is required"}), 400

    with db_session_manager(current_user):
        return add_task_note(task_id, memo, current_user)


@bp.route('/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
@token_required
@set_session
def update_task_route(task_id):
    """Atualizar detalhes de uma tarefa"""
    current_user = get_jwt_identity()
    data = request.json

    # Validate required fields
    required_fields = ['name', 'ts_client', 'ts_priority']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    return update_task(
        task_id=task_id,
        name=data['name'],
        ts_client=data['ts_client'],
        ts_priority=data['ts_priority'],
        memo=data.get('memo', ''),
        current_user=current_user
    )


@bp.route('/tasks/<int:task_id>/close', methods=['POST'])
@jwt_required()
@token_required
@set_session
def close_task_route(task_id):
    """Fechar uma tarefa"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return close_task(task_id, current_user)


@bp.route('/tasks/<int:task_id>/status', methods=['PUT'])
@jwt_required()
@token_required
@set_session
def update_task_status_route(task_id):
    """Atualizar status de uma tarefa"""
    current_user = get_jwt_identity()
    data = request.json
    status_id = data.get('status_id')

    if status_id is None:
        return jsonify({"error": "status_id is required"}), 400

    with db_session_manager(current_user):
        return update_task_status(task_id, status_id, current_user)


@bp.route('/tasks/<int:task_id>/history', methods=['GET'])
@jwt_required()
@token_required
@set_session
def get_task_history_route(task_id):
    """Consultar histórico de notas de uma tarefa"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return get_task_history(task_id, current_user)


@bp.route('/tasks/<int:task_id>/notification', methods=['PUT'])
@jwt_required()
@token_required
@set_session
def update_task_notification(task_id):
    """Atualiza a notificação da tarefa (por exemplo, marca como lida)."""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return update_task_note_notification(task_id, current_user)
