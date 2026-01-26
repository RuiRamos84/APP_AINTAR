# app/routes/telemetry_routes.py
"""
Rotas de Telemetria para receber dados de sensores IoT

Endpoints:
    POST /api/v1/telemetry/dados     - Receber dados de sensores (API Key)
    GET  /api/v1/telemetry/dados     - Listar dados de sensores (JWT)
    PUT  /api/v1/telemetry/dados/<pk>/processed - Marcar como processado (JWT)
    GET  /api/v1/telemetry/stats     - Estatísticas de dados não processados (JWT)

Autenticação:
    - POST: Requer header X-API-Key com chave válida
    - Outros: Requer JWT token
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
import os
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from app.services.telemetry_service import (
    insert_sensor_data,
    get_sensor_data,
    mark_as_processed,
    get_unprocessed_count
)

logger = get_logger(__name__)

bp = Blueprint('telemetry', __name__)


# ============================================
# AUTENTICAÇÃO POR API KEY
# ============================================

def get_valid_api_keys():
    """
    Obtém as API keys válidas.
    Pode ser configurado via variável de ambiente TELEMETRY_API_KEYS
    Formato: chave1,chave2,chave3 (separadas por vírgula)
    """
    keys_str = os.environ.get('TELEMETRY_API_KEYS', '')
    if not keys_str:
        # Chave padrão para desenvolvimento (MUDAR EM PRODUÇÃO!)
        logger.warning("TELEMETRY_API_KEYS não configurado! Usando chave padrão.")
        return {'aintar-sensor-dev-2025'}
    return set(key.strip() for key in keys_str.split(',') if key.strip())


def require_api_key(f):
    """
    Decorator que valida a API Key no header X-API-Key
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key')

        if not api_key:
            logger.warning(f"Tentativa de acesso sem API Key - IP: {request.remote_addr}")
            return jsonify({
                "status": "error",
                "message": "API Key não fornecida",
                "codigo": "ERR_NO_API_KEY"
            }), 401

        valid_keys = get_valid_api_keys()

        if api_key not in valid_keys:
            logger.warning(f"API Key inválida - IP: {request.remote_addr}")
            return jsonify({
                "status": "error",
                "message": "API Key inválida",
                "codigo": "ERR_INVALID_API_KEY"
            }), 401

        return f(*args, **kwargs)
    return decorated_function


# ============================================
# ENDPOINT COM API KEY - Receber dados de sensores
# ============================================

@bp.route('/dados', methods=['POST'])
@require_api_key
@api_error_handler
def receive_sensor_data():
    """
    Recebe dados de sensores IoT.

    Requer autenticação via API Key no header X-API-Key.

    Headers:
        X-API-Key: Chave de API válida (obrigatório)

    Body:
        JSON com dados do sensor (formato livre)

    Returns:
        {"status": "ok", "message": "...", "pk": <id>}

    Errors:
        401: API Key não fornecida ou inválida
        400: Payload inválido
        500: Erro interno
    """
    try:
        # Obter payload
        payload = request.get_json(force=True, silent=True)

        if payload is None:
            return jsonify({
                "status": "error",
                "message": "Payload JSON inválido ou vazio"
            }), 400

        # Obter API key para log (já validada pelo decorator)
        api_key = request.headers.get('X-API-Key', '')[:8] + '***'

        # Log do recebimento com info do sensor
        sensor_id = payload.get('sensor_id', 'unknown')
        logger.info(f"Telemetria recebida - Sensor: {sensor_id}, Key: {api_key}, Size: {len(str(payload))} bytes")

        # Inserir dados
        return insert_sensor_data(payload)

    except Exception as e:
        logger.error(f"Erro ao receber dados de sensor: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# ============================================
# ENDPOINTS AUTENTICADOS - Gestão de dados
# ============================================

@bp.route('/dados', methods=['GET'])
@jwt_required()
@api_error_handler
def list_sensor_data():
    """
    Lista dados de sensores.

    Query params:
        limit: Número máximo de registos (default: 100)
        processed: Filtrar por estado (true/false/all)

    Returns:
        {"status": "ok", "count": N, "data": [...]}
    """
    try:
        limit = request.args.get('limit', 100, type=int)
        processed_param = request.args.get('processed', 'all')

        # Converter parâmetro processed
        processed = None
        if processed_param == 'true':
            processed = True
        elif processed_param == 'false':
            processed = False

        return get_sensor_data(limit=limit, processed=processed)

    except Exception as e:
        logger.error(f"Erro ao listar dados de sensor: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@bp.route('/dados/<int:pk>/processed', methods=['PUT'])
@jwt_required()
@api_error_handler
def set_processed(pk):
    """
    Marca um registo de sensor como processado.

    Args:
        pk: ID do registo

    Returns:
        {"status": "ok", "message": "...", "pk": <id>}
    """
    try:
        return mark_as_processed(pk)

    except Exception as e:
        logger.error(f"Erro ao marcar sensor como processado: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@bp.route('/stats', methods=['GET'])
@jwt_required()
@api_error_handler
def get_stats():
    """
    Obtém estatísticas de dados de sensores.

    Returns:
        {"status": "ok", "unprocessed_count": N}
    """
    try:
        return get_unprocessed_count()

    except Exception as e:
        logger.error(f"Erro ao obter estatísticas: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
