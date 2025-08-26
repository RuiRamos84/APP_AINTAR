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


def cache_result(timeout=120):
    """Decorador para cache de resultados de consultas frequentes"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            cache_key = f"{f.__name__}_{args}_{kwargs}"
            result = cache.get(cache_key)
            if result:
                current_app.logger.debug(
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
        current_app.logger.error(
            f"Erro de BD ao buscar passos do documento {pk}: {str(e)}")
        raise APIError("Erro ao consultar passos do documento",
                       500, "ERR_DATABASE")
    except Exception as e:
        current_app.logger.error(
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

                # Emitir notificação
                notification_data = {
                    "document_id": tb_document,
                    "message": f"Novo passo adicionado ao pedido {tb_document}"
                }
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
                current_app.logger.error(
                    f"Erro de BD ao salvar passo do documento: {str(se)}")
                raise APIError("Erro ao salvar passo do documento", 500, "ERR_DATABASE")
    except ResourceNotFoundError as e:
        current_app.logger.error(
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
        current_app.logger.error(f"Erro BD parâmetros: {str(e)}")
        return jsonify({'error': "Erro ao consultar parâmetros"}), 500
    except Exception as e:
        current_app.logger.error(f"Erro parâmetros: {str(e)}")
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
                        current_app.logger.warning(
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
                        current_app.logger.info(
                            f"Invoice calculado para documento {document_id} (tipo {document_type}): {invoice_result}")
                    else:
                        current_app.logger.warning(
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
                current_app.logger.error(
                    f"Erro de BD ao atualizar parâmetros: {str(se)}")
                raise APIError("Erro ao atualizar parâmetros",
                               500, "ERR_DATABASE")

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except APIError as e:
        return {'error': str(e), 'code': e.error_code}, e.status_code
    except Exception as e:
        current_app.logger.error(
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
                current_app.logger.warning(
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
        current_app.logger.error(
            f"Erro de BD ao atualizar documento {pk}: {str(e)}")
        return {'error': "Erro ao atualizar documento", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        current_app.logger.error(
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
                    current_app.logger.error(
                        f"Erro ao parsear JSON da hierarquia: {str(e)}")
                    return {'error': "Erro no formato dos dados da hierarquia"}, 500

            return result, 200

    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Erro de BD ao buscar hierarquia de passos: {str(e)}")
        return {'error': "Erro ao consultar passos", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao buscar hierarquia de passos: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500
