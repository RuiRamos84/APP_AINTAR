from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.permissions_decorator import require_permission
from ..utils.utils import set_session, token_required
from ..services import operation_metadata_service
from app.utils.logger import get_logger

logger = get_logger(__name__)



bp = Blueprint('operation_metadata', __name__, url_prefix='/api/v1/operation_metadata')


@bp.route('/query', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)  # Mesma permissão de operações
@set_session
def query_metadata():
    """
    Consultar metadata de operações

    Body:
    {
        "tb_instalacao": 123 (opcional),
        "tt_operacaomodo": 1 (opcional)
    }
    """
    current_user = get_jwt_identity()
    data = request.get_json() or {}

    result, status_code = operation_metadata_service.query_operation_metadata(data, current_user)
    return jsonify(result), status_code


@bp.route('/create', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def create_metadata():
    """
    Criar nova metadata de operação

    Body:
    {
        "tt_operacaomodo": 1,
        "tb_instalacao": 123,
        "tt_operacaodia": 1,
        "tt_operacaoaccao": 456,
        "ts_operador1": 789,
        "ts_operador2": 790 (opcional)
    }
    """
    current_user = get_jwt_identity()
    data = request.get_json()

    result, status_code = operation_metadata_service.create_operation_metadata(data, current_user)
    return jsonify(result), status_code


@bp.route('/update', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def update_metadata():
    """
    Atualizar metadata de operação

    Body:
    {
        "pk": 123,
        "tt_operacaomodo": 1 (opcional),
        "tb_instalacao": 123 (opcional),
        ... outros campos opcionais
    }
    """
    current_user = get_jwt_identity()
    data = request.get_json()

    result, status_code = operation_metadata_service.update_operation_metadata(data, current_user)
    return jsonify(result), status_code


@bp.route('/delete/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def delete_metadata(pk):
    """
    Eliminar metadata de operação - DESABILITADO POR SEGURANÇA

    URL: /operation_metadata/delete/{pk}
    """
    return jsonify({
        'success': False,
        'error': 'Para eliminar esta tarefa, contacte o administrador do sistema'
    }), 403


@bp.route('/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def get_metadata(pk):
    """
    Obter metadata de operação por PK

    URL: /operation_metadata/{pk}
    """
    current_user = get_jwt_identity()

    result, status_code = operation_metadata_service.get_operation_metadata_by_pk(pk, current_user)
    return jsonify(result), status_code
