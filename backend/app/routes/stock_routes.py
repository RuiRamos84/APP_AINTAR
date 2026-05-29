from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from ..utils.utils import token_required, set_session
from ..services.stock_service import (
    list_stock_types, list_units,
    list_stock_items, create_stock_item, update_stock_item, delete_stock_item,
    list_stock_current,
    list_stock_in, create_stock_in, update_stock_in, delete_stock_in,
    list_stock_out, create_stock_out, update_stock_out, delete_stock_out,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)
bp = Blueprint('stock_routes', __name__)

VIEW = 'stock.view'
MANAGE = 'stock.manage'


def _json():
    data = request.get_json()
    if not data:
        return None
    return data


# ─── Metadata ────────────────────────────────────────────────────────────────

@bp.route('/stock/types', methods=['GET'])
@jwt_required()
@token_required
@require_permission(VIEW)
@set_session
@api_error_handler
def get_types():
    return list_stock_types(get_jwt_identity())


@bp.route('/stock/units', methods=['GET'])
@jwt_required()
@token_required
@require_permission(VIEW)
@set_session
@api_error_handler
def get_units():
    return list_units(get_jwt_identity())


# ─── Stock Atual ─────────────────────────────────────────────────────────────

@bp.route('/stock/current', methods=['GET'])
@jwt_required()
@token_required
@require_permission(VIEW)
@set_session
@api_error_handler
def get_stock_current():
    return list_stock_current(get_jwt_identity())


# ─── Artigos ─────────────────────────────────────────────────────────────────

@bp.route('/stock/items', methods=['GET'])
@jwt_required()
@token_required
@require_permission(VIEW)
@set_session
@api_error_handler
def get_items():
    return list_stock_items(get_jwt_identity())


@bp.route('/stock/items', methods=['POST'])
@jwt_required()
@token_required
@require_permission(MANAGE)
@set_session
@api_error_handler
def post_item():
    data = _json()
    if not data:
        return {'error': 'Body inválido ou vazio.'}, 400
    return create_stock_item(get_jwt_identity(), data)


@bp.route('/stock/items/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(MANAGE)
@set_session
@api_error_handler
def put_item(pk):
    data = _json()
    if not data:
        return {'error': 'Body inválido ou vazio.'}, 400
    return update_stock_item(get_jwt_identity(), pk, data)


@bp.route('/stock/items/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission(MANAGE)
@set_session
@api_error_handler
def delete_item(pk):
    return delete_stock_item(get_jwt_identity(), pk)


# ─── Entradas ────────────────────────────────────────────────────────────────

@bp.route('/stock/in', methods=['GET'])
@jwt_required()
@token_required
@require_permission(VIEW)
@set_session
@api_error_handler
def get_in():
    return list_stock_in(get_jwt_identity())


@bp.route('/stock/in', methods=['POST'])
@jwt_required()
@token_required
@require_permission(MANAGE)
@set_session
@api_error_handler
def post_in():
    data = _json()
    if not data:
        return {'error': 'Body inválido ou vazio.'}, 400
    return create_stock_in(get_jwt_identity(), data)


@bp.route('/stock/in/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(MANAGE)
@set_session
@api_error_handler
def put_in(pk):
    data = _json()
    if not data:
        return {'error': 'Body inválido ou vazio.'}, 400
    return update_stock_in(get_jwt_identity(), pk, data)


@bp.route('/stock/in/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission(MANAGE)
@set_session
@api_error_handler
def delete_in(pk):
    return delete_stock_in(get_jwt_identity(), pk)


# ─── Saídas ──────────────────────────────────────────────────────────────────

@bp.route('/stock/out', methods=['GET'])
@jwt_required()
@token_required
@require_permission(VIEW)
@set_session
@api_error_handler
def get_out():
    return list_stock_out(get_jwt_identity())


@bp.route('/stock/out', methods=['POST'])
@jwt_required()
@token_required
@require_permission(MANAGE)
@set_session
@api_error_handler
def post_out():
    data = _json()
    if not data:
        return {'error': 'Body inválido ou vazio.'}, 400
    return create_stock_out(get_jwt_identity(), data)


@bp.route('/stock/out/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(MANAGE)
@set_session
@api_error_handler
def put_out(pk):
    data = _json()
    if not data:
        return {'error': 'Body inválido ou vazio.'}, 400
    return update_stock_out(get_jwt_identity(), pk, data)


@bp.route('/stock/out/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission(MANAGE)
@set_session
@api_error_handler
def delete_out(pk):
    return delete_stock_out(get_jwt_identity(), pk)
