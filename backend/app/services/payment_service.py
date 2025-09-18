import requests
from datetime import datetime, timedelta
import logging
from app.utils.utils import db_session_manager
from sqlalchemy import text
import json
from datetime import date
import time
from pydantic import BaseModel, Field, conint, constr, condecimal
from typing import Optional
from app.utils.error_handler import api_error_handler, ResourceNotFoundError, APIError

logger = logging.getLogger(__name__)



class PaymentStatus:
    CREATED = 'CREATED'
    PENDING = 'PENDING'
    PENDING_VALIDATION = 'PENDING_VALIDATION'
    SUCCESS = 'SUCCESS'
    DECLINED = 'DECLINED'
    EXPIRED = 'EXPIRED'

class CheckoutCreate(BaseModel):
    document_id: int
    amount: condecimal(gt=0)
    payment_method: constr(pattern=r'^(MBWAY|MULTIBANCO)$')

class MBWayProcess(BaseModel):
    transaction_id: str
    phone_number: constr(pattern=r'^(\+351)?[0-9]{9}$')
    document_id: Optional[int] = None # Opcional, para recriação
    amount: Optional[condecimal(gt=0)] = None # Opcional, para recriação

class ManualPaymentRegister(BaseModel):
    document_id: int
    amount: condecimal(gt=0)
    payment_type: str
    reference_info: str
    user_id: Optional[int] = None

