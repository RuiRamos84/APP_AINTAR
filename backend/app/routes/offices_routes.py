import os
from flask import Blueprint, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.sql import text
from app.utils.permissions_decorator import require_permission
from ..services.offices_service import list_offices, open_office, close_office, replicate_office
from ..utils.utils import token_required, set_session, db_session_manager
from app.utils.error_handler import api_error_handler, ResourceNotFoundError, APIError
from app.utils.logger import get_logger

logger = get_logger(__name__)

bp = Blueprint('offices_routes', __name__)


@bp.route('/offices', methods=['GET'])
@jwt_required()
@token_required
@require_permission(1300)  # offices.view
@set_session
@api_error_handler
def get_offices():
    """
    Listar Ofícios/Expedientes
    ---
    tags:
      - Ofícios
    summary: Retorna todos os ofícios/expedientes acessíveis ao utilizador.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Lista de ofícios retornada com sucesso.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return list_offices(current_user)


@bp.route('/offices/<int:pk>/open', methods=['POST'])
@jwt_required()
@token_required
@require_permission(1310)  # offices.create
@set_session
@api_error_handler
def open_office_route(pk):
    """
    Abrir Ofício
    ---
    tags:
      - Ofícios
    summary: Altera o estado do ofício para Aberto.
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Ofício aberto com sucesso.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return open_office(pk, current_user)


@bp.route('/offices/<int:pk>/close', methods=['POST'])
@jwt_required()
@token_required
@require_permission(1330)  # offices.close
@set_session
@api_error_handler
def close_office_route(pk):
    """
    Fechar Ofício
    ---
    tags:
      - Ofícios
    summary: Altera o estado do ofício para Fechado.
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Ofício fechado com sucesso.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return close_office(pk, current_user)


@bp.route('/offices/<int:pk>/replicate', methods=['POST'])
@jwt_required()
@token_required
@require_permission(1340)  # offices.replicate
@set_session
@api_error_handler
def replicate_office_route(pk):
    """
    Replicar Ofício
    ---
    tags:
      - Ofícios
    summary: Cria um novo ofício com base numa cópia do selecionado.
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      201:
        description: Ofício replicado com sucesso.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return replicate_office(pk, current_user)


@bp.route('/offices/<int:pk>/view', methods=['GET'])
@jwt_required()
@token_required
@require_permission(1300)  # offices.view
@set_session
@api_error_handler
def view_office_route(pk):
    """
    Visualizar PDF do Ofício
    ---
    tags:
      - Ofícios
    summary: Retorna o PDF do ofício para visualização inline.
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: PDF retornado com sucesso.
      404:
        description: Ofício ou ficheiro não encontrado.
    """
    current_user = get_jwt_identity()
    with db_session_manager(current_user) as session:
        row = session.execute(
            text("SELECT filename FROM vbl_letter WHERE pk = :pk"), {"pk": pk}
        ).mappings().fetchone()

        if not row:
            raise ResourceNotFoundError("Ofício", pk)

        if not row['filename']:
            raise APIError("PDF não disponível para este ofício", 404)

        pdf_dir = os.path.join(os.path.dirname(__file__), '../generated_pdfs')
        file_path = os.path.join(pdf_dir, row['filename'])

        if not os.path.exists(file_path):
            raise APIError("Ficheiro PDF não encontrado no servidor", 404)

        return send_file(file_path, mimetype='application/pdf')
