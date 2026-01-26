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
from app.utils.logger import get_logger

logger = get_logger(__name__)




def send_email(email, subject, message):
    try:
        msg = Message(subject, sender=current_app.config.get('MAIL_DEFAULT_SENDER'), recipients=[email])
        msg.body = message
        mail.send(msg)
    except Exception as e:
        logger.error(f"Erro ao enviar o e-mail para {email}: {str(e)}", exc_info=True)
        raise APIError("Falha no serviço de envio de e-mail.", 502, "ERR_EMAIL_SERVICE")


def send_activation_email(name, email, id, activation_code):
    try:
        subject = "Ativação da conta AINTAR"
        body = f"Olá {name},\n\nObrigado por se registrar em AINTAR. Para ativar sua conta, utilize o seguinte código de ativação:\n\n http://localhost:3000/activation/{id}/{activation_code}\n\n Atenciosamente,\n Equipe AINTAR"
        msg = Message(subject, sender=current_app.config.get('MAIL_DEFAULT_SENDER'), recipients=[email])
        msg.body = body
        mail.send(msg)
    except Exception as e:
        logger.error(f"Erro ao enviar o e-mail de ativação para {email}: {str(e)}", exc_info=True)
        raise APIError("Falha ao enviar o e-mail de ativação.", 502, "ERR_EMAIL_SERVICE")


def send_courtesy_email(name, email):
    try:
        subject = "Conta AINTAR ativada com sucesso"
        body = f"Olá {name},\n\nParabéns! Sua conta AINTAR foi ativada com sucesso. Agora você pode acessar todos os recursos da plataforma.\n\nAtenciosamente,\nEquipe AINTAR"
        msg = Message(subject, sender=current_app.config.get('MAIL_DEFAULT_SENDER'), recipients=[email])
        msg.body = body
        mail.send(msg)
    except Exception as e:
        logger.error(f"Erro ao enviar o e-mail de cortesia para {email}: {str(e)}", exc_info=True)
        # Neste caso, o processo principal já teve sucesso, então apenas registamos o erro sem parar a execução.
        logger.warning(f"Falha ao enviar e-mail de cortesia para {email}, mas a ativação foi bem-sucedida.")


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
        logger.error(f"Erro ao enviar o e-mail de recuperação para {email}: {str(e)}", exc_info=True)
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
    door: Optional[str] = None
    floor: Optional[str] = None
    phone: Optional[str] = None
    postal: Optional[str] = None
    nut1: Optional[str] = None  # Distrito
    nut2: Optional[str] = None  # Concelho
    nut3: Optional[str] = None  # Freguesia
    nut4: Optional[str] = None  # Localidade
    ident_type: Optional[str] = None
    ident_value: Optional[str] = None
    descr: Optional[str] = None

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
            SET name = :name, email = :email, address = :address, door = :door,
                floor = :floor, phone = :phone, postal = :postal,
                nut1 = :nut1, nut2 = :nut2, nut3 = :nut3, nut4 = :nut4,
                ident_type = :ident_type, ident_value = :ident_value, descr = :descr
            WHERE pk = :user_id
        """)

        # Converter strings vazias para None (NULL na BD)
        params = user_data.model_dump()
        params["ident_type"] = params.get("ident_type") or None
        params["ident_value"] = params.get("ident_value") or None
        params["door"] = params.get("door") or None
        params["floor"] = params.get("floor") or None
        params["descr"] = params.get("descr") or None
        params["user_id"] = user_id

        session.execute(update_query, params)
        logger.info(f"Informações do utilizador {user_id} atualizadas com sucesso.")
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
    """
    Lista todos os utilizadores com informação completa
    Campos: pk (user_id), username, name, email, validated (active),
            ts_profile (profil), darkmode, vacation, interface, entity_name
    """
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT
                c.pk as user_id,
                c.username,
                c.name,
                e.email,
                c.validated,
                c.ts_profile as profil,
                c.darkmode,
                c.vacation,
                COALESCE(c.interface, ARRAY[]::integer[]) as interface,
                e.name as entity_name,
                e.phone,
                c.ts_entity
            FROM ts_client c
            LEFT JOIN ts_entity e ON c.ts_entity = e.pk
            ORDER BY c.pk DESC
        """)
        result = session.execute(query).mappings().all()

        users = []
        for row in result:
            user = dict(row)
            # validated = 0 -> já validado (active = True)
            # validated != 0 -> código de ativação pendente (active = False)
            validated_value = user.get('validated', 0)
            user['active'] = (validated_value == 0)
            user['email_validated'] = (validated_value == 0)
            user['activation_code'] = validated_value if validated_value != 0 else None
            # Converter profil para string
            user['profil'] = str(user.get('profil', '2'))
            users.append(user)

        return users