class PaymentHistoryFilters(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    method: Optional[str] = None
    status: Optional[str] = None


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
        """
        Obtém os dados da fatura de um documento.
        Tenta criar a fatura se ela não existir.
        Lança um erro se o documento não for encontrado.
        """
        with db_session_manager(current_user) as session:
            # 1. Verificar se o documento existe
            doc_check_query = text("SELECT pk FROM vbl_document WHERE pk = :document_id")
            doc_exists = session.execute(doc_check_query, {"document_id": document_id}).scalar()
            if not doc_exists:
                raise ResourceNotFoundError(f"Documento {document_id} não encontrado.")

            # 2. Tentar obter os dados da fatura
            invoice_query = text("SELECT * FROM vbl_document_invoice WHERE tb_document = :document_id")
            result = session.execute(invoice_query, {"document_id": document_id}).fetchone()

            # 3. Se a fatura existir, retorná-la
            if result:
                return dict(result._mapping)

            # 4. Se não existir, tentar criar a fatura
            try:
                session.execute(text("SELECT fbo_document_invoice$getset(:document_id)"), {"document_id": document_id})
                # Tentar buscar novamente após a criação
                result = session.execute(invoice_query, {"document_id": document_id}).fetchone()
                if result:
                    return dict(result._mapping)
            except Exception as create_error:
                logger.warning(f"Não foi possível criar a fatura para o documento {document_id}: {create_error}")
            
            # 5. Se a criação falhar ou não retornar dados, retornar uma estrutura vazia, mas válida.
            # Isto indica que o documento existe, mas não tem fatura associada.
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

    def create_checkout_only(self, data: dict, current_user: str):
        """Criar checkout SIBS sem gravar BD"""
        checkout_data = CheckoutCreate.model_validate(data)
        try:
            # Limpeza do cache
            self._cleanup_expired_cache()

            with db_session_manager(current_user) as db:
                regnumber = db.execute(text("""
                    SELECT regnumber FROM tb_document WHERE pk = :doc_id
                """), {"doc_id": checkout_data.document_id}).scalar()
                if not regnumber:
                    raise ResourceNotFoundError("Documento não encontrado")
            
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
                    "amount": {"value": float(checkout_data.amount), "currency": "EUR"},
                    "paymentMethod": ["CARD", "MBWAY", "REFERENCE"],
                    "paymentReference": {
                        "initialDatetime": now,
                        "finalDatetime": expiry,
                        "maxAmount": {"value": float(checkout_data.amount), "currency": "EUR"},
                        "minAmount": {"value": float(checkout_data.amount), "currency": "EUR"},
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
                "document_id": checkout_data.document_id,
                "amount": checkout_data.amount,
                "order_id": regnumber,
                "transaction_signature": data.get("transactionSignature"),
                "payment_reference": data.get("paymentReference", {}),
                "timestamp": time.time()
            }

            return {
                "success": True,
                "transaction_id": transaction_id,
                "amount": checkout_data.amount,
                "expiry_date": expiry
            }

        except Exception as e:
            logger.error(f"Erro create_checkout_only: {e}")
            raise

    def _get_checkout_data(self, transaction_id):
        """Recuperar dados do cache"""
        data = self.checkout_cache.get(transaction_id)
        if not data:
            logger.info(f"Checkout {transaction_id} não encontrado no cache.")
            return None, False # Não existe, não está expirado

        # Verificar expiração (15 min)
        if time.time() - data["timestamp"] > 900:
            # Não apagar já, para permitir recriação
            logger.info(f"Checkout {transaction_id} encontrado no cache, mas está expirado.")
            return data, True  # Retorna os dados e um indicador de que está expirado

        logger.info(f"Checkout {transaction_id} encontrado no cache e válido.")
        return data, False  # Retorna os dados e indica que não está expirado

    def process_mbway_from_checkout(self, data: dict, current_user: str):
        """MBWay usando checkout cache"""
        mbway_data = MBWayProcess.model_validate(data)
        try:
            transaction_id = mbway_data.transaction_id
            checkout_data, is_expired = self._get_checkout_data(transaction_id)

            # Se o checkout não for encontrado ou estiver expirado, tenta recriar
            if not checkout_data or is_expired:
                logger.warning(f"Checkout {transaction_id} não encontrado ou expirado. Tentando recriar...")
                if not mbway_data.document_id or not mbway_data.amount:
                    raise APIError("Sessão de pagamento expirada. Por favor, tente novamente desde o início.", 410)

                new_checkout_data = {
                    "document_id": mbway_data.document_id,
                    "amount": mbway_data.amount,
                    "payment_method": "MBWAY"
                }
                new_checkout_result = self.create_checkout_only(new_checkout_data, current_user)
                transaction_id = new_checkout_result["transaction_id"]
                checkout_data, _ = self._get_checkout_data(transaction_id)

            if not checkout_data:
                # Se mesmo após a tentativa de recriação não houver checkout, lança erro.
                raise APIError("Falha ao criar ou recuperar a sessão de pagamento.", 500)

            # Processar MBWay
            phone_number = mbway_data.phone_number.replace('+351', '').replace(' ', '')
            formatted_phone = f"351#{phone_number}"

            url = f"{self.base_url}/payments/{mbway_data.transaction_id}/mbway-id/purchase"
            headers = self._get_headers(
                "Digest", checkout_data["transaction_signature"])

            resp = requests.post(
                url, json={"customerPhone": formatted_phone}, headers=headers, timeout=30)
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
            if transaction_id in self.checkout_cache:
                del self.checkout_cache[transaction_id]

            return {
                "success": True,
                "transaction_id": transaction_id,
                "payment_status": internal_status,
                "mbway_response": sibs_response
            }

        except Exception as e:
            logger.error(f"Erro process_mbway_from_checkout: {e}")
            raise

    def process_multibanco_from_checkout(self, data: dict, current_user: str):
        """Multibanco usando checkout cache"""
        try:
            # Pydantic doesn't have a model for this, so we validate manually for now.
            original_transaction_id = data.get('transaction_id')
            if not original_transaction_id:
                raise APIError("transaction_id é obrigatório.", 400)

            checkout_data, is_expired = self._get_checkout_data(original_transaction_id)

            # Recreate if expired or not found, provided we have the necessary info
            if (not checkout_data or is_expired) and data.get('document_id') and data.get('amount'):
                logger.warning(f"Checkout {original_transaction_id} não encontrado ou expirado. A recriar...")
                new_checkout_data = {
                    "document_id": data["document_id"],
                    "amount": data["amount"],
                    "payment_method": "MULTIBANCO"
                }
                new_checkout_result = self.create_checkout_only(new_checkout_data, current_user)
                transaction_id = new_checkout_result["transaction_id"]
                checkout_data, _ = self._get_checkout_data(transaction_id)
            else:
                transaction_id = original_transaction_id

            if not checkout_data:
                raise APIError("Sessão de pagamento expirou. Por favor, tente novamente.", 410)
            
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
            if transaction_id in self.checkout_cache:
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
            raise

    def register_manual_payment_direct(self, data: dict, user_session: str):
        """Registar pagamento manual direto - CORRIGIDO"""
        payment_data = ManualPaymentRegister.model_validate(data)
        try:
            document_id = payment_data.document_id
            # Criar payment_reference estruturado
            payment_reference = {
                "manual_payment": True,
                "payment_details": payment_data.reference_info,
                "submitted_by": payment_data.user_id,
                "submitted_at": datetime.now().isoformat(),
                "payment_type": payment_data.payment_type
            }

            # Gerar transaction_id único
            transaction_id = f"MANUAL-{payment_data.payment_type}-{document_id}-{int(time.time())}"

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
                    "amount": float(payment_data.amount),
                    "method": payment_data.payment_type,
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
            raise

    # MANTER compatibilidade com método antigo
    def process_manual_direct(self, document_id, amount, payment_type, payment_details, current_user):
        """DEPRECATED: Usar register_manual_payment_direct"""
        data = {'document_id': document_id, 'amount': amount, 'payment_type': payment_type, 'reference_info': payment_details}
        return self.register_manual_payment_direct(data, current_user)

    def check_payment_status(self, transaction_id: str, current_user: str):
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
                    raise ResourceNotFoundError("Transação não encontrada")

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
                    "Success": PaymentStatus.SUCCESS, # CORREÇÃO: Mapear para SUCCESS
                    "Pending": PaymentStatus.PENDING, # Manter como está
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

                    # Se o pagamento foi bem-sucedido, atualizar a fatura
                    if new_status == PaymentStatus.SUCCESS and local_data.tb_document:
                        db.execute(text("""
                            SELECT fbo_document_invoice$sibs(:doc, (
                                SELECT pk FROM tb_sibs WHERE transaction_id = :transaction_id
                            ))
                        """), {"doc": local_data.tb_document, "transaction_id": transaction_id})

                    # Retorna sempre o novo estado e que foi atualizado
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
            raise

    def approve_payment(self, payment_pk: int, user_pk: int, current_user: str):
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
            raise

    def get_pending_payments(self, current_user: str):
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

    def get_payment_details(self, payment_pk: int, current_user: str):
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

    def get_document_payment_status(self, document_id: int, current_user: str):
        """Obtém o estado do pagamento de um documento."""
        with db_session_manager(current_user) as session:
            # Primeiro, verifica se o documento existe para dar um erro 404 claro.
            doc_check_query = text("SELECT pk FROM vbl_document WHERE pk = :document_id")
            if not session.execute(doc_check_query, {"document_id": document_id}).scalar():
                raise ResourceNotFoundError(f"Documento {document_id} não encontrado.")

            # Agora, busca os dados da fatura.
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
            result = session.execute(query, {"document_id": document_id}).fetchone()

            if not result:
                # Se o documento existe mas não tem fatura, retorna uma estrutura vazia.
                return {'tb_document': document_id, 'invoice': 0.0, 'payed': False}
            
            return dict(result._mapping)

    def get_payment_history(self, current_user: str, page: int, page_size: int, filters: dict):
        """Histórico de pagamentos - exclui PENDING_VALIDATION"""
        filter_data = PaymentHistoryFilters.model_validate(filters)
        try:
            with db_session_manager(current_user) as session:
                # Base: excluir CREATED e PENDING_VALIDATION
                where_conditions = [
                    "s.payment_status NOT IN ('CREATED', 'PENDING_VALIDATION')"
                ]
                params = {}

                if filter_data.start_date:
                    where_conditions.append(
                        "DATE(s.created_at) >= :start_date")
                    params['start_date'] = filter_data.start_date

                if filter_data.end_date:
                    where_conditions.append("DATE(s.created_at) <= :end_date")
                    params['end_date'] = filter_data.end_date

                if filter_data.method:
                    where_conditions.append("s.payment_method = :method")
                    params['method'] = filter_data.method

                if filter_data.status:
                    where_conditions.append("s.payment_status = :status")
                    params['status'] = filter_data.status

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

    def get_sibs_data(self, order_id: str, current_user: str):
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

    def process_webhook(self, webhook_data: dict):
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
            raise


payment_service = PaymentService()
