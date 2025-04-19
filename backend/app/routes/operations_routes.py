from flask import Blueprint, jsonify, current_app, request
from ..services.operations_service import get_operations_data, create_internal_document
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.utils import token_required, db_session_manager, set_session
from app.utils.error_handler import api_error_handler
from sqlalchemy.exc import SQLAlchemyError

bp = Blueprint('operations', __name__)


@bp.route('/operations', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_operations():
    """Obter dados de operações (antiga funcionalidade de dashboard)"""
    current_user = get_jwt_identity()
    try:
        with db_session_manager(current_user):
            data = get_operations_data(current_user)
            # Filtre apenas as views que têm dados
            data = {k: v for k, v in data.items() if v.get('data')}
            return jsonify(data), 200
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Erro de banco de dados ao buscar dados de operações: {str(e)}", exc_info=True)
        return jsonify({"error": "Erro de banco de dados", "message": "Não foi possível recuperar dados de operações devido a um erro de banco de dados"}), 500
    except Exception as e:
        if "SESSÃO INVÁLIDA" in str(e):
            current_app.logger.error(
                f"Sessão inválida: {str(e)}", exc_info=True)
            return jsonify({"error": "Sessão inválida", "message": "Sua sessão expirou. Por favor, faça login novamente."}), 419
        else:
            current_app.logger.error(
                f"Erro ao buscar dados de operações: {str(e)}", exc_info=True)
            return jsonify({"error": "Erro interno do servidor", "message": "Ocorreu um erro inesperado ao buscar dados de operações"}), 500


@bp.route('/internal_document', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def add_internal_document():
    """Criar um documento interno utilizando fbo_document_createintern"""
    current_user = get_jwt_identity()
    data = request.get_json()

    pntype = data.get('pntype')
    pnts_associate = data.get('pnts_associate')
    pnmemo = data.get('pnmemo')
    pnpk_etar = data.get('pnpk_etar')
    pnpk_ee = data.get('pnpk_ee')

    # Verificações obrigatórias
    if not pntype:
        return jsonify({'error': 'O tipo de documento é obrigatório'}), 400

    if not pnmemo:
        return jsonify({'error': 'A descrição do documento é obrigatória'}), 400

    # Para o tipo 19 (requisição interna), pnts_associate será sempre 1 (AINTAR)
    # conforme lógica na função fbo_document_createintern

    result, status_code = create_internal_document(
        pntype, pnts_associate, pnmemo, pnpk_etar, pnpk_ee, current_user
    )

    return jsonify(result), status_code


@bp.after_request
def cleanup_session(response):
    """Limpar sessão após requisição"""
    return response
