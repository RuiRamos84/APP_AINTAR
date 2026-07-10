from flask import current_app, jsonify
from app.utils.error_handler import APIError, ResourceNotFoundError
from app.utils.utils import format_message, db_session_manager
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from functools import wraps
from app import cache
from .utils import sanitize_input
from app.utils.logger import get_logger

logger = get_logger(__name__)




def cache_result(timeout=300):
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
        logger.error(f"Erro de BD ao criar pedido ETAR: {str(e)}")
        return {"error": "Erro ao processar pedido ETAR", "code": "ERR_DATABASE"}, 500
    except Exception as e:
        logger.error(
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
        logger.error(f"Erro de BD ao criar pedido EE: {str(e)}")
        return {"error": "Erro ao processar pedido EE", "code": "ERR_DATABASE"}, 500
    except Exception as e:
        logger.error(
            f"Erro inesperado ao criar pedido EE: {str(e)}")
        return {"error": "Erro interno do servidor", "code": "ERR_INTERNAL"}, 500


# @cache_result(timeout=120)  # DESATIVADO: Cache causava dados de utilizador anterior
def get_document_ramais(current_user):
    """Obtém ramais para pavimentar (vbr_document_pav01)"""
    try:
        with db_session_manager(current_user) as session:
            ramais_query = text("SELECT * FROM vbr_document_pav01")
            result = session.execute(ramais_query).mappings().all()

            if result:
                return {'ramais': [dict(row) for row in result]}, 200
            return {'ramais': [], 'message': 'Nenhum ramal para pavimentar encontrado'}, 200

    except SQLAlchemyError as e:
        logger.error(
            f"Erro de BD ao obter ramais para pavimentar: {str(e)}")
        return {'error': "Erro ao consultar ramais para pavimentar", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        logger.error(
            f"Erro inesperado ao obter ramais para pavimentar: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500


# @cache_result(timeout=120)  # DESATIVADO: Cache causava dados de utilizador anterior
def get_document_ramais_executed(current_user):
    """Obtém ramais executados mas não pagos (vbr_document_pav02)"""
    try:
        with db_session_manager(current_user) as session:
            ramais_query = text("SELECT * FROM vbr_document_pav02")
            result = session.execute(ramais_query).mappings().all()

            if result:
                return {'ramais': [dict(row) for row in result]}, 200
            return {'ramais': [], 'message': 'Nenhum ramal executado encontrado'}, 200

    except SQLAlchemyError as e:
        logger.error(
            f"Erro de BD ao obter ramais executados: {str(e)}")
        return {'error': "Erro ao consultar ramais executados", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        logger.error(
            f"Erro inesperado ao obter ramais executados: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500


# @cache_result(timeout=120)  # DESATIVADO: Cache causava dados de utilizador anterior
def get_document_ramais_concluded(current_user):
    """Obtém ramais concluídos e pagos (vbr_document_pav03)"""
    try:
        with db_session_manager(current_user) as session:
            ramais_query = text("SELECT * FROM vbr_document_pav03")
            result = session.execute(ramais_query).mappings().all()

            if result:
                return {'ramais': [dict(row) for row in result]}, 200
            return {'ramais': [], 'message': 'Nenhum ramal concluído encontrado'}, 200

    except SQLAlchemyError as e:
        logger.error(
            f"Erro de BD ao obter ramais concluídos: {str(e)}")
        return {'error': "Erro ao consultar ramais concluídos", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        logger.error(
            f"Erro inesperado ao obter ramais concluídos: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500


def update_document_pavenext(pk, current_user):
    """Atualiza o status do documento para próximo passo (para pavimentar -> executado)"""
    try:
        with db_session_manager(current_user) as session:
            pk = sanitize_input(pk, 'int')

            # Executar função para mover de "para pavimentar" para "executado"
            sql = text("SELECT fbo_document_nextstep(:pnpk) AS result")
            result = session.execute(sql, {"pnpk": pk}).fetchone()

            if not result or not result.result:
                raise APIError("Erro ao atualizar status do ramal",
                               500, "ERR_FUNCTION_FAILED")

            # Processar resposta XML
            formatted_result = format_message(result.result)
            session.commit()

            # Limpar cache relevante - usar delete ao invés de delete_memoized
            cache.delete(f"get_document_ramais_{(current_user,)}_{{}}")
            cache.delete(f"get_document_ramais_executed_{(current_user,)}_{{}}")

            return {"message": "Ramal marcado como executado", "result": formatted_result}, 200

    except APIError as e:
        return {"error": str(e), "code": e.error_code}, e.status_code
    except SQLAlchemyError as e:
        logger.error(f"Erro de BD ao atualizar ramal: {str(e)}")
        return {"error": "Erro ao atualizar ramal", "code": "ERR_DATABASE"}, 500
    except Exception as e:
        logger.error(
            f"Erro inesperado ao atualizar ramal: {str(e)}")
        return {"error": "Erro interno do servidor", "code": "ERR_INTERNAL"}, 500


def update_document_pavpaid(pk, current_user):
    """Atualiza o status do documento para pago (executado -> concluído)"""
    try:
        with db_session_manager(current_user) as session:
            pk = sanitize_input(pk, 'int')

            # Executar função para mover de "executado" para "concluído/pago"
            sql = text("SELECT fbo_document_nextstep(:pnpk, :msg) AS result")
            result = session.execute(
                sql, {"pnpk": pk, "msg": "Pagamento efectuado"}).fetchone()

            if not result or not result.result:
                raise APIError("Erro ao marcar ramal como pago",
                               500, "ERR_FUNCTION_FAILED")

            # Processar resposta XML
            formatted_result = format_message(result.result)
            session.commit()

            # Limpar cache relevante - usar delete ao invés de delete_memoized
            cache.delete(f"get_document_ramais_executed_{(current_user,)}_{{}}")
            cache.delete(f"get_document_ramais_concluded_{(current_user,)}_{{}}")

            return {"message": "Ramal marcado como pago e concluído", "result": formatted_result}, 200

    except APIError as e:
        return {"error": str(e), "code": e.error_code}, e.status_code
    except SQLAlchemyError as e:
        logger.error(
            f"Erro de BD ao marcar ramal como pago: {str(e)}")
        return {"error": "Erro ao marcar ramal como pago", "code": "ERR_DATABASE"}, 500
    except Exception as e:
        logger.error(
            f"Erro inesperado ao marcar ramal como pago: {str(e)}")
        return {"error": "Erro interno do servidor", "code": "ERR_INTERNAL"}, 500


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
                # logger.debug(f"Contagens de tipos obtidas com sucesso: {count_types_list}")
                return {'count_types': count_types_list}, 200
            else:
                return {'mensagem': 'Nenhum tipo de pedido encontrado para esta entidade.'}, 200

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except SQLAlchemyError as e:
        logger.error(
            f"Erro de BD ao obter tipos de pedidos: {str(e)}")
        return {'error': "Erro ao consultar tipos de pedidos", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        logger.error(
            f"Erro inesperado ao obter tipos de pedidos: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500


# Tipo criado quando a AINTAR obriga à ligação à rede de saneamento em vez de
# continuar a limpar a fossa (água/saneamento disponíveis a menos de 20m).
RAMAL_COERCIVO_TYPE_NAME = "Ramal: Execução Coerciva"

# what: -3 CONCLUIDO POR REPLICAÇÃO, -1 ANULADO, 0 CONCLUIDO — não bloqueiam
RAMAL_COERCIVO_EXCLUDED_WHAT = (-3, -1, 0)


def check_ramal_coercivo(nipc, address, postal, current_user):
    """
    Verifica se existe um pedido de Ramal: Execução Coerciva ainda em curso
    (não concluído/anulado) para o mesmo NIF e morada — usado para impedir a
    criação de um novo Pedido de Limpeza de Fossa nesses casos.
    """
    try:
        nipc = sanitize_input(nipc, 'int')
        if not nipc or not address or not postal:
            return {'blocked': False}, 200

        with db_session_manager(current_user) as session:
            query = text(f"""
                SELECT pk, regnumber, submission
                FROM vbl_document
                WHERE tt_type = :type_name
                  AND nipc = :nipc
                  AND upper(trim(postal)) = upper(trim(:postal))
                  AND upper(trim(address)) = upper(trim(:address))
                  AND what NOT IN {RAMAL_COERCIVO_EXCLUDED_WHAT}
                ORDER BY submission DESC
                LIMIT 1
            """)
            row = session.execute(query, {
                'type_name': RAMAL_COERCIVO_TYPE_NAME,
                'nipc': nipc,
                'postal': postal,
                'address': address,
            }).mappings().first()

            if row:
                return {
                    'blocked': True,
                    'document': {'pk': row['pk'], 'regnumber': row['regnumber'], 'submission': row['submission']}
                }, 200
            return {'blocked': False}, 200

    except SQLAlchemyError as e:
        logger.error(f"Erro de BD ao verificar Ramal: Execução Coerciva: {str(e)}")
        return {'error': "Erro ao verificar pedidos de ramal coercivo", 'code': "ERR_DATABASE"}, 500
    except Exception as e:
        logger.error(f"Erro inesperado ao verificar Ramal: Execução Coerciva: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500
