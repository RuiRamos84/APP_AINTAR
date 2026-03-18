from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.permissions_decorator import require_permission
from ..utils.utils import set_session, token_required
from ..services import analysis_service
from app.utils.logger import get_logger

logger = get_logger(__name__)



bp = Blueprint('analysis', __name__, url_prefix='/api/v1/analysis')


@bp.route('/query', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)  # Mesma permissão de operações
@set_session
def query_analysis():
    """
    Consultar Análises Laboratoriais (Instalações)
    ---
    tags:
      - Intervenções (Análises)
    summary: Procura resultados ou pedidos de análise cruzando dados por Instalação e intervalo de datas.
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
              description: ID da instalação (opcional)
            data_inicio:
              type: string
              format: date
              description: 2025-01-01 (opcional)
            data_fim:
              type: string
              format: date
              description: 2025-12-31 (opcional)
    responses:
      200:
        description: Resultados da query de análises.
    """
    current_user = get_jwt_identity()
    data = request.get_json() or {}

    result, status_code = analysis_service.query_analysis(data, current_user)
    return jsonify(result), status_code


@bp.route('/update', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def update_analysis():
    """
    Atualizar Resultado / Registo de Análise
    ---
    tags:
      - Intervenções (Análises)
    summary: Anexa ou altera o veredito descritivo do relatório da amostra correspondente.
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
            resultado:
              type: string
    responses:
      200:
        description: Atualizado.
    """
    current_user = get_jwt_identity()
    data = request.get_json()

    result, status_code = analysis_service.update_analysis(data, current_user)
    return jsonify(result), status_code


@bp.route('/search/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def search_analysis(pk):
    """
    Pesquisar Análise Rápida
    ---
    tags:
      - Intervenções (Análises)
    summary: Localiza um registo de análise laboratorial diretamente pelo seu número de amostra/identificador (PK).
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Elemento devolvido.
    """
    current_user = get_jwt_identity()

    result, status_code = analysis_service.get_analysis_by_pk(pk, current_user)
    return jsonify(result), status_code


@bp.route('/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def get_analysis(pk):
    """
    Obter Detalhes Completos da Análise
    ---
    tags:
      - Intervenções (Análises)
    summary: Visualização detalhada de um registo de recolha.
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Dados da análise.
    """
    current_user = get_jwt_identity()

    result, status_code = analysis_service.get_analysis_by_pk(pk, current_user)
    return jsonify(result), status_code
