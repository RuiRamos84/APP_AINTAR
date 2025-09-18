from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.permissions_decorator import require_permission
from ..services.epi_service import (
    create_epi,
    get_epi_deliveries,
    create_epi_delivery,
    update_epi_preferences,
    update_epi_delivery,
    return_epi_delivery,
)
from ..utils.utils import token_required, set_session, db_session_manager
from app.utils.error_handler import api_error_handler
from sqlalchemy import text

bp = Blueprint('epi_routes', __name__)


@bp.route('/deliveries', methods=['GET'])
@jwt_required()
@token_required
@require_permission("epi.manage")
@set_session
@api_error_handler
def get_epi_deliveries_route():
    """
    Listar entregas de EPI
    Permite buscar histórico completo ou filtrar por período/funcionário
    """
    current_user = get_jwt_identity()
    filters = {
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'employee_id': request.args.get('employee_id')
    }
    with db_session_manager(current_user):
        return get_epi_deliveries(current_user, filters)


@bp.route('/delivery', methods=['POST'])
@jwt_required()
@token_required
@require_permission("epi.manage")
@set_session
@api_error_handler
def create_epi_delivery_route():
    """Registrar nova entrega de EPI"""
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user):
        return create_epi_delivery(data, current_user)


@bp.route('/preferences/<int:user_pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission("epi.manage")
@set_session
@api_error_handler
def update_epi_preferences_route(user_pk):
    """Atualizar preferências de EPI do trabalhador"""
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user):
        return update_epi_preferences(user_pk, data, current_user)


@bp.route('/epi/data', methods=['GET'])
@jwt_required()
@api_error_handler
def get_epi_data():
    """Obtém dados de EPI"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        epi_list = session.execute(
            text("SELECT * FROM vbl_epi ORDER BY name")).mappings().all()
        shoe_types = session.execute(
            text("SELECT * FROM vbl_epishoetype ORDER BY pk")).mappings().all()
        what_types = session.execute(
            text("SELECT * FROM vbl_epiwhat ORDER BY pk")).mappings().all()

        return jsonify({
            'epi_list': [dict(row) for row in epi_list],
            'epi_shoe_types': [dict(row) for row in shoe_types],
            'epi_what_types': [dict(row) for row in what_types]
        }), 200


@bp.route('/epi/list', methods=['GET'])
@api_error_handler
def get_epi_list():
    """Obtém apenas a lista de EPIs"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        epi_list = session.execute(
            text("SELECT * FROM vbl_epi ORDER BY name")).mappings().all()
        return jsonify([dict(row) for row in epi_list]), 200


@bp.route('/delivery/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission("epi.manage")
@set_session
@api_error_handler
def update_epi_delivery_route(pk):
    """Atualizar entrega de EPI"""
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user):
        return update_epi_delivery(pk, data, current_user)


@bp.route('/delivery/<int:pk>/return', methods=['PUT'])
@jwt_required()
@token_required
@require_permission("epi.manage")
@set_session
@api_error_handler
def return_epi_delivery_route(pk):
    """Anular entrega de EPI"""
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user):
        return return_epi_delivery(pk, data, current_user)


@bp.route('/epi', methods=['POST'])
@jwt_required()
@token_required
@require_permission("epi.manage")
@set_session
@api_error_handler
def create_epi_route():
    """Criar novo colaborador EPI"""
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user):
        return create_epi(data, current_user)


@bp.after_request
@api_error_handler
def cleanup_session(response):
    if hasattr(g, 'current_user'):
        delattr(g, 'current_user')
    if hasattr(g, 'current_session_id'):
        delattr(g, 'current_session_id')
    return response


# Registrar a função de limpeza de sessão
bp.after_request(cleanup_session)