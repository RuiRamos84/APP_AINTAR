from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services.etar_ee_service import (
    create_etar_document,
    create_ee_document,
    # Funções unificadas - novas
    create_instalacao_volume,
    create_instalacao_water_volume,
    create_instalacao_energy,
    create_instalacao_expense,
    list_instalacao_volumes,
    list_instalacao_water_volumes,
    list_instalacao_energy,
    list_instalacao_expenses,
    create_instalacao_desmatacao,
    create_instalacao_retirada_lamas,
    create_instalacao_reparacao,
    create_instalacao_vedacao,
    create_instalacao_qualidade_ambiental,
    # Funções compatibilidade - antigas
    create_etar_volume,
    create_ee_volume,
    list_etar_volumes,
    list_ee_volumes,
    create_water_etar_volume,
    create_water_ee_volume,
    list_etar_water_volumes,
    list_ee_water_volumes,
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
    create_etar_desmatacao,
    create_etar_retirada_lamas,
    create_etar_reparacao,
    create_etar_vedacao,
    create_etar_qualidade_ambiental,
    create_ee_desmatacao,
    create_ee_retirada_lamas,
    create_ee_reparacao,
    create_ee_vedacao,
    create_ee_qualidade_ambiental,
    create_rede_desobstrucao,
    create_rede_reparacao_colapso,
    create_caixa_desobstrucao,
    create_caixa_reparacao,
    create_caixa_reparacao_tampa,
    create_ramal_desobstrucao,
    create_ramal_reparacao,
    create_requisicao_interna,
    update_etar_details,
    update_ee_details,
    create_etar_incumprimento,
    list_etar_incumprimentos,
    create_instalacao_incumprimento
)
from ..utils.utils import set_session, token_required
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler


bp = Blueprint('etar_ee_routes', __name__)


# ==================== ROTAS UNIFICADAS - NOVAS ====================

