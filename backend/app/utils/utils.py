from flask_jwt_extended import get_jwt
import xml.etree.ElementTree as ET
from sqlalchemy.sql import text
from functools import wraps
from flask import g, jsonify, current_app
from flask_jwt_extended import verify_jwt_in_request
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
import os
import requests
from sqlalchemy.exc import SQLAlchemyError
from contextlib import contextmanager
from app import blacklist
from flask_caching import Cache
from datetime import datetime, timezone


cache = Cache(config={'CACHE_TYPE': 'simple'})


# Blacklist para tokens revogados
token_blacklist = set()


def get_access_token():
    tenant_id = os.getenv('TENANT_ID')
    client_id = os.getenv('CLIENT_ID')
    client_secret = os.getenv('CLIENT_SECRET')
    scope = os.getenv('MS_GRAPH_SCOPE')

    url = f'https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token'

    data = {
        'client_id': client_id,
        'client_secret': client_secret,
        'scope': scope,
        'grant_type': 'client_credentials'
    }

    response = requests.post(url, data=data)
    response.raise_for_status()
    token = response.json().get('access_token')
    return token


def send_mail(subject, body, recipient, sender_email):
    token = get_access_token()
    url = f'https://graph.microsoft.com/v1.0/users/{sender_email}/sendMail'

    email_msg = {
        "message": {
            "subject": subject,
            "body": {
                "contentType": "Text",  
                "content": body
            },
            "toRecipients": [
                {
                    "emailAddress": {
                        "address": recipient
                    }
                }
            ]
        }
    }

    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    # print("Enviando e-mail com a seguinte requisição:", email_msg)
    response = requests.post(url, json=email_msg, headers=headers)

    # print("Resposta da API:", response.text)
    # Isto irá levantar uma exceção se a resposta não for 200 OK
    response.raise_for_status()
    print(f'Email enviado com sucesso para {recipient}')


def init_cache(app):
    cache.init_app(app)


@cache.memoize(timeout=300)  # Cache for 5 minutes
def fetch_meta_data(tipo, current_user):
    METADATA_TYPES = {
        "ident_types": "SELECT * FROM vst_0001",
        "types": "SELECT * FROM vst_doctype order by value",
        "associates": "SELECT * FROM vsl_associate order by name",
        "what": "SELECT * FROM vst_document_step$what order by pk",
        "who": "SELECT * FROM vst_document_step$who order by pk",
    }
    try:
        with db_session_manager(current_user) as session:
            if tipo == "order":
                who_query = "SELECT * FROM vst_document_step$who order by pk"
                what_query = "SELECT * FROM vst_document_step$what order by pk"
                who_result = session.execute(text(who_query)).fetchall()
                what_result = session.execute(text(what_query)).fetchall()
                who_result = [row._asdict() for row in who_result]
                what_result = [row._asdict() for row in what_result]
                return {"who": who_result, "what": what_result}
            else:
                query = METADATA_TYPES.get(tipo)
                if query is None:
                    raise ValueError("Tipo de metadado inválido.")
                result = session.execute(text(query)).fetchall()
                result = [row._asdict() for row in result]
                return {tipo: result}
    except Exception as e:
        current_app.logger.error(f"Erro ao buscar metadados do tipo {tipo}: {str(e)}")
        raise


def format_message(message):
    if isinstance(message, int):
        return str(message)

    start_success = message.find("<success>") + len("<success>")
    end_success = message.find("</success>")
    start_sucess = message.find("<sucess>") + len("<sucess>")
    end_sucess = message.find("</sucess>")
    start_error = message.find("<error>") + len("<error>")
    end_error = message.find("</error>")
    if start_success > -1 and end_success > -1:
        return message[start_success:end_success].strip()
    elif start_sucess > -1 and end_sucess > -1:
        return message[start_sucess:end_sucess].strip()
    elif start_error > -1 and end_error > -1:
        return message[start_error:end_error].strip()
    return message.strip()


