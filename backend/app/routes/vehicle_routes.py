from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.utils import set_session, token_required
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from ..services.vehicle_service import (
    list_vehicle,
    add_vehicle,
    update_vehicle,
   
    list_vehicle_assign,
    add_vehicle_assign,
    update_vehicle_assign,
    
    list_vehicle_maintenance,
    add_vehicle_maintenance,
    update_vehicle_maintenance,
    
)

logger = get_logger(__name__)
bp = Blueprint('vehicle_routes', __name__)

# ========================= VEHICLE LIST =========================
@bp.route('/vehicle_list', methods=['GET'])
@jwt_required()
@token_required
@require_permission(500)
@set_session
@api_error_handler
def list_vehicle_route():
    current_user = get_jwt_identity()
    return list_vehicle(current_user)

# ========================= VEHICLE CREATE =========================
@bp.route('/vehicle_create', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def add_vehicle_route():
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return add_vehicle(current_user, data)

# ========================= VEHICLE UPDATE =========================
@bp.route('/vehicle_update/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def update_vehicle_route(pk):
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return update_vehicle(current_user, pk, data)

# ========================= VEHICLE DELETE =========================


# ========================= VEHICLE ASSIGN LIST =========================
@bp.route('/vehicle_assign_list', methods=['GET'])
@jwt_required()
@token_required
@require_permission(500)
@set_session
@api_error_handler
def list_vehicle_assign_route():
    current_user = get_jwt_identity()
    return list_vehicle_assign(current_user)

# ========================= VEHICLE ASSIGN CREATE =========================
@bp.route('/vehicle_assign_create', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def add_vehicle_assign_route():
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return add_vehicle_assign(current_user, data)

# ========================= VEHICLE ASSIGN UPDATE =========================
@bp.route('/vehicle_assign_update/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def update_vehicle_assign_route(pk):
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return update_vehicle_assign(current_user, pk, data)

# ========================= VEHICLE ASSIGN DELETE =========================


# ========================= VEHICLE MAINTENANCE LIST =========================
@bp.route('/vehicle_maintenance_list', methods=['GET'])
@jwt_required()
@token_required
@require_permission(500)
@set_session
@api_error_handler
def list_vehicle_maintenance_route():
    current_user = get_jwt_identity()
    return list_vehicle_maintenance(current_user)

# ========================= VEHICLE MAINTENANCE CREATE =========================
@bp.route('/vehicle_maintenance_create', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def add_vehicle_maintenance_route():
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return add_vehicle_maintenance(current_user, data)

# ========================= VEHICLE MAINTENANCE UPDATE =========================
@bp.route('/vehicle_maintenance_update/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
#@require_permission(320)
@set_session
@api_error_handler
def update_vehicle_maintenance_route(pk):
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return update_vehicle_maintenance(current_user, pk,data)

# ========================= VEHICLE MAINTENANCE DELETE =========================
