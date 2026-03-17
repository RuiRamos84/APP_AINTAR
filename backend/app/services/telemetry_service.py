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
def get_sensor_data(limit: int = None, processed: bool = None, sensor_name: str = None, jsontag: str = None):
    """
    Obtém dados de sensores da view vbl_sensordata

    Args:
        jsontag: Filtrar pelo jsontag do parâmetro de telemetria

    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        # Construir query base usando a view de leitura
        query_str = "SELECT * FROM vbl_sensordata"
        params = {}
        conditions = []

        # Filtro por estado de processamento
        if processed is not None:
            if processed:
                conditions.append("processed IS NOT NULL")
            else:
                conditions.append("processed IS NULL")

        # Filtro por sensor
        if sensor_name:
            conditions.append("tb_sensor = :sensor_name")
            params["sensor_name"] = sensor_name

        # Filtro por parâmetro de telemetria
        if jsontag:
            conditions.append("tt_teleparam = :jsontag")
            params["jsontag"] = jsontag

        if conditions:
            query_str += " WHERE " + " AND ".join(conditions)

        query_str += " ORDER BY data DESC"
        if limit is not None:
            query_str += " LIMIT :limit"
            params["limit"] = limit

        query = text(query_str)
        result = db.session.execute(query, params).mappings().all()

        # Converter para lista de dicionários serializando todos os campos
        data = []
        for row in result:
            record = {}
            for key, val in row.items():
                if hasattr(val, 'isoformat'):
                    record[key] = val.isoformat()
                else:
                    record[key] = val
            data.append(record)

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
def get_sensors():
    """
    Obtém todos os sensores da view vbl_sensor

    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        query = text("SELECT * FROM vbl_sensor ORDER BY name")
        result = db.session.execute(query).mappings().all()

        data = []
        for row in result:
            record = {}
            for key, val in row.items():
                if hasattr(val, 'isoformat'):
                    record[key] = val.isoformat()
                else:
                    record[key] = val
            data.append(record)

        return {
            "status": "ok",
            "count": len(data),
            "data": data
        }, 200

    except SQLAlchemyError as e:
        logger.error(f"Erro de BD ao obter sensores: {str(e)}")
        raise APIError("Erro ao consultar sensores", 500, "ERR_DATABASE")
    except Exception as e:
        logger.error(f"Erro inesperado ao obter sensores: {str(e)}")
        raise APIError(f"Erro interno: {str(e)}", 500, "ERR_INTERNAL")


@api_error_handler
def get_sensor_types():
    """
    Obtém todos os tipos de sensor da view vbl_sensortype

    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        query = text("SELECT pk, value FROM vbl_sensortype WHERE value IS NOT NULL ORDER BY value")
        result = db.session.execute(query).fetchall()
        data = [{"pk": row[0], "value": row[1]} for row in result]
        return {"status": "ok", "data": data}, 200
    except SQLAlchemyError as e:
        logger.error(f"Erro de BD ao obter tipos de sensor: {str(e)}")
        raise APIError("Erro ao consultar tipos de sensor", 500, "ERR_DATABASE")
    except Exception as e:
        logger.error(f"Erro inesperado ao obter tipos de sensor: {str(e)}")
        raise APIError(f"Erro interno: {str(e)}", 500, "ERR_INTERNAL")


@api_error_handler
def query_stations(sensortype_pk, teleparam_pk, date_from, date_to):
    """
    Obtém estações/sensores via fbo_telemetry$querystation

    Args:
        sensortype_pk: PK do tipo de sensor (int ou None)
        teleparam_pk: PK do parâmetro de telemetria (int ou None)
        date_from: Data início (str YYYY-MM-DD ou None)
        date_to: Data fim (str YYYY-MM-DD ou None)

    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        query = text("""
            SELECT * FROM fbo_telemetry$querystation(
                :sensortype_pk,
                :teleparam_pk,
                :date_from,
                :date_to
            )
        """)
        params = {
            "sensortype_pk": sensortype_pk,
            "teleparam_pk": teleparam_pk,
            "date_from": date_from,
            "date_to": date_to,
        }
        result = db.session.execute(query, params).mappings().all()
        # A função PostgreSQL inicializa estado interno na 1ª chamada — retry sem rollback,
        # depois com rollback se necessário (rollback desfaz a inicialização, por isso tenta sem primeiro)
        if not result:
            result = db.session.execute(query, params).mappings().all()
        if not result:
            db.session.rollback()
            result = db.session.execute(query, params).mappings().all()

        data = []
        for row in result:
            record = {}
            for key, val in row.items():
                if hasattr(val, 'isoformat'):
                    record[key] = val.isoformat()
                else:
                    record[key] = val
            data.append(record)

        logger.info(f"Query estações: tipo={sensortype_pk}, param={teleparam_pk}, {date_from}→{date_to}: {len(data)} estação(ões)")

        return {
            "status": "ok",
            "count": len(data),
            "data": data
        }, 200

    except SQLAlchemyError as e:
        logger.error(f"Erro de BD ao consultar estações: {str(e)}")
        raise APIError("Erro ao consultar estações", 500, "ERR_DATABASE")
    except Exception as e:
        logger.error(f"Erro inesperado ao consultar estações: {str(e)}")
        raise APIError(f"Erro interno: {str(e)}", 500, "ERR_INTERNAL")


