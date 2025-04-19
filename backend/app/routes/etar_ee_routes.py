from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services.etar_ee_service import (
    create_etar_document,
    create_ee_document, 
    create_etar_volume,
    create_ee_volume,
    list_etar_volumes,
    list_ee_volumes,
    create_etar_energy,
    create_ee_energy,
    list_etar_energy,
    list_ee_energy,
    create_etar_expense,
    create_ee_expense,
    create_rede_expense,
    create_ramal_expense,
    list_etar_expenses,
    list_ee_expenses,
    list_rede_expenses,
    list_ramal_expenses,
    get_etar_details_by_pk,
    get_ee_details_by_pk,
    list_manut_expenses,
    create_manut_expense,
    create_equip_expense,
    list_equip_expenses,
    )
from ..utils.utils import set_session, token_required
from app.utils.error_handler import api_error_handler


bp = Blueprint('etar_ee_routes', __name__)


@bp.route('/etar_maintenance/<int:pk>', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def create_etar(pk):
    """Criar documento para ETAR"""
    current_user = get_jwt_identity()
    result, status_code = create_etar_document(pk, current_user)
    return jsonify(result), status_code


@bp.route('/ee_maintenance/<int:pk>', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def create_ee(pk):
    """Criar documento para EE"""
    current_user = get_jwt_identity()
    result, status_code = create_ee_document(pk, current_user)
    return jsonify(result), status_code


@bp.route('/etar_volume', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def add_etar_volume():
    """Registar volume de ETAR"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnpk = data.get('pnpk')
    pndate = data.get('pndate')
    pnval = data.get('pnval')
    pnspot = data.get('pnspot')
    result, status_code = create_etar_volume(
        pnpk, pndate, pnval, pnspot, current_user)
    return jsonify(result), status_code


@bp.route('/ee_volume', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def add_ee_volume():
    """Registar volume de EE"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnpk = data.get('pnpk')
    pndate = data.get('pndate')
    pnval = data.get('pnval')
    pnspot = data.get('pnspot')
    result, status_code = create_ee_volume(
        pnpk, pndate, pnval, pnspot, current_user)
    return jsonify(result), status_code


@bp.route('/etar_volumes/<int:tb_etar>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_etar_volumes(tb_etar):
    """Listar volumes de ETAR para uma ETAR específica"""
    current_user = get_jwt_identity()
    result, status_code = list_etar_volumes(tb_etar, current_user)
    return jsonify(result), status_code


@bp.route('/ee_volumes/<int:tb_ee>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_ee_volumes(tb_ee):
    """Listar volumes de EE para uma EE específica"""
    current_user = get_jwt_identity()
    result, status_code = list_ee_volumes(tb_ee, current_user)
    return jsonify(result), status_code


@bp.route('/etar_energy', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def add_etar_energy():
    """Registar energia de ETAR"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnpk = data.get('pnpk')
    pndate = data.get('pndate')
    pnval_vazio = data.get('pnval_vazio')
    pnval_ponta = data.get('pnval_ponta')
    pnval_cheia = data.get('pnval_cheia')
    result, status_code = create_etar_energy(
        pnpk, pndate, pnval_vazio, pnval_ponta, pnval_cheia, current_user)
    return jsonify(result), status_code


@bp.route('/ee_energy', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def add_ee_energy():
    """Registar energia de EE"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnpk = data.get('pnpk')
    pndate = data.get('pndate')
    pnval_vazio = data.get('pnval_vazio')
    pnval_ponta = data.get('pnval_ponta')
    pnval_cheia = data.get('pnval_cheia')
    result, status_code = create_ee_energy(
        pnpk, pndate, pnval_vazio, pnval_ponta, pnval_cheia, current_user)
    return jsonify(result), status_code


@bp.route('/etar_energy/<int:tb_etar>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_etar_energy(tb_etar):
    """Listar energia de ETAR para uma ETAR específica"""
    current_user = get_jwt_identity()
    result, status_code = list_etar_energy(tb_etar, current_user)
    return jsonify(result), status_code


@bp.route('/ee_energy/<int:tb_ee>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_ee_energy(tb_ee):
    """Listar energia de EE para uma EE específica"""
    current_user = get_jwt_identity()
    result, status_code = list_ee_energy(tb_ee, current_user)
    return jsonify(result), status_code


@bp.route('/etar_expense', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def add_etar_expense():
    """Registar despesa em ETAR"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pntt_expensedest = data.get('pntt_expensedest')
    pndate = data.get('pndate')
    pnval = data.get('pnval')
    pntt_etar = data.get('pntt_etar')
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    result, status_code = create_etar_expense(
        pntt_expensedest, pndate, pnval, pntt_etar, pnts_associate, pnmemo, current_user)
    return jsonify(result), status_code


@bp.route('/ee_expense', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def add_ee_expense():
    """Registar despesa em EE"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pntt_expensedest = data.get('pntt_expensedest')
    pndate = data.get('pndate')
    pnval = data.get('pnval')
    pntt_ee = data.get('pntt_ee')
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    result, status_code = create_ee_expense(
        pntt_expensedest, pndate, pnval, pntt_ee, pnts_associate, pnmemo, current_user)
    return jsonify(result), status_code


@bp.route('/rede_expense', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def add_rede_expense():
    """Registar despesa na rede"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pntt_expensedest = data.get('pntt_expensedest')
    pndate = data.get('pndate')
    pnval = data.get('pnval')
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    result, status_code = create_rede_expense(
        pntt_expensedest, pndate, pnval, pnts_associate, pnmemo, current_user)
    return jsonify(result), status_code


@bp.route('/ramal_expense', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def add_ramal_expense():
    """Registar despesa no ramal"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pntt_expensedest = data.get('pntt_expensedest')
    pndate = data.get('pndate')
    pnval = data.get('pnval')
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    result, status_code = create_ramal_expense(
        pntt_expensedest, pndate, pnval, pnts_associate, pnmemo, current_user)
    return jsonify(result), status_code


@bp.route('/etar_expenses/<int:tb_etar>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_etar_expenses(tb_etar):
    """Listar despesas para uma ETAR específica"""
    current_user = get_jwt_identity()
    result, status_code = list_etar_expenses(tb_etar, current_user)
    return jsonify(result), status_code


@bp.route('/ee_expenses/<int:tb_ee>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_ee_expenses(tb_ee):
    """Listar despesas para uma EE específica"""
    current_user = get_jwt_identity()
    result, status_code = list_ee_expenses(tb_ee, current_user)
    return jsonify(result), status_code


@bp.route('/rede_expenses', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_rede_expenses():
    """Listar despesas para a rede"""
    current_user = get_jwt_identity()
    result, status_code = list_rede_expenses(current_user)
    return jsonify(result), status_code


@bp.route('/ramal_expenses', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_ramal_expenses():
    """Listar despesas para os ramais"""
    current_user = get_jwt_identity()
    result, status_code = list_ramal_expenses(current_user)
    return jsonify(result), status_code


@bp.route('/manut_expenses', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_manut_expenses():
    """Listar despesas de manutenção"""
    current_user = get_jwt_identity()
    result, status_code = list_manut_expenses(current_user)
    return jsonify(result), status_code


@bp.route('/manut_expense', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def created_manut_expense():
    """Criar uma despesa de manutenção"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pntt_expensedest = data.get('pntt_expensedest')
    pndate = data.get('pndate')
    pnval = data.get('pnval')
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    result, status_code = create_manut_expense(
        pntt_expensedest, pndate, pnval, pnts_associate, pnmemo, current_user)
    return jsonify(result), status_code


@bp.route('/etar_details/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_etar_details(pk):
    """
    Obter detalhes de uma ETAR específica pela PK.
    """
    current_user = get_jwt_identity()
    result, status_code = get_etar_details_by_pk(current_user, pk)
    return jsonify(result), status_code


@bp.route('/ee_details/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_ee_details(pk):
    """
    Obter detalhes de uma EE específica pela PK.
    """
    current_user = get_jwt_identity()
    result, status_code = get_ee_details_by_pk(current_user, pk)
    return jsonify(result), status_code


@bp.route('/equip_expense', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def add_equip_expense():
    """Registar despesa de Equipamento"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pntt_expensedest = data.get('pntt_expensedest')
    pndate = data.get('pndate')
    pnval = data.get('pnval')
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')

    result, status_code = create_equip_expense(
        pntt_expensedest, pndate, pnval, pnts_associate, pnmemo, current_user
    )
    return jsonify(result), status_code


@bp.route('/equip_expenses', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_equip_expenses():
    """Listar despesas de Equipamento"""
    current_user = get_jwt_identity()
    result, status_code = list_equip_expenses(current_user)
    return jsonify(result), status_code
