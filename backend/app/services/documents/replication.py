from flask import current_app
from app.utils.error_handler import APIError, ResourceNotFoundError
from app.utils.utils import format_message, db_session_manager
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from .utils import sanitize_input
from app import cache


def replicate_document_service(pk, new_type, current_user):
    """
    Serviço para replicar um documento com novo tipo.
    
    Args:
        pk (int): PK do documento original
        new_type (int): Novo tipo de documento
        current_user: Usuário atual
    """
    try:
        with db_session_manager(current_user) as session:
            pk = sanitize_input(pk, 'int')
            new_type = sanitize_input(new_type, 'int')

            # Verificar se o documento existe
            doc_query = text("SELECT pk FROM vbl_document WHERE pk = :pk")
            doc = session.execute(doc_query, {'pk': pk}).fetchone()
            if not doc:
                raise ResourceNotFoundError("Documento", pk)

            # Verificar se o tipo de documento existe
            type_query = text("SELECT pk FROM vst_doctype WHERE pk = :pk")
            doc_type = session.execute(type_query, {'pk': new_type}).fetchone()
            if not doc_type:
                raise ResourceNotFoundError("Tipo de documento", new_type)

            # Executar a função de replicação
            replicate_query = text("""
            SELECT fbo_document_replicate(:popk, :pntype) AS result
            """)

            result = session.execute(replicate_query, {
                'popk': pk,
                'pntype': new_type
            }).scalar()

            if not result:
                raise APIError('Falha ao replicar documento',
                               500, "ERR_REPLICATION_FAILED")

            # Processar resposta
            formatted_result = format_message(result)

            # Extrair PK do novo documento (assumindo formato padrão da resposta)
            try:
                if "Documento replicado com sucesso" in formatted_result:
                    # Get the new document by its registration number
                    regnumber = formatted_result.split(": ")[1].strip()
                    new_doc_query = text(
                        """SELECT pk, regnumber FROM vbl_document WHERE regnumber = :regnumber""")
                    new_doc = session.execute(
                        new_doc_query, {'regnumber': regnumber}).fetchone()

                    if new_doc:
                        # Limpar cache
                        from .core import list_documents, document_self, document_owner
                        cache.delete_memoized(list_documents, current_user)
                        cache.delete_memoized(document_self, current_user)
                        cache.delete_memoized(document_owner, current_user)

                    return {
                        'message': f'Documento replicado com sucesso',
                        'original_pk': pk,
                        'new_pk': new_pk,
                        'new_regnumber': new_doc.regnumber,
                        'new_type': new_type
                    }, 201
            except Exception as pe:
                current_app.logger.error(
                    f"Erro ao processar resultado da replicação: {str(pe)}")

            # Resposta genérica se não conseguir extrair detalhes
            return {'message': formatted_result}, 201

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except APIError as e:
        return {'error': str(e), 'code': e.error_code}, e.status_code
    except SQLAlchemyError as e:
        current_app.logger.error(f"Erro de BD ao replicar documento: {str(e)}")
        return {'error': "Erro ao replicar documento", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao replicar documento: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500


def reopen_document(regnumber, user_id, current_user):
    """
    Reabre um documento fechado
    
    Args:
        regnumber (str): Número do registro
        user_id (int): ID do utilizador
        current_user: Sessão do utilizador
    """
    try:
        with db_session_manager(current_user) as session:
            regnumber = sanitize_input(regnumber)
            user_id = sanitize_input(user_id, 'int')

            print(f"Reabrir documento: {regnumber} - {user_id}")

            # Verificar se o documento existe
            doc_query = text(
                "SELECT pk FROM vbl_document WHERE regnumber = :regnumber")
            doc = session.execute(
                doc_query, {'regnumber': regnumber}).fetchone()
            if not doc:
                raise ResourceNotFoundError("Documento", regnumber)

            # Verificar se o usuário existe
            user_query = text(
                "SELECT * FROM vst_document_step$who WHERE pk = :pk")
            user = session.execute(user_query, {'pk': user_id}).fetchone()
            print(f"Usuário encontrado: {user}")
            if not user:
                raise ResourceNotFoundError("Usuário", user_id)

            # Executar a função de reabertura
            result = session.execute(
                text("SELECT fbs_document_open(:regnumber, :user_id)"),
                {'regnumber': regnumber, 'user_id': user_id}
            ).scalar()

            if not result:
                raise APIError('Falha ao reabrir pedido',
                               400, "ERR_REOPEN_FAILED")

            # Processar resposta
            formatted_result = format_message(result)

            # REMOVA COMPLETAMENTE O CÓDIGO DE CACHE

            return {
                'message': 'Pedido reaberto com sucesso',
                'result': formatted_result
            }, 200

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except APIError as e:
        return {'error': str(e), 'code': e.error_code}, e.status_code
    except SQLAlchemyError as e:
        current_app.logger.error(f"Erro de BD ao reabrir pedido: {str(e)}")
        return {'error': "Erro ao reabrir pedido", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao reabrir pedido: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500
        current_app.logger.error(
            f"Erro inesperado ao reabrir pedido: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500
