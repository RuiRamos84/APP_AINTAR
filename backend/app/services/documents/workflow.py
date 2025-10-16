import json  # Adicionar este import no topo do ficheiro
from flask import current_app, jsonify, request
from app.utils.error_handler import APIError, ResourceNotFoundError
from app.utils.utils import format_message, db_session_manager
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
from functools import wraps
from app import cache
from .utils import emit_socket_notification, sanitize_input
from app.utils.logger import get_logger

logger = get_logger(__name__)




def cache_result(timeout=120):
    """Decorador para cache de resultados de consultas frequentes"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            cache_key = f"{f.__name__}_{args}_{kwargs}"
            result = cache.get(cache_key)
            if result:
                logger.debug(
                    f"Resultado encontrado em cache para {f.__name__}")
                return result

            result = f(*args, **kwargs)
            cache.set(cache_key, result, timeout=timeout)
            return result
        return decorated_function
    return decorator


@cache_result(timeout=30)
def get_document_steps(pk, current_user):
    """Obter passos do documento"""
    try:
        with db_session_manager(current_user) as session:
            pk = sanitize_input(pk, 'int')

            # Verificar se o documento existe
            doc_query = text("SELECT pk FROM vbl_document WHERE pk = :pk")
            doc = session.execute(doc_query, {'pk': pk}).fetchone()
            if not doc:
                raise ResourceNotFoundError("Documento", pk)

            # Buscar os passos
            document_step_query = text(
                "SELECT * FROM vbl_document_step WHERE tb_document = :pk ORDER BY ord")
            document_step_result = session.execute(
                document_step_query, {'pk': pk})

            document_step_list = []
            for row in document_step_result.mappings():
                step_dict = dict(row)
                # Formatação de datas se necessário
                if "created_at" in step_dict and isinstance(step_dict["created_at"], datetime):
                    step_dict["created_at"] = step_dict["created_at"].isoformat()
                document_step_list.append(step_dict)

            return document_step_list

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except SQLAlchemyError as e:
        logger.error(
            f"Erro de BD ao buscar passos do documento {pk}: {str(e)}")
        raise APIError("Erro ao consultar passos do documento",
                       500, "ERR_DATABASE")
    except Exception as e:
        logger.error(
            f"Erro inesperado ao buscar passos do documento {pk}: {str(e)}")
        raise APIError("Erro interno do servidor", 500, "ERR_INTERNAL")


def add_document_step(data, pk, current_user):
    """Adicionar ou atualizar passo do documento"""
    try:
        with db_session_manager(current_user) as session:
            print(data)
            pk = sanitize_input(pk, 'int')
            tb_document = sanitize_input(data.get('tb_document'), 'int')
            what = sanitize_input(data.get('what'), 'int')
            who = sanitize_input(data.get('who'), 'int')
            memo = data.get('memo')

            if tb_document is None or what is None or who is None:
                raise APIError("Dados incompletos para o passo do documento", 400, "ERR_INVALID_INPUT")

            # Verificar se o documento existe
            doc_query = text("SELECT pk FROM vbl_document WHERE pk = :pk")
            doc = session.execute(doc_query, {'pk': tb_document}).fetchone()
            if not doc:
                raise ResourceNotFoundError("Documento", tb_document)

            # Verificar se o passo existe
            document_step_query = text(
                "SELECT * FROM vbf_document_step WHERE pk = :pk")
            document_step_result = session.execute(
                document_step_query, {'pk': pk}).fetchone()

            try:
                if document_step_result is None:
                    # Criar novo passo
                    pk_query = text("SELECT fs_nextcode()")
                    pk_result = session.execute(pk_query).scalar()

                    insert_query = text(
                        "INSERT INTO vbf_document_step (pk, tb_document, what, who, memo) "
                        "VALUES (:pk, :tb_document, :what, :who, :memo)"
                    )
                    session.execute(insert_query, {
                        'pk': pk_result,
                        'tb_document': tb_document,
                        'what': what,
                        'who': who,
                        'memo': memo
                    })
                else:
                    # Atualizar passo existente
                    update_query = text(
                        "UPDATE vbf_document_step SET memo = :memo, what = :what, who = :who WHERE pk = :pk"
                    )
                    session.execute(
                        update_query, {'pk': pk, 'memo': memo, 'what': what, 'who': who})

                session.commit()

                # Limpar cache de passos
                cache.delete_memoized(get_document_steps)

                # Emitir notificação com dados completos
                import time

                # Buscar dados completos do documento
                doc_details_query = text("""
                    SELECT d.pk, d.regnumber, d.memo as descr, d.tt_type, d.creator,
                           d.ts_entity, d.ts_associate, d.tb_representative, d.tt_presentation
                    FROM vbf_document d
                    WHERE d.pk = :document_id
                """)
                doc_details = session.execute(doc_details_query, {
                    'document_id': tb_document
                }).fetchone()

                if doc_details:
                    notification_data = {
                        "document_id": tb_document,
                        "document_number": doc_details.regnumber or f"Pedido #{tb_document}",
                        "document_description": doc_details.descr or "",
                        "document_type": doc_details.tt_type or "Documento",
                        "from_user": current_user if isinstance(current_user, int) else int(current_user) if str(current_user).isdigit() else 17,  # Quem criou o passo
                        "from_user_name": doc_details.creator or 'Utilizador',
                        "to_user": who,  # Para quem foi atribuído
                        "to_user_name": "Utilizador",
                        "step_name": "Novo passo adicionado",
                        "step_type": "workflow_step",
                        "current_status": "Em processamento",
                        "message": f"Novo passo adicionado ao {doc_details.regnumber or f'pedido #{tb_document}'}",
                        "timestamp": time.time(),
                        "notification_id": f"workflow_{tb_document}_{int(time.time() * 1000)}",
                        "metadata": {
                            "memo": memo or "",
                            "step_what": what,
                            "step_who": who,
                            "document_pk": tb_document,
                            "document_regnumber": doc_details.regnumber,
                            "document_creator": doc_details.creator,
                            "workflow_action": "add_step",
                            "notification_source": "workflow_step",
                            "recipient_type": "assigned_user",
                            # IDs para mapeamento no frontend
                            "step_what_id": what,  # ID para mapeamento em metadata.what
                            "step_who_id": who,    # ID para mapeamento em metadata.who
                            "document_type_id": doc_details.tt_type if doc_details else None,  # Para metadata.param_doctype
                            "entity_mapping_id": doc_details.ts_entity if doc_details else None,  # Para metadata.ee
                            "associate_mapping_id": doc_details.ts_associate if doc_details else None,  # Para metadata.associates
                            "representative_mapping_id": doc_details.tb_representative if doc_details else None,  # Para metadata.who
                            "presentation_mapping_id": doc_details.tt_presentation if doc_details else None,  # Para metadata.presentation
                            # Flags para o frontend saber que dados mapear
                            "requires_mapping": {
                                "step_what": True,
                                "step_who": True,
                                "document_type": True if doc_details else False,
                                "entity": True if (doc_details and doc_details.ts_entity) else False,
                                "associate": True if (doc_details and doc_details.ts_associate) else False,
                                "representative": True if (doc_details and doc_details.tb_representative) else False,
                                "presentation": True if (doc_details and doc_details.tt_presentation) else False
                            }
                        }
                    }
                else:
                    # Fallback se não conseguir buscar detalhes
                    notification_data = {
                        "document_id": tb_document,
                        "document_number": f"Pedido #{tb_document}",
                        "from_user": current_user if isinstance(current_user, int) else int(current_user) if str(current_user).isdigit() else 17,
                        "from_user_name": 'Utilizador',
                        "to_user": who,
                        "to_user_name": "Utilizador",
                        "message": f"Novo passo adicionado ao pedido #{tb_document}",
                        "timestamp": time.time(),
                        "notification_id": f"workflow_{tb_document}_{int(time.time() * 1000)}",
                        "metadata": {
                            "memo": memo or "",
                            "step_what": what,
                            "step_who": who,
                            "document_pk": tb_document,
                            "workflow_action": "add_step",
                            "notification_source": "workflow_step",
                            "recipient_type": "assigned_user",
                            # IDs para mapeamento no frontend
                            "step_what_id": what,  # ID para mapeamento em metadata.what
                            "step_who_id": who,    # ID para mapeamento em metadata.who
                            # Flags para o frontend saber que dados mapear
                            "requires_mapping": {
                                "step_what": True,
                                "step_who": True
                            }
                        }
                    }

                debug_msg = f"🔥 BACKEND DEBUG: workflow.py - Preparando notificação {notification_data['notification_id']}"
                print(debug_msg)
                logger.info(debug_msg)
                emit_socket_notification(notification_data, f"user_{who}")

                return {'sucesso': 'Passo do pedido criado ou atualizado com sucesso'}, 201

            except SQLAlchemyError as se:
                session.rollback()
                error_str = str(se)

                # Verificar se é uma regra de negócio (mensagem controlada)
                import re
                error_match = re.search(r'<error>(.*?)</error>', error_str)
                if error_match:
                    error_message = error_match.group(1)
                    # Retorna código 422 (Unprocessable Entity) em vez de 400 ou 500
                    # que indica erro de validação de negócio, não de sintaxe ou sistema
                    return {'error': error_message, 'code': 'VALIDATION_ERROR'}, 422

                # Se for um erro técnico não previsto
                logger.error(
                    f"Erro de BD ao salvar passo do documento: {str(se)}")
                raise APIError("Erro ao salvar passo do documento", 500, "ERR_DATABASE")
    except ResourceNotFoundError as e:
        logger.error(
            f"Erro ao buscar passo do documento: {str(e)}")
        raise APIError("Recurso não encontrado", 404, "ERR_NOT_FOUND") 
        

# @cache_result(timeout=60)
def get_document_type_param(current_user, type_id):
    """Obter parâmetros do documento - SEMPRE 200"""
    try:
        with db_session_manager(current_user) as session:
            type_id = sanitize_input(type_id, 'int')

            # Verificar se documento existe
            doc_query = text("SELECT pk FROM vbl_document WHERE pk = :pk")
            doc_result = session.execute(doc_query, {'pk': type_id}).fetchone()
            if not doc_result:
                raise ResourceNotFoundError("Documento", type_id)

            # Buscar parâmetros (pode ser vazio)
            query = text("""
                SELECT * FROM vbl_document_param
                WHERE tb_document = :document_id
            """)
            result = session.execute(query, {'document_id': type_id})
            params = [dict(row) for row in result.mappings()]

            # SEMPRE retorna 200, mesmo sem parâmetros
            response = {
                'params': params,
                'total': len(params),
                'document_id': type_id
            }

            return jsonify(response), 200

    except ResourceNotFoundError as e:
        return jsonify({'error': str(e)}), e.status_code
    except SQLAlchemyError as e:
        logger.error(f"Erro BD parâmetros: {str(e)}")
        return jsonify({'error': "Erro ao consultar parâmetros"}), 500
    except Exception as e:
        logger.error(f"Erro parâmetros: {str(e)}")
        return jsonify({'error': "Erro interno"}), 500


def update_document_params(current_user, document_id, data):
    """Atualizar parâmetros do documento e calcular invoice"""

    # Mapeamento entre tipos de documento e funções invoice
    TYPE_TO_INVOICE = {
        "Ramal: Execução": {
            "id": 1,
            "function": "fbo_document_invoice$1"
        },
        "Pedido de Limpeza de Fossa": {
            "id": 2,
            "function": "fbo_document_invoice$2"
        },
        # Adicionar novos tipos aqui:
        # "Novo Tipo": {
        #     "id": 3,
        #     "function": "fbo_document_invoice$3"
        # },
    }

    try:
        with db_session_manager(current_user) as session:
            document_id = sanitize_input(document_id, 'int')

            # Verificar se o documento existe e obter o tipo
            doc_query = text(
                "SELECT pk, tt_type FROM vbl_document WHERE pk = :pk")
            doc = session.execute(doc_query, {'pk': document_id}).fetchone()
            if not doc:
                raise ResourceNotFoundError("Documento", document_id)

            document_type = doc.tt_type

            # Data já é um array aqui, não precisa do .get('params')
            params_to_update = data if isinstance(data, list) else []

            if not params_to_update:
                raise APIError('Nenhum parâmetro para atualizar',
                               400, "ERR_NO_PARAMS")

            update_count = 0
            try:
                for param in params_to_update:
                    if not isinstance(param, dict) or 'pk' not in param or 'value' not in param:
                        continue

                    param_pk = sanitize_input(param['pk'], 'int')
                    param_value = sanitize_input(param.get('value', ''))
                    param_memo = sanitize_input(param.get('memo', ''))

                    # Verificar se o parâmetro existe e pertence ao documento
                    param_check_query = text("""
                        SELECT 1 FROM vbf_document_param 
                        WHERE pk = :pk AND tb_document = :document_id
                    """)
                    param_exists = session.execute(param_check_query, {
                        'pk': param_pk,
                        'document_id': document_id
                    }).fetchone()

                    if not param_exists:
                        logger.warning(
                            f"Tentativa de atualizar parâmetro inexistente: {param_pk}")
                        continue

                    # Atualizar o parâmetro
                    update_query = text("""
                        UPDATE vbf_document_param
                        SET value = :value, memo = :memo
                        WHERE pk = :pk AND tb_document = :document_id
                    """)
                    result = session.execute(update_query, {
                        'value': param_value if param_value is not None else '',
                        'memo': param_memo if param_memo is not None else '',
                        'pk': param_pk,
                        'document_id': document_id
                    })
                    update_count += result.rowcount

                # Chamar a função de invoice se o tipo estiver configurado
                invoice_info = None

                # Verificar se document_type é string (nome) ou número (id)
                if isinstance(document_type, str) and document_type in TYPE_TO_INVOICE:
                    invoice_info = TYPE_TO_INVOICE[document_type]
                elif isinstance(document_type, (int, float)):
                    # Procurar pelo ID no mapeamento
                    for type_name, info in TYPE_TO_INVOICE.items():
                        if info["id"] == int(document_type):
                            invoice_info = info
                            break

                if invoice_info:
                    invoice_function = invoice_info["function"]
                    invoice_query = text(f"""
                        SELECT {invoice_function}(:pnpk) AS result
                    """)
                    invoice_result = session.execute(invoice_query, {
                        'pnpk': document_id
                    }).scalar()

                    if invoice_result:
                        logger.info(
                            f"Invoice calculado para documento {document_id} (tipo {document_type}): {invoice_result}")
                    else:
                        logger.warning(
                            f"Falha ao calcular invoice para documento {document_id} (tipo {document_type})")

                session.commit()

                # Limpar cache relacionado
                cache.delete_memoized(get_document_type_param)

                return {
                    'success': True,
                    'message': f'Atualizados {update_count} parâmetros com sucesso',
                    'invoice_updated': invoice_info is not None
                }, 200

            except SQLAlchemyError as se:
                session.rollback()
                logger.error(
                    f"Erro de BD ao atualizar parâmetros: {str(se)}")
                raise APIError("Erro ao atualizar parâmetros",
                               500, "ERR_DATABASE")

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except APIError as e:
        return {'error': str(e), 'code': e.error_code}, e.status_code
    except Exception as e:
        logger.error(
            f"Erro inesperado ao atualizar parâmetros: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }, 500
        

def update_document_pavenext(pk, current_user):
    """Atualizar o documento usando a função fbo_document_pavenext"""
    try:
        with db_session_manager(current_user) as session:
            pk = sanitize_input(pk, 'int')

            # Verificar se o documento existe
            doc_query = text("SELECT pk FROM vbl_document WHERE pk = :pk")
            doc = session.execute(doc_query, {'pk': pk}).fetchone()
            if not doc:
                raise ResourceNotFoundError("Documento", pk)

            # Chamar a função armazenada
            update_query = text("""
                SELECT fbo_document_pavenext(:pk) AS result
            """)
            result = session.execute(update_query, {'pk': pk}).scalar()

            if not result:
                raise APIError("Falha ao atualizar documento",
                               400, "ERR_UPDATE_FAILED")

            formatted_result = format_message(result)
            session.commit()

            # Limpar caches relacionados
            try:
                from .core import list_documents, document_self, document_owner
                cache.delete_memoized(get_document_steps, pk, current_user)
                cache.delete_memoized(list_documents, current_user)
                cache.delete_memoized(document_self, current_user)
                cache.delete_memoized(document_owner, current_user)
            except Exception as cache_error:
                logger.warning(
                    f"Erro ao limpar cache: {cache_error}")

            return {
                'message': 'Documento atualizado com sucesso',
                'result': formatted_result
            }, 200

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except APIError as e:
        return {'error': str(e), 'code': e.error_code}, e.status_code
    except SQLAlchemyError as e:
        logger.error(
            f"Erro de BD ao atualizar documento {pk}: {str(e)}")
        return {'error': "Erro ao atualizar documento", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        logger.error(
            f"Erro inesperado ao atualizar documento {pk}: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500


def step_hierarchy(dockty_id, current_user):
    """Obter os passos do tipo de documento com hierarquia"""
    try:
        with db_session_manager(current_user) as session:
            dockty_id = sanitize_input(dockty_id, 'int')

            # Chamar a função armazenada que retorna o diagrama de transição dos passos
            query = text("""
                SELECT fbo_step_transition_diagram(:dockty_id) AS result
            """)
            result = session.execute(query, {'dockty_id': dockty_id}).scalar()

            if not result:
                return {'error': "Nenhuma hierarquia encontrada para o tipo de documento"}, 404

            # O resultado já é um JSON, mas pode vir como string dependendo do driver
            if isinstance(result, str):
                try:
                    result = json.loads(result)
                except json.JSONDecodeError as e:
                    logger.error(
                        f"Erro ao parsear JSON da hierarquia: {str(e)}")
                    return {'error': "Erro no formato dos dados da hierarquia"}, 500

            return result, 200

    except SQLAlchemyError as e:
        logger.error(
            f"Erro de BD ao buscar hierarquia de passos: {str(e)}")
        return {'error': "Erro ao consultar passos", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        logger.error(
            f"Erro inesperado ao buscar hierarquia de passos: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500
