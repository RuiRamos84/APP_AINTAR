import re
import uuid
from flask import g, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, get_jwt, decode_token as jwt_decode_token
from sqlalchemy.sql import text
from datetime import timedelta, datetime, timezone
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
import xml.etree.ElementTree as ET
from .. import db, cache
import time
from ..utils.utils import format_message, parse_xml_response, fs_setsession, add_token_to_blacklist, is_token_revoked, db_session_manager


# Constante para o prefixo da chave de cache
LAST_ACTIVITY_PREFIX = "last_activity_"
# Set para armazenar IDs de utilizadors ativos
active_users = set()


# Define a função para criar um token de acesso
def fsf_client_notificationget():
    try:
        with db_session_manager() as session:
            result = session.execute(text("SELECT * FROM vsl_client$self"))
            row = result.fetchone()
            return row.notification if row else None
    except Exception as e:
        current_app.logger.error(f"Erro ao obter notificação: {str(e)}")
        return {'erro': f"Erro ao obter notificação: {str(e)}"}, 500


def fsf_client_notificationadd(user_id):
    try:
        with db_session_manager() as session:
            result = session.execute(
                text("SELECT fsf_client_notificationadd(:user_id)"),
                {"user_id": user_id}
            )
            s = result.fetchone()[0]
            return format_message(s)
    except Exception as e:
        current_app.logger.error(f"Erro ao adicionar notificação: {str(e)}")
        return f"Erro ao adicionar notificação: {str(e)}"


def fsf_client_notificationclean(user_id):
    try:
        with db_session_manager() as session:
            result = db.session.execute(
                text("SELECT fsf_client_notificationclean(:user_id)"),
                {"user_id": user_id},
            )
            s = result.fetchone()[0]
            return format_message(s)
    except Exception as e:
        return f"Erro ao deletar notificação: {str(e)}"


def fsf_client_darkmodeclean(user_id, current_user):
    try:
        with db_session_manager(current_user) as session:
            result = session.execute(
                text("SELECT fsf_client_darkmodeclean(:user_id)"),
                {"user_id": user_id}
            )
            s = result.fetchone()[0]
            return s
    except Exception as e:
        current_app.logger.error(f"Erro ao atualizar o darkmode: {str(e)}")
        return f"Erro ao atualizar o darkmode: {str(e)}"


def fsf_client_darkmodeadd(user_id, current_user):
    try:
        with db_session_manager(current_user) as session:
            result = session.execute(
                text("SELECT fsf_client_darkmodeadd(:user_id)"),
                {"user_id": user_id},
            )
            s = result.fetchone()[0]
            return s
    except Exception as e:
        db.session.rollback()
        return f"Erro ao atualizar o darkmode: {str(e)}"


def is_temp_password(password):
    pattern = r'^xP!tO.{7}$'
    return bool(re.match(pattern, password))


def validate_session(session):
    if 'session_validated' not in g:
        g.session_validated = fs_setsession(session)
    return g.session_validated


def login_user(username, password):
    try:
        # current_app.logger.debug(f"Iniciando processo de login para: {username}")
        session_id, profil, error_message = fs_login(username, password)
        if session_id is None:
            # current_app.logger.warning(f"Login falhou para {username} - Razão: {error_message}")
            return None, 'Utilizador ou password incorretos'

        # current_app.logger.debug(f"Login bem-sucedido para {username}. Obtendo informações do usuário...")

        with db_session_manager(session_id) as session:
            user_info_query = text("SELECT * FROM vsl_client$self")
            user_info_result = session.execute(user_info_query).fetchone()

            if user_info_result is None:
                current_app.logger.error(f"Informações do usuário não encontradas para: {username}")
                return None, 'Erro ao obter informações do utilizador'

            interfaces_query = text("""
                SELECT COALESCE(interface, ARRAY[]::integer[]) as interfaces 
                FROM ts_client 
                WHERE pk = :user_id
            """)

            interfaces_result = session.execute(
                interfaces_query, {'user_id': user_info_result.pk}
            ).fetchone()

            user_data = {
                'user_id': user_info_result.pk,
                'user_name': user_info_result.client_name,
                'profil': profil,
                'session_id': session_id,
                'interfaces': interfaces_result.interfaces or [],
                'dark_mode': user_info_result.darkmode,
                'vacation': user_info_result.vacation,
                'entity': user_info_result.ts_entity,
            }

        # current_app.logger.debug(f"Informações do usuário obtidas com sucesso para: {username}")
        update_last_activity(user_data['user_id'])

        # current_app.logger.debug("Gerando tokens...")
        access_token, refresh_token = create_tokens(user_data)
        user_data['access_token'] = access_token
        user_data['refresh_token'] = refresh_token

        # current_app.logger.info(f"Login concluído com sucesso para {username} com session_id: {session_id}")
        return user_data, None
    except Exception as e:
        current_app.logger.error(
            f'Erro durante o processo de login para {username}: {str(e)}', exc_info=True)
        return None, 'Erro durante o processo de login'


