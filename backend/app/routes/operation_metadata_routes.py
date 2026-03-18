from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.permissions_decorator import require_permission
from ..utils.utils import set_session, token_required
from ..services import operation_metadata_service
from app.utils.logger import get_logger

logger = get_logger(__name__)



bp = Blueprint('operation_metadata', __name__, url_prefix='/api/v1/operation_metadata')


@bp.route('/query', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)  # Mesma permissão de operações
@set_session
def query_metadata():
    """
    Consultar Operações Custom (Eventos/Metadados)
    ---
    tags:
      - Operações Instalações (Metadados)
    summary: Pesquisa os metadados registados para os vários controlos e atividades diárias das instalações.
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
          properties:
            tb_instalacao:
              type: integer
            tt_operacaomodo:
              type: integer
    responses:
      200:
        description: Listagem obtida.
    """
    current_user = get_jwt_identity()
    data = request.get_json() or {}

    result, status_code = operation_metadata_service.query_operation_metadata(data, current_user)
    return jsonify(result), status_code


@bp.route('/create', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def create_metadata():
    """
    Criar Cabeçalho de Operação (Metadado Diário)
    ---
    tags:
      - Operações Instalações (Metadados)
    summary: Abre a folha de registo para início de lançamento de controlos do dia/operação.
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
          properties:
            tt_operacaomodo:
              type: integer
            tb_instalacao:
              type: integer
            tt_operacaodia:
              type: integer
            tt_operacaoaccao:
              type: integer
            ts_operador1:
              type: integer
            ts_operador2:
              type: integer
    responses:
      201:
        description: Registo de metadado efetuado.
    """
    current_user = get_jwt_identity()
    data = request.get_json()

    result, status_code = operation_metadata_service.create_operation_metadata(data, current_user)
    return jsonify(result), status_code


@bp.route('/update', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def update_metadata():
    """
    Atualizar Meta de Operação (Atributos Diários)
    ---
    tags:
      - Operações Instalações (Metadados)
    summary: Configura atributos como os operadores do dia, modos, etc após abertura da sheet diária.
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
          properties:
            pk:
              type: integer
    responses:
      200:
        description: Atualizado.
    """
    current_user = get_jwt_identity()
    data = request.get_json()

    result, status_code = operation_metadata_service.update_operation_metadata(data, current_user)
    return jsonify(result), status_code


@bp.route('/delete/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def delete_metadata(pk):
    """
    Eliminar Metadados [Bloqueado]
    ---
    tags:
      - Operações Instalações (Metadados)
    summary: Anular logs é proibido para a maioria dos utilizadores por compliance.
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      403:
        description: Ação proibida sem admin request.
    """
    return jsonify({
        'success': False,
        'error': 'Para eliminar esta tarefa, contacte o administrador do sistema'
    }), 403


@bp.route('/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def get_metadata(pk):
    """
    Ler Metadado por ID
    ---
    tags:
      - Operações Instalações (Metadados)
    summary: Obtém detalhe da cabimentação do dia.
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Dados da folha.
    """
    current_user = get_jwt_identity()

    result, status_code = operation_metadata_service.get_operation_metadata_by_pk(pk, current_user)
    return jsonify(result), status_code
