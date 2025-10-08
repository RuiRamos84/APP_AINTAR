from flask import current_app, jsonify, request
from app.utils.error_handler import APIError, ResourceNotFoundError, DuplicateResourceError
from app.utils.utils import format_message, db_session_manager
from app import db, cache
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import text, func
from datetime import datetime
import os
from functools import wraps
from .utils import ensure_directories, emit_socket_notification, validate_document_data, sanitize_input


def cache_result(timeout=300):
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


# @cache_result(timeout=60)
def list_documents(current_user):
    """Listar todos os documentos com cache estratégico"""
    try:
        with db_session_manager(current_user) as session:
            documents_query = text("SELECT * FROM vbl_document")
            documents_result = session.execute(documents_query).fetchall()

            if documents_result:
                documents_list = []
                for document in documents_result:
                    document_dict = document._asdict()
                    if isinstance(document_dict["submission"], datetime):
                        document_dict["submission"] = document_dict["submission"].isoformat(
                        )
                    documents_list.append(document_dict)
                return {'documents': documents_list}, 200
            else:
                return {'message': 'Nenhum documento encontrado'}, 200

    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Erro de banco de dados ao listar documentos: {str(e)}")
        raise APIError("Erro ao consultar documentos", 500, "ERR_DATABASE")
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao listar documentos: {str(e)}")
        raise APIError(f"Erro interno do servidor", 500, "ERR_INTERNAL")


def documentById(documentId, current_user):
    """Obter dados do documento"""
    try:
        with db_session_manager(current_user) as session:
            # Sanitizar entrada
            documentId = sanitize_input(documentId)

            document_query = text(
                "SELECT * FROM vbl_document WHERE regnumber = :documentId")
            document_result = session.execute(
                document_query, {"documentId": documentId}).fetchone()

            if not document_result:
                raise ResourceNotFoundError("Documento", documentId)

            document_dict = document_result._asdict()
            if isinstance(document_dict["submission"], datetime):
                document_dict["submission"] = document_dict["submission"].isoformat()

            return {'document': document_dict}, 200

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Erro de BD ao buscar documento {documentId}: {str(e)}")
        raise APIError("Erro ao consultar documento", 500, "ERR_DATABASE")
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao buscar documento {documentId}: {str(e)}")
        raise APIError("Erro interno do servidor", 500, "ERR_INTERNAL")


# @cache_result(timeout=60)
def document_self(current_user):
    """Listar documentos atribuídos a si"""
    try:
        with db_session_manager(current_user) as session:
            document_self_query = text("SELECT * FROM vbl_document$self")
            document_self_result = session.execute(
                document_self_query).fetchall()

            if document_self_result:
                document_self_list = []
                for document in document_self_result:
                    document_dict = document._asdict()
                    if isinstance(document_dict["submission"], datetime):
                        document_dict["submission"] = document_dict["submission"].isoformat(
                        )
                    document_self_list.append(document_dict)
                return {'document_self': document_self_list}, 200
            else:
                return {'mensagem': 'Não existem Pedidos atribuídos a si'}, 200

    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Erro de BD ao listar documentos próprios: {str(e)}")
        raise APIError("Erro ao consultar documentos", 500, "ERR_DATABASE")
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao listar documentos próprios: {str(e)}")
        raise APIError("Erro interno do servidor", 500, "ERR_INTERNAL")


# @cache_result(timeout=60)
def document_owner(current_user):
    """Listar documentos criados por si"""
    try:
        with db_session_manager(current_user) as session:
            document_owner_query = text("SELECT * FROM vbl_document$owner")
            document_owner_result = session.execute(
                document_owner_query).fetchall()

            if document_owner_result:
                document_owner_list = []
                for document in document_owner_result:
                    document_dict = document._asdict()
                    if isinstance(document_dict["submission"], datetime):
                        document_dict["submission"] = document_dict["submission"].isoformat(
                        )
                    document_owner_list.append(document_dict)
                return {'document_owner': document_owner_list}, 200
            else:
                return {'mensagem': 'Não existem Documentos atribuídos a si'}, 200

    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Erro de BD ao listar documentos criados: {str(e)}")
        raise APIError("Erro ao consultar documentos", 500, "ERR_DATABASE")
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao listar documentos criados: {str(e)}")
        raise APIError("Erro interno do servidor", 500, "ERR_INTERNAL")


