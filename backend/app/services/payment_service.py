import requests
import uuid
from datetime import datetime, timedelta
from app.utils.utils import db_session_manager, db_system_session
from sqlalchemy import text
import json
from datetime import date
import time
from pydantic import BaseModel, Field, conint, constr, condecimal
from typing import Optional
from app.utils.error_handler import api_error_handler, ResourceNotFoundError, APIError
from app.utils.logger import get_logger


logger = get_logger(__name__)



class PaymentStatus:
    CREATED = 'CREATED'
    PENDING = 'PENDING'
    PENDING_VALIDATION = 'PENDING_VALIDATION'
    SUCCESS = 'SUCCESS'
    DECLINED = 'DECLINED'
    EXPIRED = 'EXPIRED'
    REJECTED = 'REJECTED'
    REFUNDED = 'REFUNDED'

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

    _CHECKOUT_TTL = 900  # 15 min
    _CHECKOUT_KEY_PREFIX = "sibs:checkout:"

    def __init__(self):
        self.base_url = None
        self.terminal_id = None
        self.client_id = None
        self.entity = None
        self.api_token = None
        self._redis = None
        self.checkout_cache = {}  # Fallback em memória (usado só se o Redis não estiver disponível)

    def init_app(self, app):
        self.base_url = app.config.get('SIBS_BASE_URL')
        self.terminal_id = int(app.config.get('SIBS_TERMINAL_ID'))
        self.client_id = app.config.get('SIBS_CLIENT_ID')
        self.entity = app.config.get('SIBS_ENTITY', '52764')
        self.api_token = app.config.get('SIBS_API_TOKEN')

        redis_url = app.config.get('CACHE_REDIS_URL') or app.config.get('REDIS_URL')
        if redis_url:
            try:
                import redis
                client = redis.Redis.from_url(redis_url, socket_connect_timeout=2, decode_responses=True)
                client.ping()
                self._redis = client
                logger.info("PaymentService: cache de checkout SIBS a usar Redis")
            except Exception as e:
                logger.warning(f"PaymentService: Redis indisponível ({e}) — cache de checkout usa memória (fallback)")
                self._redis = None

    def _cache_set_checkout(self, transaction_id: str, data: dict):
        if self._redis:
            self._redis.setex(f"{self._CHECKOUT_KEY_PREFIX}{transaction_id}", self._CHECKOUT_TTL, json.dumps(data, default=str))
        else:
            data = dict(data)
            data["timestamp"] = time.time()
            self.checkout_cache[transaction_id] = data

    def _cache_get_checkout(self, transaction_id: str):
        if self._redis:
            raw = self._redis.get(f"{self._CHECKOUT_KEY_PREFIX}{transaction_id}")
            return json.loads(raw) if raw else None

        data = self.checkout_cache.get(transaction_id)
        if data and time.time() - data["timestamp"] <= self._CHECKOUT_TTL:
            return data
        return None

    def _cache_delete_checkout(self, transaction_id: str):
        if self._redis:
            self._redis.delete(f"{self._CHECKOUT_KEY_PREFIX}{transaction_id}")
        else:
            self.checkout_cache.pop(transaction_id, None)

    def _get_headers(self, auth_type="Bearer", token=None):
        """Headers para API SIBS"""
        token = token or self.api_token
        return {
            "Authorization": f"{auth_type} {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-IBM-Client-Id": self.client_id
        }

    def _map_payment_method_to_param(self, payment_method: str) -> str:
        """
        Mapear método de pagamento para pk do parâmetro 'Método de pagamento'.

        Mapeamentos:
        - Dinheiro -> pk 1
        - Multibanco/Reference -> pk 2
        - MBWay -> pk 3
        - Transferência Bancária -> pk 4
        - Pagamento Município -> pk 5
        """
        if not payment_method:
            return None

        method_upper = payment_method.upper()

        # Mapeamento de métodos SIBS e manuais (português e inglês)
        mapping = {
            # SIBS methods
            "MBWAY": "3",
            "MULTIBANCO": "2",
            "REFERENCE": "2",
            # Manual payment methods
            "DINHEIRO": "1",
            "CASH": "1",
            "TRANSFERENCIA": "4",
            "TRANSFERÊNCIA": "4",
            "TRANSFER": "4",
            "BANK_TRANSFER": "4",
            "MUNICIPIO": "5",
            "MUNICÍPIO": "5",
            "PAG_MUNICIPIO": "5",
            "MUNICIPALITY": "5",
            "ISENCAO": "6",
            "ISENÇÃO": "6",
        }

        return mapping.get(method_upper)

    def get_invoice_data(self, document_id, current_user):
        """
        Obtém os dados da fatura de um documento.
        Tenta criar a fatura se ela não existir.
        Lança um erro se o documento não for encontrado.
        """
        logger.info(f"🔍 get_invoice_data chamado para documento {document_id}")

        with db_session_manager(current_user) as session:
            # 1. Verificar se o documento existe
            doc_check_query = text("SELECT pk FROM vbl_document WHERE pk = :document_id")
            doc_exists = session.execute(doc_check_query, {"document_id": document_id}).scalar()
            if not doc_exists:
                raise ResourceNotFoundError(f"Documento {document_id} não encontrado.")

            # 2. Tentar obter os dados da fatura
            invoice_query = text("SELECT * FROM vbl_document_invoice WHERE tb_document = :document_id")
            result = session.execute(invoice_query, {"document_id": document_id}).fetchone()

            # 3. Se a fatura existir, retorná-la (enriquecida com dados SIBS)
            if result:
                invoice_data = dict(result._mapping)
                invoice_val = float(invoice_data.get('invoice') or 0)
                has_urgency = bool(invoice_data.get('urgency'))
                logger.info(f"💰 Invoice encontrado para documento {document_id}: {invoice_val} (urgency={has_urgency})")

                # Se o valor é 0 mas há urgência, o invoice pode não ter sido recalculado
                # após a urgência ser definida. fbo_document_invoice$getset NÃO recalcula se
                # o registo já existe — é necessário chamar a função específica do tipo ($2 para Fossa).
                if invoice_val == 0 and has_urgency:
                    logger.info(f"🔄 Invoice=0 com urgência activa — recalculando para documento {document_id}")
                    try:
                        doc_type_query = text("SELECT tt_type FROM tb_document WHERE pk = :document_id")
                        doc_type = session.execute(doc_type_query, {"document_id": document_id}).scalar()
                        type_fn_map = {1: '"fbo_document_invoice$1"', 2: '"fbo_document_invoice$2"', 58: '"fbo_document_invoice$58"'}
                        fn = type_fn_map.get(doc_type)
                        if fn:
                            session.execute(text(f"SELECT {fn}(:document_id)"), {"document_id": document_id})
                            recalc_result = session.execute(invoice_query, {"document_id": document_id}).fetchone()
                            if recalc_result:
                                invoice_data = dict(recalc_result._mapping)
                                invoice_val = float(invoice_data.get('invoice') or 0)
                                logger.info(f"✅ Invoice recalculado para documento {document_id} (tipo={doc_type}): {invoice_val}")
                        else:
                            logger.warning(f"⚠️ Tipo {doc_type} sem função de recálculo configurada")
                    except Exception as recalc_err:
                        logger.warning(f"⚠️ Erro ao recalcular invoice para documento {document_id}: {recalc_err}")

                # Enriquecer com dados da tabela SIBS (expiry, entity, etc.)
                # A view vbl_document_invoice não tem tb_sibs, usar order_id ou tb_document
                # vbl_document_invoice já inclui payment_status, payment_method,
                # payment_reference e order_id via join interno com tb_sibs.
                view_payment_status = invoice_data.get('payment_status')

                if view_payment_status:
                    invoice_data['sibs_status'] = view_payment_status
                    invoice_data['sibs_method'] = invoice_data.get('payment_method')
                    invoice_data['sibs_reference'] = invoice_data.get('payment_reference')
                else:
                    # Fallback: procurar em vbl_sibs via JOIN com tb_document_invoice
                    sibs_result = session.execute(text("""
                        SELECT s.* FROM vbl_sibs s
                        JOIN tb_document_invoice di ON di.tb_sibs = s.pk
                        WHERE di.tb_document = :document_id
                        ORDER BY s.created_at DESC LIMIT 1
                    """), {"document_id": document_id}).fetchone()

                    if not sibs_result:
                        sibs_result = session.execute(text(
                            "SELECT * FROM vbl_sibs WHERE tb_document = :document_id ORDER BY created_at DESC LIMIT 1"
                        ), {"document_id": document_id}).fetchone()

                    if sibs_result:
                        sibs_data = dict(sibs_result._mapping)
                        invoice_data['payment_status'] = sibs_data.get('payment_status')
                        invoice_data['payment_method'] = sibs_data.get('payment_method')
                        invoice_data['payment_reference'] = sibs_data.get('payment_reference')
                        invoice_data['sibs_expiry'] = str(sibs_data.get('expiry_date', '')) if sibs_data.get('expiry_date') else None
                        invoice_data['sibs_entity'] = sibs_data.get('entity')
                        invoice_data['sibs_reference'] = sibs_data.get('pref')
                        invoice_data['sibs_method'] = sibs_data.get('payment_method')
                        invoice_data['sibs_status'] = sibs_data.get('payment_status')

                return invoice_data

            logger.warning(f"⚠️ Invoice NÃO encontrado para documento {document_id}, tentando criar...")

            # 4. Se não existir, tentar criar a fatura
            try:
                logger.info(f"🧮 A chamar fbo_document_invoice$getset({document_id})")
                session.execute(text("SELECT fbo_document_invoice$getset(:document_id)"), {"document_id": document_id})
                # Tentar buscar novamente após a criação
                result = session.execute(invoice_query, {"document_id": document_id}).fetchone()
                if result:
                    invoice_data = dict(result._mapping)
                    logger.info(f"✅ Invoice criado para documento {document_id}: {invoice_data.get('invoice', 0)}")
                    return invoice_data
                else:
                    logger.warning(f"❌ fbo_document_invoice$getset executou mas não criou invoice para documento {document_id}")
            except Exception as create_error:
                logger.warning(f"❌ Fatura não criada para documento {document_id} - erro: {create_error}")

            # 5. Se a criação falhar ou não retornar dados, retornar uma estrutura vazia, mas válida.
            # Isto indica que o documento existe, mas não tem fatura associada.
            logger.info(f"📭 Retornando invoice=0 para documento {document_id}")
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
            self._cache_set_checkout(transaction_id, {
                "document_id": checkout_data.document_id,
                "amount": checkout_data.amount,
                "order_id": regnumber,
                "transaction_signature": data.get("transactionSignature"),
                "payment_reference": data.get("paymentReference", {}),
            })

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
        """Recuperar dados do cache. A expiração (15 min) é gerida pelo próprio
        cache (TTL no Redis, timestamp manual no fallback em memória) — se os
        dados já não estiverem lá, é equivalente a estarem expirados."""
        data = self._cache_get_checkout(transaction_id)
        if not data:
            logger.info(f"Checkout {transaction_id} não encontrado no cache (ou expirado).")
            return None, False

        logger.info(f"Checkout {transaction_id} encontrado no cache e válido.")
        return data, False

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

            # Usar o transaction_id correto (pode ter sido recriado)
            url = f"{self.base_url}/payments/{transaction_id}/mbway-id/purchase"
            headers = self._get_headers(
                "Digest", checkout_data["transaction_signature"])

            resp = requests.post(
                url, json={"customerPhone": formatted_phone}, headers=headers, timeout=30)

            # Tratar erros HTTP da SIBS com mensagens claras
            if resp.status_code != 200:
                sibs_error = None
                try:
                    sibs_error = resp.json()
                except Exception:
                    pass

                logger.error(f"SIBS MBWay erro HTTP {resp.status_code}: {sibs_error or resp.text}")

                error_messages = {
                    404: "O número de telemóvel indicado não tem MB WAY ativo. Verifique o número ou utilize outro método de pagamento.",
                    400: "Dados inválidos enviados para o MB WAY. Verifique o número de telemóvel.",
                    401: "Erro de autenticação com o serviço de pagamentos.",
                    403: "Acesso negado ao serviço de pagamentos.",
                    409: "Já existe um pagamento pendente para esta transação.",
                    429: "Demasiados pedidos. Aguarde uns segundos e tente novamente.",
                    500: "O serviço MB WAY está temporariamente indisponível. Tente novamente mais tarde.",
                    503: "O serviço MB WAY está em manutenção. Tente novamente mais tarde.",
                }
                msg = error_messages.get(
                    resp.status_code,
                    f"Erro no serviço MB WAY (código {resp.status_code}). Tente novamente."
                )
                raise APIError(msg, 400, "ERR_MBWAY_SIBS")

            sibs_response = resp.json()
            payment_status = sibs_response.get("paymentStatus", "UNKNOWN")
            logger.info(f"SIBS MBWay Response: payment_status={payment_status}")

            # Tratar recusa imediata da SIBS (ex: número sem MBWay na 2a tentativa)
            if payment_status == "Declined":
                status_desc = sibs_response.get("returnStatus", {}).get("statusDescription", "")
                logger.warning(f"SIBS MBWay recusado imediatamente: {status_desc}")

                declined_messages = {
                    "The provided alias does not exist": "O número de telemóvel indicado não tem MB WAY ativo. Verifique o número ou utilize outro método de pagamento.",
                }
                msg = declined_messages.get(
                    status_desc,
                    "O pagamento MB WAY foi recusado. Verifique o número ou tente outro método de pagamento."
                )
                raise APIError(msg, 400, "ERR_MBWAY_DECLINED")

            status_map = {
                "Success": PaymentStatus.PENDING_VALIDATION,
                "Pending": PaymentStatus.PENDING,
                "Expired": PaymentStatus.EXPIRED
            }
            internal_status = status_map.get(
                payment_status, PaymentStatus.PENDING)

            # Gravar na BD
            with db_session_manager(current_user) as db:
                document_id = checkout_data["document_id"]

                # Garantir que existe registo de fatura antes de tentar ligar o SIBS
                db.execute(text("SELECT fbo_document_invoice$getset(:document_id)"), {"document_id": document_id})

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

                sibs_pk = sibs_result.scalar() or new_pk

                db.execute(text("""
                    SELECT "fbo_document_invoice$link"(:document_id, :sibs_pk)
                """), {"sibs_pk": sibs_pk, "document_id": document_id})

                # Garantir que tb_sibs ficou preenchido (fbo_document_invoice$link pode falhar silenciosamente)
                verify = db.execute(text(
                    "SELECT tb_sibs FROM tb_document_invoice WHERE tb_document = :doc_id LIMIT 1"
                ), {"doc_id": document_id}).scalar()
                if verify != sibs_pk:
                    db.execute(text(
                        "UPDATE tb_document_invoice SET tb_sibs = :sibs_pk WHERE tb_document = :doc_id"
                    ), {"sibs_pk": sibs_pk, "doc_id": document_id})

            # Limpar cache
            self._cache_delete_checkout(transaction_id)

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
                document_id = checkout_data["document_id"]

                # Garantir que existe registo de fatura antes de tentar ligar o SIBS
                db.execute(text("SELECT fbo_document_invoice$getset(:document_id)"), {"document_id": document_id})

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

                sibs_pk = sibs_result.scalar() or new_pk

                db.execute(text("""
                    SELECT "fbo_document_invoice$link"(:document_id, :sibs_pk)
                """), {"sibs_pk": sibs_pk, "document_id": document_id})

                # Garantir que tb_sibs ficou preenchido (fbo_document_invoice$link pode falhar silenciosamente)
                verify = db.execute(text(
                    "SELECT tb_sibs FROM tb_document_invoice WHERE tb_document = :doc_id LIMIT 1"
                ), {"doc_id": document_id}).scalar()
                if verify != sibs_pk:
                    db.execute(text(
                        "UPDATE tb_document_invoice SET tb_sibs = :sibs_pk WHERE tb_document = :doc_id"
                    ), {"sibs_pk": sibs_pk, "doc_id": document_id})

            # Limpar cache
            self._cache_delete_checkout(transaction_id)

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

    def register_manual_payment_direct(self, data: dict, user_session: str, user_pk: int = None):
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
                # Garantir que o registo de fatura existe antes de fazer o link SIBS.
                # fbo_document_invoice$link faz UPDATE em tb_document_invoice — se o registo
                # não existir, o UPDATE afecta 0 linhas e tb_sibs fica NULL para sempre.
                db.execute(text("SELECT fbo_document_invoice$getset(:document_id)"), {"document_id": document_id})

                # Obter regnumber do documento para usar como order_id (igual aos pagamentos automáticos)
                regnumber = db.execute(text(
                    "SELECT regnumber FROM tb_document WHERE pk = :doc_id"
                ), {"doc_id": document_id}).scalar() or f"MANUAL-{document_id}"

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
                    "order_id": regnumber,
                    "transaction_id": transaction_id,
                    "amount": float(payment_data.amount),
                    "method": payment_data.payment_type,
                    "status": PaymentStatus.PENDING_VALIDATION,
                    "pref": json.dumps(payment_reference),
                    "created_at": datetime.now()
                })

                # fbf_sibs pode retornar NULL em algumas versões — usar new_pk como fallback
                sibs_pk = sibs_result.scalar() or new_pk

                # Associar SIBS à fatura do documento
                db.execute(text("""
                    SELECT "fbo_document_invoice$link"(:document_id, :sibs_pk)
                """), {"sibs_pk": sibs_pk, "document_id": document_id})

                # Garantir que tb_sibs ficou preenchido (fbo_document_invoice$link pode falhar silenciosamente)
                verify = db.execute(text(
                    "SELECT tb_sibs FROM tb_document_invoice WHERE tb_document = :doc_id LIMIT 1"
                ), {"doc_id": document_id}).scalar()
                if verify != sibs_pk:
                    db.execute(text(
                        "UPDATE tb_document_invoice SET tb_sibs = :sibs_pk WHERE tb_document = :doc_id"
                    ), {"sibs_pk": sibs_pk, "doc_id": document_id})

                # Actualizar parâmetro "Método de pagamento" automaticamente
                payment_method_pk = self._map_payment_method_to_param(payment_data.payment_type)
                if payment_method_pk:
                    db.execute(text("""
                        UPDATE vbf_document_param dp
                        SET value = :payment_method_pk
                        FROM tb_param p
                        WHERE dp.tb_param = p.pk
                          AND dp.tb_document = :document_id
                          AND p.name = 'Método de pagamento'
                    """), {
                        "payment_method_pk": payment_method_pk,
                        "document_id": document_id
                    })
                    logger.info(
                        f"Parâmetro 'Método de pagamento' actualizado para {payment_method_pk} "
                        f"(document_id={document_id}, método={payment_data.payment_type})"
                    )

                # Numerário: quem regista é quem tem o dinheiro na mão — não faz sentido
                # exigir uma segunda pessoa a "validar" mais tarde. Aprova-se de imediato
                # e lança-se logo em Caixa, na mesma transação. Restantes métodos (Transferência,
                # Município) continuam PENDING_VALIDATION — só o backoffice pode confirmar
                # que o dinheiro chegou à conta.
                final_status = PaymentStatus.PENDING_VALIDATION
                if payment_data.payment_type == 'CASH' and user_pk:
                    db.execute(text("""
                        SELECT fbo_sibs_approve(:payment_pk, :user_pk)
                    """), {"payment_pk": sibs_pk, "user_pk": user_pk})
                    final_status = PaymentStatus.SUCCESS

                # Commit explícito
                db.commit()

            if final_status == PaymentStatus.SUCCESS:
                self._create_caixa_entry(
                    document_id, float(payment_data.amount), user_pk, sibs_pk,
                    source_label="pagamento manual"
                )

            return {
                "success": True,
                "transaction_id": transaction_id,
                "payment_status": final_status,
                "message": "Pagamento registado e confirmado com sucesso" if final_status == PaymentStatus.SUCCESS
                            else "Pagamento registado com sucesso"
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
        """
        Verificar estado do pagamento.

        Chamado como fallback de polling (MBWAY, se o webhook não chegar em 5min)
        ou como verificação manual do admin (qualquer método, PaymentAdminPage).
        Em ambos os casos quem chama quer o estado actual — por isso consulta-se
        sempre a SIBS quando o estado local ainda não é final. (Antes havia um
        atalho que evitava consultar a SIBS para Multibanco antes da data de
        expiração, pensado para poupar chamadas de um polling automático que
        nunca chegou a existir no frontend — na prática só impedia o botão de
        verificação manual do admin de mostrar o estado real.)
        """
        try:
            # Estado local primeiro
            with db_session_manager(current_user) as db:
                local_data = db.execute(text("""
                    SELECT payment_status, order_id, payment_method,
                           expiry_date, tb_document, invoice_pk
                    FROM vbl_sibs
                    WHERE transaction_id = :transaction_id
                """), {"transaction_id": transaction_id}).fetchone()

                if not local_data:
                    raise ResourceNotFoundError(
                        "Transação não encontrada"
                    )

            # Se já tem status final, retornar sem consultar SIBS
            if local_data.payment_status not in [
                PaymentStatus.CREATED, PaymentStatus.PENDING,
                PaymentStatus.PENDING_VALIDATION
            ]:
                return {
                    "success": True,
                    "payment_status": local_data.payment_status,
                    "payment_method": local_data.payment_method,
                    "document_id": local_data.tb_document,
                    "updated": False
                }

            # Consultar SIBS API
            url = f"{self.base_url}/payments/{transaction_id}/status"
            resp = requests.get(
                url, headers=self._get_headers(), timeout=30
            )
            resp.raise_for_status()

            sibs_data = resp.json()
            payment_status = sibs_data.get("paymentStatus")
            logger.info(f"SIBS GetStatus response: {sibs_data}")

            # Mapear e actualizar se mudou
            status_map = {
                "Success": PaymentStatus.SUCCESS,
                "Pending": PaymentStatus.PENDING,
                "Declined": PaymentStatus.DECLINED,
                "Expired": PaymentStatus.EXPIRED
            }
            new_status = status_map.get(
                payment_status, PaymentStatus.PENDING
            )

            if new_status != local_data.payment_status:
                with db_session_manager(current_user) as db:
                    db.execute(text("""
                        SELECT fbo_sibs_status(:transaction_id, :status, :pref)
                    """), {
                        "status": new_status,
                        "pref": json.dumps(sibs_data),
                        "transaction_id": transaction_id
                    })

                    # Se sucesso, atualizar a fatura
                    if (new_status == PaymentStatus.SUCCESS
                            and local_data.tb_document):
                        db.execute(text("""
                            SELECT "fbo_document_invoice$link"(
                                :document_id,
                                (SELECT pk FROM tb_sibs
                                 WHERE transaction_id = :tid)
                            )
                        """), {
                            "document_id": local_data.tb_document,
                            "tid": transaction_id
                        })

                return {
                    "success": True,
                    "payment_status": new_status,
                    "payment_method": local_data.payment_method,
                    "document_id": local_data.tb_document,
                    "updated": True
                }

            return {
                "success": True,
                "payment_status": local_data.payment_status,
                "payment_method": local_data.payment_method,
                "document_id": local_data.tb_document,
                "updated": False
            }

        except Exception as e:
            logger.error(f"Erro em check_payment_status: {e}")
            raise

    def force_sync_with_sibs(self, transaction_id: str, current_user: str):
        """
        Força sincronização com SIBS independentemente do estado local.
        Usado para reflectir devoluções feitas no backoffice SIBS ou
        qualquer alteração de estado iniciada externamente.
        """
        try:
            with db_session_manager(current_user) as db:
                local_data = db.execute(text("""
                    SELECT pk, payment_status, payment_method,
                           tb_document, invoice_pk, order_id
                    FROM vbl_sibs
                    WHERE transaction_id = :transaction_id
                """), {"transaction_id": transaction_id}).fetchone()

            if not local_data:
                raise ResourceNotFoundError("Transação não encontrada")

            if local_data.payment_method not in ('MBWAY', 'MULTIBANCO'):
                return {
                    "success": True,
                    "payment_status": local_data.payment_status,
                    "payment_method": local_data.payment_method,
                    "updated": False,
                    "message": "Sincronização SIBS apenas disponível para MBWAY e MULTIBANCO."
                }

            # Consultar SIBS sem restrições
            url = f"{self.base_url}/payments/{transaction_id}/status"
            resp = requests.get(url, headers=self._get_headers(), timeout=30)
            resp.raise_for_status()

            sibs_data = resp.json()
            payment_status = sibs_data.get("paymentStatus")
            logger.info(f"[ForceSync] SIBS status para {transaction_id}: {payment_status} (local: {local_data.payment_status})")

            status_map = {
                "Success":  PaymentStatus.SUCCESS,
                "Pending":  PaymentStatus.PENDING,
                "Declined": PaymentStatus.DECLINED,
                "Expired":  PaymentStatus.EXPIRED,
                "Refunded": PaymentStatus.REFUNDED,
                "Annulled": PaymentStatus.REFUNDED,
            }
            new_status = status_map.get(payment_status)

            if not new_status:
                return {
                    "success": True,
                    "payment_status": local_data.payment_status,
                    "sibs_status": payment_status,
                    "updated": False,
                    "message": f"Estado SIBS '{payment_status}' não reconhecido."
                }

            if new_status == local_data.payment_status:
                return {
                    "success": True,
                    "payment_status": local_data.payment_status,
                    "updated": False,
                    "message": "Estado já sincronizado."
                }

            # Actualizar BD com novo estado
            with db_session_manager(current_user) as db:
                db.execute(text("""
                    SELECT fbo_sibs_status(:transaction_id, :status, :pref)
                """), {
                    "transaction_id": transaction_id,
                    "status": new_status,
                    "pref": json.dumps(sibs_data)
                })

                if new_status == PaymentStatus.SUCCESS and local_data.tb_document:
                    sibs_pk = db.execute(text(
                        "SELECT pk FROM tb_sibs WHERE transaction_id = :tid"
                    ), {"tid": transaction_id}).scalar()
                    if sibs_pk:
                        db.execute(text("""
                            SELECT "fbo_document_invoice$link"(:document_id, :sibs_pk)
                        """), {"document_id": local_data.tb_document, "sibs_pk": sibs_pk})

                elif new_status == PaymentStatus.REFUNDED:
                    pass  # fbo_sibs_status já actualiza o estado; sem função de refund na BD

            logger.info(f"[ForceSync] {transaction_id}: {local_data.payment_status} → {new_status}")

            return {
                "success": True,
                "payment_status": new_status,
                "previous_status": local_data.payment_status,
                "payment_method": local_data.payment_method,
                "document_id": local_data.tb_document,
                "updated": True,
                "message": f"Estado actualizado: {local_data.payment_status} → {new_status}"
            }

        except Exception as e:
            logger.error(f"Erro em force_sync_with_sibs: {e}", exc_info=True)
            raise

    def _create_caixa_entry(self, document_id, amount, user_pk, source_pk, source_label="pagamento"):
        """Cria a entrada de Caixa (tipo 2) para um pagamento CASH já aprovado.
        Usa sessão de sistema (None) para contornar permissões da view vbf_caixa."""
        try:
            with db_session_manager(None) as admin_db:
                caixa_pk = admin_db.execute(text("SELECT fs_nextcode()")).scalar()
                admin_db.execute(text("""
                    INSERT INTO vbf_caixa (
                        pk, tt_caixamovimento, data, valor,
                        tb_document, ordempagamento,
                        ts_client1, ts_client2,
                        hist_client, hist_time
                    ) VALUES (
                        :pk, 2, NOW(), :valor,
                        :tb_document, NULL,
                        :ts_client1, NULL,
                        :ts_client1, NOW()
                    )
                """), {
                    'pk':          caixa_pk,
                    'valor':       amount,
                    'tb_document': document_id,
                    'ts_client1':  user_pk,
                })
                admin_db.commit()
            logger.info(f"Movimento de caixa {caixa_pk} criado para {source_label} {source_pk} (doc={document_id} valor={amount})")
        except Exception as caixa_err:
            logger.error(f"[CAIXA] Falha ao criar movimento para {source_label} {source_pk} doc={document_id}: {caixa_err}", exc_info=True)
            raise

    def approve_payment(self, payment_pk: int, user_pk: int, current_user: str):
        """Aprovar pagamento pendente"""
        try:
            with db_session_manager(current_user) as db:
                # Aprovar pagamento
                db.execute(text("""
                    SELECT fbo_sibs_approve(:payment_pk, :user_pk)
                """), {"payment_pk": payment_pk, "user_pk": user_pk})

                # Obter invoice_pk, document_id, payment_method, amount e actualizar invoice
                payment_info = db.execute(text("""
                    SELECT invoice_pk, tb_document, payment_method, amount
                    FROM vbl_sibs
                    WHERE pk = :payment_pk
                """), {"payment_pk": payment_pk}).fetchone()

                invoice_pk = payment_info[0] if payment_info else None
                document_id = payment_info[1] if payment_info else None
                payment_method = payment_info[2] if payment_info else None
                amount = float(payment_info[3]) if payment_info and payment_info[3] else None

                # Fallback: tb_document pode ser NULL em registos manuais antigos
                if not document_id:
                    document_id = db.execute(text("""
                        SELECT di.tb_document
                        FROM tb_document_invoice di
                        WHERE di.tb_sibs = :payment_pk
                        LIMIT 1
                    """), {"payment_pk": payment_pk}).scalar()

                if document_id:
                    db.execute(text("""
                        SELECT "fbo_document_invoice$link"(:document_id, :sibs_pk)
                    """), {"document_id": document_id, "sibs_pk": payment_pk})

                    # Actualizar parâmetro "Método de pagamento" automaticamente
                    # Mapear método de pagamento para pk do payment_method:
                    # Dinheiro -> 1, Multibanco -> 2, MBWay -> 3, Transferência -> 4, Pag. Município -> 5
                    payment_method_pk = self._map_payment_method_to_param(payment_method)

                    if payment_method_pk:
                        db.execute(text("""
                            UPDATE vbf_document_param dp
                            SET value = :payment_method_pk
                            FROM tb_param p
                            WHERE dp.tb_param = p.pk
                              AND dp.tb_document = :document_id
                              AND p.name = 'Método de pagamento'
                        """), {
                            "payment_method_pk": payment_method_pk,
                            "document_id": document_id
                        })
                        logger.info(
                            f"Parâmetro 'Método de pagamento' actualizado para {payment_method_pk} "
                            f"(document_id={document_id}, método={payment_method})"
                        )

                    # Criar movimento de caixa automático (tipo 2 = entrada com documento)
                    # Apenas para pagamentos em numerário (pk 1) — Caixa regista só dinheiro físico,
                    # não transferências bancárias, município ou outros métodos manuais.
                    if amount and amount > 0 and payment_method_pk == "1":
                        self._create_caixa_entry(document_id, amount, user_pk, payment_pk, source_label="pagamento")

            return {"success": True, "message": "Pagamento aprovado"}

        except Exception as e:
            logger.error(f"Erro em approve_payment: {e}")
            raise

    def get_pending_payments(self, current_user: str):
        """Obter pagamentos pendentes de validação"""
        try:
            with db_session_manager(current_user) as session:
                query = text("""
                    SELECT pk, order_id, transaction_id, amount,
                           payment_method, payment_status, payment_reference,
                           created_at, entity, tb_document,
                           regnumber, document_descr
                    FROM vbl_sibs
                    WHERE payment_status = 'PENDING_VALIDATION'
                      AND payment_method != 'ISENCAO'
                    ORDER BY created_at DESC
                """)

                results = session.execute(query).fetchall()

                return [dict(row._mapping) for row in results]

        except Exception as e:
            logger.error(f"Erro ao obter pagamentos pendentes: {e}")
            raise

    def get_payment_details(self, payment_pk: int, current_user: str):
        """Obter detalhes completos do pagamento"""
        try:
            with db_session_manager(current_user) as session:
                query = text("""
                    SELECT pk, order_id, transaction_id, amount,
                           payment_method, payment_status, payment_reference,
                           created_at, updated_at, validated_by, validated_at,
                           tb_document, invoice, presented, accepted,
                           payed, closed, urgency,
                           regnumber, document_descr, validator_name
                    FROM vbl_sibs
                    WHERE pk = :payment_pk
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
                SELECT pk, tb_document, invoice, presented,
                       accepted, payed, closed,
                       sibs_pk, transaction_id, payment_status,
                       payment_method, amount, payment_created
                FROM vbl_document_payment
                WHERE tb_document = :document_id
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
                    "payment_status NOT IN ('CREATED', 'PENDING_VALIDATION')"
                ]
                params = {}

                if filter_data.start_date:
                    where_conditions.append("DATE(created_at) >= :start_date")
                    params['start_date'] = filter_data.start_date

                if filter_data.end_date:
                    where_conditions.append("DATE(created_at) <= :end_date")
                    params['end_date'] = filter_data.end_date

                if filter_data.method:
                    where_conditions.append("payment_method = :method")
                    params['method'] = filter_data.method

                if filter_data.status:
                    where_conditions.append("payment_status = :status")
                    params['status'] = filter_data.status

                where_clause = " AND ".join(where_conditions)

                # Query total
                count_query = text(f"""
                    SELECT COUNT(*) as total
                    FROM vbl_sibs
                    WHERE {where_clause}
                """)

                total = session.execute(count_query, params).scalar()

                # Query paginada
                offset = (page - 1) * page_size
                params.update({'limit': page_size, 'offset': offset})

                data_query = text(f"""
                    SELECT pk, order_id, transaction_id, amount,
                           payment_method, payment_status, payment_reference,
                           created_at, updated_at, validated_by, validated_at,
                           tb_document, regnumber, document_descr
                    FROM vbl_sibs
                    WHERE {where_clause}
                    ORDER BY created_at DESC
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

    # Mapeamento de payment_status (backend) para status de fatura (InvoicesPage)
    _INVOICE_STATUS_MAP = {
        "SUCCESS": "paid",
        "PENDING": "pending",
        "CREATED": "pending",
        "PENDING_VALIDATION": "pending",
        "EXPIRED": "overdue",
        "DECLINED": "overdue",
        "REJECTED": "overdue",
        "REFUNDED": "issued",
    }

    def _map_invoice_row(self, row: dict) -> dict:
        row = dict(row)
        row["status"] = self._INVOICE_STATUS_MAP.get(row.get("payment_status"), "issued")
        return row

    def get_invoices(self, current_user: str, filters: dict):
        """Lista de facturas (todos os pagamentos, com filtros opcionais de estado/pesquisa)."""
        try:
            with db_session_manager(current_user) as session:
                where = ["s.payment_method != 'ISENCAO'"]
                params = {}

                status = filters.get("status")
                if status:
                    where.append("s.payment_status = :status")
                    params["status"] = status

                search = filters.get("search")
                if search:
                    where.append("(s.regnumber ILIKE :search OR d.ts_entity ILIKE :search)")
                    params["search"] = f"%{search}%"

                where_clause = " AND ".join(where)
                rows = session.execute(text(f"""
                    SELECT s.pk, s.regnumber, ent.name AS ts_entity, s.amount, s.created_at,
                           s.payment_status, s.payment_method, s.tb_document
                    FROM vbl_sibs s
                    LEFT JOIN tb_document d ON d.pk = s.tb_document
                    LEFT JOIN ts_entity ent ON ent.pk = d.ts_entity
                    WHERE {where_clause}
                    ORDER BY s.created_at DESC
                    LIMIT 200
                """), params).mappings().all()

                return [self._map_invoice_row(r) for r in rows]

        except Exception as e:
            logger.error(f"Erro get_invoices: {e}")
            raise

    def get_pending_invoices(self, current_user: str):
        """Facturas com pagamento ainda não concluído."""
        try:
            with db_session_manager(current_user) as session:
                rows = session.execute(text("""
                    SELECT s.pk, s.regnumber, ent.name AS ts_entity, s.amount, s.created_at,
                           s.payment_status, s.payment_method, s.tb_document
                    FROM vbl_sibs s
                    LEFT JOIN tb_document d ON d.pk = s.tb_document
                    LEFT JOIN ts_entity ent ON ent.pk = d.ts_entity
                    WHERE s.payment_status IN ('PENDING', 'CREATED', 'PENDING_VALIDATION')
                      AND s.payment_method != 'ISENCAO'
                    ORDER BY s.created_at DESC
                """)).mappings().all()

                return [self._map_invoice_row(r) for r in rows]

        except Exception as e:
            logger.error(f"Erro get_pending_invoices: {e}")
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
            payment_method = webhook_data.get("paymentMethod")

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

            document_id = None

            # Webhook não tem sessão autenticada - usar sessão de sistema
            with db_system_session() as db:
                # Actualizar status
                db.execute(text("""
                    SELECT fbo_sibs_status(:transaction_id, :status, :pref)
                """), {
                    "status": internal_status,
                    "pref": json.dumps(webhook_data),
                    "transaction_id": transaction_id
                })

                # Obter invoice_pk, document_id e dados para notificações
                invoice_info = db.execute(text("""
                    SELECT invoice_pk, tb_document, regnumber, amount
                    FROM vbl_sibs
                    WHERE transaction_id = :transaction_id
                """), {"transaction_id": transaction_id}).fetchone()

                invoice_pk = invoice_info[0] if invoice_info else None
                document_id = invoice_info[1] if invoice_info else None
                regnumber = invoice_info[2] if invoice_info else None
                amount = invoice_info[3] if invoice_info else None

                # Quem iniciou o checkout (hist_client de tb_sibs) — permite ao
                # frontend distinguir o dono do pagamento no broadcast do socket
                # mesmo noutra sessão/dispositivo (ex: Multibanco pago dias depois).
                initiator_user_id = db.execute(text(
                    "SELECT hist_client FROM tb_sibs WHERE transaction_id = :transaction_id"
                ), {"transaction_id": transaction_id}).scalar()

                # Se sucesso, actualizar invoice
                if internal_status == PaymentStatus.SUCCESS and document_id:
                    sibs_pk = db.execute(text(
                        "SELECT pk FROM tb_sibs WHERE transaction_id = :transaction_id"
                    ), {"transaction_id": transaction_id}).scalar()

                    if sibs_pk:
                        db.execute(text("""
                            SELECT "fbo_document_invoice$link"(:document_id, :sibs_pk)
                        """), {"document_id": document_id, "sibs_pk": sibs_pk})

                        # Garantir que tb_sibs ficou preenchido (fbo_document_invoice$link pode falhar silenciosamente)
                        verify = db.execute(text(
                            "SELECT tb_sibs FROM tb_document_invoice WHERE tb_document = :doc_id LIMIT 1"
                        ), {"doc_id": document_id}).scalar()
                        if verify != sibs_pk:
                            db.execute(text(
                                "UPDATE tb_document_invoice SET tb_sibs = :sibs_pk WHERE tb_document = :doc_id"
                            ), {"sibs_pk": sibs_pk, "doc_id": document_id})
                            logger.info(f"Fallback: tb_document_invoice.tb_sibs corrigido directamente (document_id={document_id}, sibs_pk={sibs_pk})")

                    # Actualizar parâmetro "Método de pagamento" automaticamente
                    payment_method_pk = self._map_payment_method_to_param(payment_method)

                    if payment_method_pk:
                        # Encontrar e actualizar o parâmetro "Método de pagamento"
                        # usando a VIEW vbf_document_param que tem triggers
                        db.execute(text("""
                            UPDATE vbf_document_param dp
                            SET value = :payment_method_pk
                            FROM tb_param p
                            WHERE dp.tb_param = p.pk
                              AND dp.tb_document = :document_id
                              AND p.name = 'Método de pagamento'
                        """), {
                            "payment_method_pk": payment_method_pk,
                            "document_id": document_id
                        })
                        logger.info(
                            f"Parâmetro 'Método de pagamento' actualizado para {payment_method_pk} "
                            f"(document_id={document_id}, método SIBS={payment_method})"
                        )

            logger.info(
                f"Webhook processado: {transaction_id} -> {internal_status}")

            return {
                "success": True,
                "transaction_id": transaction_id,
                "status": internal_status,
                "document_id": document_id,
                "regnumber": regnumber,
                "amount": amount,
                "initiator_user_id": initiator_user_id
            }

        except Exception as e:
            logger.error(f"Erro no webhook: {e}")
            raise

    def notify_payment_received(self, result: dict, payment_method: str = None):
        """
        Notifica a contabilidade (permissão payments.alerts) de que um pagamento
        confirmado por webhook deu entrada. Best-effort: nunca falha o webhook.

        Dedup por transaction_id contra o histórico da tabela central — a SIBS
        pode reenviar o mesmo webhook várias vezes.
        """
        transaction_id = result.get('transaction_id')
        if not transaction_id or result.get('status') != PaymentStatus.SUCCESS:
            return
        try:
            from flask import current_app
            from app.services.notification_service import get_alert_recipients
            socketio_events = current_app.extensions.get('socketio_events')
            if not socketio_events:
                logger.warning("[PagamentoNotif] socketio_events indisponível — notificação não enviada.")
                return

            with db_system_session() as db:
                ja_notificado = db.execute(text("""
                    SELECT 1 FROM tb_notification
                    WHERE type = 'payment' AND metadata->>'transaction_id' = :tid
                    LIMIT 1
                """), {'tid': str(transaction_id)}).scalar()
                if ja_notificado:
                    return
                recipients = get_alert_recipients(db, 'payments.alerts')

            if not recipients:
                logger.info("[PagamentoNotif] Nenhum utilizador com payments.alerts — notificação não enviada.")
                return

            pedido = result.get('regnumber') or (
                f"#{result.get('document_id')}" if result.get('document_id') else 'desconhecido'
            )
            valor = result.get('amount')
            valor_txt = f"{float(valor):.2f}".replace('.', ',') + ' €' if valor is not None else None
            metodo_txt = {'MBWAY': 'MB WAY', 'REFERENCE': 'Multibanco'}.get(payment_method, payment_method)
            detalhes = ' — '.join(p for p in (valor_txt, metodo_txt) if p)
            mensagem = f"O pagamento do pedido {pedido} deu entrada" + (f" ({detalhes})." if detalhes else ".")

            socketio_events.emit_central_notification(
                user_ids=recipients,
                type_='payment',
                notification_type='pagamento_recebido',
                title=f"Pagamento recebido — {pedido}",
                message=mensagem,
                route='/payments',
                metadata={
                    'transaction_id': str(transaction_id),
                    'document_id': result.get('document_id'),
                },
            )
        except Exception as e:
            logger.error(f"[PagamentoNotif] Erro ao notificar contabilidade: {e}", exc_info=True)


    # ============================================================
    # ISENÇÕES (Gratuito)
    # ============================================================

    def apply_exemption_direct(self, document_id: int, user_pk: int, current_user: str):
        """Aplicar isenção diretamente (registo + aprovação imediata).
        Usado pelo operador que já validou o comprovativo em anexo."""
        try:
            with db_session_manager(current_user) as db:
                # Garantir que existe registo de fatura para o documento
                db.execute(text("SELECT fbo_document_invoice$getset(:document_id)"), {"document_id": document_id})

                # Obter regnumber para usar como order_id
                regnumber = db.execute(text(
                    "SELECT regnumber FROM tb_document WHERE pk = :doc_id"
                ), {"doc_id": document_id}).scalar() or f"ISENCAO-{document_id}"

                transaction_id = f"ISENCAO-{document_id}-{int(time.time())}"
                new_pk = db.execute(text("SELECT nextval('sq_codes')")).scalar()

                payment_reference = {
                    "manual_payment": True,
                    "payment_details": "Isenção — taxa de saneamento liquidada em conta de água",
                    "submitted_by": user_pk,
                    "submitted_at": datetime.now().isoformat(),
                    "payment_type": "ISENCAO"
                }

                # Criar registo tb_sibs com método ISENCAO e valor 0
                sibs_result = db.execute(text("""
                    SELECT fbf_sibs(0, :pk, :order_id, :transaction_id,
                                NULL, 0, 'EUR',
                                'ISENCAO', 'PENDING_VALIDATION', :pref, NULL,
                                NULL, :created_at, NULL, NULL, NULL)
                """), {
                    "pk": new_pk,
                    "order_id": regnumber,
                    "transaction_id": transaction_id,
                    "pref": json.dumps(payment_reference),
                    "created_at": datetime.now()
                })

                sibs_pk = sibs_result.scalar() or new_pk

                # Associar à fatura do documento
                db.execute(text("""
                    SELECT "fbo_document_invoice$link"(:document_id, :sibs_pk)
                """), {"document_id": document_id, "sibs_pk": sibs_pk})

                # Garantir link (fallback caso fbo_document_invoice$link falhe silenciosamente)
                verify = db.execute(text(
                    "SELECT tb_sibs FROM tb_document_invoice WHERE tb_document = :doc_id LIMIT 1"
                ), {"doc_id": document_id}).scalar()
                if verify != sibs_pk:
                    db.execute(text(
                        "UPDATE tb_document_invoice SET tb_sibs = :sibs_pk WHERE tb_document = :doc_id"
                    ), {"sibs_pk": sibs_pk, "doc_id": document_id})

                # Aprovar imediatamente
                db.execute(text("""
                    SELECT fbo_sibs_approve(:payment_pk, :user_pk)
                """), {"payment_pk": sibs_pk, "user_pk": user_pk})

                # Actualizar parâmetro "Método de pagamento" (pk=6 = Isenção)
                payment_method_pk = self._map_payment_method_to_param('ISENCAO')
                if payment_method_pk:
                    db.execute(text("""
                        UPDATE vbf_document_param dp
                        SET value = :payment_method_pk
                        FROM tb_param p
                        WHERE dp.tb_param = p.pk
                          AND dp.tb_document = :document_id
                          AND p.name = 'Método de pagamento'
                    """), {"payment_method_pk": payment_method_pk, "document_id": document_id})

                db.commit()

            return {
                "success": True,
                "sibs_pk": sibs_pk,
                "payment_status": "SUCCESS",
                "message": "Isenção aplicada com sucesso"
            }

        except Exception as e:
            logger.error(f"Erro apply_exemption_direct doc={document_id}: {e}")
            raise

    def submit_exemption(self, document_id: int, current_user: str):
        """Submeter pedido de isenção pendente de aprovação."""
        try:
            with db_session_manager(current_user) as db:
                db.execute(text("SELECT fbo_document_invoice$getset(:document_id)"), {"document_id": document_id})

                regnumber = db.execute(text(
                    "SELECT regnumber FROM tb_document WHERE pk = :doc_id"
                ), {"doc_id": document_id}).scalar() or f"ISENCAO-{document_id}"

                transaction_id = f"ISENCAO-{document_id}-{int(time.time())}"
                new_pk = db.execute(text("SELECT nextval('sq_codes')")).scalar()

                payment_reference = {
                    "manual_payment": True,
                    "payment_details": "Pedido de isenção submetido pelo cliente",
                    "payment_type": "ISENCAO"
                }

                sibs_result = db.execute(text("""
                    SELECT fbf_sibs(0, :pk, :order_id, :transaction_id,
                                NULL, 0, 'EUR',
                                'ISENCAO', 'PENDING_VALIDATION', :pref, NULL,
                                NULL, :created_at, NULL, NULL, NULL)
                """), {
                    "pk": new_pk,
                    "order_id": regnumber,
                    "transaction_id": transaction_id,
                    "pref": json.dumps(payment_reference),
                    "created_at": datetime.now()
                })

                sibs_pk = sibs_result.scalar() or new_pk

                db.execute(text("""
                    SELECT "fbo_document_invoice$link"(:document_id, :sibs_pk)
                """), {"document_id": document_id, "sibs_pk": sibs_pk})

                db.commit()

            return {
                "success": True,
                "sibs_pk": sibs_pk,
                "message": "Pedido de isenção submetido com sucesso"
            }

        except Exception as e:
            logger.error(f"Erro submit_exemption doc {document_id}: {e}")
            raise

    def get_pending_exemptions(self, current_user: str):
        """Obter isenções pendentes de validação"""
        try:
            with db_session_manager(current_user) as session:
                results = session.execute(text("""
                    SELECT pk, order_id, transaction_id, amount,
                           payment_method, payment_status, payment_reference,
                           created_at, entity, tb_document,
                           regnumber, document_descr
                    FROM vbl_sibs
                    WHERE payment_status = 'PENDING_VALIDATION'
                      AND payment_method = 'ISENCAO'
                    ORDER BY created_at DESC
                """)).fetchall()

                return [dict(row._mapping) for row in results]

        except Exception as e:
            logger.error(f"Erro get_pending_exemptions: {e}")
            raise

    def get_exemption_history(self, current_user: str, page: int = 1, page_size: int = 20,
                              start_date=None, end_date=None):
        """Histórico completo de isenções com stats de controlo."""
        try:
            with db_session_manager(current_user) as session:
                where = ["payment_method = 'ISENCAO'"]
                params = {}

                if start_date:
                    where.append("DATE(created_at) >= :start_date")
                    params['start_date'] = start_date
                if end_date:
                    where.append("DATE(created_at) <= :end_date")
                    params['end_date'] = end_date

                where_clause = " AND ".join(where)

                total = session.execute(
                    text(f"SELECT COUNT(*) FROM vbl_sibs WHERE {where_clause}"), params
                ).scalar()

                stats = session.execute(text("""
                    SELECT
                        COUNT(*) FILTER (WHERE payment_method = 'ISENCAO') AS total_all,
                        COUNT(*) FILTER (WHERE payment_method = 'ISENCAO' AND payment_status = 'SUCCESS') AS total_approved,
                        COUNT(*) FILTER (WHERE payment_method = 'ISENCAO'
                                           AND DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE)) AS this_month,
                        COUNT(*) FILTER (WHERE payment_method = 'ISENCAO'
                                           AND DATE(created_at) >= DATE_TRUNC('year', CURRENT_DATE)) AS this_year
                    FROM vbl_sibs
                """)).fetchone()

                offset = (page - 1) * page_size
                params.update({'limit': page_size, 'offset': offset})

                results = session.execute(text(f"""
                    SELECT pk, order_id, transaction_id, amount,
                           payment_method, payment_status, payment_reference,
                           created_at, validated_at, validated_by,
                           tb_document, regnumber, document_descr, entity
                    FROM vbl_sibs
                    WHERE {where_clause}
                    ORDER BY created_at DESC
                    LIMIT :limit OFFSET :offset
                """), params).fetchall()

                return {
                    'exemptions': [dict(r._mapping) for r in results],
                    'total': total,
                    'stats': dict(stats._mapping) if stats else {}
                }

        except Exception as e:
            logger.error(f"Erro get_exemption_history: {e}")
            raise

    def approve_exemption(self, payment_pk: int, user_pk: int, current_user: str):
        """Aprovar isenção pendente"""
        try:
            with db_session_manager(current_user) as db:
                db.execute(text("""
                    SELECT fbo_sibs_approve(:payment_pk, :user_pk)
                """), {"payment_pk": payment_pk, "user_pk": user_pk})

                payment_info = db.execute(text("""
                    SELECT invoice_pk, tb_document
                    FROM vbl_sibs
                    WHERE pk = :payment_pk
                """), {"payment_pk": payment_pk}).fetchone()

                invoice_pk = payment_info[0] if payment_info else None
                document_id = payment_info[1] if payment_info else None

                if document_id:
                    db.execute(text("""
                        SELECT "fbo_document_invoice$link"(:document_id, :sibs_pk)
                    """), {"document_id": document_id, "sibs_pk": payment_pk})

            return {"success": True, "message": "Isenção aprovada com sucesso"}

        except Exception as e:
            logger.error(f"Erro approve_exemption pk={payment_pk}: {e}")
            raise

    def reject_exemption(self, payment_pk: int, user_pk: int, current_user: str):
        """Rejeitar isenção pendente"""
        try:
            with db_session_manager(current_user) as db:
                db.execute(text("""
                    SELECT fbo_sibs_reject(:payment_pk, :user_pk)
                """), {"payment_pk": payment_pk, "user_pk": user_pk})

            return {"success": True, "message": "Isenção rejeitada com sucesso"}

        except Exception as e:
            logger.error(f"Erro reject_exemption pk={payment_pk}: {e}")
            raise


    def refund_payment(self, payment_pk: int, reason: str, current_user: str):
        """
        Processar devolução de um pagamento aprovado.
        - Pagamentos SIBS (MBWAY/MULTIBANCO): chama API SIBS + atualiza BD
        - Pagamentos manuais: só atualiza BD
        """
        try:
            with db_session_manager(current_user) as db:
                payment = db.execute(text("""
                    SELECT pk, transaction_id, transaction_signature,
                           amount, payment_method, payment_status,
                           tb_document, invoice_pk, order_id
                    FROM vbl_sibs
                    WHERE pk = :pk
                """), {"pk": payment_pk}).fetchone()

                if not payment:
                    raise ResourceNotFoundError(f"Pagamento {payment_pk} não encontrado")

                if payment.payment_status != PaymentStatus.SUCCESS:
                    raise APIError(
                        f"Só é possível devolver pagamentos com estado SUCCESS "
                        f"(estado actual: {payment.payment_status})", 400
                    )

            is_sibs = payment.payment_method in ('MBWAY', 'MULTIBANCO')
            refund_reference = None

            # Chamar API SIBS para pagamentos eletrónicos
            if is_sibs and payment.transaction_id:
                url = f"{self.base_url}/payments/{payment.transaction_id}/refund"
                # O endpoint /refund já define a operação; não incluir paymentType
                payload = {
                    "merchant": {
                        "terminalId": self.terminal_id,
                        "channel": "web",
                        "merchantTransactionId": f"refund-{payment.order_id or payment_pk}-{uuid.uuid4().hex[:8]}"
                    },
                    "transaction": {
                        "transactionTimestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
                        "description": f"Devolução - {reason}" if reason else "Devolução",
                        "moto": False,
                        "amount": {"value": float(payment.amount), "currency": "EUR"}
                    }
                }
                logger.info(f"[Refund] A processar devolução para transação {payment.transaction_id}")
                resp = requests.post(url, json=payload, headers=self._get_headers(), timeout=30)

                if not resp.ok:
                    sibs_error = {}
                    try:
                        sibs_error = resp.json()
                    except Exception:
                        pass
                    logger.error(f"SIBS refund erro {resp.status_code}: {sibs_error}")

                    sibs_code = sibs_error.get('returnStatus', {}).get('statusCode', '')

                    # E0528 = valor de devolução excede o saldo disponível.
                    # O SIBS não actualiza o estado da transação original após um refund
                    # feito no backoffice — o endpoint de status continua a mostrar SUCCESS.
                    # Portanto: E0528 = efectivamente devolvido. Marcar localmente como REFUNDED.
                    if sibs_code == 'E0528':
                        logger.warning(
                            f"[Refund] E0528 — transação {payment.transaction_id} já não tem "
                            f"saldo disponível para devolução. A marcar como REFUNDED localmente."
                        )
                        with db_session_manager(current_user) as db:
                            db.execute(text("""
                                SELECT fbo_sibs_status(:transaction_id, :status, :pref)
                            """), {
                                "transaction_id": payment.transaction_id,
                                "status": PaymentStatus.REFUNDED,
                                "pref": json.dumps({
                                    "sibs_e0528": True,
                                    "reason": reason or "Devolução detectada via E0528",
                                    "detected_at": datetime.utcnow().isoformat()
                                })
                            })
                        return {
                            "success": True,
                            "transaction_id": payment.transaction_id,
                            "payment_status": PaymentStatus.REFUNDED,
                            "amount": float(payment.amount),
                            "payment_method": payment.payment_method,
                            "sibs_processed": False,
                            "message": "Pagamento já estava devolvido no SIBS. Estado actualizado."
                        }

                    raise APIError(
                        f"Erro ao processar devolução junto da SIBS (código {resp.status_code}). "
                        "Contacte o suporte.", 502
                    )

                refund_reference = json.dumps(resp.json())
                logger.info(f"Devolução SIBS aceite para transação {payment.transaction_id}")

            # Registar devolução na BD
            with db_session_manager(current_user) as db:
                db.execute(text("""
                    SELECT fbo_sibs_status(:transaction_id, :status, :pref)
                """), {
                    "transaction_id": payment.transaction_id,
                    "status": PaymentStatus.REFUNDED,
                    "pref": refund_reference or json.dumps({
                        "manual_refund": True,
                        "reason": reason,
                        "refunded_at": datetime.utcnow().isoformat()
                    })
                })

                db.commit()

            logger.info(
                f"Devolução registada — pagamento pk={payment_pk}, "
                f"método={payment.payment_method}, montante={payment.amount}"
            )
            return {
                "success": True,
                "message": "Devolução processada com sucesso",
                "payment_pk": payment_pk,
                "transaction_id": payment.transaction_id,
                "amount": float(payment.amount),
                "method": payment.payment_method,
                "sibs_processed": is_sibs
            }

        except (ResourceNotFoundError, APIError):
            raise
        except Exception as e:
            logger.error(f"Erro em refund_payment pk={payment_pk}: {e}")
            raise

    def get_payments_by_entity(self, entity_pk, current_user):
        """Lista faturas/pagamentos de uma entidade específica (legacy)"""
        return self.get_payments_by_user(entity_pk, current_user)

    def get_my_contracts(self, entity_pk, current_user):
        """Contratos e períodos de pagamento do utilizador (filtra por ts_entity do JWT)."""
        with db_session_manager(current_user) as session:
            contracts_result = session.execute(text("""
                SELECT c.pk, c.start_date, c.stop_date, c.family, c.tt_contractfrequency,
                       c.address, c.postal
                FROM vbl_contract c
                WHERE c.ts_entity = :entity_pk
                ORDER BY c.start_date DESC
            """), {"entity_pk": entity_pk})
            contracts = [dict(row) for row in contracts_result.mappings().all()]

            if not contracts:
                return []

            contract_pks = [c["pk"] for c in contracts]
            payments_result = session.execute(text("""
                SELECT pk, tb_contract, start_date, stop_date, value, presented, payed
                FROM vbl_contract_payment
                WHERE tb_contract = ANY(:pks)
                ORDER BY start_date DESC
            """), {"pks": contract_pks})
            payments = [dict(row) for row in payments_result.mappings().all()]

            payments_by_contract = {}
            for p in payments:
                payments_by_contract.setdefault(p["tb_contract"], []).append(p)

            for c in contracts:
                c["payments"] = payments_by_contract.get(c["pk"], [])

            return contracts

    def get_payments_by_user(self, user_id, current_user):
        """Lista faturas/pagamentos dos documentos criados pelo utilizador."""
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT di.*, d.regnumber, d.tt_type_name as type_name, d.submission
                FROM vbl_document_invoice di
                JOIN vbl_document d ON d.pk = di.tb_document
                WHERE d.hist_client = :user_id
                ORDER BY d.submission DESC
            """)
            result = session.execute(query, {"user_id": user_id})
            return [dict(row) for row in result.mappings().all()]


payment_service = PaymentService()
