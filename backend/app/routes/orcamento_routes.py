from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from ..utils.utils import token_required, set_session, db_session_manager
from ..services.orcamento_service import (
    get_orcamento_detalhe,
    get_orcamento_summary,
    get_orcamento_anos,
    get_orcamento_classes,
    get_orcamento_subclasses,
    get_orcamento_tipos,
    get_sncap,
    get_sncap_summary,
    create_orcamento,
    update_orcamento,
    delete_orcamento,
    create_classe,
    update_classe,
    create_subclasse,
    update_subclasse,
)

logger = get_logger(__name__)

bp = Blueprint('orcamento_routes', __name__)


# ── Leitura ────────────────────────────────────────────────────────────────

@bp.route('/orcamento', methods=['GET'])
@jwt_required()
@token_required
@require_permission('orcamento.view')
@api_error_handler
def get_orcamento_detalhe_route():
    current_user = get_jwt_identity()
    ano = request.args.get('ano')
    with db_session_manager(current_user) as session:
        return get_orcamento_detalhe(session, ano)


@bp.route('/orcamento/anos', methods=['GET'])
@jwt_required()
@token_required
@require_permission('orcamento.view')
@api_error_handler
def get_orcamento_anos_route():
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        return get_orcamento_anos(session)


@bp.route('/orcamento/summary', methods=['GET'])
@jwt_required()
@token_required
@require_permission('orcamento.view')
@api_error_handler
def get_orcamento_summary_route():
    current_user = get_jwt_identity()
    ano = request.args.get('ano')
    with db_session_manager(current_user) as session:
        return get_orcamento_summary(session, ano)


@bp.route('/orcamento/subclasses', methods=['GET'])
@jwt_required()
@token_required
@require_permission('orcamento.view')
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


@bp.route('/orcamento/sncap-summary', methods=['GET'])
@jwt_required()
@token_required
@require_permission('orcamento.view')
@api_error_handler
def get_sncap_summary_route():
    current_user = get_jwt_identity()
    ano = request.args.get('ano')
    with db_session_manager(current_user) as session:
        return get_sncap_summary(session, ano)


# ── Orçamento ──────────────────────────────────────────────────────────────

@bp.route('/orcamento', methods=['POST'])
@jwt_required()
@token_required
@require_permission('orcamento.edit')
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
@require_permission('orcamento.edit')
@set_session
@api_error_handler
def update_orcamento_route(pk):
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user) as session:
        return update_orcamento(pk, data, session)


@bp.route('/orcamento/tipos', methods=['GET'])
@jwt_required()
@token_required
@require_permission('expenses.view')
@api_error_handler
def get_orcamento_tipos_route():
    """
    Tipos de orçamento (Corrente / Capital)
    ---
    tags:
      - Orçamento
    responses:
      200:
        description: Lista de tipos.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        return get_orcamento_tipos(session)


@bp.route('/orcamento/classe', methods=['POST'])
@jwt_required()
@token_required
@require_permission('expenses.edit')
@set_session
@api_error_handler
def create_classe_route():
    """
    Criar nova Classe de Orçamento
    ---
    tags:
      - Orçamento
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [designacao]
          properties:
            designacao:
              type: string
    responses:
      201:
        description: Criado.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user) as session:
        return create_classe(data, session)


@bp.route('/orcamento/subclasse', methods=['POST'])
@jwt_required()
@token_required
@require_permission('expenses.edit')
@set_session
@api_error_handler
def create_subclasse_route():
    """
    Criar nova Subclasse de Orçamento
    ---
    tags:
      - Orçamento
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [designacao, ts_orcamento_classe, ts_orcamento_tipo]
          properties:
            designacao:
              type: string
            ts_orcamento_classe:
              type: integer
            ts_orcamento_tipo:
              type: integer
            sncap:
              type: string
    responses:
      201:
        description: Criado.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user) as session:
        return create_subclasse(data, session)


@bp.route('/orcamento/classe/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('expenses.edit')
@set_session
@api_error_handler
def update_classe_route(pk):
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user) as session:
        return update_classe(pk, data, session)


@bp.route('/orcamento/subclasse/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('expenses.edit')
@set_session
@api_error_handler
def update_subclasse_route(pk):
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user) as session:
        return update_subclasse(pk, data, session)


@bp.route('/orcamento/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('orcamento.edit')
@set_session
@api_error_handler
def delete_orcamento_route(pk):
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        return delete_orcamento(pk, session)