@bp.route('/instalacao_volume', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_instalacao_volume():
    """Registar volume de instalação (ETAR ou EE)"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_instalacao_volume(data.get('pnpk'), data, current_user)


@bp.route('/instalacao_volumes/<int:tb_instalacao>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_instalacao_volumes(tb_instalacao):
    """Listar volumes de uma instalação"""
    current_user = get_jwt_identity()
    result, status_code = list_instalacao_volumes(tb_instalacao, current_user)
    return jsonify(result), status_code


@bp.route('/instalacao_water_volume', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_instalacao_water_volume():
    """Registar volume de água de instalação"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_instalacao_water_volume(data.get('pnpk'), data, current_user)


@bp.route('/instalacao_water_volumes/<int:tb_instalacao>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_instalacao_water_volumes(tb_instalacao):
    """Listar volumes de água de uma instalação"""
    current_user = get_jwt_identity()
    result, status_code = list_instalacao_water_volumes(
        tb_instalacao, current_user)
    return jsonify(result), status_code


@bp.route('/instalacao_energy', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_instalacao_energy():
    """Registar energia de instalação"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_instalacao_energy(data.get('pnpk'), data, current_user)


@bp.route('/instalacao_energy/<int:tb_instalacao>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_instalacao_energy(tb_instalacao):
    """Listar energia de uma instalação"""
    current_user = get_jwt_identity()
    result, status_code = list_instalacao_energy(tb_instalacao, current_user)
    return jsonify(result), status_code


@bp.route('/instalacao_expense', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_instalacao_expense():
    """Registar despesa em instalação"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_instalacao_expense(data, current_user)


@bp.route('/instalacao_expenses/<int:tb_instalacao>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_instalacao_expenses(tb_instalacao):
    """Listar despesas de uma instalação"""
    current_user = get_jwt_identity()
    result, status_code = list_instalacao_expenses(tb_instalacao, current_user)
    return jsonify(result), status_code


# Documentos unificados
@bp.route('/instalacao/desmatacao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_instalacao_desmatacao():
    """Criar pedido de desmatação para instalação"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_instalacao = data.get('pnpk_instalacao')

    if not all([pnmemo, pnpk_instalacao]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_instalacao_desmatacao(
        pnts_associate, pnmemo, pnpk_instalacao, current_user)
    return jsonify(result), status_code


@bp.route('/instalacao/retirada_lamas', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_instalacao_retirada_lamas():
    """Criar pedido de retirada de lamas para instalação"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_instalacao = data.get('pnpk_instalacao')

    if not all([pnmemo, pnpk_instalacao]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_instalacao_retirada_lamas(
        pnts_associate, pnmemo, pnpk_instalacao, current_user)
    return jsonify(result), status_code


@bp.route('/instalacao/reparacao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_instalacao_reparacao():
    """Criar pedido de reparação para instalação"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_instalacao = data.get('pnpk_instalacao')

    if not all([pnmemo, pnpk_instalacao]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_instalacao_reparacao(
        pnts_associate, pnmemo, pnpk_instalacao, current_user)
    return jsonify(result), status_code


@bp.route('/instalacao/vedacao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_instalacao_vedacao():
    """Criar pedido de vedação para instalação"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_instalacao = data.get('pnpk_instalacao')

    if not all([pnmemo, pnpk_instalacao]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_instalacao_vedacao(
        pnts_associate, pnmemo, pnpk_instalacao, current_user)
    return jsonify(result), status_code


@bp.route('/instalacao/qualidade_ambiental', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_instalacao_qualidade_ambiental():
    """Criar pedido de controlo de qualidade ambiental para instalação"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_instalacao = data.get('pnpk_instalacao')

    if not all([pnmemo, pnpk_instalacao]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_instalacao_qualidade_ambiental(
        pnts_associate, pnmemo, pnpk_instalacao, current_user)
    return jsonify(result), status_code


# ==================== ROTAS COMPATIBILIDADE - ANTIGAS ====================

@bp.route('/etar_update/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def update_etar(pk):
    """Atualizar dados de uma ETAR"""
    current_user = get_jwt_identity()
    data = request.get_json()
    result, status_code = update_etar_details(pk, data, current_user)
    return jsonify(result), status_code


@bp.route('/ee_update/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def update_ee(pk):
    """Atualizar dados de uma EE"""
    current_user = get_jwt_identity()
    data = request.get_json()
    result, status_code = update_ee_details(pk, data, current_user)
    return jsonify(result), status_code


@bp.route('/etar_maintenance/<int:pk>', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
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
@require_permission("operation.access")
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
@require_permission("operation.access")
@set_session
@api_error_handler
def add_etar_volume():
    """Registar volume de ETAR - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_etar_volume(data.get('pnpk'), data, current_user)


@bp.route('/ee_volume', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_ee_volume():
    """Registar volume de EE - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_ee_volume(data.get('pnpk'), data, current_user)


@bp.route('/etar_volumes/<int:tb_etar>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_etar_volumes(tb_etar):
    """Listar volumes de ETAR - compatibilidade"""
    current_user = get_jwt_identity()
    result, status_code = list_etar_volumes(tb_etar, current_user)
    return jsonify(result), status_code


@bp.route('/ee_volumes/<int:tb_ee>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_ee_volumes(tb_ee):
    """Listar volumes de EE - compatibilidade"""
    current_user = get_jwt_identity()
    result, status_code = list_ee_volumes(tb_ee, current_user)
    return jsonify(result), status_code


@bp.route('/etar_water_volume', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_water_etar_volume():
    """Registar volume de água ETAR - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_water_etar_volume(data.get('pnpk'), data, current_user)


@bp.route('/ee_water_volume', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_water_ee_volume():
    """Registar volume de água EE - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_water_ee_volume(data.get('pnpk'), data, current_user)


@bp.route('/etar_water_volumes/<int:tb_etar>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_water_etar_volumes(tb_etar):
    """Listar volumes de água ETAR - compatibilidade"""
    current_user = get_jwt_identity()
    result, status_code = list_etar_water_volumes(tb_etar, current_user)
    return jsonify(result), status_code


@bp.route('/ee_water_volumes/<int:tb_ee>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_water_ee_volumes(tb_ee):
    """Listar volumes de água EE - compatibilidade"""
    current_user = get_jwt_identity()
    result, status_code = list_ee_water_volumes(tb_ee, current_user)
    return jsonify(result), status_code


@bp.route('/etar_energy', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_etar_energy():
    """Registar energia de ETAR - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_etar_energy(data.get('pnpk'), data, current_user)


@bp.route('/ee_energy', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_ee_energy():
    """Registar energia de EE - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_ee_energy(data.get('pnpk'), data, current_user)


@bp.route('/etar_energy/<int:tb_etar>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_etar_energy(tb_etar):
    """Listar energia de ETAR - compatibilidade"""
    current_user = get_jwt_identity()
    result, status_code = list_etar_energy(tb_etar, current_user)
    return jsonify(result), status_code


@bp.route('/ee_energy/<int:tb_ee>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_ee_energy(tb_ee):
    """Listar energia de EE - compatibilidade"""
    current_user = get_jwt_identity()
    result, status_code = list_ee_energy(tb_ee, current_user)
    return jsonify(result), status_code


@bp.route('/etar_expense', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_etar_expense():
    """Registar despesa em ETAR - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()

    # Converter formato antigo para novo
    converted_data = {
        'pntt_expensedest': data.get('pntt_expensedest'),
        'pndate': data.get('pndate'),
        'pnval': data.get('pnval'),
        'pntt_instalacao': data.get('pntt_etar'),  # conversão chave
        'pnts_associate': data.get('pnts_associate'),
        'pnmemo': data.get('pnmemo')
    }

    # Se vem no formato antigo (parâmetros individuais)
    if 'pntt_etar' not in data and len(data) == 6:
        return create_etar_expense(
            data.get('pntt_expensedest'),
            data.get('pndate'),
            data.get('pnval'),
            data.get('pntt_etar'),
            data.get('pnts_associate'),
            data.get('pnmemo'),
            current_user
        )

    return create_instalacao_expense(converted_data, current_user)


@bp.route('/ee_expense', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_ee_expense():
    """Registar despesa em EE - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_ee_expense(data, current_user)


@bp.route('/rede_expense', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_rede_expense():
    """Registar despesa na rede"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_rede_expense(data, current_user)


@bp.route('/ramal_expense', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_ramal_expense():
    """Registar despesa no ramal"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_ramal_expense(data, current_user)


@bp.route('/etar_expenses/<int:tb_etar>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_etar_expenses(tb_etar):
    """Listar despesas ETAR - compatibilidade"""
    current_user = get_jwt_identity()
    result, status_code = list_etar_expenses(tb_etar, current_user)
    return jsonify(result), status_code


@bp.route('/ee_expenses/<int:tb_ee>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_ee_expenses(tb_ee):
    """Listar despesas EE - compatibilidade"""
    current_user = get_jwt_identity()
    result, status_code = list_ee_expenses(tb_ee, current_user)
    return jsonify(result), status_code


@bp.route('/rede_expenses', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
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
@require_permission("operation.access")
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
@require_permission("operation.access")
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
@require_permission("operation.access")
@set_session
@api_error_handler
def created_manut_expense():
    """Criar uma despesa de manutenção"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_manut_expense(data, current_user)


@bp.route('/etar_details/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_etar_details(pk):
    """Obter detalhes de uma ETAR específica pela PK"""
    current_user = get_jwt_identity()
    result, status_code = get_etar_details_by_pk(current_user, pk)
    return jsonify(result), status_code


@bp.route('/ee_details/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_ee_details(pk):
    """Obter detalhes de uma EE específica pela PK"""
    current_user = get_jwt_identity()
    result, status_code = get_ee_details_by_pk(current_user, pk)
    return jsonify(result), status_code


@bp.route('/equip_expense', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_equip_expense():
    """Registar despesa de Equipamento"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return create_equip_expense(data, current_user)


@bp.route('/equip_expenses', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_equip_expenses():
    """Listar despesas de Equipamento"""
    current_user = get_jwt_identity()
    result, status_code = list_equip_expenses(current_user)
    return jsonify(result), status_code


# ==================== DOCUMENTOS ETAR - COMPATIBILIDADE ====================

@bp.route('/etar/desmatacao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_etar_desmatacao():
    """Criar pedido de desmatação para ETAR - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_etar = data.get('pnpk_etar')

    if not all([pnmemo, pnpk_etar]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_etar_desmatacao(
        pnts_associate, pnmemo, pnpk_etar, current_user)
    return jsonify(result), status_code


@bp.route('/etar/retirada_lamas', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_etar_retirada_lamas():
    """Criar pedido de retirada de lamas para ETAR - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_etar = data.get('pnpk_etar')

    if not all([pnmemo, pnpk_etar]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_etar_retirada_lamas(
        pnts_associate, pnmemo, pnpk_etar, current_user)
    return jsonify(result), status_code


@bp.route('/etar/reparacao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_etar_reparacao():
    """Criar pedido de reparação para ETAR - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_etar = data.get('pnpk_etar')

    if not all([pnmemo, pnpk_etar]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_etar_reparacao(
        pnts_associate, pnmemo, pnpk_etar, current_user)
    return jsonify(result), status_code


@bp.route('/etar/vedacao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_etar_vedacao():
    """Criar pedido de vedação para ETAR - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_etar = data.get('pnpk_etar')

    if not all([pnmemo, pnpk_etar]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_etar_vedacao(
        pnts_associate, pnmemo, pnpk_etar, current_user)
    return jsonify(result), status_code


@bp.route('/etar/qualidade_ambiental', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_etar_qualidade_ambiental():
    """Criar pedido de controlo de qualidade ambiental para ETAR - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_etar = data.get('pnpk_etar')

    if not all([pnmemo, pnpk_etar]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_etar_qualidade_ambiental(
        pnts_associate, pnmemo, pnpk_etar, current_user)
    return jsonify(result), status_code


# ==================== DOCUMENTOS EE - COMPATIBILIDADE ====================

@bp.route('/ee/desmatacao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_ee_desmatacao():
    """Criar pedido de desmatação para EE - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_ee = data.get('pnpk_ee')

    if not all([pnmemo, pnpk_ee]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_ee_desmatacao(
        pnts_associate, pnmemo, pnpk_ee, current_user)
    return jsonify(result), status_code


@bp.route('/ee/retirada_lamas', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_ee_retirada_lamas():
    """Criar pedido de retirada de lamas para EE - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_ee = data.get('pnpk_ee')

    if not all([pnmemo, pnpk_ee]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_ee_retirada_lamas(
        pnts_associate, pnmemo, pnpk_ee, current_user)
    return jsonify(result), status_code


@bp.route('/ee/reparacao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_ee_reparacao():
    """Criar pedido de reparação para EE - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_ee = data.get('pnpk_ee')

    if not all([pnmemo, pnpk_ee]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_ee_reparacao(
        pnts_associate, pnmemo, pnpk_ee, current_user)
    return jsonify(result), status_code


@bp.route('/ee/vedacao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_ee_vedacao():
    """Criar pedido de vedação para EE - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_ee = data.get('pnpk_ee')

    if not all([pnmemo, pnpk_ee]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_ee_vedacao(
        pnts_associate, pnmemo, pnpk_ee, current_user)
    return jsonify(result), status_code


@bp.route('/ee/qualidade_ambiental', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_ee_qualidade_ambiental():
    """Criar pedido de controlo de qualidade ambiental para EE - compatibilidade"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_ee = data.get('pnpk_ee')

    if not all([pnmemo, pnpk_ee]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    result, status_code = create_ee_qualidade_ambiental(
        pnts_associate, pnmemo, pnpk_ee, current_user)
    return jsonify(result), status_code


# ==================== DOCUMENTOS REDE/CAIXAS/RAMAIS ====================

@bp.route('/rede/desobstrucao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_rede_desobstrucao():
    """Criar pedido de desobstrução para Rede"""
    current_user = get_jwt_identity()
    data = request.get_json()

    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnaddress = data.get('pnaddress')
    pnpostal = data.get('pnpostal')
    pndoor = data.get('pndoor')
    pnfloor = data.get('pnfloor')
    pnnut1 = data.get('pnnut1')
    pnnut2 = data.get('pnnut2')
    pnnut3 = data.get('pnnut3')
    pnnut4 = data.get('pnnut4')
    pnglat = data.get('pnglat')
    pnglong = data.get('pnglong')

    result, status_code = create_rede_desobstrucao(
        pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor,
        pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user)
    return jsonify(result), status_code


@bp.route('/rede/reparacao_colapso', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_rede_reparacao_colapso():
    """Criar pedido de reparação/colapso para Rede"""
    current_user = get_jwt_identity()
    data = request.get_json()

    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnaddress = data.get('pnaddress')
    pnpostal = data.get('pnpostal')
    pndoor = data.get('pndoor')
    pnfloor = data.get('pnfloor')
    pnnut1 = data.get('pnnut1')
    pnnut2 = data.get('pnnut2')
    pnnut3 = data.get('pnnut3')
    pnnut4 = data.get('pnnut4')
    pnglat = data.get('pnglat')
    pnglong = data.get('pnglong')

    result, status_code = create_rede_reparacao_colapso(
        pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor,
        pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user)
    return jsonify(result), status_code


@bp.route('/caixas/desobstrucao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_caixa_desobstrucao():
    """Criar pedido de desobstrução para Caixas"""
    current_user = get_jwt_identity()
    data = request.get_json()

    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnaddress = data.get('pnaddress')
    pnpostal = data.get('pnpostal')
    pndoor = data.get('pndoor')
    pnfloor = data.get('pnfloor')
    pnnut1 = data.get('pnnut1')
    pnnut2 = data.get('pnnut2')
    pnnut3 = data.get('pnnut3')
    pnnut4 = data.get('pnnut4')
    pnglat = data.get('pnglat')
    pnglong = data.get('pnglong')

    result, status_code = create_caixa_desobstrucao(
        pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor,
        pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user)
    return jsonify(result), status_code


@bp.route('/caixas/reparacao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_caixa_reparacao():
    """Criar pedido de reparação para Caixas"""
    current_user = get_jwt_identity()
    data = request.get_json()

    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnaddress = data.get('pnaddress')
    pnpostal = data.get('pnpostal')
    pndoor = data.get('pndoor')
    pnfloor = data.get('pnfloor')
    pnnut1 = data.get('pnnut1')
    pnnut2 = data.get('pnnut2')
    pnnut3 = data.get('pnnut3')
    pnnut4 = data.get('pnnut4')
    pnglat = data.get('pnglat')
    pnglong = data.get('pnglong')

    result, status_code = create_caixa_reparacao(
        pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor,
        pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user)
    return jsonify(result), status_code


@bp.route('/caixas/reparacao_tampa', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_caixa_reparacao_tampa():
    """Criar pedido de reparação de tampa para Caixas"""
    current_user = get_jwt_identity()
    data = request.get_json()

    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnaddress = data.get('pnaddress')
    pnpostal = data.get('pnpostal')
    pndoor = data.get('pndoor')
    pnfloor = data.get('pnfloor')
    pnnut1 = data.get('pnnut1')
    pnnut2 = data.get('pnnut2')
    pnnut3 = data.get('pnnut3')
    pnnut4 = data.get('pnnut4')
    pnglat = data.get('pnglat')
    pnglong = data.get('pnglong')

    result, status_code = create_caixa_reparacao_tampa(
        pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor,
        pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user)
    return jsonify(result), status_code


@bp.route('/ramais/desobstrucao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_ramal_desobstrucao():
    """Criar pedido de desobstrução para Ramais"""
    current_user = get_jwt_identity()
    data = request.get_json()

    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnaddress = data.get('pnaddress')
    pnpostal = data.get('pnpostal')
    pndoor = data.get('pndoor')
    pnfloor = data.get('pnfloor')
    pnnut1 = data.get('pnnut1')
    pnnut2 = data.get('pnnut2')
    pnnut3 = data.get('pnnut3')
    pnnut4 = data.get('pnnut4')
    pnglat = data.get('pnglat')
    pnglong = data.get('pnglong')

    result, status_code = create_ramal_desobstrucao(
        pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor,
        pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user)
    return jsonify(result), status_code


@bp.route('/ramais/reparacao', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_ramal_reparacao():
    """Criar pedido de reparação para Ramais"""
    current_user = get_jwt_identity()
    data = request.get_json()

    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnaddress = data.get('pnaddress')
    pnpostal = data.get('pnpostal')
    pndoor = data.get('pndoor')
    pnfloor = data.get('pnfloor')
    pnnut1 = data.get('pnnut1')
    pnnut2 = data.get('pnnut2')
    pnnut3 = data.get('pnnut3')
    pnnut4 = data.get('pnnut4')
    pnglat = data.get('pnglat')
    pnglong = data.get('pnglong')

    result, status_code = create_ramal_reparacao(
        pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor,
        pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user)
    return jsonify(result), status_code


# ==================== OUTRAS ROTAS ====================

@bp.route('/requisicao_interna', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_requisicao_interna():
    """Criar pedido de requisição interna"""
    current_user = get_jwt_identity()
    data = request.get_json()
    pnmemo = data.get('pnmemo')

    if not pnmemo:
        return jsonify({'error': 'Descrição do pedido é obrigatória'}), 400

    result, status_code = create_requisicao_interna(pnmemo, current_user)
    return jsonify(result), status_code


@bp.route('/etar_incumprimento', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def add_etar_incumprimento():
    """Registar incumprimento em ETAR"""
    current_user = get_jwt_identity()
    payload = request.get_json()
    # Renomear a chave para corresponder à nova função de serviço
    if 'tb_etar' in payload:
        payload['tb_instalacao'] = payload.pop('tb_etar')
    result, status_code = create_instalacao_incumprimento(payload, current_user)
    return jsonify(result), status_code


@bp.route('/etar_incumprimentos/<int:tb_etar>', methods=['GET'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def get_etar_incumprimentos(tb_etar):
    """Listar incumprimentos de uma ETAR"""
    current_user = get_jwt_identity()
    result, status_code = list_etar_incumprimentos(tb_etar, current_user)
    return jsonify(result), status_code


# ==================== ROTA LEGACY INTERNA ====================
# Manter para compatibilidade se ainda for usado

@bp.route('/internal_request', methods=['POST'])
@jwt_required()
@token_required
@require_permission("operation.access")
@set_session
@api_error_handler
def create_internal_request_route():
    """Criar pedido interno - LEGACY - usar /instalacao/* em vez"""
    current_user = get_jwt_identity()
    data = request.get_json()

    # Parâmetros obrigatórios
    pntype = data.get('pntype')
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')

    # Parâmetros opcionais - converter para instalação
    pnpk_etar = data.get('pnpk_etar')
    pnpk_ee = data.get('pnpk_ee')
    pnpk_instalacao = pnpk_etar or pnpk_ee  # usar qualquer um dos dois

    if not all([pntype, pnmemo]):
        return jsonify({'error': 'Parâmetros obrigatórios em falta'}), 400

    # Mapear tipos de documentos para as novas funções
    if pntype == 20:  # desmatação
        result, status_code = create_instalacao_desmatacao(
            pnts_associate, pnmemo, pnpk_instalacao, current_user)
    elif pntype in [40, 41]:  # retirada de lamas
        result, status_code = create_instalacao_retirada_lamas(
            pnts_associate, pnmemo, pnpk_instalacao, current_user)
    elif pntype in [45, 46]:  # reparação
        result, status_code = create_instalacao_reparacao(
            pnts_associate, pnmemo, pnpk_instalacao, current_user)
    elif pntype in [47, 48]:  # vedação
        result, status_code = create_instalacao_vedacao(
            pnts_associate, pnmemo, pnpk_instalacao, current_user)
    elif pntype == 49:  # qualidade ambiental
        result, status_code = create_instalacao_qualidade_ambiental(
            pnts_associate, pnmemo, pnpk_instalacao, current_user)
    elif pntype == 19:  # requisição interna
        result, status_code = create_requisicao_interna(pnmemo, current_user)
    else:
        return jsonify({'error': 'Tipo de documento não suportado'}), 400

    return jsonify(result), status_code
