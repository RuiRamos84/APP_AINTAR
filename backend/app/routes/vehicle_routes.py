from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.utils import set_session, token_required
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from ..services.vehicle_service import (
    list_vehicle,
    add_vehicle,
    update_vehicle,
   
    list_vehicle_assign,
    add_vehicle_assign,
    update_vehicle_assign,
    
    list_vehicle_maintenance,
    add_vehicle_maintenance,
    update_vehicle_maintenance,
    
)

logger = get_logger(__name__)
bp = Blueprint('vehicle_routes', __name__)

# ========================= VEHICLE LIST =========================
@bp.route('/vehicle_list', methods=['GET'])
@jwt_required()
@token_required
@require_permission('fleet.view')  # ts_interface: fleet.view
@set_session
@api_error_handler
def list_vehicle_route():
    """
    Listar Frota de Veículos
    ---
    tags:
      - Gestão de Frota (Veículos)
    summary: Devolve o catálogo de veículos geridos pela empresa.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Listagem de Veículos.
    """
    current_user = get_jwt_identity()
    return list_vehicle(current_user)

# ========================= VEHICLE CREATE =========================
@bp.route('/vehicle_create', methods=['POST'])
@jwt_required()
@token_required
@require_permission('fleet.edit')  # ts_interface: fleet.edit
@set_session
@api_error_handler
def add_vehicle_route():
    """
    Registar Novo Veículo
    ---
    tags:
      - Gestão de Frota (Veículos)
    summary: Adiciona nova viatura ao detalhe operacional da Frota.
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
        description: Veículo inserido.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return add_vehicle(current_user, data)

# ========================= VEHICLE UPDATE =========================
@bp.route('/vehicle_update/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
@api_error_handler
def update_vehicle_route(pk):
    """
    Atualizar Cadastro do Veículo
    ---
    tags:
      - Gestão de Frota (Veículos)
    summary: Edita propriedades fixas como matrícula, marca ou KMs iniciais.
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
        description: Atualizado.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return update_vehicle(current_user, pk, data)

# ========================= VEHICLE DELETE =========================


# ========================= VEHICLE ASSIGN LIST =========================
@bp.route('/vehicle_assign_list', methods=['GET'])
@jwt_required()
@token_required
@require_permission('fleet.view')  # ts_interface: fleet.view
@set_session
@api_error_handler
def list_vehicle_assign_route():
    """
    Listar Alocações de Veículos
    ---
    tags:
      - Gestão de Frota (Veículos)
    summary: Retorna um histórico das viaturas atribuídas aos colaboradores.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Array de Associações.
    """
    current_user = get_jwt_identity()
    return list_vehicle_assign(current_user)

# ========================= VEHICLE ASSIGN CREATE =========================
@bp.route('/vehicle_assign_create', methods=['POST'])
@jwt_required()
@token_required
@require_permission('fleet.edit')  # ts_interface: fleet.edit
@set_session
@api_error_handler
def add_vehicle_assign_route():
    """
    Despachar Veículo para Funcionário
    ---
    tags:
      - Gestão de Frota (Veículos)
    summary: Regista o "check-out" ou uso prolongado de uma viatura.
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
        description: Atribuído.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return add_vehicle_assign(current_user, data)

# ========================= VEHICLE ASSIGN UPDATE =========================
@bp.route('/vehicle_assign_update/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('fleet.edit')  # ts_interface: fleet.edit
@set_session
@api_error_handler
def update_vehicle_assign_route(pk):
    """
    Atualizar Status de Atribuição (Check-In)
    ---
    tags:
      - Gestão de Frota (Veículos)
    summary: Usado muitas das vezes para proceder à rescisão do uso ou editar quilómetros à entrega.
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
        description: Devolvido/Atualizado.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return update_vehicle_assign(current_user, pk, data)

# ========================= VEHICLE ASSIGN DELETE =========================


# ========================= VEHICLE MAINTENANCE LIST =========================
@bp.route('/vehicle_maintenance_list', methods=['GET'])
@jwt_required()
@token_required
@require_permission('fleet.view')  # ts_interface: fleet.view
@set_session
@api_error_handler
def list_vehicle_maintenance_route():
    """
    Consultar Manutenções Auto
    ---
    tags:
      - Gestão de Frota (Veículos)
    summary: Tabela de intervenções mecânicas/custos realizados nas viaturas.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Logs de manutenção e oficinas.
    """
    current_user = get_jwt_identity()
    return list_vehicle_maintenance(current_user)

# ========================= VEHICLE MAINTENANCE CREATE =========================
@bp.route('/vehicle_maintenance_create', methods=['POST'])
@jwt_required()
@token_required
@require_permission('fleet.edit')  # ts_interface: fleet.edit
@set_session
@api_error_handler
def add_vehicle_maintenance_route():
    """
    Submeter Registo de Intervenção Auto
    ---
    tags:
      - Gestão de Frota (Veículos)
    summary: Agenda ou submete o lançamento numérico de despesas da viatura.
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
        description: Registo guardado.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return add_vehicle_maintenance(current_user, data)

# ========================= VEHICLE MAINTENANCE UPDATE =========================
@bp.route('/vehicle_maintenance_update/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('fleet.edit')  # ts_interface: fleet.edit
@set_session
@api_error_handler
def update_vehicle_maintenance_route(pk):
    """
    Corrigir Intervenção da Oficina
    ---
    tags:
      - Gestão de Frota (Veículos)
    summary: Atualiza KMs reais ou Custos Pós-Intervenção.
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
        description: Manutenção corrigida com sucesso.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return update_vehicle_maintenance(current_user, pk,data)

# ========================= VEHICLE MAINTENANCE DELETE =========================
