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

    def get_invoice_amount(self, document_id, current_user):
        try:
            with db_session_manager(current_user) as session:
                query = text(
                    """SELECT * FROM vbl_document_invoice WHERE tb_document = :document_id"""
                )
                result = session.execute(
                    query, {"document_id": document_id}).fetchone()
                if result:
                    invoice_data = {}
                    if hasattr(result, '_mapping'):
                        for key in result._mapping:
                            invoice_data[key] = result._mapping[key]
                    elif hasattr(result, 'keys'):
                        for key in result.keys():
                            invoice_data[key] = result[key]
                    else:
                        columns = ['pk', 'tb_document', 'urgency', 'invoice', 'presented', 'accepted',
                                   'payed', 'closed', 'updated_at', 'payment_reference',
                                   'payment_method', 'payment_status', 'order_id']
                        for i, column in enumerate(columns):
                            if i < len(result):
                                invoice_data[column] = result[i]
                    return invoice_data
                # se não existe, chama a função e repete
                query_fn = text(
                    """SELECT fbo_document_invoice$getset(:document_id) as amount"""
                )
                fn_result = session.execute(
                    query_fn, {"document_id": document_id}).fetchone()
                if fn_result and fn_result[0] is not None:
                    query = text(
                        """SELECT * FROM vbl_document_invoice WHERE tb_document = :document_id"""
                    )
                    updated = session.execute(
                        query, {"document_id": document_id}).fetchone()
                    if updated:
                        invoice_data = {}
                        if hasattr(updated, '_mapping'):
                            for key in updated._mapping:
                                invoice_data[key] = updated._mapping[key]
                        elif hasattr(updated, 'keys'):
                            for key in updated.keys():
                                invoice_data[key] = updated[key]
                        else:
                            cols = ['pk', 'tb_document', 'urgency', 'invoice', 'presented', 'accepted',
                                    'payed', 'closed', 'updated_at', 'payment_reference',
                                    'payment_method', 'payment_status', 'order_id']
                            for i, col in enumerate(cols):
                                if i < len(updated):
                                    invoice_data[col] = updated[i]
                        return invoice_data
                    return {"amount": float(fn_result[0])}
                return None
        except Exception as e:
            logger.error(f"Erro ao obter o valor da fatura: {e}")
            raise

    def create_checkout(self, order_id, amount, methods, current_user):
        try:
            url = f"{self.base_url}/payments"
            now = datetime.utcnow().isoformat()
            expiry = (datetime.utcnow() + timedelta(days=2)).isoformat()
            payment_reference_obj = {
                "initialDatetime": now,
                "finalDatetime": expiry,
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
                    "transactionTimestamp": now,
                    "description": order_id,
                    "moto": False,
                    "paymentType": "PURS",
                    "amount": {"value": amount, "currency": "EUR"},
                    "paymentMethod": ["CARD", "MBWAY", "REFERENCE"],
                    "paymentReference": payment_reference_obj
                }
            }
            resp = requests.post(
                url, json=payload, headers=self._get_headers(), timeout=30)
            resp.raise_for_status()
            data = resp.json()
            transaction_id = data.get("transactionID")
            transaction_signature = data.get("transactionSignature")
            with db_session_manager(current_user) as db:
                db.execute(text(
                    """
                    INSERT INTO vbf_sibs
                      (pk, order_id, transaction_id, transaction_signature,
                       amount, currency, payment_method, payment_status,
                       payment_reference, entity, expiry_date, created_at)
                    VALUES
                      (nextval('sq_codes'), :order_id, :transaction_id, :transaction_signature,
                       :amount, 'EUR', :method, 'PENDING_VALIDATION',
                       :pref, 'SIBS', :expiry_date, NOW())
                    """
                ), {
                    "order_id": order_id,
                    "transaction_id": transaction_id,
                    "transaction_signature": transaction_signature,
                    "amount": amount,
                    "method": methods,
                    "pref": json.dumps(payment_reference_obj),
                    "expiry_date": expiry
                })
            return {"success": True, "transaction_id": transaction_id, "transaction_signature": transaction_signature}
        except Exception as e:
            logger.error(f"Erro em create_checkout: {e}")
            return {"success": False, "error": str(e)}

    def create_mbway_payment(self, transaction_id, transaction_signature, phone_number, current_user):
        try:
            url = f"{self.base_url}/payments/{transaction_id}/mbway-id/purchase"
            headers = {
                "Authorization": f"Digest {transaction_signature}",
                "X-IBM-Client-Id": self.client_id,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            resp = requests.post(
                url, json={"customerPhone": phone_number}, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            with db_session_manager(current_user) as db:
                db.execute(text(
                    """
                    UPDATE vbf_sibs
                    SET payment_reference = :pref, updated_at = NOW()
                    WHERE transaction_id = :transaction_id
                    """
                ), {"pref": resp.text, "transaction_id": transaction_id})
            return {"success": True, "mbway_response": data}
        except Exception as e:
            logger.error(f"Erro em create_mbway_payment: {e}")
            return {"success": False, "error": str(e)}

    def create_multibanco_reference(self, transaction_id, transaction_signature, expiry_date, current_user):
        try:
            url = f"{self.base_url}/payments/{transaction_id}/service-reference/generate"
            headers = {
                "Authorization": f"Digest {transaction_signature}",
                "X-IBM-Client-Id": self.client_id,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            resp = requests.post(url, json={}, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            with db_session_manager(current_user) as db:
                db.execute(text(
                    """
                    UPDATE vbf_sibs
                    SET payment_reference = :pref, updated_at = NOW()
                    WHERE transaction_id = :transaction_id
                    """
                ), {"pref": resp.text, "transaction_id": transaction_id})
            return {"success": True, "multibanco_response": data}
        except Exception as e:
            logger.error(f"Erro em create_multibanco_reference: {e}")
            return {"success": False, "error": str(e)}

    def check_payment_status(self, transaction_id, document_id, current_user):
        try:
            url = f"{self.base_url}/payments/{transaction_id}/status"
            resp = requests.get(url, headers=self._get_headers(), timeout=30)
            resp.raise_for_status()
            data = resp.json()
            status_info = data.get("status", data)
            payment_method = status_info.get("paymentMethod")
            payment_reference = (
                status_info.get("token", {}).get("value")
                if payment_method == "MBWAY"
                else json.dumps(status_info)
            )
            status = status_info.get("paymentStatus", "UNKNOWN")

            with db_session_manager(current_user) as db:
                sibs_pk = db.execute(text(
                    "SELECT pk FROM vbf_sibs WHERE transaction_id = :transaction_id"
                ), {"transaction_id": transaction_id}).scalar()
                if not sibs_pk:
                    return {"success": False, "message": "Registo não encontrado"}

                new_status = (
                    'PENDING_VALIDATION' if status.lower() == 'success' else status
                )
                db.execute(text("""
                    UPDATE vbf_sibs
                    SET payment_status = :st,
                        payment_reference = :pref,
                        updated_at = NOW()
                    WHERE transaction_id = :transaction_id
                """), {"st": new_status, "pref": payment_reference, "transaction_id": transaction_id})

            message = (
                "Pagamento recebido, pendente validação manual"
                if new_status == 'PENDING_VALIDATION'
                else f"Status atualizado: {status}"
            )
            return {"success": True, "status": data, "message": message}
        except Exception as e:
            logger.error(f"Erro em check_payment_status: {e}")
            return {"success": False, "error": str(e)}

    def process_webhook(self, data):
        try:
            transaction_id = data.get("transactionID")
            status = data.get("paymentStatus")
            if not transaction_id or not status:
                raise Exception("Dados inválidos no webhook")
            with db_session_manager(None) as db:
                new_status = 'PENDING_VALIDATION' if status.lower() == 'success' else status
                db.execute(text("""
                    UPDATE vbf_sibs
                    SET payment_status = :st, updated_at = NOW()
                    WHERE transaction_id = :transaction_id
                """), {"st": new_status, "transaction_id": transaction_id})
            return {"success": True, "message": "Webhook processado"}
        except Exception as e:
            logger.error(f"Erro em process_webhook: {e}")
            return {"success": False, "error": str(e)}

    def register_manual_payment(self, order_id, amount, payment_type, reference_info, current_user):
        try:
            transaction_id = f"MANUAL-{order_id}-{datetime.utcnow():%Y%m%d%H%M%S}"
            meta = {
                "manual_payment": True,
                "reference_info": reference_info,
                "submitted_by": current_user,
                "submitted_at": datetime.utcnow().isoformat()
            }
            with db_session_manager(current_user) as db:
                result = db.execute(text("""
                    INSERT INTO vbf_sibs
                      (pk, order_id, transaction_id, transaction_signature,
                       amount, currency, payment_method, payment_status,
                       payment_reference, entity, created_at)
                    VALUES
                      (nextval('sq_codes'), :order_id, :transaction_id, 'MANUAL',
                       :amount, 'EUR', :payment_method, 'PENDING_VALIDATION',
                       :payment_reference, 'MANUAL', NOW())
                    RETURNING pk
                """), {
                    "order_id": order_id,
                    "transaction_id": transaction_id,
                    "amount": amount,
                    "payment_method": payment_type,
                    "payment_reference": json.dumps(meta)
                }).fetchone()
                payment_pk = result[0] if result else None
            return {"success": True, "transaction_id": transaction_id, "payment_pk": payment_pk}
        except Exception as e:
            logger.error(f"Erro em register_manual_payment: {e}")
            return {"success": False, "error": str(e)}

    def approve_payment(self, payment_pk, user_pk):
        try:
            with db_session_manager(user_pk) as db:
                db.execute(text("""
                    UPDATE vbf_sibs
                    SET payment_status = 'Success',
                        validated_by   = :user_pk,
                        validated_at   = NOW(),
                        updated_at     = NOW()
                    WHERE pk = :payment_pk
                """), {"user_pk": user_pk, "payment_pk": payment_pk})
                order_id = db.execute(text(
                    "SELECT order_id FROM vbf_sibs WHERE pk = :payment_pk"
                ), {"payment_pk": payment_pk}).scalar()
                db.execute(text("SELECT fbo_document_invoice$sibs(:doc, :pk)"),
                           {"doc": order_id, "pk": payment_pk})
            return {"success": True, "message": "Pagamento aprovado com sucesso"}
        except Exception as e:
            logger.error(f"Erro em approve_payment: {e}")
            return {"success": False, "error": str(e)}


payment_service = PaymentService()