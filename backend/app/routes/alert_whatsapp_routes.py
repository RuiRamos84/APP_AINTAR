# app/routes/alert_whatsapp_routes.py
"""
Rotas de alertas via WhatsApp

Endpoints:
    GET  /api/v1/alertas/whatsapp/ultimo   - Obtém o alerta mais recente
    POST /api/v1/alertas/whatsapp/enviar   - Envia alerta via WhatsApp (CallMeBot)

Autenticação: JWT obrigatório
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from app.services.alert_whatsapp_service import get_latest_alert, send_whatsapp_alert

logger = get_logger(__name__)

bp = Blueprint('alert_whatsapp', __name__)


@bp.route('/whatsapp/ultimo', methods=['GET'])
@jwt_required()
@api_error_handler
def get_ultimo_alerta():
    """
    Obtém o alerta mais recente da tb_sensordataraw.

    Query params:
        pk: PK específico (opcional)

    Returns:
        {"status": "ok", "pk": N, "sensor_id": "...", "alert_message": "...", ...}
    """
    try:
        pk = request.args.get('pk', None, type=int)
        return get_latest_alert(pk=pk)
    except Exception as e:
        logger.error(f"Erro ao obter último alerta: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


@bp.route('/whatsapp/enviar', methods=['POST'])
@jwt_required()
@api_error_handler
def enviar_alerta_whatsapp():
    """
    Envia o alerta via WhatsApp usando CallMeBot.

    Body JSON:
        phone:  str  — Número com código de país (ex: +351912345678)
        apikey: str  — API key do CallMeBot
        pk:     int  — PK do registo (opcional, usa o mais recente se omitido)

    Returns:
        {"status": "ok", "message": "...", "sensor_id": "...", ...}

    Errors:
        400: Parâmetros em falta
        404: Registo não encontrado
        502: Erro ao enviar pelo CallMeBot
        504: Timeout
    """
    try:
        body = request.get_json(force=True, silent=True) or {}
        phone = body.get("phone", "").strip()
        apikey = body.get("apikey", "").strip()
        pk = body.get("pk", None)

        if not phone:
            return jsonify({"status": "error", "message": "Número de telefone obrigatório"}), 400
        if not apikey:
            return jsonify({"status": "error", "message": "API key do CallMeBot obrigatória"}), 400

        return send_whatsapp_alert(phone=phone, apikey=apikey, pk=pk)

    except Exception as e:
        logger.error(f"Erro ao enviar alerta WhatsApp: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500
