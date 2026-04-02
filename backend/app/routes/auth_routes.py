from flask import Blueprint, request, jsonify, current_app, g
from sqlalchemy import text
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from ..services.auth_service import (
    login_user, logout_user, refresh_access_token,
    update_last_activity, check_inactivity, get_last_activity,
    list_cached_activities, fsf_client_darkmodeadd, fsf_client_darkmodeclean,
    fsf_client_vacationadd, fsf_client_vacationclean,
)
from ..utils.utils import format_message, set_session, db_session_manager, add_token_to_blacklist
import pytz
from flask_limiter.util import get_remote_address
from .. import limiter
from datetime import datetime, timezone
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger

logger = get_logger(__name__)


bp = Blueprint('auth', __name__)


@bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute", key_func=get_remote_address)
@api_error_handler
def login():
    """
    Autenticar Utilizador
    ---
    tags:
      - Autenticação
    summary: Inicia sessão com as credenciais do utilizador.
    description: Autentica utilizador via LDAP/Base de Dados, gerando tokens JWT.
    consumes:
      - application/json
    parameters:
      - in: body
        name: credentials
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
              example: rui.ramos
            password:
              type: string
              example: secret
    responses:
      200:
        description: Autenticação bem sucedida. Retorna tokens e dados do utilizador.
      401:
        description: Credenciais inválidas.
      500:
        description: Erro interno do servidor.
    """
    # logger.info("Tentativa de login iniciada")
    username = request.json.get("username")
    password = request.json.get("password")
    
    # A função login_user agora lança uma exceção em caso de erro, que é tratada pelo @api_error_handler
    user_data = login_user(username, password)
    return jsonify(user_data), 200


@bp.route('/logout', methods=['POST'])
@jwt_required(optional=True)  # Permite logout mesmo com token expirado
@api_error_handler
def logout():
    """
    Terminar Sessão
    ---
    tags:
      - Autenticação
    summary: Invalida a sessão atual do utilizador.
    description: Adiciona o token JWT atual à blacklist (se aplicável) e liberta a sessão no backend.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Logout efetuado ou sessão terminada.
    """
    user_identity = get_jwt_identity()
    if user_identity:
        # Revogar o token actual na blacklist antes de terminar a sessão
        jwt_data = get_jwt()
        if jwt_data and jwt_data.get('jti'):
            add_token_to_blacklist(jwt_data['jti'])
        logout_user(user_identity)
        return jsonify(msg="Logout bem-sucedido"), 200
    else:
        # Mesmo sem user_identity, retorna 200 para garantir que o frontend processa o logout
        return jsonify(msg="Sessão terminada"), 200


