# app/services/alert_whatsapp_service.py
"""
Serviço de alertas via WhatsApp (Twilio)
Lê o alerta mais recente de tb_sensordataraw e envia via WhatsApp
"""

import requests
from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioRestException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app import db
from app.utils.error_handler import api_error_handler, APIError
from app.utils.logger import get_logger

logger = get_logger(__name__)


@api_error_handler
def get_latest_alert(pk: int = None):
    """
    Obtém o alerta mais recente (ou de um pk específico) da tb_sensordataraw.
    Extrai o campo alerts.alert_message do JSON da coluna value.

    Args:
        pk: PK específico (opcional). Se None, usa o mais recente.

    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        if pk:
            query = text("""
                SELECT pk, data, value
                FROM tb_sensordataraw
                WHERE pk = :pk
            """)
            result = db.session.execute(query, {"pk": pk}).mappings().fetchone()
        else:
            query = text("""
                SELECT pk, data, value
                FROM tb_sensordataraw
                WHERE value::jsonb ? 'alerts'
                  AND value::jsonb -> 'alerts' ->> 'alert_message' IS NOT NULL
                ORDER BY data DESC
                LIMIT 1
            """)
            result = db.session.execute(query).mappings().fetchone()

        if not result:
            raise APIError("Nenhum registo encontrado", 404, "ERR_NOT_FOUND")

        value = result["value"]

        # value pode ser dict (JSON PostgreSQL) ou string
        if isinstance(value, str):
            import json
            value = json.loads(value)

        alerts = value.get("alerts", {})
        alert_message = alerts.get("alert_message", "")
        alert_severity = alerts.get("alert_severity", "unknown")
        alert_codes = alerts.get("alert_codes", [])
        sensor_id = value.get("sensor_id", "desconhecido")
        timestamp = value.get("timestamp", "")

        data_str = result["data"]
        if hasattr(data_str, "isoformat"):
            data_str = data_str.isoformat()

        return {
            "status": "ok",
            "pk": result["pk"],
            "data": data_str,
            "sensor_id": sensor_id,
            "timestamp": timestamp,
            "alert_severity": alert_severity,
            "alert_codes": alert_codes,
            "alert_message": alert_message,
        }, 200

    except APIError:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Erro BD ao obter alerta: {str(e)}")
        raise APIError("Erro ao consultar alerta", 500, "ERR_DATABASE")
    except Exception as e:
        logger.error(f"Erro inesperado ao obter alerta: {str(e)}")
        raise APIError(f"Erro interno: {str(e)}", 500, "ERR_INTERNAL")


@api_error_handler
def send_whatsapp_alert(phone: str, pk: int = None):
    """
    Envia o alerta via WhatsApp usando a API Twilio.

    Args:
        phone: Número de destino com código de país (ex: +351912345678)
        pk: PK do registo (opcional, usa o mais recente se None)

    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        # Obter o alerta
        alert_result, status = get_latest_alert(pk)

        if status != 200:
            return alert_result, status

        alert_message = alert_result.get("alert_message", "")
        sensor_id = alert_result.get("sensor_id", "")
        alert_severity = alert_result.get("alert_severity", "")

        if not alert_message:
            raise APIError("Sem mensagem de alerta no registo", 400, "ERR_NO_ALERT_MESSAGE")

        # Montar mensagem
        mensagem = f"[AINTAR ALERTA]\nSensor: {sensor_id}\nSeveridade: {alert_severity.upper()}\n\n{alert_message}"

        # Credenciais do .env
        import os
        account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        from_number = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

        if not account_sid or not auth_token:
            raise APIError("Credenciais Twilio não configuradas no servidor", 500, "ERR_CONFIG")

        # Enviar via subprocess (contorna eventlet monkey-patch que quebra DNS no Windows)
        import subprocess, sys, json
        script = (
            "import sys, json\n"
            "from twilio.rest import Client\n"
            "d = json.loads(sys.argv[1])\n"
            "c = Client(d['sid'], d['token'])\n"
            "m = c.messages.create(from_=d['from_'], to=d['to'], body=d['body'])\n"
            "print(m.sid)\n"
        )
        payload = json.dumps({
            "sid": account_sid, "token": auth_token,
            "from_": from_number, "to": f"whatsapp:{phone}", "body": mensagem,
        })
        result = subprocess.run(
            [sys.executable, "-c", script, payload],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            raise Exception(result.stderr.strip())
        sid = result.stdout.strip()
        msg = type("Msg", (), {"sid": sid})()

        logger.info(f"Alerta WhatsApp enviado para {phone[:6]}*** — SID: {msg.sid}")
        return {
            "status": "ok",
            "message": "Alerta enviado com sucesso via WhatsApp",
            "phone": phone[:4] + "****" + phone[-3:],
            "sensor_id": sensor_id,
            "alert_severity": alert_severity,
        }, 200

    except APIError:
        raise
    except TwilioRestException as e:
        logger.error(f"Erro Twilio ao enviar WhatsApp: {str(e)}")
        raise APIError(f"Erro Twilio: {e.msg}", 502, "ERR_TWILIO")
    except Exception as e:
        logger.error(f"Erro inesperado ao enviar WhatsApp: {str(e)}")
        raise APIError(f"Erro interno: {str(e)}", 500, "ERR_INTERNAL")
