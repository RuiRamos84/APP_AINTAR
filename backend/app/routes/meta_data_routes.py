from flask import Blueprint, jsonify, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services.meta_data_service import fetch_meta_data
from ..utils.utils import set_session, token_required, db_session_manager
from sqlalchemy.exc import SQLAlchemyError
from app.utils.error_handler import api_error_handler

bp = Blueprint('meta_data_routes', __name__)


@bp.route('/metaData', methods=['GET'])
@jwt_required()
# @token_required
# @set_session
@api_error_handler
def get_meta_data_route():
    """Obtém metadados"""
    try:
        current_user = get_jwt_identity()
        with db_session_manager(current_user):
            # current_app.logger.info("Iniciando requisição de metadados")
            # current_app.logger.debug(f"JWT Identity: {get_jwt_identity()}")
            # current_app.logger.debug(f"Current User: {g.current_user if hasattr(g, 'current_user') else 'Not set'}")

            metadata, status_code = fetch_meta_data(current_user)
            # current_app.logger.info(f"Metadados obtidos com sucesso. Status code: {status_code}")
            return jsonify(metadata), status_code
    except SQLAlchemyError as e:
        current_app.logger.error(f"Erro de banco de dados ao buscar metadados: {str(e)}")
        return jsonify({"error": "Erro de banco de dados ao buscar metadados"}), 500
    except Exception as e:
        current_app.logger.error(f"Erro inesperado em get_meta_data_route: {str(e)}")
        return jsonify({"error": "Erro interno do servidor ao buscar metadados"}), 500


@bp.after_request
@api_error_handler
def cleanup_session(response):
    if hasattr(g, 'current_user'):
        delattr(g, 'current_user')
    if hasattr(g, 'current_session_id'):
        delattr(g, 'current_session_id')
    # current_app.logger.debug("Sessão limpa após requisição")
    return response


# Registrar a função de limpeza de sessão
bp.after_request(cleanup_session)