def create_tokens(user_data, refresh_count=0):
    current_time = datetime.now(timezone.utc)

    # ✅ ADICIONAR PROFIL AOS CLAIMS DO JWT
    common_claims = {
        "session_id": user_data['session_id'],
        "user_id": user_data['user_id'],
        "profil": user_data['profil'],  # ← NOVO: Incluir profil
        "entity": user_data.get('entity'),  # ← NOVO: Incluir entity também
        "user_name": user_data.get('user_name'),  # ← ÚTIL para debug
        "created_at": current_time.timestamp(),
        "last_activity": current_time.timestamp()
    }

    access_token = create_access_token(
        identity=user_data['session_id'],
        additional_claims={**common_claims, "token_type": "access"},
        expires_delta=current_app.config['ACCESS_TOKEN_EXPIRES']
    )

    refresh_token = create_refresh_token(
        identity=user_data['session_id'],
        additional_claims={
            **common_claims,
            "token_type": "refresh",
            "refresh_count": refresh_count
        },
        expires_delta=current_app.config['REFRESH_TOKEN_EXPIRES']
    )

    return access_token, refresh_token


def fs_login(username, password):
    try:
        # current_app.logger.debug(f"Chamando fs_login para usuário: {username}")
        query = text("SELECT * FROM fs_login(:username, :password)")
        result = db.session.execute(
            query, {'username': username, 'password': password}).fetchone()
        if result:
            message = result[0]
            # current_app.logger.debug(f"Resposta recebida de fs_login: {message}")
            session_id, profil, error_message = parse_xml_response(message)
            if error_message:
                # current_app.logger.warning(f"Erro retornado por fs_login: {error_message}")
                return None, None, format_message(error_message)
            # current_app.logger.info(f'Login bem-sucedido para {username} com perfil {profil}')
            db.session.commit()
            return session_id, profil, None
        # current_app.logger.warning(f"fs_login não retornou resultado esperado para {username}")
        return None, None, 'Login function did not return expected result'
    except Exception as e:
        error_message = str(e)
        # current_app.logger.error(f'Erro ao executar fs_login para {username}: {error_message}', exc_info=True)
        return None, None, format_message(error_message)


def decode_token(token):
    try:
        return jwt_decode_token(token)
    except ExpiredSignatureError:
        # Se o token estiver expirado, ainda decodificamos para obter as informações
        return jwt_decode_token(token, verify_exp=False)
    except InvalidTokenError:
        # Se o token for inválido, retornamos None
        return None


def refresh_access_token(refresh_token, client_time, server_time):
    try:
        decoded_token = jwt_decode_token(refresh_token)

        # Verificar se o token foi descodificado corretamente e se é um token de refresh
        if not decoded_token or decoded_token.get('token_type') != 'refresh':
            return None, "Token inválido para atualização", 401

        # ✅ EXTRAIR PROFIL E ENTITY DO TOKEN
        user_data = {
            'user_id': decoded_token.get('user_id'),
            'user_name': decoded_token.get('user_name'),
            'session_id': decoded_token.get('session_id'),
            'profil': decoded_token.get('profil'),  # ← NOVO: Extrair profil
            'entity': decoded_token.get('entity'),   # ← NOVO: Extrair entity
            'notification_count': decoded_token.get('notification_count'),
            'dark_mode': decoded_token.get('dark_mode'),
            'vacation': decoded_token.get('vacation'),
        }
        refresh_count = decoded_token.get('refresh_count', 0)

        # Verificar se os campos essenciais estão presentes e válidos
        token_created_at_timestamp = decoded_token.get('created_at')
        last_activity_timestamp = decoded_token.get('last_activity')

        if token_created_at_timestamp is None or last_activity_timestamp is None:
            current_app.logger.error(
                f"Campos do token em falta: created_at={token_created_at_timestamp}, last_activity={last_activity_timestamp}")
            return None, "Os dados do token estão incompletos", 400

        # Calcular a idade do token com base no tempo de criação
        token_created_at = datetime.fromtimestamp(
            token_created_at_timestamp, timezone.utc)
        token_age = server_time - token_created_at

        if token_age > current_app.config['REFRESH_TOKEN_EXPIRES']:
            return None, "Token de atualização expirado", 419

        last_activity = datetime.fromtimestamp(
            last_activity_timestamp, timezone.utc)
        if (server_time - last_activity) > timedelta(hours=2):
            return None, "Sessão expirada por inatividade total", 419

        if (server_time - client_time).total_seconds() > current_app.config['INACTIVITY_TIMEOUT'].total_seconds():
            return None, "Sessão expirada por inatividade", 419

        # Incrementar o contador de atualizações e criar novos tokens
        refresh_count += 1
        new_access_token, new_refresh_token = create_tokens(
            user_data, refresh_count)

        # Atualizar a última atividade do utilizador
        update_last_activity(user_data['user_id'])

        # ✅ RETORNAR PROFIL E ENTITY NO REFRESH
        return {
            "user_id": user_data['user_id'],
            "user_name": user_data['user_name'],
            "profil": user_data['profil'],  # ← NOVO: Incluir no retorno
            "entity": user_data['entity'],   # ← NOVO: Incluir no retorno
            "session_id": user_data['session_id'],
            "notification_count": user_data['notification_count'],
            "dark_mode": user_data['dark_mode'],
            "vacation": user_data['vacation'],
            "access_token": new_access_token,
            "refresh_token": new_refresh_token
        }, None, 200

    except Exception as e:
        current_app.logger.error(f"Erro ao renovar token: {str(e)}")
        return None, str(e), 500


