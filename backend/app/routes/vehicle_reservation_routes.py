from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.utils import set_session, token_required
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from ..services.vehicle_reservation_service import (
    list_vehicle_reservations,
    add_vehicle_reservation,
    update_vehicle_reservation,
    cancel_vehicle_reservation,
    complete_vehicle_reservation,
)

logger = get_logger(__name__)
bp = Blueprint('vehicle_reservation_routes', __name__)

# ========================= RESERVATION LIST =========================
@bp.route('/vehicle_reservation_list', methods=['GET'])
@jwt_required()
@token_required
@require_permission('fleet.reservations.view')  # ts_interface: fleet.reservations.view
@set_session
@api_error_handler
def list_vehicle_reservation_route():
    """
    Listar Reservas de Viaturas
    ---
    tags:
      - Gestão de Frota (Reservas)
    summary: Devolve as reservas de viaturas, com filtros opcionais de veículo e período.
    security:
      - BearerAuth: []
    parameters:
      - name: vehicle
        in: query
        type: integer
        required: false
      - name: date_from
        in: query
        type: string
        required: false
      - name: date_to
        in: query
        type: string
        required: false
    responses:
      200:
        description: Listagem de reservas.
    """
    current_user = get_jwt_identity()
    filters = {
        "vehicle": request.args.get("vehicle"),
        "date_from": request.args.get("date_from"),
        "date_to": request.args.get("date_to"),
    }
    return list_vehicle_reservations(current_user, filters)

# ========================= RESERVATION CREATE =========================
@bp.route('/vehicle_reservation_create', methods=['POST'])
@jwt_required()
@token_required
@require_permission('fleet.reservations.create')  # ts_interface: fleet.reservations.create
@set_session
@api_error_handler
def add_vehicle_reservation_route():
    """
    Criar Reserva de Viatura
    ---
    tags:
      - Gestão de Frota (Reservas)
    summary: Regista uma reserva futura de uma viatura para um colaborador, período e destino.
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
        description: Reserva criada.
      409:
        description: Conflito — a viatura já está reservada nesse período.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return add_vehicle_reservation(current_user, data)

# ========================= RESERVATION UPDATE =========================
@bp.route('/vehicle_reservation_update/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('fleet.reservations.create')  # ownership verificado no service
@set_session
@api_error_handler
def update_vehicle_reservation_route(pk):
    """
    Reagendar/Editar Reserva de Viatura
    ---
    tags:
      - Gestão de Frota (Reservas)
    summary: Edita período, destino ou observações de uma reserva existente.
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
        description: Reserva atualizada.
      403:
        description: Sem permissão para editar reservas de outro colaborador.
      409:
        description: Conflito — a viatura já está reservada nesse período.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return update_vehicle_reservation(current_user, pk, data)

# ========================= RESERVATION CANCEL =========================
@bp.route('/vehicle_reservation_cancel/<int:pk>', methods=['POST'])
@jwt_required()
@token_required
@require_permission('fleet.reservations.create')  # ownership verificado no service
@set_session
@api_error_handler
def cancel_vehicle_reservation_route(pk):
    """
    Cancelar Reserva de Viatura
    ---
    tags:
      - Gestão de Frota (Reservas)
    summary: Cancela uma reserva, libertando o período para novas reservas.
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Reserva cancelada.
    """
    current_user = get_jwt_identity()
    return cancel_vehicle_reservation(current_user, pk)

# ========================= RESERVATION COMPLETE =========================
@bp.route('/vehicle_reservation_complete/<int:pk>', methods=['POST'])
@jwt_required()
@token_required
@require_permission('fleet.reservations.create')  # ownership verificado no service
@set_session
@api_error_handler
def complete_vehicle_reservation_route(pk):
    """
    Concluir Reserva de Viatura
    ---
    tags:
      - Gestão de Frota (Reservas)
    summary: Marca a reserva como concluída (viatura entregue), libertando o período.
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: false
        schema:
          type: object
          properties:
            km:
              type: integer
              description: Km de retorno da viatura (opcional).
    responses:
      200:
        description: Reserva concluída.
    """
    current_user = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    return complete_vehicle_reservation(current_user, pk, data.get("km"))