@api_error_handler
def get_user_by_id(user_id: int, current_user: str):
    """
    Obtém utilizador por ID com informação completa
    """
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT
                c.pk as user_id,
                c.username,
                c.name,
                e.email,
                c.validated,
                c.ts_profile as profil,
                c.darkmode,
                c.vacation,
                COALESCE(c.interface, ARRAY[]::integer[]) as interface,
                e.name as entity_name,
                e.phone,
                e.address,
                e.door,
                e.floor,
                e.postal,
                e.nut1,
                e.nut2,
                e.nut3,
                e.nut4,
                e.ident_type,
                e.ident_value,
                e.descr,
                c.ts_entity
            FROM ts_client c
            LEFT JOIN ts_entity e ON c.ts_entity = e.pk
            WHERE c.pk = :user_id
        """)
        result = session.execute(query, {"user_id": user_id}).mappings().first()

        if not result:
            raise ResourceNotFoundError("Utilizador", user_id)

        user = dict(result)
        # validated = 0 -> já validado (active = True)
        # validated != 0 -> código de ativação pendente (active = False)
        validated_value = user.get('validated', 0)
        user['active'] = (validated_value == 0)
        user['email_validated'] = (validated_value == 0)
        user['activation_code'] = validated_value if validated_value != 0 else None
        user['profil'] = str(user.get('profil', '2'))

        return user


@api_error_handler
def create_user_admin(data: dict, current_user: str):
    """
    Cria novo utilizador (apenas admin)
    """
    with db_session_manager(current_user) as session:
        import hashlib
        import random

        password_hash = hashlib.md5(data.get('password', '').encode()).hexdigest()

        # Gerar código de ativação (número de 6 dígitos)
        # validated = 0 -> já validado
        # validated != 0 -> código de ativação pendente
        send_activation = data.get('send_activation_email', False)
        activation_code = random.randint(100000, 999999) if send_activation else 0

        # Criar entity
        entity_query = text("""
            INSERT INTO ts_entity (name, email, phone)
            VALUES (:name, :email, :phone)
            RETURNING pk
        """)
        entity_result = session.execute(entity_query, {
            'name': data.get('name', ''),
            'email': data.get('email', ''),
            'phone': data.get('phone', '')
        })
        entity_id = entity_result.scalar()

        # Criar client
        client_query = text("""
            INSERT INTO ts_client (username, passwd, ts_entity, ts_profile, validated, name)
            VALUES (:username, :passwd, :ts_entity, :ts_profile, :validated, :name)
            RETURNING pk
        """)
        client_result = session.execute(client_query, {
            'username': data.get('username'),
            'passwd': password_hash,
            'ts_entity': entity_id,
            'ts_profile': int(data.get('profil', 2)),
            'validated': activation_code,  # 0 = validado, != 0 = código de ativação
            'name': data.get('name', '')
        })
        user_id = client_result.scalar()

        # Enviar email de ativação se solicitado
        if send_activation and activation_code != 0:
            try:
                send_activation_email(
                    data.get('name', ''),
                    data.get('email', ''),
                    user_id,
                    activation_code
                )
            except Exception as e:
                logger.warning(f"Falha ao enviar email de ativação: {str(e)}")

        response = {
            'message': 'Utilizador criado com sucesso',
            'user_id': user_id
        }

        if activation_code != 0:
            response['activation_code'] = activation_code
            response['activation_required'] = True
        else:
            response['activation_required'] = False

        return response, 201


@api_error_handler
def update_user_admin(user_id: int, data: dict, current_user: str):
    """
    Atualiza utilizador (apenas admin)
    """
    with db_session_manager(current_user) as session:
        # Obter ts_entity do utilizador
        entity_query = text("SELECT ts_entity FROM ts_client WHERE pk = :user_id")
        entity_result = session.execute(entity_query, {"user_id": user_id}).scalar()

        if not entity_result:
            raise ResourceNotFoundError("Utilizador", user_id)

        # Atualizar entity
        update_entity_query = text("""
            UPDATE ts_entity
            SET name = :name,
                email = :email,
                phone = :phone,
                address = :address,
                door = :door,
                floor = :floor,
                postal = :postal,
                nut1 = :nut1,
                nut2 = :nut2,
                nut3 = :nut3,
                nut4 = :nut4,
                ident_type = :ident_type,
                ident_value = :ident_value,
                descr = :descr
            WHERE pk = :entity_id
        """)
        session.execute(update_entity_query, {
            'entity_id': entity_result,
            'name': data.get('name'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'address': data.get('address'),
            'door': data.get('door'),
            'floor': data.get('floor'),
            'postal': data.get('postal'),
            'nut1': data.get('nut1'),
            'nut2': data.get('nut2'),
            'nut3': data.get('nut3'),
            'nut4': data.get('nut4'),
            'ident_type': data.get('ident_type'),
            'ident_value': data.get('ident_value'),
            'descr': data.get('descr')
        })

        # Atualizar client
        update_client_query = text("""
            UPDATE ts_client
            SET username = :username,
                name = :name,
                ts_profile = :ts_profile,
                darkmode = :darkmode,
                vacation = :vacation
            WHERE pk = :user_id
        """)
        result = session.execute(update_client_query, {
            'user_id': user_id,
            'username': data.get('username'),
            'name': data.get('name'),
            'ts_profile': int(data.get('profil', 2)),
            'darkmode': int(data.get('darkmode', 0)),
            'vacation': int(data.get('vacation', 0))
        })

        if result.rowcount == 0:
            raise ResourceNotFoundError("Utilizador", user_id)

        return {'message': 'Utilizador atualizado com sucesso'}, 200


@api_error_handler
def delete_user_admin(user_id: int, current_user: str):
    """
    Apaga utilizador (apenas admin)
    """
    with db_session_manager(current_user) as session:
        # Verificar se utilizador existe
        check_query = text("SELECT pk FROM ts_client WHERE pk = :user_id")
        exists = session.execute(check_query, {"user_id": user_id}).scalar()

        if not exists:
            raise ResourceNotFoundError("Utilizador", user_id)

        # Apagar client (a FK com cascade vai apagar ts_entity automaticamente)
        delete_query = text("DELETE FROM ts_client WHERE pk = :user_id")
        session.execute(delete_query, {"user_id": user_id})

        return {'message': 'Utilizador apagado com sucesso'}, 200


@api_error_handler
def reset_user_password_admin(user_id: int, current_user: str):
    """
    Reset password de utilizador (apenas admin)
    Gera password temporária
    """
    import secrets
    import string

    with db_session_manager(current_user) as session:
        # Gerar password temporária (8 caracteres)
        alphabet = string.ascii_letters + string.digits
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(8))

        # Hash da password
        import hashlib
        password_hash = hashlib.md5(temp_password.encode()).hexdigest()

        # Atualizar password
        update_query = text("""
            UPDATE ts_client
            SET passwd = :passwd
            WHERE pk = :user_id
        """)
        result = session.execute(update_query, {
            'user_id': user_id,
            'passwd': password_hash
        })

        if result.rowcount == 0:
            raise ResourceNotFoundError("Utilizador", user_id)

        return {
            'message': 'Password resetada com sucesso',
            'temp_password': temp_password
        }, 200


@api_error_handler
def toggle_user_status_admin(user_id: int, active: bool, current_user: str):
    """
    Ativa/Desativa utilizador (apenas admin)
    """
    with db_session_manager(current_user) as session:
        update_query = text("""
            UPDATE ts_client
            SET validated = :validated
            WHERE pk = :user_id
        """)
        result = session.execute(update_query, {
            'user_id': user_id,
            'validated': 1 if active else 0
        })

        if result.rowcount == 0:
            raise ResourceNotFoundError("Utilizador", user_id)

        status = 'ativado' if active else 'desativado'
        return {'message': f'Utilizador {status} com sucesso'}, 200


@api_error_handler
def get_all_interfaces(current_user: str):
    """
    Retorna todas as interfaces/permissões com metadados completos da BD
    """
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT
                pk,
                value as name,
                category,
                label,
                description,
                icon,
                requires,
                is_critical,
                is_sensitive,
                sort_order
            FROM ts_interface
            ORDER BY sort_order, pk
        """)
        result = session.execute(query).mappings().all()

        # Converter para dict e garantir que arrays sejam serializáveis
        interfaces = []
        for row in result:
            interface = dict(row)
            # Garantir que requires seja uma lista (mesmo que None)
            interface['requires'] = interface.get('requires') or []
            interfaces.append(interface)

        return interfaces


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