@api_error_handler
def get_teleparams():
    """
    Obtém todos os parâmetros de telemetria da view vbl_teleparam (coluna value)

    Returns:
        tuple: (response_dict, status_code) — data é lista de strings
    """
    try:
        query = text("SELECT pk, value FROM vbl_teleparam WHERE value IS NOT NULL ORDER BY value")
        result = db.session.execute(query).fetchall()
        params = [{"pk": row[0], "value": row[1]} for row in result]
        return {"status": "ok", "data": params}, 200

    except SQLAlchemyError as e:
        logger.error(f"Erro de BD ao obter teleparams: {str(e)}")
        raise APIError("Erro ao consultar parâmetros", 500, "ERR_DATABASE")
    except Exception as e:
        logger.error(f"Erro inesperado ao obter teleparams: {str(e)}")
        raise APIError(f"Erro interno: {str(e)}", 500, "ERR_INTERNAL")


@api_error_handler
def query_sensor_data(sensor_pks: list, teleparam_pk: int, date_from: str, date_to: str):
    """
    Obtém dados de telemetria via fbo_telemetry$querydata.

    Args:
        sensor_pks: Lista de PKs de sensores
        teleparam_pk: PK do parâmetro de telemetria
        date_from: Data de início (YYYY-MM-DD) ou None
        date_to: Data de fim (YYYY-MM-DD) ou None

    Returns:
        tuple: (response_dict, status_code)
    """
    try:
        if not sensor_pks:
            raise APIError("Lista de sensores vazia", 400, "ERR_MISSING_PARAMS")
        if teleparam_pk is None:
            raise APIError("Parâmetro de telemetria obrigatório", 400, "ERR_MISSING_PARAMS")

        # Formatar array de PKs como literal PostgreSQL
        pks_literal = "{" + ",".join(str(int(pk)) for pk in sensor_pks) + "}"

        query = text("""
            SELECT * FROM "fbo_telemetry$querydata"(
                CAST(:sensor_pks AS integer[]),
                :teleparam_pk,
                CAST(:date_from AS date),
                CAST(:date_to AS date)
            )
        """)

        params = {
            "sensor_pks": pks_literal,
            "teleparam_pk": int(teleparam_pk),
            "date_from": date_from or None,
            "date_to": date_to or None,
        }
        result = db.session.execute(query, params).mappings().all()
        # A função PostgreSQL inicializa estado interno na 1ª chamada — retry sem rollback,
        # depois com rollback se necessário (rollback desfaz a inicialização, por isso tenta sem primeiro)
        if not result:
            result = db.session.execute(query, params).mappings().all()
        if not result:
            db.session.rollback()
            result = db.session.execute(query, params).mappings().all()

        data = []
        for row in result:
            record = {}
            for key, val in row.items():
                if hasattr(val, 'isoformat'):
                    record[key] = val.isoformat()
                else:
                    record[key] = val
            data.append(record)

        logger.info(f"Query telemetria: {len(sensor_pks)} sensor(es), param pk={teleparam_pk}, {len(data)} registos")

        return {"status": "ok", "count": len(data), "data": data}, 200

    except APIError:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Erro de BD ao consultar dados de telemetria: {str(e)}")
        raise APIError("Erro ao consultar dados de telemetria", 500, "ERR_DATABASE")
    except Exception as e:
        logger.error(f"Erro inesperado ao consultar dados de telemetria: {str(e)}")
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
