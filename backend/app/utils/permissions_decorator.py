# app/utils/permissions_decorator.py

from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt
from app.utils.logger import get_logger
from app.core.permissions import permission_manager


logger = get_logger(__name__)


def check_permission_by_id(permission_id: int, user_profile: str, user_interfaces: list) -> bool:
    """
    Verifica se o utilizador tem uma permissão, baseando-se no ID da interface.

    Args:
        permission_id: ID da permissão/interface (ex: 500, 520, 510)
        user_profile: Perfil do utilizador
        user_interfaces: Lista de interfaces do utilizador

    Returns:
        bool: True se tiver permissão, False caso contrário
    """
    # Super admin (perfil '0') sempre tem acesso
    if user_profile == "0":
        return True

    # Verificar se o ID da permissão está na lista de interfaces do utilizador
    return permission_id in (user_interfaces or [])


def require_permission(permission_id):
    """
    Decorator para verificar permissões em rotas

    Usage:
        @require_permission(500)  # ID numérico da permissão
        def my_route():
            return "Success"
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Extrair dados do JWT
                jwt_data = get_jwt()

                # User ID
                user_id = jwt_data.get('user_id')
                if isinstance(user_id, dict):
                    user_id = user_id.get('user_id')

                # Perfil do utilizador
                user_profile = (
                    jwt_data.get('profil') or
                    jwt_data.get('profile') or
                    jwt_data.get('user_profile')
                )

                # Interfaces do utilizador
                user_interfaces = jwt_data.get('interfaces', [])

                # Validação básica
                if not user_id:
                    logger.warning(
                        f"Acesso negado - User ID não encontrado na rota {f.__name__}")
                    return jsonify({
                        "success": False,
                        "error": "Dados de utilizador inválidos",
                        "code": "INVALID_USER_DATA"
                    }), 401

                # Verificar permissão usando apenas IDs numéricos
                has_permission = check_permission_by_id(
                    permission_id,
                    str(user_profile),
                    user_interfaces or []
                )

                if not has_permission:
                    logger.warning(
                        f"Acesso negado - Permissão: {permission_id}, "
                        f"User: {user_id}, Perfil: {user_profile}, "
                        f"Interfaces: {user_interfaces}, Rota: {f.__name__}"
                    )
                    return jsonify({
                        "success": False,
                        "error": "Permissão insuficiente",
                        "required_permission": permission_id,
                        "code": "INSUFFICIENT_PERMISSION"
                    }), 403

                return f(*args, **kwargs)

            except Exception as e:
                logger.error(
                    f"Erro verificação permissão na rota {f.__name__}: {e}")
                return jsonify({
                    "success": False,
                    "error": "Erro interno de permissões",
                    "code": "PERMISSION_CHECK_ERROR"
                }), 500

        return decorated_function
    return decorator


def require_any_permission(*permission_ids):
    """
    Decorator para verificar se utilizador tem pelo menos uma das permissões
    
    Usage:
        @require_any_permission("admin.users", "admin.super")
        def my_route():
            return "Success"
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                jwt_data = get_jwt()

                user_id = jwt_data.get('user_id')
                if isinstance(user_id, dict):
                    user_id = user_id.get('user_id')

                user_profile = (
                    jwt_data.get('profil') or
                    jwt_data.get('profile') or
                    jwt_data.get('user_profile')
                )

                user_interfaces = jwt_data.get('interfaces', [])

                if not user_id:
                    return jsonify({
                        "success": False,
                        "error": "Dados de utilizador inválidos"
                    }), 401

                # Verificar se tem pelo menos uma permissão
                has_any_permission = any(
                    check_permission_by_id(
                        perm_id, str(user_profile), user_interfaces or []
                    ) for perm_id in permission_ids
                )

                if not has_any_permission:
                    logger.warning(
                        f"Acesso negado - Permissões: {permission_ids}, "
                        f"User: {user_id}, Perfil: {user_profile}"
                    )
                    return jsonify({
                        "success": False,
                        "error": "Permissão insuficiente",
                        "required_permissions": list(permission_ids)
                    }), 403

                return f(*args, **kwargs)

            except Exception as e:
                logger.error(f"Erro verificação permissões múltiplas: {e}")
                return jsonify({
                    "success": False,
                    "error": "Erro interno de permissões"
                }), 500

        return decorated_function
    return decorator


def require_all_permissions(*permission_ids):
    """
    Decorator para verificar se utilizador tem todas as permissões
    
    Usage:
        @require_all_permissions("docs.view", "docs.edit")
        def my_route():
            return "Success"
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                jwt_data = get_jwt()

                user_id = jwt_data.get('user_id')
                if isinstance(user_id, dict):
                    user_id = user_id.get('user_id')

                user_profile = (
                    jwt_data.get('profil') or
                    jwt_data.get('profile') or
                    jwt_data.get('user_profile')
                )

                user_interfaces = jwt_data.get('interfaces', [])

                if not user_id:
                    return jsonify({
                        "success": False,
                        "error": "Dados de utilizador inválidos"
                    }), 401

                # Verificar se tem todas as permissões
                has_all_permissions = all(
                    check_permission_by_id(
                        perm_id, str(user_profile), user_interfaces or []
                    ) for perm_id in permission_ids
                )

                if not has_all_permissions:
                    logger.warning(
                        f"Acesso negado - Requer todas as permissões: {permission_ids}, "
                        f"User: {user_id}, Perfil: {user_profile}"
                    )
                    return jsonify({
                        "success": False,
                        "error": "Permissões insuficientes",
                        "required_permissions": list(permission_ids)
                    }), 403

                return f(*args, **kwargs)

            except Exception as e:
                logger.error(f"Erro verificação todas as permissões: {e}")
                return jsonify({
                    "success": False,
                    "error": "Erro interno de permissões"
                }), 500

        return decorated_function
    return decorator


def get_user_permissions_from_jwt():
    """
    Função utilitária para obter permissões do utilizador atual

    Returns:
        tuple: (user_id, user_profile, user_interfaces, permissions_list)
    """
    try:
        jwt_data = get_jwt()

        user_id = jwt_data.get('user_id')
        if isinstance(user_id, dict):
            user_id = user_id.get('user_id')

        user_profile = (
            jwt_data.get('profil') or
            jwt_data.get('profile') or
            jwt_data.get('user_profile')
        )

        user_interfaces = jwt_data.get('interfaces', [])

        # Obter lista de nomes de permissão a partir do mapa (opcional)
        permissions = []
        if permission_manager._permission_map:
            permissions = [
                perm_id for perm_id, interface_id in permission_manager._permission_map.items()
                if interface_id in user_interfaces
            ]

        if user_id:
            return int(user_id), str(user_profile), user_interfaces, permissions

        return None, None, None, []

    except Exception as e:
        logger.error(f"Erro obter permissões do JWT: {e}")
        return None, None, None, []


def check_permission_direct(permission_id: int) -> bool:
    """
    Verificar permissão diretamente no contexto atual

    Args:
        permission_id: ID numérico da permissão

    Returns:
        bool: True se tem permissão, False caso contrário
    """
    try:
        user_id, user_profile, user_interfaces, _ = get_user_permissions_from_jwt()

        if not user_id:
            return False

        return check_permission_by_id(
            permission_id, user_profile, user_interfaces
        )

    except Exception as e:
        logger.error(
            f"Erro verificação direta de permissão {permission_id}: {e}")
        return False
