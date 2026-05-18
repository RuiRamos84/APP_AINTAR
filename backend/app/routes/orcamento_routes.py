from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from ..utils.utils import token_required, set_session, db_session_manager
from ..services.orcamento_service import (
    get_orcamento_detalhe,
    get_orcamento_anos,
    get_orcamento_classes,
    get_orcamento_subclasses,
    get_sncap,
    create_orcamento,
    update_orcamento,
    delete_orcamento,
)

logger = get_logger(__name__)

bp = Blueprint('orcamento_routes', __name__)


# ── Leitura ────────────────────────────────────────────────────────────────

@bp.route('/orcamento', methods=['GET'])
@jwt_required()
@token_required
@require_permission('expenses.view')
@api_error_handler
def get_orcamento_detalhe_route():
    current_user = get_jwt_identity()
    ano = request.args.get('ano')
    with db_session_manager(current_user) as session:
        return get_orcamento_detalhe(session, ano)


@bp.route('/orcamento/anos', methods=['GET'])
@jwt_required()
@token_required
@require_permission('expenses.view')
@api_error_handler
def get_orcamento_anos_route():
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        return get_orcamento_anos(session)


@bp.route('/orcamento/classes', methods=['GET'])
@jwt_required()
@token_required
@require_permission('expenses.view')
@api_error_handler
def get_orcamento_classes_route():
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        return get_orcamento_classes(session)


@bp.route('/orcamento/subclasses', methods=['GET'])
@jwt_required()
@token_required
@require_permission('expenses.view')
@api_error_handler
def get_orcamento_subclasses_route():
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        return get_orcamento_subclasses(session)


@bp.route('/orcamento/sncap/<string:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission('expenses.view')
@api_error_handler
def get_sncap_route(pk):
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        return get_sncap(session, pk)


# ── Orçamento ──────────────────────────────────────────────────────────────

@bp.route('/orcamento', methods=['POST'])
@jwt_required()
@token_required
@require_permission('expenses.edit')
@set_session
@api_error_handler
def create_orcamento_route():
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user) as session:
        return create_orcamento(data, session)


@bp.route('/orcamento/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('expenses.edit')
@set_session
@api_error_handler
def update_orcamento_route(pk):
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user) as session:
        return update_orcamento(pk, data, session)


@bp.route('/orcamento/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('expenses.edit')
@set_session
@api_error_handler
def delete_orcamento_route(pk):
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        return delete_orcamento(pk, session)


