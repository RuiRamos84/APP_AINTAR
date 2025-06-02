import requests
from datetime import datetime, timedelta
import logging
from app.utils.utils import db_session_manager
from sqlalchemy import text
import json
import time

logger = logging.getLogger(__name__)


class PaymentStatus:
    CREATED = 'CREATED'
    PENDING = 'PENDING'
    PENDING_VALIDATION = 'PENDING_VALIDATION'
    SUCCESS = 'SUCCESS'
    DECLINED = 'DECLINED'
    EXPIRED = 'EXPIRED'


class PaymentService:
    def __init__(self):
        self.base_url = None
        self.terminal_id = None
        self.client_id = None
        self.entity = None
        self.api_token = None

    def init_app(self, app):
        self.base_url = "https://api.qly.sibspayments.com/sibs/spg/v2"
        self.terminal_id = int(app.config.get('SIBS_TERMINAL_ID'))
        self.client_id = app.config.get('SIBS_CLIENT_ID')
        self.entity = app.config.get('SIBS_ENTITY', '52791')
        self.api_token = app.config.get('SIBS_API_TOKEN')

    def _get_headers(self, auth_type="Bearer", token=None):
        """Headers para API SIBS"""
        token = token or self.api_token
        return {
            "Authorization": f"{auth_type} {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-IBM-Client-Id": self.client_id
        }

    def _validate_payment_data(self, data, required_fields):
        """Validação centralizada"""
        missing = [f for f in required_fields if f not in data]
        if missing:
            raise ValueError(f"Campos obrigatórios: {missing}")

        if 'amount' in data:
            try:
                data['amount'] = round(float(data['amount']), 2)
            except (ValueError, TypeError):
                raise ValueError("Valor inválido")

        return data

    def get_invoice_data(self, document_id, current_user):
        """Obter dados da fatura"""
        try:
            with db_session_manager(current_user) as session:
                query = text("""
                    SELECT * FROM vbl_document_invoice 
                    WHERE tb_document = :document_id
                """)
                result = session.execute(
                    query, {"document_id": document_id}).fetchone()

                if result:
                    return dict(result._mapping)

                session.execute(text("""
                    SELECT fbo_document_invoice$getset(:document_id)
                """), {"document_id": document_id})

                result = session.execute(
                    query, {"document_id": document_id}).fetchone()
                return dict(result._mapping) if result else None

        except Exception as e:
            logger.error(f"Erro ao obter dados da fatura {document_id}: {e}")
            raise

    def create_checkout(self, document_id, amount, payment_method, current_user):
        try:
            if payment_method in ['MBWAY', 'MULTIBANCO']:
                return self._create_sibs_checkout(document_id, amount, payment_method, current_user)
            else:
                return self._create_manual_checkout(document_id, amount, payment_method, current_user)
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _create_sibs_checkout(self, document_id, amount, payment_method, current_user):
        try:
            order_id = str(document_id)
            now = datetime.utcnow().isoformat()
            expiry = (datetime.utcnow() + timedelta(days=2)).isoformat()

            payload = {
                "merchant": {
                    "terminalId": self.terminal_id,
                    "channel": "web",
                    "merchantTransactionId": order_id
                },
                "transaction": {
                    "transactionTimestamp": now,
                    "description": f"Pagamento documento {document_id}",
                    "moto": False,
                    "paymentType": "PURS",
                    "amount": {"value": float(amount), "currency": "EUR"},
                    "paymentMethod": ["CARD", "MBWAY", "REFERENCE"],
                    "paymentReference": {
                        "initialDatetime": now,
                        "finalDatetime": expiry,
                        "maxAmount": {"value": float(amount), "currency": "EUR"},
                        "minAmount": {"value": float(amount), "currency": "EUR"},
                        "entity": self.entity
                    }
                }
            }

            resp = requests.post(
                f"{self.base_url}/payments", json=payload, headers=self._get_headers())
            resp.raise_for_status()
            data = resp.json()

            transaction_id = data["transactionID"]
            transaction_signature = data.get("transactionSignature")

            if not transaction_id or not transaction_signature:
                raise Exception("Resposta SIBS inválida")

            with db_session_manager(current_user) as db:
                # Gerar novo PK
                new_pk = db.execute(
                    text("SELECT nextval('sq_codes')")).scalar()

                # Inserir via função (16 parâmetros corretos)
                sibs_result = db.execute(text("""
                    SELECT aintar_server.fbf_sibs(0, :pk, :order_id, :transaction_id, 
                                   :transaction_signature, :amount, :currency, 
                                   :method, :status, :pref, :entity, 
                                   :expiry, :created_at, NULL, NULL, NULL)
                """), {
                    "pk": new_pk,
                    "order_id": order_id,
                    "transaction_id": transaction_id,
                    "transaction_signature": transaction_signature,
                    "amount": float(amount),
                    "currency": "EUR",
                    "method": payment_method,
                    "status": PaymentStatus.CREATED,
                    "pref": json.dumps(data.get("paymentReference", {})),
                    "entity": self.entity,
                    "expiry": expiry,
                    "created_at": now
                })

                sibs_pk = sibs_result.scalar()

                # Ligar à invoice (usar tabela base tb_document_invoice)
                db.execute(text("""
                    UPDATE tb_document_invoice 
                    SET tb_sibs = :sibs_pk 
                    WHERE tb_document = :document_id
                """), {"sibs_pk": sibs_pk, "document_id": document_id})

            logger.info(
                f"Checkout criado - Doc: {document_id}, TxID: {transaction_id}")

            return {
                "success": True,
                "transaction_id": transaction_id,
                "transaction_signature": transaction_signature,
                "amount": amount,
                "expiry_date": expiry
            }

        except Exception as e:
            logger.error(f"Erro em _create_sibs_checkout: {e}")
            raise

    def _create_manual_checkout(self, document_id, amount, payment_method, current_user):
        try:
            transaction_id = f"LOCAL-{document_id}-{int(time.time())}"

            with db_session_manager(current_user) as db:
                new_pk = db.execute(
                    text("SELECT nextval('sq_codes')")).scalar()

                result = db.execute(text("""
                    SELECT aintar_server.fbf_sibs(0, :pk, :order_id, :transaction_id, 
                                   'MANUAL', :amount, 'EUR', 
                                   :method, 'CREATED', NULL, 'MANUAL', 
                                   NULL, :created_at, NULL, NULL, NULL)
                """), {
                    "pk": new_pk,
                    "order_id": str(document_id),
                    "transaction_id": transaction_id,
                    "amount": float(amount),
                    "method": payment_method,
                    "created_at": datetime.utcnow()
                })

                sibs_pk = result.scalar()

                db.execute(text("UPDATE tb_document_invoice SET tb_sibs = :pk WHERE tb_document = :doc"),
                           {"pk": sibs_pk, "doc": document_id})

            return {
                "success": True,
                "transaction_id": transaction_id,
                "amount": amount
            }
        except Exception as e:
            logger.error(f"Erro em _create_manual_checkout: {e}")
            raise

    def process_mbway_payment(self, transaction_id, phone_number, current_user):
        """Processar pagamento MBWay"""
        try:
            with db_session_manager(current_user) as db:
                sibs_data = db.execute(text("""
                    SELECT transaction_signature, payment_status
                    FROM vbl_sibs 
                    WHERE transaction_id = :transaction_id
                """), {"transaction_id": transaction_id}).fetchone()

                if not sibs_data or sibs_data.payment_status != PaymentStatus.CREATED:
                    raise Exception("Transação não encontrada ou inválida")

                transaction_signature = sibs_data.transaction_signature

            if not phone_number.startswith("351#"):
                phone_number = f"351#{phone_number.replace('+351', '').replace(' ', '')}"

            url = f"{self.base_url}/payments/{transaction_id}/mbway-id/purchase"
            headers = self._get_headers("Digest", transaction_signature)

            resp = requests.post(
                url,
                json={"customerPhone": phone_number},
                headers=headers,
                timeout=30
            )
            resp.raise_for_status()

            data = resp.json()
            payment_status = data.get("paymentStatus", "UNKNOWN")

            status_map = {
                "Success": PaymentStatus.PENDING_VALIDATION,
                "Pending": PaymentStatus.PENDING,
                "Declined": PaymentStatus.DECLINED,
                "Expired": PaymentStatus.EXPIRED
            }
            internal_status = status_map.get(
                payment_status, PaymentStatus.PENDING)

            with db_session_manager(current_user) as db:
                db.execute(text("""
                    UPDATE tb_sibs
                    SET payment_status = :status,
                        payment_reference = :pref, 
                        updated_at = NOW()
                    WHERE transaction_id = :transaction_id
                """), {
                    "status": internal_status,
                    "pref": json.dumps(data),
                    "transaction_id": transaction_id
                })

            return {
                "success": True,
                "transaction_id": transaction_id,
                "payment_status": internal_status,
                "mbway_response": data
            }

        except Exception as e:
            logger.error(f"Erro em process_mbway_payment: {e}")
            return {"success": False, "error": str(e)}

    def process_multibanco_payment(self, transaction_id, current_user):
        """Processar pagamento Multibanco"""
        try:
            # Obter dados SIBS
            with db_session_manager(current_user) as db:
                sibs_data = db.execute(text("""
                    SELECT transaction_signature, payment_status
                    FROM vbl_sibs 
                    WHERE transaction_id = :transaction_id
                """), {"transaction_id": transaction_id}).fetchone()

                if not sibs_data or sibs_data.payment_status != PaymentStatus.CREATED:
                    raise Exception("Transação não encontrada ou inválida")

                transaction_signature = sibs_data.transaction_signature

            # Gerar referência MB
            url = f"{self.base_url}/payments/{transaction_id}/service-reference/generate"
            headers = self._get_headers("Digest", transaction_signature)

            resp = requests.post(url, json={}, headers=headers, timeout=30)
            resp.raise_for_status()

            data = resp.json()

            # Actualizar BD
            with db_session_manager(current_user) as db:
                db.execute(text("""
                    UPDATE tb_sibs
                    SET payment_status = :status,
                        payment_reference = :pref, 
                        updated_at = NOW()
                    WHERE transaction_id = :transaction_id
                """), {
                    "status": PaymentStatus.PENDING,
                    "pref": json.dumps(data),
                    "transaction_id": transaction_id
                })

            return {
                "success": True,
                "transaction_id": transaction_id,
                "multibanco_reference": data
            }

        except Exception as e:
            logger.error(f"Erro em process_multibanco_payment: {e}")
            return {"success": False, "error": str(e)}

    def check_payment_status(self, transaction_id, current_user):
        """Verificar estado do pagamento"""
        try:
            # Estado local primeiro
            with db_session_manager(current_user) as db:
                local_data = db.execute(text("""
                    SELECT s.payment_status, s.order_id, di.tb_document
                    FROM vbl_sibs s
                    LEFT JOIN vbl_document_invoice di ON di.order_id = s.order_id
                    WHERE s.transaction_id = :transaction_id
                """), {"transaction_id": transaction_id}).fetchone()

                if not local_data:
                    return {"success": False, "error": "Transação não encontrada"}

            # Consultar SIBS se ainda pendente
            if local_data.payment_status in [PaymentStatus.CREATED, PaymentStatus.PENDING]:
                url = f"{self.base_url}/payments/{transaction_id}/status"
                resp = requests.get(
                    url, headers=self._get_headers(), timeout=30)
                resp.raise_for_status()

                sibs_data = resp.json()
                payment_status = sibs_data.get("paymentStatus")

                # Mapear e actualizar se mudou
                status_map = {
                    "Success": PaymentStatus.PENDING_VALIDATION,
                    "Pending": PaymentStatus.PENDING,
                    "Declined": PaymentStatus.DECLINED,
                    "Expired": PaymentStatus.EXPIRED
                }
                new_status = status_map.get(
                    payment_status, PaymentStatus.PENDING)

                if new_status != local_data.payment_status:
                    with db_session_manager(current_user) as db:
                        db.execute(text("""
                            UPDATE tb_sibs
                            SET payment_status = :status,
                                payment_reference = :pref,
                                updated_at = NOW()
                            WHERE transaction_id = :transaction_id
                        """), {
                            "status": new_status,
                            "pref": json.dumps(sibs_data),
                            "transaction_id": transaction_id
                        })

                    return {
                        "success": True,
                        "payment_status": new_status,
                        "document_id": local_data.tb_document,
                        "updated": True
                    }

            return {
                "success": True,
                "payment_status": local_data.payment_status,
                "document_id": local_data.tb_document,
                "updated": False
            }

        except Exception as e:
            logger.error(f"Erro em check_payment_status: {e}")
            return {"success": False, "error": str(e)}

    def process_manual_payment(self, transaction_id, payment_details, current_user):
        """Processar pagamento manual (Cash/Transfer/Municipality)"""
        try:
            # Obter dados SIBS
            with db_session_manager(current_user) as db:
                sibs_data = db.execute(text("""
                    SELECT payment_method, payment_status, order_id
                    FROM vbl_sibs 
                    WHERE transaction_id = :transaction_id
                """), {"transaction_id": transaction_id}).fetchone()

                if not sibs_data or sibs_data.payment_status != PaymentStatus.CREATED:
                    raise Exception("Transação não encontrada ou inválida")

            meta = {
                "manual_payment": True,
                "payment_details": payment_details,
                "submitted_by": current_user,
                "submitted_at": datetime.utcnow().isoformat()
            }

            # Actualizar para pendente validação
            with db_session_manager(current_user) as db:
                db.execute(text("""
                    UPDATE tb_sibs
                    SET payment_status = :status,
                        payment_reference = :pref, 
                        updated_at = NOW()
                    WHERE transaction_id = :transaction_id
                """), {
                    "status": PaymentStatus.PENDING_VALIDATION,
                    "pref": json.dumps(meta),
                    "transaction_id": transaction_id
                })

            return {
                "success": True,
                "transaction_id": transaction_id,
                "payment_status": PaymentStatus.PENDING_VALIDATION
            }

        except Exception as e:
            logger.error(f"Erro em process_manual_payment: {e}")
            return {"success": False, "error": str(e)}

    def register_manual_payment(self, document_id, amount, payment_type, reference_info, current_user):
        """Registar pagamento manual direto (sem checkout prévio)"""
        try:
            data = self._validate_payment_data(
                {"document_id": document_id, "amount": amount},
                ["document_id", "amount"]
            )

            order_id = str(document_id)
            transaction_id = f"MANUAL-{order_id}-{datetime.utcnow():%Y%m%d%H%M%S}"

            meta = {
                "manual_payment": True,
                "reference_info": reference_info,
                "submitted_by": current_user,
                "submitted_at": datetime.utcnow().isoformat()
            }

            with db_session_manager(current_user) as db:
                new_pk = db.execute(
                    text("SELECT nextval('sq_codes')")).scalar()

                # Inserir SIBS manual
                sibs_result = db.execute(text("""
                    SELECT aintar_server.fbf_sibs(0, :pk, :order_id, :transaction_id, 
                                   'MANUAL', :amount, 'EUR', :payment_method, 
                                   :status, :payment_reference, 'MANUAL', 
                                   NULL, :created_at, NULL, NULL, NULL)
                """), {
                    "pk": new_pk,
                    "order_id": order_id,
                    "transaction_id": transaction_id,
                    "amount": float(data['amount']),
                    "payment_method": payment_type,
                    "status": PaymentStatus.PENDING_VALIDATION,
                    "payment_reference": json.dumps(meta),
                    "created_at": datetime.utcnow()
                })

                sibs_pk = sibs_result.scalar()

                # Ligar à invoice
                db.execute(text("""
                    UPDATE tb_document_invoice 
                    SET tb_sibs = :sibs_pk 
                    WHERE tb_document = :document_id
                """), {"sibs_pk": sibs_pk, "document_id": document_id})

            return {"success": True, "transaction_id": transaction_id}

        except Exception as e:
            logger.error(f"Erro em register_manual_payment: {e}")
            return {"success": False, "error": str(e)}

    def approve_payment(self, payment_pk, user_pk, current_user):
        """Aprovar pagamento pendente"""
        try:
            with db_session_manager(current_user) as db:
                # Actualizar estado
                db.execute(text("""
                    UPDATE tb_sibs
                    SET payment_status = :status,
                        validated_by = :user_pk,
                        validated_at = NOW(),
                        updated_at = NOW()
                    WHERE pk = :payment_pk
                """), {
                    "status": PaymentStatus.SUCCESS,
                    "user_pk": user_pk,
                    "payment_pk": payment_pk
                })

                # Obter document_id e actualizar invoice
                document_id = db.execute(text("""
                    SELECT di.tb_document
                    FROM tb_sibs s
                    JOIN tb_document_invoice di ON di.tb_sibs = s.pk
                    WHERE s.pk = :payment_pk
                """), {"payment_pk": payment_pk}).scalar()

                if document_id:
                    db.execute(text("""
                        SELECT fbo_document_invoice$sibs(:doc, :pk)
                    """), {"doc": document_id, "pk": payment_pk})

            return {"success": True, "message": "Pagamento aprovado"}

        except Exception as e:
            logger.error(f"Erro em approve_payment: {e}")
            return {"success": False, "error": str(e)}

    def get_pending_payments(self, current_user):
        """Obter pagamentos pendentes de validação"""
        try:
            with db_session_manager(current_user) as session:
                query = text("""
                    SELECT
                        s.pk, s.order_id, s.transaction_id, s.amount,
                        s.payment_method, s.payment_status, s.payment_reference,
                        s.created_at, s.entity, di.tb_document,
                        d.regnumber, d.memo as document_descr
                    FROM tb_sibs s
                    LEFT JOIN tb_document_invoice di ON di.tb_sibs = s.pk
                    LEFT JOIN tb_document d ON d.pk = di.tb_document
                    WHERE s.payment_status = :status
                    ORDER BY s.created_at DESC
                """)

                results = session.execute(query, {
                    "status": PaymentStatus.PENDING_VALIDATION
                }).fetchall()

                return [dict(row._mapping) for row in results]

        except Exception as e:
            logger.error(f"Erro ao obter pagamentos pendentes: {e}")
            raise

    def get_document_payment_status(self, document_id, current_user):
        """Estado completo do pagamento de um documento"""
        try:
            with db_session_manager(current_user) as session:
                query = text("""
                    SELECT 
                        di.pk, di.tb_document, di.invoice, di.presented,
                        di.accepted, di.payed, di.closed,
                        s.pk as sibs_pk, s.transaction_id, s.payment_status,
                        s.payment_method, s.amount, s.created_at as payment_created
                    FROM tb_document_invoice di
                    LEFT JOIN tb_sibs s ON s.pk = di.tb_sibs
                    WHERE di.tb_document = :document_id
                """)

                result = session.execute(
                    query, {"document_id": document_id}).fetchone()
                return dict(result._mapping) if result else None

        except Exception as e:
            logger.error(
                f"Erro ao obter estado do documento {document_id}: {e}")
            raise

    def process_webhook(self, webhook_data):
        """Processar webhook SIBS (notificações automáticas)"""
        try:
            transaction_id = webhook_data.get("transactionID")
            payment_status = webhook_data.get("paymentStatus")

            if not transaction_id:
                return {"success": False, "error": "Transaction ID missing"}

            # Mapear status SIBS para interno
            status_map = {
                "Success": PaymentStatus.SUCCESS,
                "Pending": PaymentStatus.PENDING,
                "Declined": PaymentStatus.DECLINED,
                "Expired": PaymentStatus.EXPIRED
            }

            internal_status = status_map.get(
                payment_status, PaymentStatus.PENDING)

            with db_session_manager("system") as db:
                # Actualizar status
                db.execute(text("""
                    UPDATE tb_sibs
                    SET payment_status = :status,
                        payment_reference = :pref,
                        updated_at = NOW()
                    WHERE transaction_id = :transaction_id
                """), {
                    "status": internal_status,
                    "pref": json.dumps(webhook_data),
                    "transaction_id": transaction_id
                })

                # Se sucesso, actualizar invoice
                if internal_status == PaymentStatus.SUCCESS:
                    document_id = db.execute(text("""
                        SELECT di.tb_document
                        FROM tb_sibs s
                        JOIN tb_document_invoice di ON di.tb_sibs = s.pk
                        WHERE s.transaction_id = :transaction_id
                    """), {"transaction_id": transaction_id}).scalar()

                    if document_id:
                        db.execute(text("""
                            SELECT fbo_document_invoice$sibs(:doc, (
                                SELECT pk FROM tb_sibs WHERE transaction_id = :transaction_id
                            ))
                        """), {"doc": document_id, "transaction_id": transaction_id})

            logger.info(
                f"Webhook processado: {transaction_id} -> {internal_status}")

            return {
                "success": True,
                "transaction_id": transaction_id,
                "status": internal_status
            }

        except Exception as e:
            logger.error(f"Erro no webhook: {e}")
            return {"success": False, "error": str(e)}


payment_service = PaymentService()
