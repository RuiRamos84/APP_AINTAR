from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ..services.notification_service import (
    get_notifications,
    get_notifications_count,
    add_notification,
    delete_notifications,
    update_notification_status
)
from ..utils.utils import db_session_manager

bp = Blueprint('notification_routes', __name__)


@bp.route('/notifications/count', methods=['GET'])
@jwt_required()
def get_notifications_count_route():
    jwt_data = get_jwt()
    user_id = jwt_data.get('user_id')

    with db_session_manager(jwt_data.get('session_id')):
        result = get_notifications_count(user_id)
        if 'error' in result:
            return jsonify(result), 500
        return jsonify(result), 200


@bp.route('/notification', methods=['GET', 'POST', 'DELETE'])
@jwt_required()
def handle_notifications():
    jwt_data = get_jwt()
    session_id = jwt_data.get('session_id')
    user_id = jwt_data.get('user_id')

    if request.method == 'GET':
        """Obtém as notificações do utilizador."""
        with db_session_manager(session_id):
            # Implemente esta função para retornar as notificações completas
            result = get_notifications(user_id)
            if isinstance(result, str) and result.startswith("Erro"):
                return jsonify({'error': result}), 400
            return jsonify({'notifications': result}), 200

    elif request.method == 'POST':
        """Adiciona uma notificação ao utilizador."""
        data = request.json
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id é obrigatório'}), 400
        with db_session_manager(session_id):
            result = add_notification(user_id)
            if isinstance(result, str) and result.startswith("Erro"):
                return jsonify({'error': result}), 400
            return jsonify({'adicionada ': result}), 200

    elif request.method == 'DELETE':
        """Remove as notificações do utilizador."""
        data = request.json
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id é obrigatório'}), 400
        with db_session_manager(session_id):
            result = delete_notifications(user_id)
            if isinstance(result, str) and result.startswith("Erro"):
                return jsonify({'error': result}), 400
            return jsonify({'removida': result}), 200


@bp.route('/notification/<int:document_id>', methods=['PUT'])
@jwt_required()
def update_notification(document_id):
    """Atualiza o status de notificação de um documento específico."""
    jwt_data = get_jwt()
    session_id = jwt_data.get('session_id')

    data = request.json
    new_status = data.get('status')

    if new_status is None:
        return jsonify({'error': 'status é obrigatório'}), 400

    with db_session_manager(session_id):
        result = update_notification_status(document_id, new_status)
        if isinstance(result, str) and result.startswith("Erro"):
            return jsonify({'error': result}), 400
        return jsonify({'message': result}), 200
