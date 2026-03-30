from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.utils import set_session, token_required
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from ..services.obra_despesa_service import list_obra_despesas, list_obra_despesas_by_instalacao, create_obra_despesa, update_obra_despesa

logger = get_logger(__name__)

bp = Blueprint('obra_despesa_routes', __name__)


@bp.route('/obra_despesa_list_by_instalacao/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission('obras.view')  # ts_interface: obras.view
@set_session
@api_error_handler
def list_obra_despesas_by_instalacao_route(pk):
    current_user = get_jwt_identity()
    return list_obra_despesas_by_instalacao(current_user, pk)


@bp.route('/obra_despesa_list', methods=['GET'])
@jwt_required()
@token_required
@require_permission('obras.view')  # ts_interface: obras.view
@set_session
@api_error_handler
def list_obra_despesas_route():
    current_user = get_jwt_identity()
    return list_obra_despesas(current_user)


@bp.route('/obra_despesa_create', methods=['POST'])
@jwt_required()
@token_required
@require_permission('obras.edit')  # ts_interface: obras.edit
@set_session
@api_error_handler
def create_obra_despesa_route():
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    return create_obra_despesa(current_user, data)


@bp.route('/obra_despesa_update/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('obras.edit')  # ts_interface: obras.edit
@set_session
@api_error_handler
def update_obra_despesa_route(pk):
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    return update_obra_despesa(current_user, pk, data)
