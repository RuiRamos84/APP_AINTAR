from flask import Blueprint, jsonify, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services.meta_data_service import fetch_meta_data, clear_meta_data_cache
from ..utils.utils import set_session, token_required, db_session_manager
from sqlalchemy.exc import SQLAlchemyError
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler

bp = Blueprint('meta_data_routes', __name__)


@bp.route('/metaData', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_meta_data_route():
    """Obtém metadados"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        metadata, status_code = fetch_meta_data(current_user)
        return jsonify(metadata), status_code


@bp.route('/clear-metadata-cache', methods=['POST'])
@jwt_required()
@token_required
@require_permission(110)  # admin.cache.manage # Apenas admins podem limpar o cache
def clear_metadata_cache():
    clear_meta_data_cache()
    return jsonify({'message': 'Cache limpo com sucesso'}), 200


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
