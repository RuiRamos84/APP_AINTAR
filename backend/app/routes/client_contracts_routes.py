from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.client_contracts_service import (
    list_contracts, get_contract, create_contract,
    update_contract, delete_contract, list_contract_frequencies,
    list_contract_payments, create_contract_payment, update_contract_payment, delete_contract_payment
)
from app.utils.utils import set_session, token_required
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from flask import g

bp = Blueprint('client_contracts', __name__)

@bp.route('/clients/contracts', methods=['GET'])
@jwt_required()
@token_required
@require_permission(880) # payments.view ou entities.view
@set_session
@api_error_handler
def get_contracts_list():
    entity_id = request.args.get('entity_id', type=int)
    current_user = get_jwt_identity()
    return list_contracts(entity_id, current_user)

@bp.route('/clients/contracts/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(880)
@set_session
@api_error_handler
def get_contract_detail(pk):
    current_user = get_jwt_identity()
    return get_contract(pk, current_user)

@bp.route('/clients/contracts', methods=['POST'])
@jwt_required()
@token_required
@require_permission(890) # payments.manage
@set_session
@api_error_handler
def add_contract():
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_contract(data, current_user)

@bp.route('/clients/contracts/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(890) # payments.manage
@set_session
@api_error_handler
def edit_contract(pk):
    current_user = get_jwt_identity()
    data = request.get_json()
    return update_contract(pk, data, current_user)

@bp.route('/clients/contracts/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission(890) # payments.manage
@set_session
@api_error_handler
def remove_contract(pk):
    current_user = get_jwt_identity()
    return delete_contract(pk, current_user)

@bp.route('/lookup/contract-frequencies', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_contract_frequencies():
    current_user = get_jwt_identity()
    return list_contract_frequencies(current_user)

@bp.route('/clients/contracts/<int:contract_id>/payments', methods=['GET'])
@jwt_required()
@token_required
@require_permission(880) # payments.view ou entities.view
@set_session
@api_error_handler
def get_contract_payments(contract_id):
    current_user = get_jwt_identity()
    return list_contract_payments(contract_id, current_user)

@bp.route('/clients/contracts/<int:contract_id>/payments', methods=['POST'])
@jwt_required()
@token_required
@require_permission(890) # payments.manage
@set_session
@api_error_handler
def add_contract_payment(contract_id):
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_contract_payment(contract_id, data, current_user)

@bp.route('/clients/contracts/payments/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(890) # payments.manage
@set_session
@api_error_handler
def edit_contract_payment(pk):
    current_user = get_jwt_identity()
    data = request.get_json()
    return update_contract_payment(pk, data, current_user)

@bp.route('/clients/contracts/payments/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission(890) # payments.manage
@set_session
@api_error_handler
def remove_contract_payment(pk):
    current_user = get_jwt_identity()
    return delete_contract_payment(pk, current_user)

@bp.after_request
@api_error_handler
def cleanup_session(response):
    if hasattr(g, 'current_user'):
        delattr(g, 'current_user')
    if hasattr(g, 'current_session_id'):
        delattr(g, 'current_session_id')
    return response
