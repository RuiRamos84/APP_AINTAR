from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.utils import set_session, token_required
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from ..services.obras_service import (
    list_obras,
    list_obras_by_instalacao,
    create_obra,
    update_obra,
    delete_obra,
)

logger = get_logger(__name__)

bp = Blueprint('obras_routes', __name__)


# ========================= LIST ALL =========================
@bp.route('/obras_list', methods=['GET'])
@jwt_required()
@token_required
@require_permission('obras.view')  # ts_interface: obras.view
@set_session
@api_error_handler
def list_obras_route():
    current_user = get_jwt_identity()
    return list_obras(current_user)


# ========================= LIST BY INSTALACAO =========================
@bp.route('/obras_list/<int:tb_instalacao>', methods=['GET'])
@jwt_required()
@token_required
@require_permission('obras.view')  # ts_interface: obras.view
@set_session
@api_error_handler
def list_obras_instalacao_route(tb_instalacao):
    current_user = get_jwt_identity()
    return list_obras_by_instalacao(current_user, tb_instalacao)


# ========================= CREATE =========================
@bp.route('/obra_create', methods=['POST'])
@jwt_required()
@token_required
@require_permission('obras.edit')  # ts_interface: obras.edit
@set_session
@api_error_handler
def create_obra_route():
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    return create_obra(current_user, data)


# ========================= UPDATE =========================
@bp.route('/obra_update/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('obras.edit')  # ts_interface: obras.edit
@set_session
@api_error_handler
def update_obra_route(pk):
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    return update_obra(current_user, pk, data)


# ========================= DELETE =========================
@bp.route('/obra_delete/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('obras.edit')  # ts_interface: obras.edit
@set_session
@api_error_handler
def delete_obra_route(pk):
    current_user = get_jwt_identity()
    return delete_obra(current_user, pk)
