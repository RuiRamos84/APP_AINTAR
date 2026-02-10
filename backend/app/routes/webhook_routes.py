import base64
import json

from flask import Blueprint, current_app, request, jsonify
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.services.payment_service import payment_service
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger

logger = get_logger(__name__)

webhook_bp = Blueprint('webhook', __name__)


def decrypt_sibs_notification(encrypted_body, iv_b64, tag_b64, secret_b64):
    """
    Desencriptar notificação SIBS usando AES-GCM.

    Conforme documentação SIBS:
    - Encryption algorithm: AES
    - Block mode: GCM
    - Padding: None
    - IV: Base64 (header X-Initialization-Vector)
    - Auth tag: Base64 (header X-Authentication-Tag)
    - Body: Base64
    - Secret key: Base64 (SIBS_WEBHOOK_SECRET)
    """
    try:
        iv = base64.b64decode(iv_b64)
        encrypted_msg = base64.b64decode(encrypted_body)
        secret_key = base64.b64decode(secret_b64)
        auth_tag = base64.b64decode(tag_b64)

        aesgcm = AESGCM(secret_key)
        # A biblioteca cryptography espera ciphertext + tag concatenados
        plaintext = aesgcm.decrypt(iv, encrypted_msg + auth_tag, None)

        return json.loads(plaintext.decode('utf-8'))

    except Exception as e:
        logger.error(f"Erro na desencriptação AES-GCM: {e}")
        raise