def create_document(data, files, current_user):
    """Criar novo documento com anexos"""
    try:
        with db_session_manager(current_user) as session:
            # Validar dados obrigatórios
            valid, error_msg = validate_document_data(data)
            if not valid:
                raise APIError(error_msg, 400, "ERR_INVALID_INPUT")

            ts_entity = sanitize_input(data.get('ts_entity'), 'int')
            if not ts_entity:
                raise APIError('ID da entidade não fornecido',
                               400, "ERR_MISSING_ENTITY")

            tt_type = sanitize_input(data.get('tt_type'), 'int')
            ts_associate = sanitize_input(data.get('ts_associate'), 'int')
            representative_nipc = data.get('tb_representative')
            tt_presentation = sanitize_input(
                data.get('tt_presentation'), 'int')

            # Buscar o PK do representante usando o NIF
            tb_representative = None
            if representative_nipc:
                representative_query = text(
                    "SELECT pk FROM vbf_entity WHERE nipc = :nipc")
                representative_result = session.execute(
                    representative_query, {'nipc': representative_nipc}).scalar()
                if not representative_result:
                    raise APIError(
                        'O representante fornecido não existe', 400, "ERR_INVALID_REP")
                tb_representative = representative_result

            memo = data.get('memo')
            is_different_address = data.get('isDifferentAddress') == 'true'

            # Dicionário para armazenar todos os campos do documento
            doc_fields = {
                'address': data.get('address'),
                'postal': data.get('postal'),
                'door': data.get('door'),
                'floor': data.get('floor'),
                'nut1': data.get('nut1'),
                'nut2': data.get('nut2'),
                'nut3': data.get('nut3'),
                'nut4': data.get('nut4'),
                'glat': sanitize_input(data.get('glat'), 'float') if data.get('glat') else None,
                'glong': sanitize_input(data.get('glong'), 'float') if data.get('glong') else None,
                'notification': 1,
                'tt_presentation': tt_presentation
            }

            if is_different_address:
                for field in ['address', 'postal', 'door', 'floor', 'nut1', 'nut2', 'nut3', 'nut4']:
                    doc_fields[field] = data.get(
                        f'shipping_{field}', doc_fields[field])

            # Gerar PK do documento
            pk_query = text("SELECT fs_nextcode()")
            pk_result = session.execute(pk_query).scalar()

            # Construir a query de inserção
            fields = ['pk', 'ts_entity', 'tt_type', 'ts_associate',
                      'tb_representative', 'memo'] + list(doc_fields.keys())
            placeholders = [f':{field}' for field in fields]

            insert_query = text(
                f"""INSERT INTO vbf_document
                ({', '.join(fields)})
                VALUES ({', '.join(placeholders)})"""
            )
            query_params = {
                'pk': pk_result,
                'ts_entity': ts_entity,
                'tt_type': tt_type,
                'ts_associate': ts_associate,
                'tb_representative': tb_representative,
                'memo': memo,
                **doc_fields
            }

            try:
                session.execute(insert_query, query_params)
                session.commit()
            except IntegrityError as ie:
                session.rollback()
                current_app.logger.error(f"Erro ao inserir documento: {str(ie)}")
                if "unique constraint" in str(ie).lower():
                    raise DuplicateResourceError("Documento", "regnumber", "")
                    current_app.logger.error(f"Erro de duplicação: {str(ie)}")
                raise APIError(f"Erro ao inserir documento: {str(ie)}", 500, "ERR_DB_INTEGRITY")

            # Obter regnumber e who
            reg_query = text(
                "SELECT regnumber, who FROM vbl_document WHERE pk = :pk")
            result = session.execute(reg_query, {'pk': pk_result}).fetchone()
            reg_result = result.regnumber
            who = result.who

            # Processar arquivos
            request_path, anexos_path, oficios_path = ensure_directories(
                reg_result)

            file_descriptions = data.getlist('descr')
            for i, file in enumerate(files[:5]):
                filename_query = text("SELECT fs_nextcode()")
                file_pk = session.execute(filename_query).scalar()
                description = file_descriptions[i] if i < len(
                    file_descriptions) else 'file description'
                extension = os.path.splitext(file.filename)[1]
                filename = f"{file_pk}{extension}"
                filepath = os.path.join(anexos_path, filename)

                try:
                    file.save(filepath)
                except Exception as fe:
                    current_app.logger.error(
                        f"Erro ao salvar arquivo {filename}: {str(fe)}")
                    continue

                annex_query = text(
                    "SELECT fbf_document_annex(0, :pk, :tb_document, :data, :descr, :filename)")
                try:
                    session.execute(annex_query, {
                        'pk': file_pk,
                        'tb_document': pk_result,
                        'data': datetime.now(),
                        'descr': description,
                        'filename': filename
                    })
                    session.commit()
                except Exception as ae:
                    current_app.logger.error(
                        f"Erro ao registrar anexo {filename}: {str(ae)}")
                    continue

            # Emitir notificação via socket com dados completos
            import time

            # Buscar dados completos do documento recém-criado
            doc_details_query = text("""
                SELECT d.pk, d.regnumber, d.memo as descr, d.tt_type, d.creator,
                       d.ts_entity, d.ts_associate, d.tb_representative, d.tt_presentation
                FROM vbf_document d
                WHERE d.pk = :document_id
            """)
            doc_details = session.execute(doc_details_query, {
                'document_id': pk_result
            }).fetchone()

            if doc_details:
                notification_data = {
                    "document_id": pk_result,
                    "document_number": doc_details.regnumber or f"Pedido #{pk_result}",
                    "document_description": doc_details.descr or memo or "",
                    "document_type": doc_details.tt_type or "Documento",
                    "from_user": current_user if isinstance(current_user, int) else int(current_user) if str(current_user).isdigit() else 17,
                    "from_user_name": doc_details.creator or 'Utilizador',
                    "to_user": who,
                    "to_user_name": "Utilizador",
                    "step_name": "Documento criado",
                    "step_type": "document_creation",
                    "current_status": "Criado",
                    "message": f"Novo pedido criado: {doc_details.regnumber or f'#{pk_result}'}",
                    "timestamp": time.time(),
                    "notification_id": f"document_{pk_result}_{int(time.time() * 1000)}",
                    "metadata": {
                        "memo": memo or "",
                        "entity_id": ts_entity,
                        "document_type": tt_type,
                        "document_pk": pk_result,
                        "document_regnumber": doc_details.regnumber,
                        "document_creator": doc_details.creator,
                        "workflow_action": "create_document",
                        "associate_id": ts_associate,
                        "representative_id": tb_representative,
                        "notification_source": "document_creation",
                        "recipient_type": "assigned_user",
                        "creation_context": "new_document",
                        # IDs para mapeamento no frontend
                        "entity_mapping_id": doc_details.ts_entity if doc_details else ts_entity,  # Para metadata.ee
                        "associate_mapping_id": doc_details.ts_associate if doc_details else ts_associate,  # Para metadata.associates
                        "representative_mapping_id": doc_details.tb_representative if doc_details else tb_representative,  # Para metadata.who
                        "document_type_mapping_id": doc_details.tt_type if doc_details else tt_type,  # Para metadata.param_doctype
                        "presentation_mapping_id": doc_details.tt_presentation if doc_details else None,  # Para metadata.presentation
                        # Flags para o frontend saber que dados mapear
                        "requires_mapping": {
                            "entity": True,
                            "associate": True if (doc_details.ts_associate if doc_details else ts_associate) else False,
                            "representative": True if (doc_details.tb_representative if doc_details else tb_representative) else False,
                            "document_type": True,
                            "presentation": True if (doc_details.tt_presentation if doc_details else None) else False
                        }
                    }
                }
            else:
                # Fallback se não conseguir buscar detalhes
                notification_data = {
                    "document_id": pk_result,
                    "document_number": reg_result or f"Pedido #{pk_result}",
                    "from_user": current_user if isinstance(current_user, int) else int(current_user) if str(current_user).isdigit() else 17,
                    "from_user_name": 'Utilizador',
                    "to_user": who,
                    "to_user_name": "Utilizador",
                    "message": f"Novo pedido criado: {reg_result or f'#{pk_result}'}",
                    "timestamp": time.time(),
                    "notification_id": f"document_{pk_result}_{int(time.time() * 1000)}",
                    "metadata": {
                        "memo": memo or "",
                        "entity_id": ts_entity,
                        "document_type": tt_type,
                        "document_pk": pk_result,
                        "workflow_action": "create_document",
                        "associate_id": ts_associate,
                        "representative_id": tb_representative,
                        "notification_source": "document_creation",
                        "recipient_type": "assigned_user",
                        "creation_context": "new_document",
                        # IDs para mapeamento no frontend (fallback)
                        "entity_mapping_id": ts_entity,  # Para metadata.ee
                        "associate_mapping_id": ts_associate,  # Para metadata.associates
                        "representative_mapping_id": tb_representative,  # Para metadata.who
                        "document_type_mapping_id": tt_type,  # Para metadata.param_doctype
                        # Flags para o frontend saber que dados mapear
                        "requires_mapping": {
                            "entity": True,
                            "associate": True if ts_associate else False,
                            "representative": True if tb_representative else False,
                            "document_type": True
                        }
                    }
                }

            debug_msg = f"🔥 BACKEND DEBUG: core.py - Preparando notificação {notification_data['notification_id']}"
            print(debug_msg)
            current_app.logger.info(debug_msg)
            emit_socket_notification(notification_data, f"user_{who}")

            # Buscar e atualizar parâmetros
            try:
                param_query = text("""
                    SELECT tb_param, value, memo 
                    FROM vbf_document_param 
                    WHERE tb_document = :pk
                """)
                params = session.execute(
                    param_query, {'pk': pk_result}).fetchall()

                # Inserir ou atualizar os parâmetros adicionais
                for param in params:
                    param_value = data.get(f'param_{param.tb_param}')
                    param_memo = data.get(f'param_memo_{param.tb_param}')

                    if param_value is not None or param_memo is not None:
                        update_query = text("""
                            UPDATE vbf_document_param 
                            SET value = :value, memo = :memo
                            WHERE tb_document = :doc_id AND tb_param = :param_id
                        """)
                        session.execute(update_query, {
                            'value': param_value,
                            'memo': param_memo,
                            'doc_id': pk_result,
                            'param_id': param.tb_param
                        })

                session.commit()
            except Exception as pe:
                current_app.logger.error(
                    f"Erro ao processar parâmetros: {str(pe)}")
                # Não falhar a operação se os parâmetros falharem

            return {
                'message': 'Pedido criado com sucesso',
                'order_id': pk_result,
                'regnumber': reg_result,
                'ts_entity': ts_entity,
                'tt_type': tt_type,
                'ts_associate': ts_associate,
                'tb_representative': tb_representative,
                'memo': memo,
                **doc_fields,
            }, 201

    except APIError as e:
        return {'error': str(e), 'code': e.error_code}, e.status_code
    except Exception as e:
        current_app.logger.error(f"Erro ao criar documento: {str(e)}")
        return {'error': f"Erro ao criar documento: {str(e)}"}, 500


