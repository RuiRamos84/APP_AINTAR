# app/routes/permissions_routes.py

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from app.utils.permissions_decorator import require_permission, get_user_permissions_from_jwt
from app.core.permissions import permission_manager, PermissionRule, PermissionType
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
                permission_id, user_profile, user_interfaces, user_id
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


@bp.route("/permissions/rules", methods=["GET"])
@jwt_required()
@require_permission("admin.users")
@token_required
@set_session
@api_error_handler
def get_permission_rules():
    """
    Obter todas as regras de permissão (apenas admin)
    
    Returns:
        {
            "success": true,
            "rules": {
                "rule.id": {
                    "id": "rule.id",
                    "name": "Rule Name",
                    "description": "Rule description",
                    "type": "interface",
                    "profiles": null,
                    "interfaces": [1, 2],
                    "user_ids": null,
                    "operator": "OR",
                    "active": true
                }
            }
        }
    """
    try:
        rules = permission_manager.get_all_rules()

        serialized_rules = {}
        for rule_id, rule in rules.items():
            serialized_rules[rule_id] = {
                "id": rule.id,
                "name": rule.name,
                "description": rule.description,
                "type": rule.type.value,
                "profiles": rule.profiles,
                "interfaces": rule.interfaces,
                "user_ids": rule.user_ids,
                "operator": rule.operator,
                "active": rule.active
            }

        logger.info(f"Retornando {len(serialized_rules)} regras de permissão")

        return jsonify({
            "success": True,
            "rules": serialized_rules
        })

    except Exception as e:
        logger.error(f"Erro obter regras de permissão: {e}")
        return jsonify({
            "success": False,
            "error": "Erro interno ao obter regras"
        }), 500


@bp.route("/permissions/rules", methods=["POST"])
@jwt_required()
@require_permission("admin.users")
@token_required
@set_session
@api_error_handler
def create_permission_rule():
    """
    Criar nova regra de permissão (apenas admin)
    
    Body:
        {
            "id": "new.permission.id",
            "name": "Permission Name",
            "description": "Permission description",
            "type": "interface",
            "profiles": ["0", "1"],
            "interfaces": [1, 2, 3],
            "user_ids": [12, 15],
            "operator": "OR",
            "active": true
        }
    """
    try:
        data = request.json or {}

        # Validação dos campos obrigatórios
        required_fields = ['id', 'name', 'description', 'type']
        missing_fields = [
            field for field in required_fields if not data.get(field)]

        if missing_fields:
            return jsonify({
                "success": False,
                "error": f"Campos obrigatórios em falta: {', '.join(missing_fields)}"
            }), 400

        # Validar ID único
        if permission_manager.get_rule(data['id']):
            return jsonify({
                "success": False,
                "error": f"Regra com ID '{data['id']}' já existe"
            }), 400

        # Validar tipo de permissão
        try:
            permission_type = PermissionType(data['type'])
        except ValueError:
            return jsonify({
                "success": False,
                "error": f"Tipo inválido. Deve ser: {', '.join([t.value for t in PermissionType])}"
            }), 400

        # Criar regra
        rule = PermissionRule(
            id=data['id'].strip(),
            name=data['name'].strip(),
            description=data['description'].strip(),
            type=permission_type,
            profiles=data.get('profiles'),
            interfaces=data.get('interfaces'),
            user_ids=data.get('user_ids'),
            operator=data.get('operator', 'OR'),
            active=data.get('active', True)
        )

        if permission_manager.add_rule(rule):
            logger.info(
                f"Nova regra criada: {rule.id} por utilizador {get_user_permissions_from_jwt()[0]}")
            return jsonify({
                "success": True,
                "message": "Regra criada com sucesso",
                "rule_id": rule.id
            })
        else:
            return jsonify({
                "success": False,
                "error": "Erro ao criar regra"
            }), 500

    except Exception as e:
        logger.error(f"Erro criar regra de permissão: {e}")
        return jsonify({
            "success": False,
            "error": "Erro interno ao criar regra"
        }), 500


@bp.route("/permissions/rules/<rule_id>", methods=["PUT"])
@jwt_required()
@require_permission("admin.users")
@token_required
@set_session
@api_error_handler
def update_permission_rule(rule_id):
    """
    Atualizar regra de permissão existente (apenas admin)
    
    Body:
        {
            "name": "New Name",
            "active": false,
            "interfaces": [1, 2, 3, 4]
        }
    """
    try:
        data = request.json or {}

        # Verificar se regra existe
        if not permission_manager.get_rule(rule_id):
            return jsonify({
                "success": False,
                "error": f"Regra '{rule_id}' não encontrada"
            }), 404

        # Validar tipo se fornecido
        if 'type' in data:
            try:
                PermissionType(data['type'])
            except ValueError:
                return jsonify({
                    "success": False,
                    "error": f"Tipo inválido. Deve ser: {', '.join([t.value for t in PermissionType])}"
                }), 400

        # Atualizar regra
        if permission_manager.update_rule(rule_id, **data):
            logger.info(
                f"Regra {rule_id} atualizada por utilizador {get_user_permissions_from_jwt()[0]}")
            return jsonify({
                "success": True,
                "message": "Regra atualizada com sucesso"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Erro ao atualizar regra"
            }), 500

    except Exception as e:
        logger.error(f"Erro atualizar regra {rule_id}: {e}")
        return jsonify({
            "success": False,
            "error": "Erro interno ao atualizar regra"
        }), 500


