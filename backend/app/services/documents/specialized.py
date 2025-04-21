from flask import current_app, jsonify
from app.utils.error_handler import APIError, ResourceNotFoundError
from app.utils.utils import format_message, db_session_manager
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from functools import wraps
from app import cache
from .utils import sanitize_input


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


def create_etar_document_direct(etar_pk, current_user):
    """Cria um documento para ETAR diretamente"""
    try:
        with db_session_manager(current_user) as session:
            etar_pk = sanitize_input(etar_pk, 'int')

            # Verificar se ETAR existe
            etar_query = text("SELECT pk FROM vbf_etar WHERE pk = :pk")
            etar = session.execute(etar_query, {'pk': etar_pk}).fetchone()
            if not etar:
                raise ResourceNotFoundError("ETAR", etar_pk)

            # Executar a função armazenada
            sql = text("SELECT fbo_etar_document_createdirect(:pnpk) AS result")
            result = session.execute(sql, {"pnpk": etar_pk}).fetchone()

            if not result or not result.result:
                raise APIError("Erro ao criar pedido ETAR",
                               500, "ERR_FUNCTION_FAILED")

            # Processar resposta XML
            formatted_result = format_message(result.result)
            session.commit()

            # Limpar cache relevante
            from .core import list_documents, document_self, document_owner
            cache.delete_memoized(list_documents, current_user)
            cache.delete_memoized(document_self, current_user)
            cache.delete_memoized(document_owner, current_user)

            return {"message": f"Pedido ETAR criado com sucesso", "result": formatted_result}, 201

    except ResourceNotFoundError as e:
        return {"error": str(e)}, e.status_code
    except APIError as e:
        return {"error": str(e), "code": e.error_code}, e.status_code
    except SQLAlchemyError as e:
        current_app.logger.error(f"Erro de BD ao criar pedido ETAR: {str(e)}")
        return {"error": "Erro ao processar pedido ETAR", "code": "ERR_DATABASE"}, 500
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao criar pedido ETAR: {str(e)}")
        return {"error": "Erro interno do servidor", "code": "ERR_INTERNAL"}, 500


def create_ee_document_direct(ee_pk, current_user):
    """Cria um documento para EE diretamente"""
    try:
        with db_session_manager(current_user) as session:
            ee_pk = sanitize_input(ee_pk, 'int')

            # Verificar se EE existe
            ee_query = text("SELECT pk FROM vbf_ee WHERE pk = :pk")
            ee = session.execute(ee_query, {'pk': ee_pk}).fetchone()
            if not ee:
                raise ResourceNotFoundError("Estação Elevatória", ee_pk)

            # Executar a função armazenada
            sql = text("SELECT fbo_ee_document_createdirect(:pnpk) AS result")
            result = session.execute(sql, {"pnpk": ee_pk}).fetchone()

            if not result or not result.result:
                raise APIError("Erro ao criar pedido EE",
                               500, "ERR_FUNCTION_FAILED")

            # Processar resposta XML
            formatted_result = format_message(result.result)
            session.commit()

            # Limpar cache relevante
            from .core import list_documents, document_self, document_owner
            cache.delete_memoized(list_documents, current_user)
            cache.delete_memoized(document_self, current_user)
            cache.delete_memoized(document_owner, current_user)

            return {"message": f"Pedido EE criado com sucesso", "result": formatted_result}, 201

    except ResourceNotFoundError as e:
        return {"error": str(e)}, e.status_code
    except APIError as e:
        return {"error": str(e), "code": e.error_code}, e.status_code
    except SQLAlchemyError as e:
        current_app.logger.error(f"Erro de BD ao criar pedido EE: {str(e)}")
        return {"error": "Erro ao processar pedido EE", "code": "ERR_DATABASE"}, 500
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao criar pedido EE: {str(e)}")
        return {"error": "Erro interno do servidor", "code": "ERR_INTERNAL"}, 500


@cache_result(timeout=120)
def get_document_ramais(current_user):
    """Obtém dados dos ramais da view vbr_document_pav01"""
    try:
        with db_session_manager(current_user) as session:
            ramais_query = text("SELECT * FROM vbr_document_pav01")
            result = session.execute(ramais_query).mappings().all()

            if result:
                return {'ramais': [dict(row) for row in result]}, 200
            return {'ramais': [], 'message': 'Nenhum ramal encontrado'}, 200

    except SQLAlchemyError as e:
        current_app.logger.error(f"Erro de BD ao obter ramais: {str(e)}")
        return {'error': "Erro ao consultar ramais", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        current_app.logger.error(f"Erro inesperado ao obter ramais: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500


@cache_result(timeout=120)
def get_document_ramais_concluded(current_user):
    """Obtém dados dos ramais concluídos da view vbr_document_pav02"""
    try:
        with db_session_manager(current_user) as session:
            ramais_query = text("SELECT * FROM vbr_document_pav02")
            result = session.execute(ramais_query).mappings().all()

            if result:
                return {'ramais': [dict(row) for row in result]}, 200
            return {'ramais': [], 'message': 'Nenhum ramal concluído encontrado'}, 200

    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Erro de BD ao obter ramais concluídos: {str(e)}")
        return {'error': "Erro ao consultar ramais concluídos", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao obter ramais concluídos: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500


@cache_result(timeout=300)
def get_entity_count_types(pk, current_user):
    """Obtém contagem de tipos de documentos por entidade"""
    try:
        with db_session_manager(current_user) as session:
            pk = sanitize_input(pk, 'int')

            # Verificar se a entidade existe
            entity_query = text("SELECT pk FROM vbf_entity WHERE pk = :pk")
            entity = session.execute(entity_query, {'pk': pk}).fetchone()
            if not entity:
                raise ResourceNotFoundError("Entidade", pk)

            # Buscar contagens
            query = text(
                "SELECT * FROM vbl_entity_counttypes WHERE ts_entity = :pk")
            result = session.execute(query, {'pk': pk}).mappings().all()

            if result:
                count_types_list = [dict(row) for row in result]
                return {'count_types': count_types_list}, 200
            else:
                return {'mensagem': 'Nenhum tipo de pedido encontrado para esta entidade.'}, 200

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Erro de BD ao obter tipos de pedidos: {str(e)}")
        return {'error': "Erro ao consultar tipos de pedidos", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao obter tipos de pedidos: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500
