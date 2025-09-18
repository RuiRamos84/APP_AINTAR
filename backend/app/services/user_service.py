import os
import jwt
from flask import current_app, jsonify
from flask_mail import Message
from sqlalchemy.sql import text
from datetime import datetime, timedelta
from .. import db, mail
from ..utils.utils import format_message, db_session_manager
from ..services.auth_service import fs_login
from pydantic import BaseModel, EmailStr, constr
from typing import List, Optional
from app.utils.error_handler import api_error_handler, ResourceNotFoundError, APIError


def send_email(email, subject, message):
    try:
        msg = Message(subject, sender=current_app.config.get('MAIL_DEFAULT_SENDER'), recipients=[email])
        msg.body = message
        mail.send(msg)
    except Exception as e:
        current_app.logger.error(f"Erro ao enviar o e-mail para {email}: {str(e)}", exc_info=True)
        raise APIError("Falha no serviço de envio de e-mail.", 502, "ERR_EMAIL_SERVICE")


def send_activation_email(name, email, id, activation_code):
    try:
        subject = "Ativação da conta AINTAR"
        body = f"Olá {name},\n\nObrigado por se registrar em AINTAR. Para ativar sua conta, utilize o seguinte código de ativação:\n\n http://localhost:3000/activation/{id}/{activation_code}\n\n Atenciosamente,\n Equipe AINTAR"
        msg = Message(subject, sender=current_app.config.get('MAIL_DEFAULT_SENDER'), recipients=[email])
        msg.body = body
        mail.send(msg)
    except Exception as e:
        current_app.logger.error(f"Erro ao enviar o e-mail de ativação para {email}: {str(e)}", exc_info=True)
        raise APIError("Falha ao enviar o e-mail de ativação.", 502, "ERR_EMAIL_SERVICE")


def send_courtesy_email(name, email):
    try:
        subject = "Conta AINTAR ativada com sucesso"
        body = f"Olá {name},\n\nParabéns! Sua conta AINTAR foi ativada com sucesso. Agora você pode acessar todos os recursos da plataforma.\n\nAtenciosamente,\nEquipe AINTAR"
        msg = Message(subject, sender=current_app.config.get('MAIL_DEFAULT_SENDER'), recipients=[email])
        msg.body = body
        mail.send(msg)
    except Exception as e:
        current_app.logger.error(f"Erro ao enviar o e-mail de cortesia para {email}: {str(e)}", exc_info=True)
        # Neste caso, o processo principal já teve sucesso, então apenas registamos o erro sem parar a execução.
        current_app.logger.warning(f"Falha ao enviar e-mail de cortesia para {email}, mas a ativação foi bem-sucedida.")


def send_password_recovery_email(email, temp_token):
    try:
        subject = "Recuperação de password AINTAR"
        reset_password_url = f"http://localhost:3000/reset_password?token={temp_token}"
        body = f"""Olá,\n\nAqui está o seu link para redefinir a password:\n\n
        {reset_password_url}\n\nPor favor, acesse o link acima para redefinir sua password. O link é válido por 15 minutos.\n\nAtenciosamente,\n\nEquipe AINTAR"""
        msg = Message(subject, sender=current_app.config.get('MAIL_DEFAULT_SENDER'), recipients=[email])
        msg.body = body
        mail.send(msg)
    except Exception as e:
        current_app.logger.error(f"Erro ao enviar o e-mail de recuperação para {email}: {str(e)}", exc_info=True)
        raise APIError("Falha ao enviar o e-mail de recuperação.", 502, "ERR_EMAIL_SERVICE")


class UserCreate(BaseModel):
    nipc: constr(min_length=9, max_length=9)
    name: str
    email: EmailStr
    password: str

class UserInfoUpdate(BaseModel):
    name: str
    email: EmailStr
    address: str
    phone: Optional[str] = None
    ident_type: Optional[str] = None
    ident_value: Optional[str] = None