def update_document_notification(pk, current_user):
    """Atualizar notificação do documento"""
    try:
        with db_session_manager(current_user) as session:
            pk = sanitize_input(pk, 'int')

            # Verificar se o documento existe
            doc_query = text("SELECT pk FROM vbl_document WHERE pk = :pk")
            doc = session.execute(doc_query, {'pk': pk}).fetchone()
            if not doc:
                raise ResourceNotFoundError("Documento", pk)

            update_query = text(
                "UPDATE vbf_document SET notification = 0 WHERE pk = :pk"
            )
            session.execute(update_query, {'pk': pk})
            session.commit()

            # Limpar cache relacionado
            cache.delete_memoized(list_documents)
            cache.delete_memoized(document_self)
            cache.delete_memoized(document_owner)

            return {'sucesso': 'Status de notificação atualizado com sucesso'}, 200

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Erro de BD ao atualizar notificação: {str(e)}")
        raise APIError("Erro ao atualizar notificação", 500, "ERR_DATABASE")
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao atualizar notificação: {str(e)}")
        raise APIError("Erro interno do servidor", 500, "ERR_INTERNAL")


def create_document_direct(ntype, associate, nif, name, phone, email, text_value):
    """Criar documento diretamente via API externa"""
    from app.services.auth_service import fs_login, validate_session, fs_logout

    session_id = None
    try:
        # Sanitizar entradas
        ntype = sanitize_input(ntype, 'int')
        associate = sanitize_input(associate, 'int')
        nif = sanitize_input(nif)
        name = sanitize_input(name)
        phone = sanitize_input(phone)
        email = sanitize_input(email)

        # Validação básica
        if not nif or not name or not email:
            raise APIError("Dados de identificação incompletos",
                           400, "ERR_INVALID_INPUT")

        # Realizar login com um usuário específico
        session_id, profil, login_error = fs_login(
            'site@aintar.pt', 'siteAintar@2024')
        if login_error:
            raise APIError(f"Erro no login: {login_error}", 500, "ERR_AUTH")

        # Validar a sessão
        if not validate_session(session_id):
            raise APIError('Erro ao validar sessão após login',
                           500, "ERR_SESSION")

        with db_session_manager(session_id) as session:
            # Chamar a função armazenada
            sql = text("""
                SELECT fbo_document_createdirect(
                    :pntype, :pnassociate, :pnnif, :pnname, :pnphone, :pnemail, :pntext
                ) AS result
            """)
            params = {
                "pntype": ntype,
                "pnassociate": associate,
                "pnnif": nif,
                "pnname": name,
                "pnphone": phone,
                "pnemail": email,
                "pntext": text_value,
            }

            result = session.execute(sql, params).fetchone()

            if not result or not result.result:
                raise APIError("Falha ao processar pedido",
                               500, "ERR_PROCESSING")

            session.commit()

            # Formatar a mensagem de resultado
            formatted_result = format_message(result[0])

            # Extrair o pk do resultado
            try:
                pk = int(formatted_result.split(": ")[1])
            except (IndexError, ValueError):
                raise APIError("Formato de resposta inesperado",
                               500, "ERR_PARSING")

            # Obter o regnumber
            regnumber_sql = text(
                "SELECT regnumber FROM vbl_document WHERE pk = :pk")
            regnumber_result = session.execute(
                regnumber_sql, {"pk": pk}).fetchone()

            if not regnumber_result:
                raise APIError(
                    'Erro ao obter regnumber do documento', 500, "ERR_RETRIEVAL")

            regnumber = regnumber_result[0]

            # Enviar o email de resposta
            from app.utils.utils import send_mail
            try:
                subject = f"Confirmação de receção da reclamação - {regnumber}"
                body = (
                    f"Caro(a) {name},\n\n"
                    f"A sua reclamação foi submetida com sucesso, tendo sido atribuído o número de registo {regnumber}.\n\n"
                    f"O nosso objetivo é dar-lhe uma resposta o mais breve possível, tratando com a maior objetividade as questões que apresentou.\n\n"
                    f"Agradecemos o seu contacto.\n\n"
                    f"Com os melhores cumprimentos,\n\n"
                    f"AINTAR, juntos pelo Ambiente."
                )
                send_mail(
                    subject=subject,
                    body=body,
                    recipient=email,
                    sender_email="geral@aintar.pt"
                )
            except Exception as em:
                current_app.logger.error(f"Erro ao enviar email: {str(em)}")
                # Não falhar a operação se o email falhar

            return {'resultado': formatted_result, 'regnumber': regnumber}, 200

    except APIError as e:
        return {'error': str(e), 'code': e.error_code}, e.status_code
    except Exception as e:
        current_app.logger.error(f"Erro ao criar documento: {str(e)}")
        return {'error': f"Erro ao criar documento: {str(e)}"}, 500
    finally:
        # Garantir logout mesmo com erros
        if session_id:
            try:
                fs_logout(session_id)
            except Exception:
                pass