@bp.route("/permissions/rules/<rule_id>", methods=["DELETE"])
@jwt_required()
@require_permission("admin.users")
@token_required
@set_session
@api_error_handler
def delete_permission_rule(rule_id):
    """
    Desativar regra de permissão (apenas admin)
    Nota: Não removemos regras, apenas as desativamos
    """
    try:
        if not permission_manager.get_rule(rule_id):
            return jsonify({
                "success": False,
                "error": f"Regra '{rule_id}' não encontrada"
            }), 404

        if permission_manager.disable_rule(rule_id):
            logger.info(
                f"Regra {rule_id} desativada por utilizador {get_user_permissions_from_jwt()[0]}")
            return jsonify({
                "success": True,
                "message": "Regra desativada com sucesso"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Erro ao desativar regra"
            }), 500

    except Exception as e:
        logger.error(f"Erro desativar regra {rule_id}: {e}")
        return jsonify({
            "success": False,
            "error": "Erro interno ao desativar regra"
        }), 500


@bp.route("/permissions/rules/<rule_id>/enable", methods=["PUT"])
@jwt_required()
@require_permission("admin.users")
@token_required
@set_session
@api_error_handler
def enable_permission_rule(rule_id):
    """
    Reativar regra de permissão (apenas admin)
    """
    try:
        if not permission_manager.get_rule(rule_id):
            return jsonify({
                "success": False,
                "error": f"Regra '{rule_id}' não encontrada"
            }), 404

        if permission_manager.enable_rule(rule_id):
            logger.info(
                f"Regra {rule_id} reativada por utilizador {get_user_permissions_from_jwt()[0]}")
            return jsonify({
                "success": True,
                "message": "Regra reativada com sucesso"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Erro ao reativar regra"
            }), 500

    except Exception as e:
        logger.error(f"Erro reativar regra {rule_id}: {e}")
        return jsonify({
            "success": False,
            "error": "Erro interno ao reativar regra"
        }), 500


@bp.route("/permissions/debug", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def debug_permissions():
    """
    Endpoint de debug para verificar permissões do utilizador atual
    Disponível apenas em desenvolvimento
    """
    import os
    if os.getenv('FLASK_ENV') != 'development':
        return jsonify({
            "success": False,
            "error": "Endpoint disponível apenas em desenvolvimento"
        }), 403

    try:
        user_id, user_profile, user_interfaces, permissions = get_user_permissions_from_jwt()

        # Obter informações detalhadas
        rules_by_type = {}
        for rule_type in PermissionType:
            rules_by_type[rule_type.value] = permission_manager.get_rules_by_type(
                rule_type)

        # Verificar algumas permissões chave
        key_permissions = [
            'admin.super', 'admin.users', 'payments.validate',
            'payments.cash', 'docs.view.all'
        ]

        permission_checks = {}
        for perm in key_permissions:
            permission_checks[perm] = permission_manager.check_permission(
                perm, user_profile, user_interfaces, user_id
            )

        return jsonify({
            "success": True,
            "debug_info": {
                "user": {
                    "id": user_id,
                    "profile": user_profile,
                    "interfaces": user_interfaces
                },
                "permissions": {
                    "total": len(permissions),
                    "list": permissions
                },
                "key_permission_checks": permission_checks,
                "rules_by_type": {
                    type_name: len(rules) for type_name, rules in rules_by_type.items()
                },
                "total_rules": len(permission_manager.get_all_rules())
            }
        })

    except Exception as e:
        logger.error(f"Erro debug permissões: {e}")
        return jsonify({
            "success": False,
            "error": "Erro interno no debug"
        }), 500


@bp.route("/permissions/test/<permission_id>", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def test_permission(permission_id):
    """
    Testar uma permissão específica para o utilizador atual
    Útil para debug e desenvolvimento
    """
    try:
        user_id, user_profile, user_interfaces, _ = get_user_permissions_from_jwt()

        if not user_id:
            return jsonify({
                "success": False,
                "error": "Dados de utilizador inválidos"
            }), 401

        # Verificar se a regra existe
        rule = permission_manager.get_rule(permission_id)
        if not rule:
            return jsonify({
                "success": False,
                "error": f"Regra '{permission_id}' não encontrada",
                "available_permissions": list(permission_manager.get_all_rules().keys())
            }), 404

        # Testar permissão
        has_permission = permission_manager.check_permission(
            permission_id, user_profile, user_interfaces, user_id
        )

        return jsonify({
            "success": True,
            "permission_id": permission_id,
            "has_permission": has_permission,
            "rule_details": {
                "name": rule.name,
                "description": rule.description,
                "type": rule.type.value,
                "active": rule.active,
                "profiles": rule.profiles,
                "interfaces": rule.interfaces,
                "user_ids": rule.user_ids,
                "operator": rule.operator
            },
            "user_context": {
                "user_id": user_id,
                "profile": user_profile,
                "interfaces": user_interfaces
            }
        })

    except Exception as e:
        logger.error(f"Erro testar permissão {permission_id}: {e}")
        return jsonify({
            "success": False,
            "error": "Erro interno no teste"
        }), 500
