from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.permissions_decorator import require_permission
from ..services.epi_service import (
    create_epi,
    get_epi_deliveries,
    create_epi_delivery,
    update_epi_preferences,
    update_epi_delivery,
    return_epi_delivery,
)
from ..utils.utils import token_required, set_session, db_session_manager
from app.utils.error_handler import api_error_handler
from sqlalchemy import text
from app.utils.logger import get_logger

logger = get_logger(__name__)


bp = Blueprint('epi_routes', __name__)


@bp.route('/deliveries', methods=['GET'])
@jwt_required()
@token_required
@require_permission(210)  # epi.manage
@set_session
@api_error_handler
def get_epi_deliveries_route():
    """
    Listar Histórico de Entregas EPI
    ---
    tags:
      - Recursos Humanos (EPIs)
    summary: Devolve histórico de material de proteção individual entregue, permitindo filtrar por data ou funcionário.
    security:
      - BearerAuth: []
    parameters:
      - in: query
        name: start_date
        type: string
        format: date
      - in: query
        name: end_date
        type: string
        format: date
      - in: query
        name: employee_id
        type: integer
    responses:
      200:
        description: Listagem de entregas.
    """
    current_user = get_jwt_identity()
    filters = {
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'employee_id': request.args.get('employee_id')
    }
    with db_session_manager(current_user):
        return get_epi_deliveries(current_user, filters)


@bp.route('/delivery', methods=['POST'])
@jwt_required()
@token_required
@require_permission(210)  # epi.manage
@set_session
@api_error_handler
def create_epi_delivery_route():
    """
    Registar Entrega de EPI
    ---
    tags:
      - Recursos Humanos (EPIs)
    summary: Associa um equipamento de proteção a um colaborador.
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      201:
        description: Entrega registada.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user):
        return create_epi_delivery(data, current_user)


@bp.route('/preferences/<int:user_pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(210)  # epi.manage
@set_session
@api_error_handler
def update_epi_preferences_route(user_pk):
    """
    Atualizar Tamanhos/Preferências do Colaborador
    ---
    tags:
      - Recursos Humanos (EPIs)
    summary: Atualiza o tamanho de calçado, farda, etc na ficha do HR.
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - name: user_pk
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200:
        description: Atualizado.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user):
        return update_epi_preferences(user_pk, data, current_user)


@bp.route('/epi/data', methods=['GET'])
@jwt_required()
@token_required
@require_permission(210)  # epi.manage
@api_error_handler
def get_epi_data():
    """
    Catálogos de EPI / Componentes (Lookup)
    ---
    tags:
      - Recursos Humanos (EPIs)
    summary: Retorna vbl_epi e vbl_epiwhat combinados para preenchimento de dropdowns.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Arrays combinados em JSON.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        epi_list = session.execute(
            text("SELECT * FROM vbl_epi ORDER BY name")).mappings().all()
        what_types = session.execute(
            text("SELECT * FROM vbl_epiwhat ORDER BY pk")).mappings().all()

        return jsonify({
            'epi_list': [dict(row) for row in epi_list],
            'epi_what_types': [dict(row) for row in what_types]
        }), 200


@bp.route('/epi/list', methods=['GET'])
@jwt_required()
@token_required
@api_error_handler
def get_epi_list():
    """
    Apenas Catálogo de EPI
    ---
    tags:
      - Recursos Humanos (EPIs)
    summary: VBL_EPI simples para autocompletes limitados.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Retorna list.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        epi_list = session.execute(
            text("SELECT * FROM vbl_epi ORDER BY name")).mappings().all()
        return jsonify([dict(row) for row in epi_list]), 200


@bp.route('/delivery/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(210)  # epi.manage
@set_session
@api_error_handler
def update_epi_delivery_route(pk):
    """
    Atualizar Ocorrência de Entrega de EPI
    ---
    tags:
      - Recursos Humanos (EPIs)
    summary: Edita quantidades, anotações ou data de um registo já lançado na BD.
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200:
        description: Atualizado na table.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user):
        return update_epi_delivery(pk, data, current_user)


@bp.route('/delivery/<int:pk>/return', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(210)  # epi.manage
@set_session
@api_error_handler
def return_epi_delivery_route(pk):
    """
    Devolução de EPI Existente
    ---
    tags:
      - Recursos Humanos (EPIs)
    summary: Indica que o equipamento em uso foi entregue/devolvido ao Almoxarifado validando o Life Cycle do EPI.
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200:
        description: Sucesso.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user):
        return return_epi_delivery(pk, data, current_user)


@bp.route('/epi', methods=['POST'])
@jwt_required()
@token_required
@require_permission(210)  # epi.manage
@set_session
@api_error_handler
def create_epi_route():
    """
    Validar/Criar Utilizador EPI Base
    ---
    tags:
      - Recursos Humanos (EPIs)
    summary: Configura internamente o colaborador (trigger table inicialização de HR/Epi Params) aquando admissão.
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      201:
        description: Ok.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user):
        return create_epi(data, current_user)


@bp.after_request
@api_error_handler
def cleanup_session(response):
    if hasattr(g, 'current_user'):
        delattr(g, 'current_user')
    if hasattr(g, 'current_session_id'):
        delattr(g, 'current_session_id')
    return response


# Registrar a função de limpeza de sessão
bp.after_request(cleanup_session)