@webhook_bp.route('/webhook/sibs/test', methods=['POST'])
@api_error_handler
def sibs_webhook_test():
    """
    Endpoint de TESTE para simular webhook SIBS sem encriptação.
    Apenas disponível em ambiente de desenvolvimento.
    Aceita JSON direto (sem AES-GCM).
    """
    env = current_app.config.get('ENV', 'production')
    if env == 'production':
        return jsonify({"error": "Not available in production"}), 403

    try:
        webhook_data = request.get_json()
        if not webhook_data:
            return jsonify({"error": "JSON body required"}), 400

        transaction_id = (
            webhook_data.get('transactionID')
            or webhook_data.get('merchantTransactionId')
        )
        payment_status = webhook_data.get('paymentStatus')
        payment_method = webhook_data.get('paymentMethod')
        notification_id = webhook_data.get(
            'notificationID', 'test-' + str(id(webhook_data))
        )

        logger.info(
            f"[TEST] Webhook simulado - Transaction: {transaction_id}, "
            f"Status: {payment_status}"
        )

        # Processar no serviço (mesmo fluxo do webhook real)
        result = payment_service.process_webhook(webhook_data)

        # Notificar frontend via SocketIO
        try:
            socketio_events = current_app.extensions.get('socketio_events')
            if socketio_events and transaction_id:
                socketio_events.emit_payment_status_update(
                    transaction_id=transaction_id,
                    payment_status=result.get('status', payment_status),
                    payment_method=payment_method,
                    webhook_data={
                        'transaction_id': transaction_id,
                        'payment_status': result.get('status', payment_status),
                        'payment_method': payment_method,
                        'notification_id': notification_id,
                        'document_id': result.get('document_id')
                    }
                )
                logger.info(
                    f"[TEST] SocketIO enviado para {transaction_id}"
                )
        except Exception as socket_err:
            logger.error(f"[TEST] Erro SocketIO: {socket_err}")

        return jsonify({
            "statusCode": "200",
            "statusMsg": "Success",
            "notificationID": str(notification_id),
            "_test": True,
            "_result": result
        }), 200

    except Exception as e:
        logger.error(f"[TEST] Erro webhook simulado: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@webhook_bp.route('/webhook/sibs', methods=['GET', 'POST'])
@api_error_handler
def sibs_webhook():
    """
    Endpoint para receber notificações webhook da SIBS.

    GET: Validação do endpoint (SIBS verifica se URL está acessível)
    POST: Receber notificações de pagamento

    Fluxo POST:
    1. Receber payload encriptado (Base64)
    2. Obter IV e Auth Tag dos headers
    3. Desencriptar com AES-GCM
    4. Processar a notificação (atualizar BD)
    5. Notificar frontend via SocketIO
    6. Responder com acknowledgment conforme documentação SIBS
    """
    # GET - Validação do webhook pela SIBS
    if request.method == 'GET':
        logger.info(f"[WEBHOOK] Validação GET recebida de {request.remote_addr}")
        return jsonify({
            "statusCode": "200",
            "statusMsg": "Webhook endpoint active"
        }), 200

    notification_id = None

    # DEBUG TEMPORÁRIO - Log para confirmar que webhook chegou
    logger.warning(f"[WEBHOOK DEBUG] Request recebido de {request.remote_addr}")

    try:
        # 1. Obter headers de autenticação
        iv_header = request.headers.get('X-Initialization-Vector')
        tag_header = request.headers.get('X-Authentication-Tag')

        if not iv_header or not tag_header:
            logger.warning("Webhook SIBS: Headers de autenticação ausentes")
            return jsonify({
                "statusCode": "400",
                "statusMsg": "Missing authentication headers"
            }), 400

        # 2. Obter secret key
        webhook_secret = current_app.config.get('SIBS_WEBHOOK_SECRET')
        if not webhook_secret:
            logger.error("SIBS_WEBHOOK_SECRET não configurado")
            return jsonify({
                "statusCode": "500",
                "statusMsg": "Server configuration error"
            }), 500

        # 3. Obter payload encriptado (body em Base64)
        encrypted_body = request.get_data(as_text=True)

        if not encrypted_body:
            logger.warning("Webhook SIBS: Payload vazio")
            return jsonify({
                "statusCode": "400",
                "statusMsg": "Empty payload"
            }), 400

        # 4. Desencriptar
        webhook_data = decrypt_sibs_notification(
            encrypted_body, iv_header, tag_header, webhook_secret
        )

        logger.info(f"Webhook SIBS desencriptado com sucesso: {json.dumps(webhook_data, default=str)[:500]}")

        # 5. Extrair notificationID para o acknowledgment
        notification_id = webhook_data.get('notificationID') or webhook_data.get('id', 'unknown')

        # 6. Extrair dados do pagamento
        transaction_id = webhook_data.get('transactionID') or webhook_data.get('merchantTransactionId')
        payment_status = webhook_data.get('paymentStatus')
        payment_method = webhook_data.get('paymentMethod')

        logger.info(
            f"Webhook SIBS - Transaction: {transaction_id}, "
            f"Status: {payment_status}, Method: {payment_method}, "
            f"NotificationID: {notification_id}"
        )

        # 7. Processar no serviço de pagamentos (atualizar BD)
        result = payment_service.process_webhook(webhook_data)

        # 8. Notificar frontend via SocketIO
        try:
            socketio_events = current_app.extensions.get('socketio_events')
            if socketio_events and transaction_id:
                socketio_events.emit_payment_status_update(
                    transaction_id=transaction_id,
                    payment_status=result.get('status', payment_status),
                    payment_method=payment_method,
                    webhook_data={
                        'transaction_id': transaction_id,
                        'payment_status': result.get('status', payment_status),
                        'payment_method': payment_method,
                        'notification_id': notification_id,
                        'document_id': result.get('document_id')
                    }
                )
                logger.info(f"SocketIO notificação enviada para transaction {transaction_id}")
        except Exception as socket_err:
            logger.error(f"Erro ao enviar notificação SocketIO: {socket_err}")
            # Não falhar o webhook por causa do SocketIO

        # 9. Responder com acknowledgment conforme documentação SIBS
        return jsonify({
            "statusCode": "200",
            "statusMsg": "Success",
            "notificationID": str(notification_id)
        }), 200

    except json.JSONDecodeError as e:
        logger.error(f"Erro ao parsear JSON desencriptado: {e}")
        return jsonify({
            "statusCode": "400",
            "statusMsg": "Invalid decrypted payload",
            "notificationID": str(notification_id) if notification_id else "unknown"
        }), 400

    except Exception as e:
        logger.error(f"Erro no processamento do webhook SIBS: {e}", exc_info=True)
        return jsonify({
            "statusCode": "500",
            "statusMsg": "Internal server error",
            "notificationID": str(notification_id) if notification_id else "unknown"
        }), 500