def parse_xml_response(response):
    root = ET.fromstring(response)
    session = None
    profil = None
    error_message = None

    for child in root:
        if child.tag in ["success", "sucess"]:
            session_text = child.text.strip()
            if ';' in session_text:
                session, profil = session_text.split(';')
            else:
                session = session_text
        elif child.tag == "error":
            error_message = child.text.strip()

    return session, profil, format_message(error_message) if error_message else None


def fs_setsession(session_id):
    from app import db
    try:
        query = text("SELECT fs_setsession(:session_id)")
        result = db.session.execute(query, {"session_id": session_id})
        first_row = result.fetchone()
        if first_row:
            parsed_result = str(first_row[0])
            root = ET.fromstring(parsed_result)
            success_element = root.find('sucess')
            if success_element is not None and success_element.text == str(session_id):
                # current_app.logger.info(f"Sessão configurada com sucesso para: {session_id}")
                return True
            else:
                current_app.logger.warning(f"Falha ao configurar sessão. Esperado: {session_id}, Recebido: {parsed_result}")
        else:
            current_app.logger.warning(f"Nenhum resultado retornado para fs_setsession com session_id: {session_id}")
        return False
    except Exception as e:
        current_app.logger.error(f"Erro ao definir a sessão: {str(e)}")
        return False


def set_session(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        jwt_data = get_jwt()
        session_id = jwt_data.get('session_id')
        return f(*args, **kwargs)
    return decorated_function


@contextmanager
def db_session_manager(session_id):
    from app import db
    session = db.session()
    try:
        if session_id:
            # current_app.logger.debug(f"Configurando sessão no banco de dados para session_id: {session_id}")
            result = fs_setsession(session_id)
            if not result:
                # current_app.logger.error(f"Falha ao configurar a sessão para session_id: {session_id}")
                raise Exception(f"Erro ao configurar a sessão com session_id: {session_id}")
        yield session
        session.commit()
    except SQLAlchemyError as e:
        session.rollback()
        current_app.logger.error(f"Erro na transação do banco de dados: {str(e)}")
        raise
    finally:
        session.close()
        # current_app.logger.debug(f"Sessão de banco de dados fechada para session_id: {session_id}")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
            claims = get_jwt()

            # Verificar se o token foi revogado
            if check_if_token_revoked(claims):
                return jsonify({"error": "Token foi revogado"}), 419

            # Verificar inatividade
            token_creation_time = datetime.fromtimestamp(
                claims.get('created_at', 0), timezone.utc)
            inactivity_time = datetime.now(timezone.utc) - token_creation_time
            if inactivity_time > current_app.config['INACTIVITY_TIMEOUT']:
                return jsonify({"error": "Sessão expirada por inatividade"}), 419

            return f(*args, **kwargs)

        except ExpiredSignatureError:
            current_app.logger.warning("Token expirado")
            return jsonify({'error': 'Token expirado'}), 419
        except InvalidTokenError:
            current_app.logger.warning("Token inválido")
            return jsonify({'error': 'Token inválido'}), 419
        except Exception as e:
            current_app.logger.error(f"Erro ao verificar o token: {str(e)}")
            return jsonify({'error': 'Erro de autenticação'}), 419

    return decorated


def validate_session(session):
    return fs_setsession(session)


def verify_token_claims(token):
    claims = get_jwt()
    if claims['type'] != 'access':
        raise InvalidTokenError('Token inválido')


def add_token_to_blacklist(jti):
    from app import blacklist  # Importação local
    blacklist.token_blacklist.add(jti)


def is_token_revoked(jti):
    return jti in token_blacklist


def check_if_token_revoked(jwt_payload):
    from app import blacklist  # Importação local
    jti = jwt_payload['jti']
    return jti in blacklist


def get_current_user():
    return getattr(g, 'current_session', None)


def cleanup_session(response):
    if hasattr(g, 'current_session'):
        current_app.logger.debug(f"Limpando sessão: {g.current_session}")
        delattr(g, 'current_session')
    return response


def init_app(app):
    app.after_request(cleanup_session)
