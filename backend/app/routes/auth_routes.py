from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from ..services.auth_service import (
    login_user, logout_user, refresh_access_token,
    update_last_activity, check_inactivity, get_last_activity,
    list_cached_activities, fsf_client_darkmodeadd, fsf_client_darkmodeclean
)
from ..utils.utils import format_message, set_session, db_session_manager
import pytz
from flask_limiter.util import get_remote_address
from .. import limiter
from datetime import datetime, timezone
from app.utils.error_handler import api_error_handler


bp = Blueprint('auth', __name__)


@bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute", key_func=get_remote_address)
@api_error_handler
def login():
    # current_app.logger.info("Tentativa de login iniciada")
    username = request.json.get("username")
    password = request.json.get("password")
    # current_app.logger.debug(f"Tentativa de login para o utilizador: {username}")

    user_data, error = login_user(username, password)
    if error:
        # current_app.logger.error(f"Falha no login para {username}: {error}")
        return jsonify(error=error), 401

    # current_app.logger.info(f"Login bem-sucedido para {username}")
    return jsonify(user_data), 200


@bp.route('/logout', methods=['POST'])
@jwt_required(optional=True)  # Permite logout mesmo com token expirado
@api_error_handler
def logout():
    user_identity = get_jwt_identity()
    if user_identity:
        # Limpa a sessão no backend
        if logout_user(user_identity):
            return jsonify(msg="Logout bem-sucedido"), 200
        else:
            return jsonify(msg="Erro ao fazer logout"), 500
    else:
        # Mesmo sem user_identity, retorna 200 para garantir que o frontend processa o logout
        return jsonify(msg="Sessão terminada"), 200


@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit("5 per minute", key_func=get_remote_address)
@api_error_handler
def refresh():
    current_app.logger.info("Tentativa de refresh de token")
    try:
        # Verificar e obter os dados da requisição
        data = request.get_json()
        current_app.logger.info(f"Dados da requisição recebidos: {data}")

        # Verificar se o corpo da requisição contém o campo 'current_time'
        if not data:
            current_app.logger.error(
                "O corpo da requisição está vazio ou inválido")
            return jsonify({"error": "Corpo da requisição vazio ou inválido"}), 400

        if 'current_time' not in data:
            current_app.logger.error(
                "current_time não foi passado no corpo da requisição")
            return jsonify({"error": "current_time não foi passado corretamente"}), 400

        current_time = data.get('current_time')
        current_app.logger.info(f"current_time recebido: {current_time}")

        # Verificar se current_time é None
        if current_time is None:
            current_app.logger.error("current_time é nulo ou inválido")
            return jsonify({"error": "current_time é nulo ou inválido"}), 400

        try:
            # Converter current_time para inteiro, se necessário
            current_time = int(current_time)
            client_time = datetime.fromtimestamp(
                current_time / 1000, tz=timezone.utc)
            current_app.logger.info(f"client_time calculado: {client_time}")
        except (TypeError, ValueError) as e:
            current_app.logger.error(
                f"Erro ao processar current_time: {str(e)}")
            return jsonify({"error": f"Erro ao processar current_time: {str(e)}"}), 400

        # Obter o tempo do servidor
        server_time = datetime.now(timezone.utc)

        # Verificar o refresh token
        refresh_token = request.headers.get('Authorization', '')
        if not refresh_token or len(refresh_token.split()) < 2:
            return jsonify({"error": "Token de refresh não encontrado"}), 400

        refresh_token = refresh_token.split()[1]

        # Chama a função para atualizar os tokens
        new_tokens, error, status_code = refresh_access_token(
            refresh_token, client_time, server_time)

        if error:
            return jsonify({"error": error}), status_code

        return jsonify(new_tokens), 200
    except Exception as e:
        current_app.logger.error(f"Erro ao renovar token: {str(e)}")
        return jsonify({"error": str(e)}), 500


@bp.route('/update_dark_mode', methods=['POST'])
@jwt_required()
@set_session
@api_error_handler
def update_dark_mode():
    try:
        current_app.logger.info(f"Atualização de dark mode para o utilizador {get_jwt_identity()}")
        current_user = get_jwt_identity()
        with db_session_manager(current_user):
            data = request.get_json()
            user_id = data.get('user_id')
            dark_mode = data.get('dark_mode')
            if dark_mode not in [0, 1]:
                return jsonify({"error": "Invalid dark_mode value"}), 400
            if dark_mode == 1:
                result = fsf_client_darkmodeadd(user_id, current_user)
            else:
                result = fsf_client_darkmodeclean(user_id, current_user)
            if isinstance(result, int) and result in [0, 1]:
                return jsonify({"message": "Dark mode atualizado com sucesso"}), 200
            else:
                return jsonify({"error": "Falha ao atualizar dark mode"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/heartbeat', methods=['POST'])
@jwt_required()
@set_session
@limiter.limit("360 per hour")
@api_error_handler
def heartbeat():
    current_user = get_jwt_identity()
    update_last_activity(current_user)
    current_app.logger.info(f"Heartbeat recebido para o utilizador {current_user}")
    return jsonify({"message": "Heartbeat recebido"}), 200


@bp.route('/check_session', methods=['GET'])
@jwt_required()
@set_session
@api_error_handler
def check_session():
    current_user = get_jwt_identity()
    if check_inactivity(current_user):
        return jsonify({"error": "Sessão expirada por inatividade"}), 401
    last_activity = get_last_activity(current_user)
    time_since_last_activity = datetime.now(timezone.utc) - last_activity
    if time_since_last_activity > current_app.config['WARNING_TIMEOUT']:
        time_left = current_app.config['INACTIVITY_TIMEOUT'] - \
            time_since_last_activity
        return jsonify({"warning": "Sessão próxima de expirar", "time_left": time_left.total_seconds()}), 200
    return jsonify({"message": "Sessão válida"}), 200


@bp.route('/cached-activities', methods=['GET'])
@jwt_required()
@set_session
@api_error_handler
def get_cached_activities():
    current_user = get_jwt_identity()
    activities = list_cached_activities(current_user)
    return jsonify(activities), 200


@bp.after_request
def cleanup_session(response):
    if hasattr(g, 'current_user'):
        delattr(g, 'current_user')
    if hasattr(g, 'current_session_id'):
        delattr(g, 'current_session_id')
    return response


# Adicione esta linha no final do arquivo auth_routes.py
bp.after_request(cleanup_session)
