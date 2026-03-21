from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.utils import set_session, token_required
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from ..services.equipamento_service import (
    list_equipamentos,
    list_equipamentos_by_instalacao,
    create_equipamento,
    update_equipamento,
    delete_equipamento,
)

logger = get_logger(__name__)

bp = Blueprint('equipamento_routes', __name__)


# ========================= LIST ALL =========================
@bp.route('/equipamento_list', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def list_equipamentos_route():
    """
    Listar todos os equipamentos instalados
    ---
    tags:
      - Equipamentos Instalados
    security:
      - BearerAuth: []
    responses:
      200:
        description: Lista de equipamentos.
    """
    current_user = get_jwt_identity()
    return list_equipamentos(current_user)


# ========================= LIST BY INSTALACAO =========================
@bp.route('/equipamento_list/<int:tb_instalacao>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def list_equipamentos_instalacao_route(tb_instalacao):
    """
    Listar equipamentos de uma instalação
    ---
    tags:
      - Equipamentos Instalados
    security:
      - BearerAuth: []
    parameters:
      - name: tb_instalacao
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Lista de equipamentos da instalação.
    """
    current_user = get_jwt_identity()
    return list_equipamentos_by_instalacao(current_user, tb_instalacao)


# ========================= CREATE =========================
@bp.route('/equipamento_create', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def create_equipamento_route():
    """
    Registar equipamento instalado
    ---
    tags:
      - Equipamentos Instalados
    security:
      - BearerAuth: []
    consumes:
      - multipart/form-data
    responses:
      201:
        description: Equipamento registado.
    """
    current_user = get_jwt_identity()
    data = request.form.to_dict()
    files = request.files
    return create_equipamento(current_user, data, files)


# ========================= UPDATE =========================
@bp.route('/equipamento_update/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def update_equipamento_route(pk):
    """
    Atualizar equipamento instalado
    ---
    tags:
      - Equipamentos Instalados
    security:
      - BearerAuth: []
    consumes:
      - multipart/form-data
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Atualizado.
    """
    current_user = get_jwt_identity()
    data = request.form.to_dict() if request.form else (request.get_json() or {})
    files = request.files if request.files else {}
    return update_equipamento(current_user, pk, data, files)


# ========================= DELETE =========================
@bp.route('/equipamento_delete/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def delete_equipamento_route(pk):
    """
    Eliminar equipamento instalado
    ---
    tags:
      - Equipamentos Instalados
    security:
      - BearerAuth: []
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
    return delete_equipamento(current_user, pk)
