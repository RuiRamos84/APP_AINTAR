from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.utils import set_session, token_required
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from ..services.my_vehicle_service import get_my_vehicle, report_breakdown

logger = get_logger(__name__)
bp = Blueprint('my_vehicle_routes', __name__)

# ========================= MY VEHICLE =========================
@bp.route('/my_vehicle', methods=['GET'])
@jwt_required()
@token_required
@require_permission('fleet.myvehicle.view')  # ts_interface: fleet.myvehicle.view
@set_session
@api_error_handler
def get_my_vehicle_route():
    """
    A Minha Viatura
    ---
    tags:
      - Gestão de Frota (A Minha Viatura)
    summary: Devolve a viatura atual do utilizador logado (reserva em curso ou atribuição perpétua).
    security:
      - BearerAuth: []
    responses:
      200:
        description: Viatura atual (ou vehicle=null se não tiver nenhuma).
    """
    current_user = get_jwt_identity()
    return get_my_vehicle(current_user)

# ========================= REPORT BREAKDOWN =========================
@bp.route('/vehicle_breakdown_report', methods=['POST'])
@jwt_required()
@token_required
@require_permission('fleet.myvehicle.report')  # ts_interface: fleet.myvehicle.report
@set_session
@api_error_handler
def report_breakdown_route():
    """
    Reportar Avaria
    ---
    tags:
      - Gestão de Frota (A Minha Viatura)
    summary: Regista uma avaria (e opcionalmente km) na viatura atual do utilizador.
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
            tb_vehicle:
              type: integer
            memo:
              type: string
            km:
              type: integer
    responses:
      201:
        description: Avaria registada.
      403:
        description: A viatura não é a atual do utilizador.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    if not data:
        return {"message": "JSON inválido ou body vazio"}, 400
    return report_breakdown(current_user, data)
