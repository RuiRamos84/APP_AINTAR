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
                # Primeiro tenta obter os dados da tabela vbl_document_invoice
                query = text(
                    """SELECT * FROM vbl_document_invoice WHERE tb_document = :document_id""")
                result = session.execute(
                    query, {"document_id": document_id}).fetchone()

                if result:
                    # Converte o resultado em um dicionário, obtendo as colunas via .keys() apenas se disponível
                    invoice_data = {}

                    # Verifica se o objeto result tem o método keys
                    if hasattr(result, '_mapping'):
                        # Versão mais recente do SQLAlchemy
                        for key in result._mapping:
                            invoice_data[key] = result._mapping[key]
                    elif hasattr(result, 'keys'):
                        # Versão mais antiga do SQLAlchemy
                        for key in result.keys():
                            invoice_data[key] = result[key]
                    else:
                        # Fallback para acesso por índice (menos legível, mas funcional)
                        columns = ['pk', 'tb_document', 'urgency', 'invoice', 'presented', 'accepted',
                                   'payed', 'closed', 'updated_at', 'payment_reference',
                                   'payment_method', 'payment_status', 'order_id']
                        for i, column in enumerate(columns):
                            if i < len(result):
                                invoice_data[column] = result[i]

                    return invoice_data
                else:
                    # Se não encontrar, chama a função armazenada para criar/atualizar o registro
                    query = text(
                        """SELECT fbo_document_invoicegetset(:document_id) as amount""")
                    function_result = session.execute(
                        query, {"document_id": document_id}).fetchone()

                    if function_result and function_result[0] is not None:
                        # Agora que a função foi executada, buscar novamente os dados completos
                        query = text(
                            """SELECT * FROM vbl_document_invoice WHERE tb_document = :document_id""")
                        updated_result = session.execute(
                            query, {"document_id": document_id}).fetchone()

                        if updated_result:
                            # Converte o resultado em um dicionário
                            invoice_data = {}

                            # Verifica se o objeto result tem o método keys
                            if hasattr(updated_result, '_mapping'):
                                # Versão mais recente do SQLAlchemy
                                for key in updated_result._mapping:
                                    invoice_data[key] = updated_result._mapping[key]
                            elif hasattr(updated_result, 'keys'):
                                # Versão mais antiga do SQLAlchemy
                                for key in updated_result.keys():
                                    invoice_data[key] = updated_result[key]
                            else:
                                # Fallback para acesso por índice
                                columns = ['pk', 'tb_document', 'urgency', 'invoice', 'presented', 'accepted',
                                           'payed', 'closed', 'updated_at', 'payment_reference',
                                           'payment_method', 'payment_status', 'order_id']
                                for i, column in enumerate(columns):
                                    if i < len(updated_result):
                                        invoice_data[column] = updated_result[i]

                            return invoice_data
                        else:
                            # Caso ainda não encontre após chamar a função, retorna apenas o valor
                            return {"amount": float(function_result[0])}
                    else:
                        # Se a função não retornar valor, retorna None
                        return None
        except Exception as e:
            logger.error(f"Erro ao obter o valor da fatura: {str(e)}")
            raise e  # Re-raise the exception to be caught by the route handler
        except Exception as e:
            logger.error(f"Erro ao obter o valor da fatura: {str(e)}")
            raise e  # Re-raise the exception to be caught by the route handler

    def create_checkout(self, order_id, amount, methods, current_user):
        try:
            checkout_url = f"{self.base_url}/payments"
            current_time = datetime.utcnow().isoformat()
            expiration_time = (datetime.utcnow() +
                               timedelta(days=2)).isoformat()
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
                    "description": order_id,
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
            with db_session_manager(current_user) as db:
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

    def create_mbway_payment(self, transaction_id, transaction_signature, phone_number, current_user):
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
            with db_session_manager(current_user) as db:
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

    def create_multibanco_reference(self, transaction_id, transaction_signature, expiry_date, current_user):
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
            with db_session_manager(current_user) as db:
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

    def check_payment_status(self, transaction_id, document_id, current_user):
        """
        Consulta o estado do pagamento na SIBS e atualiza o status e a referência na BD.
        Também chama a função fbo_document_invoice$sibs para associar o pagamento à fatura
        apenas se o status for SUCCESS.
        
        Args:
            transaction_id: ID da transação na SIBS
            document_id: ID do documento (tb_document.pk) associado à fatura
            current_user: Usuário atual para sessão do BD
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
                payment_reference = status_info.get(
                    "token", {}).get("value", "")
            else:
                payment_reference = json.dumps(status_info)

            with db_session_manager(current_user) as db:
                # Primeiro, consulta o PK da tabela vbf_sibs
                query_select = text("""
                    SELECT pk FROM vbf_sibs
                    WHERE transaction_id = :transaction_id
                """)
                sibs_result = db.execute(
                    query_select, {"transaction_id": transaction_id}).fetchone()

                if not sibs_result:
                    logger.error(
                        f"Não foi encontrado registro para o transaction_id: {transaction_id}")
                    return {
                        "success": False,
                        "status": data,
                        "message": "Não foi possível encontrar o registo de pagamento"
                    }

                vbf_sibs_pk = sibs_result[0]

                # Depois, atualiza o status e a referência sem usar RETURNING
                query_update = text("""
                    UPDATE vbf_sibs
                    SET payment_status = :payment_status,
                        payment_reference = :payment_reference,
                        updated_at = NOW()
                    WHERE transaction_id = :transaction_id
                """)
                db.execute(query_update, {
                    "payment_status": payment_status,
                    "payment_reference": payment_reference,
                    "transaction_id": transaction_id
                })
                print(f'payment_status: {payment_status}')
                # Verifica se o status é SUCCESS antes de associar à fatura
                if payment_status == "Success":
                    # Chamar a função fbo_document_invoice$sibs diretamente com o document_id
                    print(f'document_id: {document_id}')
                    print(f'vbf_sibs_pk: {vbf_sibs_pk}')
                    call_function = text("""
                        SELECT fbo_document_invoice$sibs(:document_id, :vbf_sibs_pk)
                    """)
                    db.execute(call_function, {
                        "document_id": document_id,
                        "vbf_sibs_pk": vbf_sibs_pk
                    })

                    return {
                        "success": True,
                        "status": data,
                        "message": "Pagamento com sucesso e associado à fatura"
                    }
                else:
                    # Se o status não for SUCCESS, apenas retorna o status sem associar
                    return {
                        "success": True,
                        "status": data,
                        "message": f"Status do pagamento atualizado: {payment_status}"
                    }
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
