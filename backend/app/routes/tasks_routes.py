from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.utils.permissions_decorator import require_permission
from ..services.tasks_service import (
    list_tasks,
    create_task,
    add_task_note,
    update_task,
    close_task,
    reopen_task,
    update_task_status,
    get_task_history,
    get_notification_count,
    update_task_note_notification,
    bulk_task_action_service,
)
from ..utils.utils import token_required, set_session, db_session_manager
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger

logger = get_logger(__name__)



bp = Blueprint('tasks_routes', __name__)


@bp.route('/tasks', methods=['GET'])
@jwt_required()
@token_required
@require_permission(200)  # tasks.all
@set_session
@api_error_handler
def get_tasks():
    """
    Listar Todas as Tarefas
    ---
    tags:
      - Tarefas
    summary: Retorna a coleção de todas as tarefas ativas do utilizador autenticado (dependendo das permissões).
    security:
      - BearerAuth: []
    responses:
      200:
        description: Lista de tarefas retornada com sucesso.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return list_tasks(current_user)


@bp.route('/tasks', methods=['POST'])
@jwt_required()
@token_required
@require_permission(750)  # tasks.manage
@set_session
@api_error_handler
def new_task():
    """
    Criar Nova Tarefa
    ---
    tags:
      - Tarefas
    summary: Regista uma nova tarefa no sistema (Pydantic validado no Serviço).
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
        description: Tarefa criada.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    # A validação dos campos é feita pelo Pydantic no serviço
    return create_task(data, current_user)


@bp.route('/tasks/bulk-action', methods=['POST'])
@jwt_required()
@token_required
@require_permission(750)  # tasks.manage
@set_session
@api_error_handler
def bulk_task_action():
    """
    Ação em Massa sobre Tarefas
    ---
    tags:
      - Tarefas
    summary: Executa close, reopen, status ou priority sobre um conjunto de tarefas.
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
          properties:
            task_ids:
              type: array
              items:
                type: integer
            action:
              type: string
              enum: [close, reopen, status, priority]
            status_id:
              type: integer
            priority_id:
              type: integer
    responses:
      200:
        description: Resultado da ação em massa com listas de succeeded e failed.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    return bulk_task_action_service(data, current_user)


@bp.route('/tasks/<int:task_id>/notes', methods=['POST'])
@jwt_required()
@token_required
@require_permission(750)  # tasks.manage
@set_session
@api_error_handler
def add_note(task_id):
    """
    Adicionar Nota à Tarefa
    ---
    tags:
      - Tarefas
    summary: Anexa uma anotação de Follow-up (Memo) a uma tarefa existente.
    security:
      - BearerAuth: []
    parameters:
      - name: task_id
        in: path
        type: integer
        required: true
      - in: body
        name: note_data
        required: true
        schema:
          type: object
    responses:
      200:
        description: Nota anexada.
    """
    current_user = get_jwt_identity()
    data = request.json
    # A validação do campo 'memo' é feita pelo Pydantic no serviço
    with db_session_manager(current_user):
        return add_task_note(task_id, data, current_user)


@bp.route('/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(750)  # tasks.manage
@set_session
@api_error_handler
def update_task_route(task_id):
    """
    Atualizar Tarefa
    ---
    tags:
      - Tarefas
    summary: Edita os atributos de configuração de uma determinada tarefa.
    security:
      - BearerAuth: []
    parameters:
      - name: task_id
        in: path
        type: integer
        required: true
      - in: body
        name: update_data
        required: true
        schema:
          type: object
    responses:
      200:
        description: Tarefa Modificada.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    # A validação dos campos é feita pelo Pydantic no serviço
    return update_task(task_id, data, current_user)


@bp.route('/tasks/<int:task_id>/close', methods=['POST'])
@jwt_required()
@token_required
@require_permission(750)  # tasks.manage
@set_session
@api_error_handler
def close_task_route(task_id):
    """
    Concluir / Fechar Tarefa
    ---
    tags:
      - Tarefas
    summary: Altera o estado da tarefa para Concluída (Closed).
    security:
      - BearerAuth: []
    parameters:
      - name: task_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Tarefa fechada.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return close_task(task_id, current_user)


@bp.route('/tasks/<int:task_id>/reopen', methods=['POST'])
@jwt_required()
@token_required
@require_permission(750)  # tasks.manage
@set_session
@api_error_handler
def reopen_task_route(task_id):
    """
    Reabrir Tarefa Antiga
    ---
    tags:
      - Tarefas
    summary: Restaura uma tarefa previamente fechada para o modo ativo.
    security:
      - BearerAuth: []
    parameters:
      - name: task_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Tarefa reaberta.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return reopen_task(task_id, current_user)


@bp.route('/tasks/<int:task_id>/status', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(750)  # tasks.manage
@set_session
@api_error_handler
def update_task_status_route(task_id):
    """
    Atualizar Status de Workflow
    ---
    tags:
      - Tarefas
    summary: Altera a label de progresso de uma tarefa específica.
    security:
      - BearerAuth: []
    parameters:
      - name: task_id
        in: path
        type: integer
        required: true
      - in: body
        name: status_payload
        required: true
        schema:
          type: object
          properties:
            status_id:
              type: integer
    responses:
      200:
        description: Estado atualizado.
    """
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
@require_permission(200)  # tasks.all
@set_session
@api_error_handler
def get_task_history_route(task_id):
    """
    Timeline / Histórico da Tarefa
    ---
    tags:
      - Tarefas
    summary: Visualizar todos os eventos (criação, anotações, status updates) de uma tarefa.
    security:
      - BearerAuth: []
    parameters:
      - name: task_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Histórico carregado.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return get_task_history(task_id, current_user)


@bp.route('/tasks/<int:task_id>/notification', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(750)  # tasks.manage
@set_session
@api_error_handler
def update_task_notification(task_id):
    """
    Marcar Notificação como Lida
    ---
    tags:
      - Tarefas
    summary: Oculta a flag de notificação visual do utilizador.
    security:
      - BearerAuth: []
    parameters:
      - name: task_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Flag Lida aplicada.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return update_task_note_notification(task_id, current_user)


@bp.route('/notifications', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_notifications():
    """
    Contagem de Notificações Unread
    ---
    tags:
      - Tarefas
    summary: Pede a Badge notification count para o header da UI.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Devolve 'count' (Inteiro).
    """
    current_user = get_jwt_identity()
    user_id = get_jwt()["user_id"]
    with db_session_manager(current_user):
        count = get_notification_count(current_user, user_id)
        return {"count": count}