@api_error_handler
def bulk_update_permissions(data: dict, current_user: str):
    """
    Bulk update permissions for multiple users.

    Supports three actions:
    - 'add': Add permissions to users (union with existing)
    - 'remove': Remove permissions from users
    - 'template': Apply a predefined template (replaces existing permissions)

    Args:
        data: {
            'user_ids': [1, 2, 3],
            'action': 'add|remove|template',
            'permissions': [10, 20, ...],  # for add/remove
            'templateName': 'Template Name'  # for template
        }
    """
    # Permission templates (matching frontend)
    PERMISSION_TEMPLATES = {
        'Operador Básico': [200, 500],  # TASKS_VIEW, DOCS_VIEW_ASSIGNED
        'Gestor de Documentos': [502, 510, 520, 530, 540],  # DOCS_VIEW_ALL, CREATE, EDIT, DELETE, ASSIGN
        'Gestor de Tarefas': [200, 210, 220, 230, 240],  # TASKS full permissions
        'Administrador': [10, 20, 30],  # ADMIN_DASHBOARD, ADMIN_USERS, ADMIN_PAYMENTS
        'Gestor de Entidades': [800, 810],  # ENTITIES_VIEW, ENTITIES_EDIT
    }

    user_ids = data.get('user_ids', [])
    action = data.get('action')
    permissions = data.get('permissions', [])
    template_name = data.get('templateName')

    if not user_ids:
        raise APIError("Lista de utilizadores vazia", 400, "ERR_EMPTY_USER_LIST")

    if not action or action not in ['add', 'remove', 'template']:
        raise APIError("Ação inválida. Use 'add', 'remove' ou 'template'", 400, "ERR_INVALID_ACTION")

    updated_count = 0

    with db_session_manager(current_user) as session:
        for user_id in user_ids:
            # Get current user permissions
            query_get = text("SELECT interface FROM ts_client WHERE pk = :user_id")
            result = session.execute(query_get, {'user_id': user_id}).fetchone()

            if not result:
                logger.warning(f"User {user_id} not found, skipping")
                continue

            current_permissions = result[0] if result[0] else []
            new_permissions = current_permissions.copy() if isinstance(current_permissions, list) else []

            if action == 'add':
                # Add permissions (union)
                new_permissions = list(set(new_permissions + permissions))

            elif action == 'remove':
                # Remove permissions
                new_permissions = [p for p in new_permissions if p not in permissions]

            elif action == 'template':
                # Replace with template permissions
                if template_name not in PERMISSION_TEMPLATES:
                    raise APIError(f"Template '{template_name}' não encontrado", 400, "ERR_TEMPLATE_NOT_FOUND")
                new_permissions = PERMISSION_TEMPLATES[template_name]

            # Update user permissions
            query_update = text("""
                UPDATE ts_client
                SET interface = :interfaces
                WHERE pk = :user_id
            """)
            session.execute(query_update, {
                'interfaces': new_permissions or None,
                'user_id': user_id
            })
            updated_count += 1

        logger.info(f"Bulk update permissions: {updated_count} users updated by {current_user}")

    return {
        'message': f'Permissões actualizadas para {updated_count} utilizador(es)',
        'updated_count': updated_count
    }, 200
