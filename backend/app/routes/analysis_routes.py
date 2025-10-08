from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.permissions_decorator import require_permission
from ..utils.utils import set_session, token_required
from ..services import analysis_service

bp = Blueprint('analysis', __name__, url_prefix='/api/v1/analysis')


@bp.route('/query', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)  # Mesma permissão de operações
@set_session
def query_analysis():
    """
    Consultar análises de instalações

    Body:
    {
        "tb_instalacao": 123 (opcional),
        "data_inicio": "2025-01-01" (opcional),
        "data_fim": "2025-12-31" (opcional)
    }
    """
    current_user = get_jwt_identity()
    data = request.get_json() or {}

    result, status_code = analysis_service.query_analysis(data, current_user)
    return jsonify(result), status_code


@bp.route('/update', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def update_analysis():
    """
    Atualizar resultado de análise

    Body:
    {
        "pk": 123,
        "resultado": "texto do resultado"
    }
    """
    current_user = get_jwt_identity()
    data = request.get_json()

    result, status_code = analysis_service.update_analysis(data, current_user)
    return jsonify(result), status_code


@bp.route('/search/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def search_analysis(pk):
    """
    Pesquisa rápida de análise por PK (número da amostra)

    URL: /analysis/search/{pk}
    """
    current_user = get_jwt_identity()

    result, status_code = analysis_service.get_analysis_by_pk(pk, current_user)
    return jsonify(result), status_code


@bp.route('/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def get_analysis(pk):
    """
    Obter análise por PK

    URL: /analysis/{pk}
    """
    current_user = get_jwt_identity()

    result, status_code = analysis_service.get_analysis_by_pk(pk, current_user)
    return jsonify(result), status_code
