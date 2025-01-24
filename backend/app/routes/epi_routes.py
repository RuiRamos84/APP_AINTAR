from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services.epi_service import (
    get_epi_deliveries,
    create_epi_delivery,
    update_epi_preferences,
)
from ..utils.utils import token_required, set_session, db_session_manager

bp = Blueprint('epi_routes', __name__)


@bp.route('/deliveries', methods=['GET'])
@jwt_required()
@token_required
@set_session
def get_epi_deliveries_route():
    """
    Listar entregas de EPI
    Permite buscar histórico completo ou filtrar por período/funcionário
    """
    try:
        current_user = get_jwt_identity()
        # Opcionalmente, pode aceitar query params para filtros
        filters = {
            'start_date': request.args.get('start_date'),
            'end_date': request.args.get('end_date'),
            'employee_id': request.args.get('employee_id')
        }
        with db_session_manager(current_user):
            return get_epi_deliveries(current_user, filters)
    except Exception as e:
        current_app.logger.error(f"Erro ao buscar entregas de EPI: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/delivery', methods=['POST'])
@jwt_required()
@token_required
@set_session
def create_epi_delivery_route():
    """Registrar nova entrega de EPI"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        with db_session_manager(current_user):
            return create_epi_delivery(data, current_user)
    except Exception as e:
        current_app.logger.error(f"Erro ao criar entrega de EPI: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/preferences/<int:user_pk>', methods=['PUT'])
@jwt_required()
@token_required
@set_session
def update_epi_preferences_route(user_pk):
    """Atualizar preferências de EPI do trabalhador"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        with db_session_manager(current_user):
            return update_epi_preferences(user_pk, data, current_user)
    except Exception as e:
        current_app.logger.error(
            f"Erro ao atualizar preferências de EPI: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.after_request
def cleanup_session(response):
    if hasattr(g, 'current_user'):
        delattr(g, 'current_user')
    if hasattr(g, 'current_session_id'):
        delattr(g, 'current_session_id')
    return response


# Registrar a função de limpeza de sessão
bp.after_request(cleanup_session)