@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit("5 per minute", key_func=get_remote_address)
@api_error_handler
def refresh():
    """
    Atualizar Tokens de Acesso
    ---
    tags:
      - Autenticação
    summary: Emite um novo Access Token baseado no Refresh Token.
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            current_time:
              type: integer
              description: Timestamp do cliente em milissegundos.
              example: 1735689600000
    responses:
      200:
        description: Tokens renovados com sucesso.
      400:
        description: Bad Request (Payload inválido ou token ausente).
      401:
        description: Não autorizado (Refresh Token inválido ou expirado).
    """
    logger.info("Tentativa de refresh de token")
    # Verificar e obter os dados da requisição
    data = request.get_json()
    logger.info(f"Dados da requisição recebidos: {data}")

    # Verificar se o corpo da requisição contém o campo 'current_time'
    if not data:
        logger.error(
            "O corpo da requisição está vazio ou inválido")
        return jsonify({"error": "Corpo da requisição vazio ou inválido"}), 400

    if 'current_time' not in data:
        logger.error(
            "current_time não foi passado no corpo da requisição")
        return jsonify({"error": "current_time não foi passado corretamente"}), 400

    current_time = data.get('current_time')
    logger.info(f"current_time recebido: {current_time}")

    # Verificar se current_time é None
    if current_time is None:
        logger.error("current_time é nulo ou inválido")
        return jsonify({"error": "current_time é nulo ou inválido"}), 400

    try:
        # Converter current_time para inteiro, se necessário
        current_time = int(current_time)
        client_time = datetime.fromtimestamp(
            current_time / 1000, tz=timezone.utc)
        logger.info(f"client_time calculado: {client_time}")
    except (TypeError, ValueError) as e:
        logger.error(
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
    # A função refresh_access_token agora lança exceções em caso de erro
    new_tokens = refresh_access_token(refresh_token, client_time, server_time)
    return jsonify(new_tokens), 200


@bp.route('/update_dark_mode', methods=['POST'])
@jwt_required()
@set_session
@api_error_handler
def update_dark_mode():
    """
    Atualizar Preferência de Tema (Dark Mode)
    ---
    tags:
      - Autenticação
    summary: Define se o modo escuro está ativo para o utilizador atual.
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: preferences
        required: true
        schema:
          type: object
          properties:
            user_id:
              type: integer
              example: 1
            dark_mode:
              type: boolean
              example: true
    responses:
      200:
        description: Preferência atualizada com sucesso.
      400:
        description: Faltam parâmetros requeridos.
      401:
        description: Não autorizado.
    """
    current_user_session = get_jwt_identity()
    data = request.get_json()
    user_id = data.get('user_id')
    dark_mode = data.get('dark_mode')

    if user_id is None or dark_mode is None:
        return jsonify({"error": "user_id e dark_mode são obrigatórios"}), 400

    # Idealmente, chamaríamos o serviço:
    # set_user_dark_mode(user_id, dark_mode, current_user_session)
    # Por agora, mantemos a lógica mas sem o try/except
    with db_session_manager(current_user_session):
        fsf_client_darkmodeadd(user_id, current_user_session) if dark_mode else fsf_client_darkmodeclean(user_id, current_user_session)

    return jsonify({"message": "Dark mode atualizado com sucesso"}), 200


@bp.route('/heartbeat', methods=['POST'])
@jwt_required()
@set_session
@limiter.limit("360 per hour")
@api_error_handler
def heartbeat():
    """
    Heartbeat de Atividade
    ---
    tags:
      - Autenticação
    summary: Sinaliza atividade do utilizador para manter a sessão viva.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Atividade registada (Sessão mantida ativa).
      401:
        description: Não autorizado.
      429:
        description: Rate limit atingido.
    """
    current_user = get_jwt_identity()
    update_last_activity(current_user)
    logger.info(f"Heartbeat recebido para o utilizador {current_user}")
    return jsonify({"message": "Heartbeat recebido"}), 200


@bp.route('/check_session', methods=['GET'])
@jwt_required()
@set_session
@api_error_handler
def check_session():
    """
    Verificar Estado da Sessão
    ---
    tags:
      - Autenticação
    summary: Analisa o decorrer de inatividade para alertar ou terminar sessão.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Sessão válida ou aviso emitido de timeout próximo.
      401:
        description: Sessão expirou por inatividade ou token não é válido.
    """
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


@bp.route('/me', methods=['GET'])
@jwt_required()
@set_session
@api_error_handler
def me():
    """
    Obter Dados Actuais do Utilizador
    ---
    tags:
      - Autenticação
    summary: Retorna as interfaces/permissões frescas do utilizador a partir da BD.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Dados actuais do utilizador.
      401:
        description: Não autorizado.
    """
    claims = get_jwt()
    user_id = claims.get('user_id')
    session_id = claims.get('session_id')

    with db_session_manager(session_id) as session:
        result = session.execute(
            text("""
                SELECT COALESCE(interface, ARRAY[]::integer[]) as interfaces
                FROM ts_client
                WHERE pk = :user_id
            """),
            {'user_id': user_id}
        ).fetchone()

    interfaces = result.interfaces if result else []
    return jsonify({"interfaces": interfaces}), 200


@bp.route('/preferences', methods=['PATCH'])
@jwt_required()
@set_session
@api_error_handler
def update_preferences():
    """
    Actualizar Preferências do Utilizador
    ---
    tags:
      - Autenticação
    summary: Actualiza dark_mode e/ou vacation para o utilizador actual.
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            dark_mode:
              type: boolean
            vacation:
              type: boolean
    responses:
      200:
        description: Preferências actualizadas com sucesso.
      400:
        description: Nenhum campo válido fornecido.
      401:
        description: Não autorizado.
    """
    claims = get_jwt()
    session_id = claims.get('session_id')
    user_id = claims.get('user_id')
    data = request.get_json() or {}

    if 'dark_mode' not in data and 'vacation' not in data:
        return jsonify({"error": "Nenhum campo válido fornecido (dark_mode, vacation)"}), 400

    if 'dark_mode' in data:
        if data['dark_mode']:
            fsf_client_darkmodeadd(user_id, session_id)
        else:
            fsf_client_darkmodeclean(user_id, session_id)

    if 'vacation' in data:
        if data['vacation']:
            fsf_client_vacationadd(user_id, session_id)
        else:
            fsf_client_vacationclean(user_id, session_id)

    return jsonify({"message": "Preferências actualizadas com sucesso"}), 200


@bp.route('/cached-activities', methods=['GET'])
@jwt_required()
@set_session
@api_error_handler
def get_cached_activities():
    """
    Buscar Atividades em Cache
    ---
    tags:
      - Autenticação
    summary: Retorna a lista de atividades registadas e retidas em Cache para o utilizador.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Array de atividades recém-executadas.
      401:
        description: Não autorizado.
    """
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
