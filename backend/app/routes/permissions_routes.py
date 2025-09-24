# app/routes/permissions_routes.py

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app.utils.permissions_decorator import get_user_permissions_from_jwt
from app.core.permissions import permission_manager
from app.utils.utils import set_session, token_required
from app.utils.error_handler import api_error_handler
import logging

bp = Blueprint("permissions", __name__)
logger = logging.getLogger(__name__)


@bp.route("/permissions/check", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def check_permissions():
    """
    Verificar permissões específicas do utilizador atual
    
    Body:
        {
            "permissions": ["permission.id1", "permission.id2"]
        }
    
    Returns:
        {
            "success": true,
            "permissions": {
                "permission.id1": true,
                "permission.id2": false
            },
            "user_permissions": ["list", "of", "all", "permissions"]
        }
    """
    try:
        data = request.json or {}
        permissions_to_check = data.get('permissions', [])

        if not isinstance(permissions_to_check, list):
            return jsonify({
                "success": False,
                "error": "Campo 'permissions' deve ser uma lista"
            }), 400

        # Obter dados do utilizador
        user_id, user_profile, user_interfaces, all_permissions = get_user_permissions_from_jwt()

        if not user_id:
            return jsonify({
                "success": False,
                "error": "Dados de utilizador inválidos"
            }), 401

        # Verificar cada permissão
        results = {}
        for permission_id in permissions_to_check:
            results[permission_id] = permission_manager.check_permission(
                permission_id, user_profile, user_interfaces
            )

        logger.debug(
            f"Verificação de permissões para user {user_id}: {results}")

        return jsonify({
            "success": True,
            "permissions": results,
            "user_permissions": all_permissions,
            "user_info": {
                "user_id": user_id,
                "profile": user_profile,
                "interfaces": user_interfaces
            }
        })

    except Exception as e:
        logger.error(f"Erro verificação permissões: {e}")
        return jsonify({
            "success": False,
            "error": "Erro interno na verificação de permissões"
        }), 500


@bp.route("/permissions/user", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_user_permissions():
    """
    Obter todas as permissões do utilizador atual
    
    Returns:
        {
            "success": true,
            "permissions": ["list", "of", "permissions"],
            "user_info": {
                "user_id": 123,
                "profile": "1",
                "interfaces": [1, 2, 3]
            }
        }
    """
    try:
        user_id, user_profile, user_interfaces, permissions = get_user_permissions_from_jwt()

        if not user_id:
            return jsonify({
                "success": False,
                "error": "Dados de utilizador inválidos"
            }), 401

        logger.debug(f"Utilizador {user_id} tem {len(permissions)} permissões")

        return jsonify({
            "success": True,
            "permissions": permissions,
            "user_info": {
                "user_id": user_id,
                "profile": user_profile,
                "interfaces": user_interfaces
            }
        })

    except Exception as e:
        logger.error(f"Erro obter permissões utilizador: {e}")
        return jsonify({
            "success": False,
            "error": "Erro interno ao obter permissões"
        }), 500
