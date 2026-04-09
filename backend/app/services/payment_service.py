import requests
from datetime import datetime, timedelta
from app.utils.utils import db_session_manager
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

    def __init__(self):
        self.base_url = None
        self.terminal_id = None
        self.client_id = None
        self.entity = None
        self.api_token = None
        self.checkout_cache = {}  # Cache de instância

    def init_app(self, app):
        self.base_url = app.config.get('SIBS_BASE_URL')
        self.terminal_id = int(app.config.get('SIBS_TERMINAL_ID'))
        self.client_id = app.config.get('SIBS_CLIENT_ID')
        self.entity = app.config.get('SIBS_ENTITY', '52764')
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
                        type_fn_map = {1: '"fbo_document_invoice$1"', 2: '"fbo_document_invoice$2"'}
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
                order_id = invoice_data.get('order_id')
                sibs_result = None
                if order_id:
                    sibs_query = text("SELECT * FROM vbl_sibs WHERE order_id = :order_id ORDER BY created_at DESC LIMIT 1")
                    sibs_result = session.execute(sibs_query, {"order_id": order_id}).fetchone()

                if not sibs_result:
                    # Fallback: procurar via tb_document_invoice -> tb_sibs
                    sibs_query = text("""
                        SELECT s.* FROM vbl_sibs s
                        JOIN tb_document_invoice di ON di.tb_sibs = s.pk
                        WHERE di.tb_document = :document_id
                    """)
                    sibs_result = session.execute(sibs_query, {"document_id": document_id}).fetchone()

                if sibs_result:
                    sibs_data = dict(sibs_result._mapping)
                    invoice_data['sibs_expiry'] = str(sibs_data.get('expiry_date', '')) if sibs_data.get('expiry_date') else None
                    invoice_data['sibs_entity'] = sibs_data.get('entity')
                    invoice_data['sibs_reference'] = sibs_data.get('pref')
                    invoice_data['sibs_method'] = sibs_data.get('method')
                    invoice_data['sibs_status'] = sibs_data.get('status')

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
                    SELECT "fbo_document_invoice$link"(:document_id, :sibs_pk)
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
                    SELECT "fbo_document_invoice$link"(:document_id, :sibs_pk)
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

                # Associar SIBS à fatura do documento
                db.execute(text("""
                    SELECT "fbo_document_invoice$link"(:document_id, :sibs_pk)
                """), {"sibs_pk": sibs_pk, "document_id": document_id})

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
        """
        Verificar estado do pagamento.

        Lógica diferenciada por método:
        - MBWAY: Chamado apenas como fallback se webhook não chegar em 5min
        - MULTIBANCO: Chamado apenas na data de expiração da referência
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
                PaymentStatus.CREATED, PaymentStatus.PENDING
            ]:
                return {
                    "success": True,
                    "payment_status": local_data.payment_status,
                    "payment_method": local_data.payment_method,
                    "document_id": local_data.tb_document,
                    "updated": False
                }

            # Para MULTIBANCO: só consultar SIBS se a data de
            # expiração já foi atingida
            if local_data.payment_method == 'MULTIBANCO':
                if local_data.expiry_date:
                    expiry = local_data.expiry_date
                    if hasattr(expiry, 'date'):
                        expiry_date = expiry.date()
                    else:
                        expiry_date = expiry
                    if date.today() < expiry_date:
                        return {
                            "success": True,
                            "payment_status": local_data.payment_status,
                            "payment_method": "MULTIBANCO",
                            "document_id": local_data.tb_document,
                            "expiry_date": str(local_data.expiry_date),
                            "updated": False,
                            "message": "Referência ainda válida. "
                                       "Aguardar webhook ou expiração."
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
                    if amount and amount > 0:
                        try:
                            caixa_pk = db.execute(text("SELECT fs_nextcode()")).scalar()
                            db.execute(text("""
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
                            logger.info(
                                f"Movimento de caixa {caixa_pk} criado automaticamente "
                                f"para pagamento {payment_pk} (doc={document_id}, valor={amount})"
                            )
                        except Exception as caixa_err:
                            logger.warning(
                                f"Falha ao criar movimento de caixa para pagamento {payment_pk}: {caixa_err}"
                            )

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

            # Webhook não tem sessão autenticada - usar conexão directa
            with db_session_manager(None) as db:
                # Actualizar status
                db.execute(text("""
                    SELECT fbo_sibs_status(:transaction_id, :status, :pref)
                """), {
                    "status": internal_status,
                    "pref": json.dumps(webhook_data),
                    "transaction_id": transaction_id
                })

                # Obter invoice_pk e document_id associados
                invoice_info = db.execute(text("""
                    SELECT invoice_pk, tb_document
                    FROM vbl_sibs
                    WHERE transaction_id = :transaction_id
                """), {"transaction_id": transaction_id}).fetchone()

                invoice_pk = invoice_info[0] if invoice_info else None
                document_id = invoice_info[1] if invoice_info else None

                # Se sucesso, actualizar invoice
                if internal_status == PaymentStatus.SUCCESS and document_id:
                    db.execute(text("""
                        SELECT "fbo_document_invoice$link"(:document_id, (
                            SELECT pk FROM tb_sibs
                            WHERE transaction_id = :transaction_id
                        ))
                    """), {
                        "document_id": document_id,
                        "transaction_id": transaction_id
                    })

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
                "document_id": document_id
            }

        except Exception as e:
            logger.error(f"Erro no webhook: {e}")
            raise


    # ============================================================
    # ISENÇÕES (Gratuito)
    # ============================================================

    def submit_exemption(self, document_id: int, current_user: str):
        """Submeter pedido de isenção para um documento gratuito"""
        try:
            with db_session_manager(current_user) as db:
                sibs_pk = db.execute(text("""
                    SELECT "fbo_document_exemption$submit"(:document_id)
                """), {"document_id": document_id}).scalar()

                if not sibs_pk:
                    raise APIError("Não foi possível criar o pedido de isenção.", 400)

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
                payload = {
                    "merchant": {"terminalId": self.terminal_id},
                    "transaction": {
                        "transactionTimestamp": datetime.utcnow().isoformat(),
                        "description": f"Devolução - {reason}" if reason else "Devolução",
                        "amount": {"value": float(payment.amount), "currency": "EUR"}
                    }
                }
                resp = requests.post(url, json=payload,
                                     headers=self._get_headers(), timeout=30)

                if not resp.ok:
                    sibs_error = {}
                    try:
                        sibs_error = resp.json()
                    except Exception:
                        pass
                    logger.error(f"SIBS refund erro {resp.status_code}: {sibs_error}")
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

                # Reverter a fatura do documento
                if payment.invoice_pk:
                    db.execute(text("""
                        SELECT fbo_document_invoice$refund(:invoice_pk)
                    """), {"invoice_pk": payment.invoice_pk})

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


payment_service = PaymentService()