class PasswordUpdate(BaseModel):
    old_password: str
    new_password: str

class PasswordRecoveryRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    email: EmailStr
    new_password: str
    token: str

class UserPermissionUpdate(BaseModel):
    interfaces: List[int]


@api_error_handler
def create_user_ext(data: dict):
    user_data = UserCreate.model_validate(data)
    query = text("SELECT fs_createuser_ext(:i, :n, :e, :p)")
    result = db.session.execute(query, {
        "i": user_data.nipc, 
        "n": user_data.name, 
        "e": user_data.email, 
        "p": user_data.password
    }).scalar()
    db.session.commit()
    message = format_message(result)
    if ";" not in message:
        if "@" in message:
            raise APIError('NIF inserido utilizado com outro email, considere recuperar a password', 409)
        else:
            raise APIError('Endereço de email já em utilização, considere recuperar a password.', 409)

    user_id, activation_code = message.split(";")
    send_activation_email(user_data.name, user_data.email, user_id, activation_code)
    return {'mensagem': 'Utilizador criado com sucesso', 'id': user_id}, 201


@api_error_handler
def activate_user(id: int, activation_code: str):
    query = text("SELECT fs_validate(:i, :k)")
    result = db.session.execute(query, {"i": id, "k": activation_code}).scalar()
    db.session.commit()
    message = format_message(result)
    if "@" not in message:
        raise APIError(message, 400)

    email, name = message.split(";")
    send_courtesy_email(name, email)
    return {'mensagem': 'Utilizador ativado com sucesso'}, 200


@api_error_handler
def get_user_info(current_user: str):
    with db_session_manager(current_user) as session:
        user_id_query = text("SELECT fs_entity() AS pk")
        user_id = session.execute(user_id_query).scalar()
        if not user_id:
            raise APIError('Erro ao obter o ID do utilizador.', 500)

        user_query = text("SELECT * FROM vbf_entity WHERE pk = :i")
        user_result = session.execute(user_query, {"i": user_id}).fetchone()
        if not user_result:
            raise ResourceNotFoundError('Utilizador', user_id)

        return user_result._asdict()


@api_error_handler
def update_user_info(data: dict, current_user: str):
    user_data = UserInfoUpdate.model_validate(data)
    
    if (user_data.ident_type and not user_data.ident_value) or \
       (not user_data.ident_type and user_data.ident_value):
        raise ValueError("Tipo de Identificação e Nº de Identificação devem ser ambos preenchidos ou ambos vazios.")

    with db_session_manager(current_user) as session:
        user_id_query = text("SELECT fs_entity() AS pk")
        user_id = session.execute(user_id_query).scalar()
        if not user_id:
            raise APIError("Erro ao obter o ID do utilizador.", 500)

        update_query = text("""
            UPDATE vbf_entity 
            SET name = :name, email = :email, address = :address, phone = :phone, 
                ident_type = :ident_type, ident_value = :ident_value
            WHERE pk = :user_id
        """)
        session.execute(update_query, {**user_data.model_dump(), "user_id": user_id})
        current_app.logger.info(f"Informações do utilizador {user_id} atualizadas com sucesso.")
        return {'message': 'Informações atualizadas com sucesso'}, 200


@api_error_handler
def update_password(data: dict, current_user: str):
    password_data = PasswordUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("SELECT fs_passwd_change(:o, :n)")
        result = session.execute(query, {
            "o": password_data.old_password, 
            "n": password_data.new_password
        }).scalar()
        message = format_message(result)
        if "sucesso" not in message.lower():
            raise APIError(message, 401) # Usar APIError com status 401 (Unauthorized)
        return {'message': message}, 200


def create_temp_password_token(temp_password):
    secret_key = os.getenv('SECRET_KEY')
    expiration_time = datetime.utcnow() + timedelta(minutes=15)
    payload = {"temp_password": temp_password, "exp": expiration_time}
    token = jwt.encode(payload, secret_key, algorithm='HS256')
    return token


