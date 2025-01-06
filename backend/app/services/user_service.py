import os
import jwt
from flask import current_app
from flask_mail import Message
from sqlalchemy.sql import text
from datetime import datetime, timedelta
from .. import db, mail
from ..utils.utils import format_message, db_session_manager
from ..services.auth_service import fs_login


def send_email(email, subject, message):
    try:
        msg = Message(subject, sender="", recipients=[email])
        msg.body = message
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Erro ao enviar o e-mail: {str(e)}")
        return False


def send_activation_email(name, email, id, activation_code):

    try:
        subject = "Ativação da conta AINTAR"
        body = f"Olá {name},\n\nObrigado por se registrar em AINTAR. Para ativar sua conta, utilize o seguinte código de ativação:\n\n http://localhost:3000/activation/{id}/{activation_code}\n\n Atenciosamente,\n Equipe AINTAR"
        msg = Message(subject, recipients=[email])
        msg.body = body
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Erro ao enviar o e-mail: {str(e)}")
        return False


def send_courtesy_email(name, email):
    try:
        subject = "Conta AINTAR ativada com sucesso"
        body = f"Olá {name},\n\nParabéns! Sua conta AINTAR foi ativada com sucesso. Agora você pode acessar todos os recursos da plataforma.\n\nAtenciosamente,\nEquipe AINTAR"
        msg = Message(subject, recipients=[email])
        msg.body = body
        mail.send(msg)
        print("E-mail enviado com sucesso") 
    except Exception as e:
        print(f"Erro ao enviar o e-mail: {e}")
        return False


def send_password_recovery_email(email, temp_token):
    try:
        subject = "Recuperação de password AINTAR"
        reset_password_url = f"http://localhost:3000/reset_password?token={temp_token}"
        body = f"""Olá,\n\nAqui está o seu link para redefinir a password:\n\n
        {reset_password_url}\n\nPor favor, acesse o link acima para redefinir sua password. O link é válido por 15 minutos.\n\n\nAtenciosamente,\n\nEquipe AINTAR"""
        msg = Message(subject, recipients=[email])
        msg.body = body
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Erro ao enviar o e-mail: {str(e)}")
        return False


def create_user_ext(data):
    nipc = data.get('nipc')
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    if not nipc or not name or not email or not password:
        return {'erro': 'Dados do utilizador não fornecidos'}, 400
    try:

        query = text("SELECT fs_createuser_ext(:i, :n, :e, :p)")
        result = db.session.execute(query, {"i": nipc, "n": name, "e": email, "p": password}).scalar()
        db.session.commit()
        message = format_message(result)
        if ";" in message:
            user_data = message.split(";")
            id, activation_code = user_data[0], user_data[1]
            email_sent = send_activation_email(name, email, id, activation_code)
            if email_sent:
                return {'mensagem': 'Utilizador criado com sucesso', 'id': id}, 201
            else:
                return {'erro': 'Erro ao enviar o e-mail'}, 500
        else:
            return {'erro': message}, 400
    except Exception as e:
        error_message = format_message(str(e))
        if "@" in error_message:
            return {'erro': 'Nif inserido utilizado com outro email, considere recuperar a password'}, 500
        else:
            return {'erro': 'Endereço de email já em utilização, considere recuperar a password.'}, 500


def activate_user(id, activation_code):
    try:
        query = text("SELECT fs_validate(:i, :k)")
        result = db.session.execute(query, {"i": id, "k": activation_code}).scalar()
        db.session.commit()
        # print(result)
        message = format_message(result)        
        if "@" in message:
            user_data = message.split(";")
            email = user_data[0]
            name = user_data[1]
            send_courtesy_email(name, email)
            return {'mensagem': 'Utilizador ativado com sucesso'}, 200
        else:
            return {'erro': message}, 400            
    except Exception as e:
        error_message = format_message(str(e))
        return {'erro': error_message}, 500


def get_user_info(current_user):
    try:
        with db_session_manager(current_user) as session:
            user_id_query = text("SELECT fs_entity() AS pk")
            user_id_result = session.execute(user_id_query).fetchone()
            if user_id_result is None:
                current_app.logger.error("Erro ao obter o ID do utilizador.")
                raise Exception('Erro ao obter o ID do utilizador.')

            user_id = user_id_result.pk
            user_query = text("SELECT * FROM vbf_entity WHERE pk = :i")
            user_result = session.execute(user_query, {"i": user_id}).fetchone()
            if user_result is None:
                current_app.logger.error("Erro ao obter informações do utilizador.")
                raise Exception('Erro ao obter informações do utilizador.')

            return user_result._asdict()
    except Exception as e:
        error_message = format_message(str(e))
        return {'erro': error_message}, 500                