def check_vacation_status(user_pk, current_user):
    """Verificar status de férias do usuário"""
    try:
        with db_session_manager(current_user) as session:
            user_pk = sanitize_input(user_pk, 'int')

            vacation_query = text(
                "SELECT vacation FROM vsl_client WHERE pk = :pk")
            result = session.execute(
                vacation_query, {'pk': user_pk}).fetchone()

            if not result:
                raise ResourceNotFoundError("Usuário", user_pk)

            return {'vacation': result.vacation}, 200

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except SQLAlchemyError as e:
        current_app.logger.error(f"Erro de BD ao verificar férias: {str(e)}")
        raise APIError("Erro ao verificar status de férias",
                       500, "ERR_DATABASE")
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao verificar férias: {str(e)}")
        raise APIError("Erro interno do servidor", 500, "ERR_INTERNAL")


@cache_result(timeout=120)
def get_documents_late(current_user):
    """Listar documentos em atraso (mais de 30 dias)"""
    try:
        with db_session_manager(current_user) as session:
            # Query para buscar documentos em atraso
            late_documents_query = text('SELECT * FROM "vbr_document$late"')
            late_documents_result = session.execute(late_documents_query).fetchall()

            if late_documents_result:
                late_documents_list = []
                for document in late_documents_result:
                    document_dict = document._asdict()
                    # Não precisa converter datas pois já vêm formatadas da view
                    late_documents_list.append(document_dict)
                
                return {
                    'late_documents': late_documents_list,
                    'total_count': len(late_documents_list)
                }, 200
            else:
                return {
                    'late_documents': [],
                    'total_count': 0,
                    'message': 'Nenhum documento em atraso encontrado'
                }, 200

    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Erro de banco de dados ao listar documentos em atraso: {str(e)}")
        raise APIError("Erro ao consultar documentos em atraso", 500, "ERR_DATABASE")
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao listar documentos em atraso: {str(e)}")
        raise APIError("Erro interno do servidor", 500, "ERR_INTERNAL")
