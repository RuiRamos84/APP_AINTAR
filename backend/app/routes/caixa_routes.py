from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from ..utils.utils import token_required, set_session, db_session_manager
from ..services.caixa_service import (
    list_movements, list_tipos, get_fecho_state, create_movement, update_movement, validate_fecho
)
from app.utils.logger import get_logger

logger = get_logger(__name__)
bp = Blueprint('caixa_routes', __name__)


def _get_user_client_pk():
    """Obtém o PK do utilizador atual (ts_client.pk) do JWT."""
    try:
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        if isinstance(user_id, dict):
            user_id = user_id.get('user_id')
        return int(user_id) if user_id else None
    except Exception:
        return None


@bp.route('/caixa/tipos', methods=['GET'])
@jwt_required()
@token_required
@require_permission('payments.caixa.view')
@set_session
@api_error_handler
def get_tipos():
    """
    Listar Tipos de Movimento de Caixa
    ---
    tags:
      - Caixa
    summary: Retorna todos os tipos de movimento disponíveis.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Lista de tipos retornada com sucesso.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return list_tipos(current_user)


@bp.route('/caixa/fecho-state', methods=['GET'])
@jwt_required()
@token_required
@require_permission('payments.caixa.view')
@set_session
@api_error_handler
def get_fecho_state_route():
    """
    Estado de rotação para o próximo fecho de caixa
    ---
    tags:
      - Caixa
    summary: Indica quem deve criar e validar o próximo fecho de caixa.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Estado de rotação retornado com sucesso.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return get_fecho_state(current_user)


@bp.route('/caixa', methods=['GET'])
@jwt_required()
@token_required
@require_permission('payments.caixa.view')
@set_session
@api_error_handler
def get_movements():
    """
    Listar Movimentos de Caixa
    ---
    tags:
      - Caixa
    summary: Retorna todos os movimentos de caixa com saldo cumulativo.
    security:
      - BearerAuth: []
    parameters:
      - name: date_from
        in: query
        type: string
        format: date
        required: false
      - name: date_to
        in: query
        type: string
        format: date
        required: false
    responses:
      200:
        description: Lista de movimentos e resumo retornados com sucesso.
    """
    current_user = get_jwt_identity()
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    with db_session_manager(current_user):
        return list_movements(current_user, date_from=date_from, date_to=date_to)


@bp.route('/caixa', methods=['POST'])
@jwt_required()
@token_required
@require_permission('payments.caixa.edit')
@set_session
@api_error_handler
def post_movement():
    """
    Registar Movimento de Caixa
    ---
    tags:
      - Caixa
    summary: Cria um novo movimento de caixa.
    security:
      - BearerAuth: []
    responses:
      201:
        description: Movimento registado com sucesso.
    """
    current_user = get_jwt_identity()
    user_client_pk = _get_user_client_pk()
    data = request.get_json()
    with db_session_manager(current_user):
        return create_movement(data, current_user, user_client_pk)


@bp.route('/caixa/<int:pk>/validar', methods=['POST'])
@jwt_required()
@token_required
@require_permission('payments.caixa.edit')
@set_session
@api_error_handler
def post_validar_fecho(pk):
    """
    Validar Fecho de Caixa
    ---
    tags:
      - Caixa
    summary: Regista a validação do fecho de caixa pelo segundo utilizador.
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Fecho validado com sucesso.
    """
    current_user = get_jwt_identity()
    user_client_pk = _get_user_client_pk()
    with db_session_manager(current_user):
        return validate_fecho(pk, user_client_pk, current_user)


@bp.route('/caixa/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('payments.caixa.edit')
@set_session
@api_error_handler
def put_movement(pk):
    """
    Atualizar Movimento de Caixa
    ---
    tags:
      - Caixa
    summary: Atualiza um movimento de caixa existente.
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Movimento atualizado com sucesso.
    """
    current_user = get_jwt_identity()
    user_client_pk = _get_user_client_pk()
    data = request.get_json()
    with db_session_manager(current_user):
        return update_movement(pk, data, current_user, user_client_pk)


