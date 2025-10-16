from flask import Blueprint, request, jsonify
import hmac
import hashlib
import os
from base64 import b64decode
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger



logger = get_logger(__name__)

webhook_bp = Blueprint('webhook', __name__)


def verify_sibs_signature(payload, headers):
    try:
        webhook_secret = os.getenv('SIBS_WEBHOOK_SECRET')
        if not webhook_secret:
            logger.error("SIBS_WEBHOOK_SECRET não configurado")
            return False

        # Obtém os headers necessários
        initialization_vector = headers.get('X-Initialization-Vector')
        authentication_tag = headers.get('X-Authentication-Tag')

        if not initialization_vector or not authentication_tag:
            logger.error("Headers de autenticação ausentes")
            return False

        # Decodifica os valores
        iv = b64decode(initialization_vector)
        tag = b64decode(authentication_tag)
        secret = b64decode(webhook_secret)

        # Calcula o HMAC
        h = hmac.new(secret, payload, hashlib.sha256)
        calculated_tag = h.digest()

        # Verifica se as tags correspondem
        return hmac.compare_digest(tag, calculated_tag)

    except Exception as e:
        logger.error(f"Erro na verificação da assinatura: {str(e)}")
        return False


@webhook_bp.route('/api/v1/webhook/sibs', methods=['POST'])
@api_error_handler
def sibs_webhook():
    try:
        # Obtém o payload raw
        payload = request.get_data()

        # Verifica a assinatura
        if not verify_sibs_signature(payload, request.headers):
            logger.warning("Assinatura inválida no webhook SIBS")
            return jsonify({"status": "error", "message": "Invalid signature"}), 401

        # Processa o webhook
        webhook_data = request.json

        # Obtém informações importantes
        transaction_id = webhook_data.get('merchantTransactionId')
        payment_status = webhook_data.get('status')
        payment_id = webhook_data.get('id')

        logger.info(
            f"Webhook recebido - Transaction: {transaction_id}, Status: {payment_status}")

        # Aqui você deve implementar a lógica para atualizar o status do pagamento
        # no seu banco de dados e realizar outras ações necessárias

        # Responde conforme documentação da SIBS
        return jsonify({
            "status": "success",
            "message": "Webhook processed successfully"
        }), 200

    except Exception as e:
        logger.error(f"Erro no processamento do webhook: {str(e)}")
        return jsonify({
            "status": "error",
            "message": "Internal server error"
        }), 500
