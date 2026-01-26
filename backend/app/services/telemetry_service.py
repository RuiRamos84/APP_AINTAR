# app/services/telemetry_service.py
"""
Serviço de Telemetria para receber dados de sensores IoT
"""

from flask import jsonify
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app import db
from app.utils.error_handler import api_error_handler, APIError
from app.utils.logger import get_logger
import json

logger = get_logger(__name__)


@api_error_handler
def insert_sensor_data(payload: dict):
    """
    Insere dados de sensores na tabela tb_sensordataraw

    Args:
        payload: Dados JSON do sensor (já validado pela API Key)

    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        # Validar payload
        if not payload:
            raise APIError("Payload vazio", 400, "ERR_EMPTY_PAYLOAD")

        # Converter payload para JSON string
        payload_json = json.dumps(payload)

        # Inserir na base de dados
        query = text("""
            INSERT INTO tb_sensordataraw (pk, data, processed, value)
            VALUES (nextval('sq_codes'), current_timestamp, null, CAST(:payload AS json))
            RETURNING pk
        """)

        result = db.session.execute(query, {"payload": payload_json})
        inserted_pk = result.fetchone()[0]
        db.session.commit()

        logger.info(f"Dados de sensor inseridos com sucesso. PK: {inserted_pk}")

        return {
            "status": "ok",
            "message": "Dados recebidos com sucesso",
            "pk": inserted_pk
        }, 200

    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Erro de BD ao inserir dados de sensor: {type(e).__name__}: {str(e)}")
        raise APIError(f"Erro ao guardar dados do sensor: {str(e)}", 500, "ERR_DATABASE")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro inesperado ao inserir dados de sensor: {str(e)}")
        raise APIError(f"Erro interno: {str(e)}", 500, "ERR_INTERNAL")


@api_error_handler
def get_sensor_data(limit: int = 100, processed: bool = None):
    """
    Obtém dados de sensores da tabela tb_sensordataraw

    Args:
        limit: Número máximo de registos a retornar
        processed: Filtrar por processado (True/False/None para todos)

    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        # Construir query base
        query_str = "SELECT pk, data, processed, value FROM tb_sensordataraw"
        params = {"limit": limit}

        # Adicionar filtro de processado se especificado
        if processed is not None:
            if processed:
                query_str += " WHERE processed IS NOT NULL"
            else:
                query_str += " WHERE processed IS NULL"

        query_str += " ORDER BY data DESC LIMIT :limit"

        query = text(query_str)
        result = db.session.execute(query, params).mappings().all()

        # Converter para lista de dicionários
        data = []
        for row in result:
            data.append({
                "pk": row["pk"],
                "data": row["data"].isoformat() if row["data"] else None,
                "processed": row["processed"].isoformat() if row["processed"] else None,
                "value": row["value"]
            })

        return {
            "status": "ok",
            "count": len(data),
            "data": data
        }, 200

    except SQLAlchemyError as e:
        logger.error(f"Erro de BD ao obter dados de sensor: {str(e)}")
        raise APIError("Erro ao consultar dados do sensor", 500, "ERR_DATABASE")
    except Exception as e:
        logger.error(f"Erro inesperado ao obter dados de sensor: {str(e)}")
        raise APIError(f"Erro interno: {str(e)}", 500, "ERR_INTERNAL")


@api_error_handler
def mark_as_processed(pk: int):
    """
    Marca um registo de sensor como processado

    Args:
        pk: ID do registo

    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        query = text("""
            UPDATE tb_sensordataraw
            SET processed = current_timestamp
            WHERE pk = :pk AND processed IS NULL
            RETURNING pk
        """)

        result = db.session.execute(query, {"pk": pk})
        updated = result.fetchone()
        db.session.commit()

        if not updated:
            raise APIError("Registo não encontrado ou já processado", 404, "ERR_NOT_FOUND")

        logger.info(f"Registo de sensor {pk} marcado como processado")

        return {
            "status": "ok",
            "message": "Registo marcado como processado",
            "pk": pk
        }, 200

    except APIError:
        raise
    except SQLAlchemyError as e:
        db.session.rollback()
        logger.error(f"Erro de BD ao marcar sensor como processado: {str(e)}")
        raise APIError("Erro ao atualizar registo", 500, "ERR_DATABASE")
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro inesperado ao marcar sensor como processado: {str(e)}")
        raise APIError(f"Erro interno: {str(e)}", 500, "ERR_INTERNAL")


@api_error_handler
def get_unprocessed_count():
    """
    Obtém o número de registos não processados

    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        query = text("SELECT COUNT(*) as count FROM tb_sensordataraw WHERE processed IS NULL")
        result = db.session.execute(query).fetchone()

        return {
            "status": "ok",
            "unprocessed_count": result[0]
        }, 200

    except SQLAlchemyError as e:
        logger.error(f"Erro de BD ao contar sensores não processados: {str(e)}")
        raise APIError("Erro ao consultar contagem", 500, "ERR_DATABASE")
    except Exception as e:
        logger.error(f"Erro inesperado ao contar sensores: {str(e)}")
        raise APIError(f"Erro interno: {str(e)}", 500, "ERR_INTERNAL")