def update_last_activity(current_user):
    if current_app.config['ENV'] != 'production':
        cache.set(f"{LAST_ACTIVITY_PREFIX}{current_user}", datetime.now(timezone.utc))
    active_users.add(current_user)
    current_app.logger.info(f"Última atividade atualizada para o utilizador {current_user}")


def get_last_activity(current_user):
    if current_app.config['ENV'] != 'production':
        return cache.get(f"{LAST_ACTIVITY_PREFIX}{current_user}")
    return None


def check_inactivity(current_user):
    last_activity = get_last_activity(current_user)
    if not last_activity:
        current_app.logger.warning(f"Nenhuma atividade registrada para o usuário {current_user}")
        return True
    now = datetime.now(timezone.utc)
    time_since_last_activity = now - last_activity
    is_inactive = time_since_last_activity > current_app.config['INACTIVITY_TIMEOUT']
    current_app.logger.info(f"Verificação de inatividade para usuário {current_user}: Última atividade: {last_activity}, Tempo desde última atividade: {time_since_last_activity}, Inativo: {is_inactive}")
    return is_inactive


def list_cached_activities(current_user):
    activities = []
    for current_user in active_users.copy():
        last_activity = get_last_activity(current_user)
        if last_activity:
            activities.append({
                'user_id': current_user,
                'last_activity': datetime.fromtimestamp(last_activity, tz=timezone.utc)
            })
        else:
            active_users.discard(current_user)
    return activities


def clear_inactive_users(current_user):
    now = time.time()
    for current_user in active_users.copy():
        last_activity = get_last_activity(current_user)
        if not last_activity or (now - last_activity) > INACTIVITY_TIMEOUT.total_seconds():
            cache.delete(f"{LAST_ACTIVITY_PREFIX}{current_user}")
            active_users.discard(current_user)
            current_app.logger.info(f"Atividade do utilizador {current_user} removida do cache")


def fs_logout(session):
    try:
        with db_session_manager(session) as db_session:
            result = db_session.execute(
                text("SELECT fs_logout(:session)"),
                {'session': session}
            )
            xml_response = result.fetchone()[0]

            root = ET.fromstring(xml_response)
            success = root.find('sucess')
            error = root.find('error')

            if success is not None and success.text == "LOGOUT COM SUCESSO":
                return {"success": True}
            elif error is not None:
                return {"success": False, "message": format_message(error.text)}
            else:
                return {"success": False, "message": "Erro desconhecido"}
    except Exception as e:
        current_app.logger.error(f"Erro ao executar fs_logout: {str(e)}")
        return {"success": False, "message": f"Erro ao executar logout: {str(e)}"}


def logout_user(user_identity):
    try:
        # Se houver user_identity, limpa a atividade do utilizador
        if user_identity:
            # Revogar o token de refresh ou access
            cache.delete(f"last_activity_{user_identity}")
            fs_logout(user_identity)  # Função personalizada de logout

        # Limpar dados da sessão no Flask
        if hasattr(g, 'current_user'):
            delattr(g, 'current_user')

        return True
    except Exception as e:
        current_app.logger.error(f"Erro ao fazer logout: {str(e)}")
        return False


def fs_passwd_recover(email):
    try:
        with db_session_manager() as session:
            query = text("SELECT fs_passwd_recover(:e)")
            result = session.execute(query, {"e": email}).scalar()
            session.commit()
            if result is not None:
                result_xml = ET.fromstring(result)
                success = result_xml.findtext(".//sucess")
                if success is not None:
                    return success
            return None
    except Exception as e:
        print(f"Erro ao recuperar a password: {str(e)}")
        return None


def insert_new_movement(who, what, pk_result, tb_document):
    try:
        with db_session_manager() as session:
            insert_query = text(
                "INSERT INTO vbf_document_step (pk, tb_document, what, who) "
                "VALUES (:pk_result, :tb_document, :what, :who)"
            )
            session.execute(
                insert_query,
                {'pk_result': pk_result, 'tb_document': tb_document,
                    'what': what, 'who': who}
            )
    except Exception as e:
        current_app.logger.error(f"Erro ao inserir novo movimento: {str(e)}")
        raise


def get_file_info_from_database(pk):
    try:
        with db_session_manager() as session:
            query = text("SELECT filename FROM vbl_document_step WHERE pk = :pk")
            file_info = session.execute(query, {'pk': pk}).fetchone()
            return file_info
    except Exception as e:
        current_app.logger.error(f"Erro ao buscar informações do arquivo: {str(e)}")
        return None
