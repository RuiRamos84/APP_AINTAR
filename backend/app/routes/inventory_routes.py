from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.utils import set_session, token_required
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from ..services.inventory_service import (
    list_inventory,
    add_inventory,
    update_inventory,
    delete_inventory
)

logger = get_logger(__name__)

bp = Blueprint('inventory_routes', __name__)

# ========================= LIST =========================
@bp.route('/inventory_list', methods=['GET'])
@jwt_required()          # exige token JWT
@token_required           # verifica token customizado
@require_permission(500)  # verifica permissão
@set_session              # cria/gera sessão
@api_error_handler        # captura erros e responde 
def list_inventory_route():
    current_user = get_jwt_identity()
    return list_inventory(current_user)


# ========================= CREATE =========================
@bp.route('/inventory_create', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def insert_inventory_route():
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return add_inventory(current_user, data)


# ========================= UPDATE =========================
@bp.route('/inventory_update/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def update_inventory_route(pk):
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return update_inventory(current_user, pk, data)


# ========================= DELETE =========================
@bp.route('/inventory_delete/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def delete_inventory_route(pk):
    current_user = get_jwt_identity()
    return delete_inventory(current_user, pk)