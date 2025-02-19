import requests
from datetime import datetime, timedelta
import logging
from app.utils.utils import db_session_manager
from sqlalchemy import text
import json

logger = logging.getLogger(__name__)


class PaymentService:
    def __init__(self):
        self.base_url = None
        self.terminal_id = None
        self.client_id = None
        self.merchant_id = None
        self.api_token = None

    def init_app(self, app):
        self.base_url = "https://api.qly.sibspayments.com/sibs/spg/v2"
        self.terminal_id = app.config.get('SIBS_TERMINAL_ID')
        self.client_id = app.config.get('SIBS_CLIENT_ID')
        self.merchant_id = app.config.get('SIBS_MERCHANT_ID')
        self.api_token = app.config.get('SIBS_API_TOKEN')
        logger.info("PaymentService inicializado.")

    def _get_headers(self):
        return {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-IBM-Client-Id": self.client_id
        }

    def create_checkout(self, order_id, amount, methods, session_token):
        try:
            checkout_url = f"{self.base_url}/payments"
            current_time = datetime.utcnow().isoformat()
            expiration_time = (datetime.utcnow() + timedelta(days=2)).isoformat()
            payment_reference_obj = {
                "initialDatetime": current_time,
                "finalDatetime": expiration_time,
                "maxAmount": {"value": amount, "currency": "EUR"},
                "minAmount": {"value": amount, "currency": "EUR"},
                "entity": self.merchant_id
            }
            payload = {
                "merchant": {
                    "terminalId": int(self.terminal_id),
                    "channel": "web",
                    "merchantTransactionId": order_id
                },
                "transaction": {
                    "transactionTimestamp": current_time,
                    "description": "teste",
                    "moto": False,
                    "paymentType": "PURS",
                    "amount": {"value": amount, "currency": "EUR"},
                    "paymentMethod": ["CARD", "MBWAY", "REFERENCE"],
                    "paymentReference": payment_reference_obj
                }
            }
            # logger.debug(f"URL Checkout: {checkout_url}")
            # logger.debug(f"Payload Checkout: {payload}")
            response = requests.post(
                checkout_url,
                json=payload,
                headers=self._get_headers(),
                timeout=30
            )
            # logger.debug(f"Status Checkout: {response.status_code}")
            # logger.debug(f"Resposta Checkout: {response.text}")
            if response.status_code not in [200, 201, 202]:
                raise Exception(f"Erro na SIBS (checkout): {response.text}")
            data = response.json()
            transaction_id = data.get("transactionID")
            transaction_signature = data.get("transactionSignature")
            # Guarda os dados na BD incluindo payment_reference e expiry_date
            with db_session_manager(session_token) as db:
                query = text("""
                    INSERT INTO vbf_sibs 
                    (pk, order_id, transaction_id, transaction_signature, amount, currency, payment_method, payment_status, payment_reference, entity, expiry_date, created_at)
                    VALUES (nextval('sq_codes'), :order_id, :transaction_id, :transaction_signature, :amount, 'EUR', :payment_method, 'PENDING', :payment_reference, :entity, :expiry_date, NOW())
                """)
                db.execute(query, {
                    "order_id": order_id,
                    "transaction_id": transaction_id,
                    "transaction_signature": transaction_signature,
                    "amount": amount,
                    "payment_method": methods,
                    "payment_reference": json.dumps(payment_reference_obj),
                    "entity": self.merchant_id,
                    "expiry_date": expiration_time
                })
            return {
                "success": True,
                "transaction_id": transaction_id,
                "transaction_signature": transaction_signature
            }
        except Exception as e:
            logger.error(f"Erro em create_checkout: {str(e)}")
            return {"success": False, "error": str(e)}

    def create_mbway_payment(self, transaction_id, transaction_signature, phone_number, session_token):
        try:
            mbway_url = f"{self.base_url}/payments/{transaction_id}/mbway-id/purchase"
            payload = {"customerPhone": phone_number}
            # Ajusta os headers para usar "Digest" com a transaction_signature
            headers = {
                "Authorization": f"Digest {transaction_signature}",
                "X-IBM-Client-Id": self.client_id,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            # logger.debug(f"URL MBWAY: {mbway_url}")
            # logger.debug(f"Payload MBWAY: {payload}")
            response = requests.post(
                mbway_url,
                json=payload,
                headers=headers,
                timeout=30
            )
            # logger.debug(f"Status MBWAY: {response.status_code}")
            # logger.debug(f"Resposta MBWAY: {response.text}")
            if response.status_code not in [200, 201, 202]:
                raise Exception(f"Erro na SIBS (MBWAY): {response.text}")
            data = response.json()
            # Atualiza o registo na BD
            with db_session_manager(session_token) as db:
                query = text("""
                    UPDATE vbf_sibs 
                    SET payment_reference = :payment_reference, updated_at = NOW()
                    WHERE transaction_id = :transaction_id
                """)
                db.execute(query, {
                    "payment_reference": response.text,
                    "transaction_id": transaction_id
                })
            return {"success": True, "mbway_response": data}
        except Exception as e:
            logger.error(f"Erro em create_mbway_payment: {str(e)}")
            return {"success": False, "error": str(e)}

    def create_multibanco_reference(self, transaction_id, transaction_signature, expiry_date, session_token):
        """
        Gera a referência e a entidade para Multibanco utilizando a API da SIBS,
        e atualiza o registo na BD.
        """
        try:
            reference_url = f"{self.base_url}/payments/{transaction_id}/service-reference/generate"
            headers = {
                "Authorization": f"Digest {transaction_signature}",
                "X-IBM-Client-Id": self.client_id,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            # Se a API não exigir payload, pode enviar um objeto vazio
            payload = {}
            # logger.debug(f"URL Multibanco Reference: {reference_url}")
            # logger.debug(f"Headers: {headers}")
            response = requests.post(
                reference_url,
                headers=headers,
                json=payload,
                timeout=30
            )
            # logger.debug(f"Status Multibanco Reference: {response.status_code}")
            # logger.debug(f"Resposta Multibanco Reference: {response.text}")
            if response.status_code not in [200, 201, 202]:
                raise Exception(f"Erro na SIBS (Multibanco): {response.text}")
            data = response.json()
            # Atualiza o registo na view com os dados da referência gerada;
            # supondo que a coluna para armazenar a resposta da referência se chame "multibanco_response"
            with db_session_manager(session_token) as db:
                query = text("""
                    UPDATE vbf_sibs
                    SET payment_reference = :payment_reference, updated_at = NOW()
                    WHERE transaction_id = :transaction_id
                """)
                db.execute(query, {
                    "payment_reference": response.text,
                    "transaction_id": transaction_id
                })
            return {"success": True, "multibanco_response": data}
        except Exception as e:
            logger.error(f"Erro em create_multibanco_reference: {str(e)}")
            return {"success": False, "error": str(e)}

    def check_payment_status(self, transaction_id, session_token):
        """
        Consulta o estado do pagamento na SIBS e atualiza o status e a referência na BD.
        """
        try:
            status_url = f"{self.base_url}/payments/{transaction_id}/status"
            logger.debug(f"URL Status: {status_url}")
            response = requests.get(
                status_url, headers=self._get_headers(), timeout=30)
            logger.debug(f"Status da requisição: {response.status_code}")
            logger.debug(f"Resposta Status: {response.text}")
            if response.status_code not in [200, 201, 202]:
                raise Exception(f"Erro na SIBS (status): {response.text}")
            data = response.json()
            # Se a resposta vier com um campo "status", usamos-o; caso contrário, usamos os dados diretamente.
            status_info = data.get("status", data)
            payment_status = status_info.get("paymentStatus", "UNKNOWN")

            # Se for MBWAY, usamos o número de telefone do token para payment_reference
            if status_info.get("paymentMethod") == "MBWAY":
                payment_reference = status_info.get("token", {}).get("value", "")
            else:
                payment_reference = json.dumps(status_info)

            # Atualiza o status e a referência na BD
            with db_session_manager(session_token) as db:
                query = text("""
                    UPDATE vbf_sibs
                    SET payment_status = :payment_status,
                        payment_reference = :payment_reference,
                        updated_at = NOW()
                    WHERE transaction_id = :transaction_id
                """)
                db.execute(query, {
                    "payment_status": payment_status,
                    "payment_reference": payment_reference,
                    "transaction_id": transaction_id
                })
            return {"success": True, "status": data}
        except Exception as e:
            logger.error(f"Erro em check_payment_status: {str(e)}")
            return {"success": False, "error": str(e)}

    def process_webhook(self, data):
        """
            Processa a notificação do webhook e atualiza o estado do pagamento na BD.
        """
        try:
            transaction_id = data.get("transactionID")
            payment_status = data.get("paymentStatus")
            if not transaction_id or not payment_status:
                raise Exception("Dados inválidos no webhook")
            with db_session_manager(None) as db:
                query = text("""
                    UPDATE vbf_sibs
                    SET payment_status = :payment_status, updated_at = NOW()
                    WHERE transaction_id = :transaction_id
                """)
                db.execute(
                    query, {"payment_status": payment_status, "transaction_id": transaction_id})
            return {"success": True, "message": "Status atualizado com sucesso"}
        except Exception as e:
            logger.error(f"Erro em process_webhook: {str(e)}")
            return {"success": False, "error": str(e)}


payment_service = PaymentService()
