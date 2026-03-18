from flask import Blueprint, request, jsonify, g, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services.entity_service import (
    get_entity_detail,
    get_entity_detail_nipc,
    update_entity_detail,
    create_entity,
    list_entities
)
from ..utils.utils import token_required, set_session, db_session_manager
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger

logger = get_logger(__name__)



bp = Blueprint('entity_routes', __name__)


@bp.route('/entity/<int:pk>', methods=['GET'])
@jwt_required()
@token_required # Adicionado para consistência
@require_permission(800)  # entities.view # Protege a visualização de detalhes
@api_error_handler
def get_entity(pk):
    """
    Obter Detalhes da Entidade
    ---
    tags:
      - Entidades
    summary: Retorna a ficha completa de uma Entidade pesquisando pela Primary Key (PK).
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
        description: ID único da Entidade
    responses:
      200:
        description: Detalhes da Entidade.
      404:
        description: Entidade não encontrada.
    """
    current_user = get_jwt_identity()
    result, status_code = get_entity_detail(pk, current_user)
    return jsonify(result), status_code

@bp.route('/entity/nipc/<int:nipc>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(800)  # entities.view # Protege a busca por NIPC
@set_session
@api_error_handler
def get_entity_nipc(nipc):
    """
    Pesquisa Entidade por NIPC
    ---
    tags:
      - Entidades
    summary: Procura uma Entidade usando o seu Número de Identificação de Pessoa Coletiva / Contribuinte.
    security:
      - BearerAuth: []
    parameters:
      - name: nipc
        in: path
        type: integer
        required: true
        description: NIPC da entidade
    responses:
      200:
        description: Detalhes da entidade.
      404:
        description: Nenhuma entidade corresponde a este NIPC.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        entity_detail, status_code = get_entity_detail_nipc(nipc, current_user)
        return entity_detail, status_code


@bp.route('/entity', methods=['POST'])
@jwt_required()
@token_required
@require_permission(810)  # entities.create # Permissão dedicada para criar entidades
@set_session
@api_error_handler
def create_new_entity():
    """
    Criar Nova Entidade
    ---
    tags:
      - Entidades
    summary: Regista uma nova entidade no sistema (Cliente, Instalação, etc.).
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: entity_data
        description: Objeto com dados da entidade
        required: true
        schema:
          type: object
    responses:
      201:
        description: Entidade criada com sucesso.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        referrer = request.referrer
        logger.info(f"Recebendo requisição para criar entidade de: {referrer}")

        data = request.get_json()
        logger.debug(f"Dados recebidos para criação de entidade: {data}")

        response = create_entity(data, current_user)

        logger.info(f"Resposta da criação de entidade: {response}")
        return response


@bp.route('/entity/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(820)  # entities.manage # Permissão dedicada para editar entidades
@set_session
@api_error_handler
def update_entity(pk):
    """
    Atualizar Entidade Existente
    ---
    tags:
      - Entidades
    summary: Modifica os dados de uma entidade residente referenciada pela sua PK.
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
        description: ID da entidade
      - in: body
        name: update_data
        required: true
        schema:
          type: object
    responses:
      200:
        description: Entidade modificada.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        data = request.get_json()
        return update_entity_detail(pk, data, current_user)


@bp.route('/entities', methods=['GET'])
@jwt_required()
@token_required
@require_permission(800)  # entities.view # Protege a listagem de entidades
@set_session
@api_error_handler
def list_all_entities():
    """
    Listar Entidades
    ---
    tags:
      - Entidades
    summary: Retorna a coleção geral de entidades ativas no sistema.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Lista de entidades retornada.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return list_entities(current_user)


@bp.after_request
@api_error_handler
def cleanup_session(response):
    if hasattr(g, 'current_user'):
        delattr(g, 'current_user')
    if hasattr(g, 'current_session_id'):
        delattr(g, 'current_session_id')
    return response


# Adicione esta linha no final do arquivo auth_routes.py
bp.after_request(cleanup_session)