def update_user_info(data, current_user):
    try:
        with db_session_manager(current_user) as session:
            user_id_query = text("SELECT fs_entity() AS pk")
            user_id_result = session.execute(user_id_query).fetchone()
            if user_id_result is None:
                raise Exception("Erro ao obter o ID do utilizador.")

            user_id = user_id_result.pk

            # Lógica de validação condicional para Tipo e Número de Identificação
            ident_type = data.get('ident_type')
            ident_value = data.get('ident_value')

            if (ident_type and not ident_value) or (not ident_type and ident_value):
                raise ValueError(
                    "Tipo de Identificação e Nº de Identificação devem ser ambos preenchidos ou ambos vazios.")

            update_query = text("""
                UPDATE vbf_entity 
                SET name = :name, email = :email, address = :address, phone = :phone, 
                    ident_type = :ident_type, ident_value = :ident_value
                WHERE pk = :user_id
            """)

            session.execute(update_query, {
                "name": data["name"],
                "email": data["email"],
                "address": data["address"],
                "phone": data["phone"],
                "ident_type": ident_type or None,  # Define como None se estiver vazio
                "ident_value": ident_value or None,  # Define como None se estiver vazio
                "user_id": user_id
            })
            current_app.logger.info(f"Informações do utilizador {user_id} atualizadas com sucesso.")
    except Exception as e:
        current_app.logger.error(
            f"Erro ao atualizar informações do utilizador: {str(e)}")
        raise Exception(f"Erro ao atualizar informações do utilizador: {str(e)}")


def update_password(old_password, new_password, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text("SELECT fs_passwd_change(:o, :n)")
            result = session.execute(
                query, {"o": old_password, "n": new_password}).scalar()
            message = format_message(result)
            if "sucesso" in message.lower():
                return True, message
            else:
                return False, message
    except Exception as e:
        error_message = format_message(str(e))
        return False, error_message


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


def password_recovery(data):
    email = data.get('email')
    if not email:
        return {'erro': 'E-mail não fornecido'}, 400
    try:
        response = fs_passwd_recover(email)
        if response and "<sucess>" in response:
            # Extraia a senha temporária da resposta
            temp_password = format_message(response)
            temp_token = create_temp_password_token(temp_password)
            if send_password_recovery_email(email, temp_token):
                return {'mensagem': 'E-mail de recuperação de password enviado com sucesso'}, 200
            else:
                return {'erro': 'Erro ao enviar o e-mail de recuperação de password'}, 500
        else:
            return {'erro': f'Erro ao recuperar a password: {format_message(response)}'}, 400
    except Exception as e:
        return {'erro': f"Erro ao recuperar a password: {format_message(str(e))}"}, 500


def reset_password(data):
    email = data.get('email')
    new_password = data.get('new_password')
    token = data.get('token')    
    if not email or not new_password or not token:
        return {'erro': 'Dados inválidos'}, 400
    try:
        # Verificar se o token é válido
        secret_key = os.getenv('SECRET_KEY')
        try:
            payload = jwt.decode(token, secret_key, algorithms=['HS256'])
            temp_password = payload.get('temp_password')
        except jwt.ExpiredSignatureError:
            return {'erro': 'Token expirado'}, 400
        except jwt.InvalidTokenError:
            return {'erro': 'Token inválido'}, 400
        session, profil, error_message = fs_login(email, temp_password)
        if error_message:
            return {'erro': error_message}, 400
        success, message = update_password(temp_password, new_password)
        if success:
            return {'mensagem': 'Senha redefinida com sucesso'}, 200
        else:
            return {'erro': message}, 400
    except Exception as e:
        return {'erro': f"Erro ao redefinir a senha: {format_message(str(e))}"}, 500


def fsf_client_vacationadd(user_id, current_user):
    try:
        with db_session_manager(current_user) as session:
            result = session.execute(
                text("SELECT fsf_client_vacationadd(:user_id)"),
                {"user_id": int(user_id)},
            )
            s = result.fetchone()[0]
            return s
    except Exception as e:
        return f"Erro ao atualizar o vacation: {str(e)}"


def fsf_client_vacationclean(user_id, current_user):
    try:
        with db_session_manager(current_user) as session:
            result = session.execute(
                text("SELECT fsf_client_vacationclean(:user_id)"),
                {"user_id": int(user_id)},
            )
            s = result.fetchone()[0]
            return s
    except Exception as e:        
        return f"Erro ao atualizar o vacation: {str(e)}"
