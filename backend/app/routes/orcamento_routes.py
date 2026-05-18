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
    get_orcamento_subclasses,
    create_orcamento,
    update_orcamento,
    delete_orcamento,
    get_orcamento_tipos,
    get_orcamento_classes,
    create_classe,
    create_subclasse,
    update_classe,
    update_subclasse,
)

logger = get_logger(__name__)

bp = Blueprint('orcamento_routes', __name__)


@bp.route('/orcamento', methods=['GET'])
@jwt_required()
@token_required
@require_permission('orcamento.view')
@api_error_handler
def get_orcamento_detalhe_route():
    """
    Listar Orçamento (Detalhe)
    ---
    tags:
      - Orçamento
    summary: Devolve todos os registos do orçamento com detalhe (ano, classe, subclasse, tipo, valor).
    parameters:
      - in: query
        name: ano
        type: integer
        required: false
    responses:
      200:
        description: Lista de registos de orçamento.
    """
    current_user = get_jwt_identity()
    ano = request.args.get('ano')
    with db_session_manager(current_user) as session:
        return get_orcamento_detalhe(session, ano)


@bp.route('/orcamento/summary', methods=['GET'])
@jwt_required()
@token_required
@require_permission('orcamento.view')
@api_error_handler
def get_orcamento_summary_route():
    """
    Resumo do Orçamento por Classe
    ---
    tags:
      - Orçamento
    summary: Totais por classe orçamental.
    parameters:
      - in: query
        name: ano
        type: integer
        required: false
    responses:
      200:
        description: Resumo por classe.
    """
    current_user = get_jwt_identity()
    ano = request.args.get('ano')
    with db_session_manager(current_user) as session:
        return get_orcamento_summary(session, ano)


@bp.route('/orcamento/anos', methods=['GET'])
@jwt_required()
@token_required
@require_permission('orcamento.view')
@api_error_handler
def get_orcamento_anos_route():
    """
    Anos disponíveis no Orçamento
    ---
    tags:
      - Orçamento
    responses:
      200:
        description: Lista de anos.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        return get_orcamento_anos(session)


@bp.route('/orcamento/subclasses', methods=['GET'])
@jwt_required()
@token_required
@require_permission('orcamento.view')
@api_error_handler
def get_orcamento_subclasses_route():
    """
    Subclasses disponíveis para lookup
    ---
    tags:
      - Orçamento
    responses:
      200:
        description: Lista de subclasses com classe e tipo.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        return get_orcamento_subclasses(session)


@bp.route('/orcamento', methods=['POST'])
@jwt_required()
@token_required
@require_permission('orcamento.edit')
@set_session
@api_error_handler
def create_orcamento_route():
    """
    Criar registo de Orçamento
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
          required: [ano, ts_orcamento_subclasse, valor]
          properties:
            ano:
              type: integer
            ts_orcamento_subclasse:
              type: integer
            valor:
              type: number
            data_inicio:
              type: string
              format: date
            data_fim:
              type: string
              format: date
    responses:
      201:
        description: Criado com sucesso.
    """
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
    """
    Atualizar registo de Orçamento
    ---
    tags:
      - Orçamento
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
        description: Atualizado.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    with db_session_manager(current_user) as session:
        return update_orcamento(pk, data, session)


@bp.route('/orcamento/tipos', methods=['GET'])
@jwt_required()
@token_required
@require_permission('orcamento.view')
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


@bp.route('/orcamento/classes', methods=['GET'])
@jwt_required()
@token_required
@require_permission('orcamento.view')
@api_error_handler
def get_orcamento_classes_route():
    """
    Classes de orçamento (lookup com pk)
    ---
    tags:
      - Orçamento
    responses:
      200:
        description: Lista de classes com pk.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        return get_orcamento_classes(session)


@bp.route('/orcamento/classe', methods=['POST'])
@jwt_required()
@token_required
@require_permission('orcamento.edit')
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
@require_permission('orcamento.edit')
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
@require_permission('orcamento.edit')
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
@require_permission('orcamento.edit')
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
    """
    Eliminar registo de Orçamento
    ---
    tags:
      - Orçamento
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Eliminado.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        return delete_orcamento(pk, session)
