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
    """Serviço de integração com SIBS Payments"""

    def __init__(self):
        self.base_url = None
        self.terminal_id = None
        self.client_id = None
        self.entity = None
        self.api_token = None
        self.checkout_cache = {}  # Cache de instância

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

    def _cleanup_expired_cache(self):
        """Limpeza automática de cache expirado"""
        now = time.time()
        expired = [k for k, v in self.checkout_cache.items()
                   if now - v["timestamp"] > 900]
        for k in expired:
            del self.checkout_cache[k]

    def get_invoice_data(self, document_id, current_user):
        """Obter dados da fatura - SEMPRE retorna estrutura"""
        try:
            with db_session_manager(current_user) as session:
                # Verificar se documento existe
                doc_check = text(
                    "SELECT pk FROM vbl_document WHERE pk = :document_id")
                doc_exists = session.execute(
                    doc_check, {"document_id": document_id}).fetchone()

                if not doc_exists:
                    raise Exception(f"Documento {document_id} não encontrado")

                # Buscar dados da fatura
                query = text("""
                    SELECT * FROM vbl_document_invoice 
                    WHERE tb_document = :document_id
                """)
                result = session.execute(
                    query, {"document_id": document_id}).fetchone()

                if result:
                    return dict(result._mapping)

                # Tentar criar automaticamente
                try:
                    session.execute(text("""
                        SELECT fbo_document_invoice$getset(:document_id)
                    """), {"document_id": document_id})

                    result = session.execute(
                        query, {"document_id": document_id}).fetchone()

                    if result:
                        return dict(result._mapping)
                except Exception as create_error:
                    current_app.logger.warning(
                        f"Não foi possível criar invoice: {create_error}")

                # Se tudo falhou, retornar estrutura com valores 0
                return {
                    'tb_document': document_id,
                    'invoice': 0.0,
                    'presented': False,
                    'accepted': False,
                    'payed': False,
                    'closed': False,
                    'urgency': False,
                    'tb_sibs': None
                }

        except Exception as e:
            logger.error(f"Erro fatura {document_id}: {e}")

            # Mesmo com erro, retornar estrutura válida
            return {
                'tb_document': document_id,
                'invoice': 0.0,
                'presented': False,
                'accepted': False,
                'payed': False,
                'closed': False,
                'urgency': False,
                'tb_sibs': None
            }

    def create_checkout_only(self, document_id, amount, payment_method, current_user):
        """Criar checkout SIBS sem gravar BD"""
        try:
            if payment_method not in ['MBWAY', 'MULTIBANCO']:
                return {"success": False, "error": "Método inválido para checkout SIBS"}

            # Limpeza do cache
            self._cleanup_expired_cache()

            with db_session_manager(current_user) as db:
                regnumber = db.execute(text("""
                    SELECT regnumber FROM tb_document WHERE pk = :doc_id
                """), {"doc_id": document_id}).scalar()

                if not regnumber:
                    return {"success": False, "error": "Documento não encontrado"}

            # Criar checkout SIBS
            now = datetime.utcnow().isoformat()
            expiry = (datetime.utcnow() + timedelta(days=2)).isoformat()

            payload = {
                "merchant": {
                    "terminalId": self.terminal_id,
                    "channel": "web",
                    "merchantTransactionId": regnumber
                },
                "transaction": {
                    "transactionTimestamp": now,
                    "description": f"Pagamento do pedido {regnumber}",
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

            resp = requests.post(f"{self.base_url}/payments",
                                 json=payload, headers=self._get_headers())
            resp.raise_for_status()
            data = resp.json()

            transaction_id = data["transactionID"]

            # Guardar no cache (15 min)
            self.checkout_cache[transaction_id] = {
                "document_id": document_id,
                "amount": amount,
                "order_id": regnumber,
                "transaction_signature": data.get("transactionSignature"),
                "payment_reference": data.get("paymentReference", {}),
                "timestamp": time.time()
            }

            return {
                "success": True,
                "transaction_id": transaction_id,
                "amount": amount,
                "expiry_date": expiry
            }

        except Exception as e:
            logger.error(f"Erro create_checkout_only: {e}")
            return {"success": False, "error": str(e)}

    def _get_checkout_data(self, transaction_id):
        """Recuperar dados do cache"""
        data = self.checkout_cache.get(transaction_id)
        if not data:
            return None

        # Verificar expiração (15 min)
        if time.time() - data["timestamp"] > 900:
            del self.checkout_cache[transaction_id]
            return None

        return data

    def process_mbway_from_checkout(self, transaction_id, phone_number, current_user):
        """MBWay usando checkout cache"""
        try:
            checkout_data = self._get_checkout_data(transaction_id)
            if not checkout_data:
                return {"success": False, "error": "Checkout expirado"}

            # Processar MBWay
            if not phone_number.startswith("351#"):
                phone_number = f"351#{phone_number.replace('+351', '').replace(' ', '')}"

            url = f"{self.base_url}/payments/{transaction_id}/mbway-id/purchase"
            headers = self._get_headers(
                "Digest", checkout_data["transaction_signature"])

            resp = requests.post(
                url, json={"customerPhone": phone_number}, headers=headers, timeout=30)
            resp.raise_for_status()

            sibs_response = resp.json()
            payment_status = sibs_response.get("paymentStatus", "UNKNOWN")
            print(f"SIBS Response: {sibs_response}")  # ADICIONAR LOG
            status_map = {
                "Success": PaymentStatus.PENDING_VALIDATION,
                "Pending": PaymentStatus.PENDING,
                "Declined": PaymentStatus.DECLINED,
                "Expired": PaymentStatus.EXPIRED
            }
            internal_status = status_map.get(
                payment_status, PaymentStatus.PENDING)

            # Gravar na BD
            with db_session_manager(current_user) as db:
                new_pk = db.execute(
                    text("SELECT nextval('sq_codes')")).scalar()

                sibs_result = db.execute(text("""
                    SELECT fbf_sibs(0, :pk, :order_id, :transaction_id, 
                                :transaction_signature, :amount, :currency, 
                                :method, :status, :pref, :entity, 
                                :expiry, :created_at, NULL, NULL, NULL)
                """), {
                    "pk": new_pk,
                    "order_id": checkout_data["order_id"],
                    "transaction_id": transaction_id,
                    "transaction_signature": checkout_data["transaction_signature"],
                    "amount": float(checkout_data["amount"]),
                    "currency": "EUR",
                    "method": "MBWAY",
                    "status": internal_status,
                    "pref": json.dumps(sibs_response),
                    "entity": self.entity,
                    "expiry": None,
                    "created_at": datetime.utcnow()
                })

                sibs_pk = sibs_result.scalar()

                db.execute(text("""
                    UPDATE tb_document_invoice 
                    SET tb_sibs = :sibs_pk 
                    WHERE tb_document = :document_id
                """), {"sibs_pk": sibs_pk, "document_id": checkout_data["document_id"]})

            # Limpar cache
            del self.checkout_cache[transaction_id]

            return {
                "success": True,
                "transaction_id": transaction_id,
                "payment_status": internal_status,
                "mbway_response": sibs_response
            }

        except Exception as e:
            logger.error(f"Erro process_mbway_from_checkout: {e}")
            return {"success": False, "error": str(e)}

    def process_multibanco_from_checkout(self, transaction_id, current_user):
        """Multibanco usando checkout cache"""
        try:
            checkout_data = self._get_checkout_data(transaction_id)
            if not checkout_data:
                return {"success": False, "error": "Checkout expirado"}

            # Gerar referência MB
            url = f"{self.base_url}/payments/{transaction_id}/service-reference/generate"
            headers = self._get_headers(
                "Digest", checkout_data["transaction_signature"])

            resp = requests.post(url, json={}, headers=headers, timeout=30)
            resp.raise_for_status()

            data = resp.json()
            payment_ref = data.get('paymentReference', {})

            entity = payment_ref.get('entity')
            reference = payment_ref.get('reference')
            expire_date = payment_ref.get('expireDate')

            # Gravar na BD
            with db_session_manager(current_user) as db:
                new_pk = db.execute(
                    text("SELECT nextval('sq_codes')")).scalar()

                sibs_result = db.execute(text("""
                    SELECT fbf_sibs(0, :pk, :order_id, :transaction_id, 
                                :transaction_signature, :amount, :currency, 
                                :method, :status, :pref, :entity, 
                                :expiry, :created_at, NULL, NULL, NULL)
                """), {
                    "pk": new_pk,
                    "order_id": checkout_data["order_id"],
                    "transaction_id": transaction_id,
                    "transaction_signature": checkout_data["transaction_signature"],
                    "amount": float(checkout_data["amount"]),
                    "currency": "EUR",
                    "method": "MULTIBANCO",
                    "status": PaymentStatus.PENDING,
                    "pref": reference,
                    "entity": entity,
                    "expiry": expire_date,
                    "created_at": datetime.utcnow()
                })

                sibs_pk = sibs_result.scalar()

                db.execute(text("""
                    UPDATE tb_document_invoice 
                    SET tb_sibs = :sibs_pk 
                    WHERE tb_document = :document_id
                """), {"sibs_pk": sibs_pk, "document_id": checkout_data["document_id"]})

            # Limpar cache
            del self.checkout_cache[transaction_id]

            return {
                "success": True,
                "transaction_id": transaction_id,
                "entity": entity,
                "reference": reference,
                "expire_date": expire_date
            }

        except Exception as e:
            logger.error(f"Erro process_multibanco_from_checkout: {e}")
            return {"success": False, "error": str(e)}

    def register_manual_payment_direct(self, document_id, amount, payment_type, reference_info, user_session, user_id=None):
        """Registar pagamento manual direto - CORRIGIDO"""
        try:
            # Criar payment_reference estruturado
            payment_reference = {
                "manual_payment": True,
                "payment_details": reference_info,
                "submitted_by": user_id,
                "submitted_at": datetime.now().isoformat(),
                "payment_type": payment_type
            }

            # Gerar transaction_id único
            transaction_id = f"MANUAL-{payment_type}-{document_id}-{int(time.time())}"

            # Inserir na base de dados usando session manager
            with db_session_manager(user_session) as db:
                # Gerar nova PK
                new_pk = db.execute(text("SELECT nextval('sq_codes')")).scalar()

                # Inserir utilizando a função fbf_sibs existente
                sibs_result = db.execute(text("""
                    SELECT fbf_sibs(0, :pk, :order_id, :transaction_id, 
                                NULL, :amount, 'EUR', 
                                :method, :status, :pref, NULL, 
                                NULL, :created_at, NULL, NULL, NULL)
                """), {
                    "pk": new_pk,
                    "order_id": f"MANUAL-{document_id}",
                    "transaction_id": transaction_id,
                    "amount": float(amount),
                    "method": payment_type,
                    "status": PaymentStatus.PENDING_VALIDATION,
                    "pref": json.dumps(payment_reference),
                    "created_at": datetime.now()
                })

                sibs_pk = sibs_result.scalar()

                # Actualizar tb_document_invoice
                db.execute(text("""
                    UPDATE tb_document_invoice 
                    SET tb_sibs = :sibs_pk 
                    WHERE tb_document = :document_id
                """), {"sibs_pk": sibs_pk, "document_id": document_id})

                # Commit explícito
                db.commit()

            return {
                "success": True,
                "transaction_id": transaction_id,
                "payment_status": PaymentStatus.PENDING_VALIDATION,
                "message": "Pagamento registado com sucesso"
            }

        except Exception as e:
            logger.error(f"Erro ao registar pagamento manual: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    # MANTER compatibilidade com método antigo
    def process_manual_direct(self, document_id, amount, payment_type, payment_details, current_user):
        """DEPRECATED: Usar register_manual_payment_direct"""
        return self.register_manual_payment_direct(document_id, amount, payment_type, payment_details, current_user)

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
                print(f"SIBS Response: {sibs_data}")  # ADICIONAR LOG

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

    def get_payment_details(self, payment_pk, current_user):
        """Obter detalhes completos do pagamento"""
        try:
            with db_session_manager(current_user) as session:
                query = text("""
                        SELECT 
                            s.pk, s.order_id, s.transaction_id, s.amount,
                            s.payment_method, s.payment_status, s.payment_reference,
                            s.created_at, s.updated_at, s.validated_by, s.validated_at,
                            b.tb_document, b.invoice, b.presented, b.accepted, 
                            b.payed, b.closed, b.urgency,
                            d.regnumber, d.memo as document_descr,
                            c.name as validator_name
                        FROM tb_sibs s
                        LEFT JOIN tb_document_invoice b ON b.tb_sibs = s.pk
                        LEFT JOIN tb_document d ON d.pk = b.tb_document
                        LEFT JOIN ts_client c ON c.pk = s.validated_by
                        WHERE s.pk = :payment_pk
                    """)

                result = session.execute(
                    query, {"payment_pk": payment_pk}).fetchone()
                return dict(result._mapping) if result else None

        except Exception as e:
            logger.error(f"Erro ao obter detalhes do pagamento {payment_pk}: {e}")
            raise

    def get_document_payment_status(self, document_id, current_user):
        """Estado pagamento - SEMPRE retorna estrutura"""
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

                if result:
                    return dict(result._mapping)

                # Sem dados = estrutura vazia mas válida
                return {
                    'tb_document': document_id,
                    'invoice': 0.0,
                    'presented': False,
                    'accepted': False,
                    'payed': False,
                    'closed': False,
                    'sibs_pk': None,
                    'transaction_id': None,
                    'payment_status': None,
                    'payment_method': None,
                    'amount': None,
                    'payment_created': None
                }

        except Exception as e:
            logger.error(f"Erro estado pagamento {document_id}: {e}")

            # Estrutura padrão mesmo com erro
            return {
                'tb_document': document_id,
                'invoice': 0.0,
                'presented': False,
                'accepted': False,
                'payed': False,
                'closed': False,
                'sibs_pk': None,
                'transaction_id': None,
                'payment_status': None,
                'payment_method': None,
                'amount': None,
                'payment_created': None
            }

    def get_payment_history(self, current_user, page, page_size, filters):
        """Histórico de pagamentos - exclui PENDING_VALIDATION"""
        try:
            with db_session_manager(current_user) as session:
                # Base: excluir CREATED e PENDING_VALIDATION
                where_conditions = [
                    "s.payment_status NOT IN ('CREATED', 'PENDING_VALIDATION')"
                ]
                params = {}

                if filters.get('start_date'):
                    where_conditions.append(
                        "DATE(s.created_at) >= :start_date")
                    params['start_date'] = filters['start_date']

                if filters.get('end_date'):
                    where_conditions.append("DATE(s.created_at) <= :end_date")
                    params['end_date'] = filters['end_date']

                if filters.get('method'):
                    where_conditions.append("s.payment_method = :method")
                    params['method'] = filters['method']

                if filters.get('status'):
                    where_conditions.append("s.payment_status = :status")
                    params['status'] = filters['status']

                where_clause = " AND ".join(where_conditions)

                # Query total
                count_query = text(f"""
                    SELECT COUNT(*) as total
                    FROM tb_sibs s
                    LEFT JOIN tb_document_invoice di ON di.tb_sibs = s.pk
                    WHERE {where_clause}
                """)

                total = session.execute(count_query, params).scalar()

                # Query paginada
                offset = (page - 1) * page_size
                params.update({'limit': page_size, 'offset': offset})

                data_query = text(f"""
                    SELECT
                        s.pk, s.order_id, s.transaction_id, s.amount,
                        s.payment_method, s.payment_status, s.payment_reference,
                        s.created_at, s.updated_at, s.validated_by, s.validated_at,
                        di.tb_document, d.regnumber, d.memo as document_descr
                    FROM tb_sibs s
                    LEFT JOIN tb_document_invoice di ON di.tb_sibs = s.pk
                    LEFT JOIN tb_document d ON d.pk = di.tb_document
                    WHERE {where_clause}
                    ORDER BY s.created_at DESC
                    LIMIT :limit OFFSET :offset
                """)

                results = session.execute(data_query, params).fetchall()
                payments = [dict(row._mapping) for row in results]

                return {
                    "success": True,
                    "payments": payments,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": (total + page_size - 1) // page_size
                }

        except Exception as e:
            logger.error(f"Erro get_payment_history: {e}")
            raise

    def get_sibs_data(self, order_id, current_user):
        """Dados completos SIBS"""
        try:
            with db_session_manager(current_user) as session:
                query = text("""
                    SELECT entity, payment_reference, expiry_date 
                    FROM vbf_sibs 
                    WHERE order_id = :order_id
                """)
                result = session.execute(query, {"order_id": order_id}).fetchone()
                return dict(result._mapping) if result else None
        except Exception as e:
            logger.error(f"Erro get_sibs_data: {e}")
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