def fs_passwd_recover(email):
    try:
        query = text("SELECT fs_passwd_recover(:e)")
        result = db.session.execute(query, {"e": email}).scalar()
        # print("result:", result)
        db.session.commit()
        if result is not None:
            if "<sucess>" in result:
                return result  # Retornar a resposta completa
            return format_message(result)  # Retornar a mensagem de erro formatada
        return None
    except Exception as e:
        return format_message(str(e))


@api_error_handler
def password_recovery(data: dict):
    recovery_data = PasswordRecoveryRequest.model_validate(data)
    response = fs_passwd_recover(recovery_data.email)
    if not response or "<sucess>" not in response:
        raise APIError(f'Erro ao recuperar a password: {format_message(response)}', 400)
    
    temp_password = format_message(response)
    temp_token = create_temp_password_token(temp_password)
    send_password_recovery_email(recovery_data.email, temp_token)
    return {'mensagem': 'E-mail de recuperação de password enviado com sucesso'}, 200


@api_error_handler
def reset_password(data: dict):
    reset_data = PasswordReset.model_validate(data)
    secret_key = os.getenv('SECRET_KEY')
    try:
        payload = jwt.decode(reset_data.token, secret_key, algorithms=['HS256'])
        temp_password = payload.get('temp_password')
    except jwt.ExpiredSignatureError:
        raise APIError('Token expirado', 401)
    except jwt.InvalidTokenError:
        raise APIError('Token inválido', 401)

    session, profil = fs_login(reset_data.email, temp_password)
    with db_session_manager(session) as db_session:
        query = text("SELECT fs_passwd_change(:o, :n)")
        result = db_session.execute(query, {
            "o": temp_password, 
            "n": reset_data.new_password
        }).scalar()
        message = format_message(result)
        if "sucesso" not in message.lower():
            raise APIError(message, 400)
    
    return {'mensagem': 'Senha redefinida com sucesso'}, 200


@api_error_handler
def fsf_client_vacationadd(user_id: int, current_user: str):
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("SELECT fsf_client_vacationadd(:user_id)"),
            {"user_id": user_id},
        ).scalar()
        if not result:
            raise APIError("Falha ao ativar o modo de férias.", 500)
        return {'message': 'Modo de férias ativado com sucesso.', 'result': format_message(result)}, 200


@api_error_handler
def fsf_client_vacationclean(user_id: int, current_user: str):
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("SELECT fsf_client_vacationclean(:user_id)"),
            {"user_id": user_id},
        ).scalar()
        if not result:
            raise APIError("Falha ao desativar o modo de férias.", 500)
        return {'message': 'Modo de férias desativado com sucesso.', 'result': format_message(result)}, 200


@api_error_handler
def get_all_users(current_user: str):
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT c.pk, c.name, c.username, c.ts_profile as profil, 
                    COALESCE(c.interface, ARRAY[]::integer[]) as interface,
                    e.name as entity_name
            FROM ts_client c 
            LEFT JOIN ts_entity e ON c.ts_entity = e.pk
            ORDER BY c.name
        """)
        result = session.execute(query).mappings().all()
        return [dict(row) for row in result]


@api_error_handler
def get_all_interfaces(current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT pk, value as name FROM ts_interface ORDER BY pk")
        result = session.execute(query).mappings().all()
        return [dict(row) for row in result]


@api_error_handler
def update_user_permissions(user_id: int, data: dict, current_user: str):
    permission_data = UserPermissionUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("""
            UPDATE ts_client 
            SET interface = :interfaces 
            WHERE pk = :user_id
        """)
        result = session.execute(query, {
            'interfaces': permission_data.interfaces or None,
            'user_id': user_id
        })
        if result.rowcount == 0:
            raise ResourceNotFoundError("Utilizador", user_id)
        return {'message': 'Permissões actualizadas'}, 200
