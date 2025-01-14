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

bp = Blueprint('entity_routes', __name__)


@bp.route('/entity/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@set_session
def get_entity(pk):
    """Obter detalhes da entidade"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return get_entity_detail(pk, current_user)


@bp.route('/entity/nipc/<int:nipc>', methods=['GET'])
@jwt_required()
@token_required
@set_session
def get_entity_nipc(nipc):
    """Obter detalhes da entidade"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        entity_detail, status_code = get_entity_detail_nipc(nipc, current_user)
        return entity_detail, status_code


@bp.route('/entity', methods=['POST'])
@jwt_required()
@token_required
@set_session
def create_new_entity():
    """Criar uma nova entidade"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        referrer = request.referrer
        current_app.logger.info(f"Recebendo requisição para criar entidade de: {referrer}")

        data = request.get_json()
        current_app.logger.debug(f"Dados recebidos para criação de entidade: {data}")

        response = create_entity(data, current_user)

        current_app.logger.info(f"Resposta da criação de entidade: {response}")
        return response


@bp.route('/entity/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@set_session
def update_entity(pk):
    """Atualizar detalhes da entidade"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        data = request.get_json()
        return update_entity_detail(pk, data, current_user)


@bp.route('/entities', methods=['GET'])
@jwt_required()
@token_required
@set_session
def list_all_entities():
    """Listar todas as entidades"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return list_entities(current_user)


@bp.after_request
def cleanup_session(response):
    if hasattr(g, 'current_user'):
        delattr(g, 'current_user')
    if hasattr(g, 'current_session_id'):
        delattr(g, 'current_session_id')
    return response


# Adicione esta linha no final do arquivo auth_routes.py
bp.after_request(cleanup_session)
