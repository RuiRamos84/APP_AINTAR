# app/services/alert_whatsapp_service.py
"""
Serviço de alertas via WhatsApp (CallMeBot)
Lê o alerta mais recente de tb_sensordataraw e envia via WhatsApp
"""

import requests
from urllib.parse import quote
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
def send_whatsapp_alert(phone: str, apikey: str, pk: int = None):
    """
    Envia o alerta via WhatsApp usando a API CallMeBot.

    Args:
        phone: Número de telefone com código de país (ex: +351912345678)
        apikey: API key do CallMeBot
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

        # Chamar API CallMeBot
        url = (
            f"https://api.callmebot.com/whatsapp.php"
            f"?phone={quote(phone)}"
            f"&text={quote(mensagem)}"
            f"&apikey={quote(apikey)}"
        )

        response = requests.get(url, timeout=15)

        if response.status_code == 200:
            logger.info(f"Alerta WhatsApp enviado para {phone[:6]}*** — sensor {sensor_id}")
            return {
                "status": "ok",
                "message": "Alerta enviado com sucesso via WhatsApp",
                "phone": phone[:4] + "****" + phone[-3:],
                "sensor_id": sensor_id,
                "alert_severity": alert_severity,
            }, 200
        else:
            logger.warning(f"CallMeBot respondeu {response.status_code}: {response.text}")
            raise APIError(
                f"Erro ao enviar WhatsApp (CallMeBot): {response.text}",
                502,
                "ERR_CALLMEBOT"
            )

    except APIError:
        raise
    except requests.exceptions.Timeout:
        raise APIError("Timeout ao contactar CallMeBot", 504, "ERR_TIMEOUT")
    except requests.exceptions.RequestException as e:
        logger.error(f"Erro de rede ao enviar WhatsApp: {str(e)}")
        raise APIError("Erro de rede ao enviar WhatsApp", 502, "ERR_NETWORK")
    except Exception as e:
        logger.error(f"Erro inesperado ao enviar WhatsApp: {str(e)}")
        raise APIError(f"Erro interno: {str(e)}", 500, "ERR_INTERNAL")
