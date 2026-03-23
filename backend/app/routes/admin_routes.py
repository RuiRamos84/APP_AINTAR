"""
Admin Routes
Blueprint para endpoints de administração do sistema.
Prefixo: /api/v1/admin
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.permissions_decorator import require_permission
from app.utils.utils import set_session
from app.utils.error_handler import api_error_handler
from app.services.admin_service import (
    get_system_status,
    clear_all_caches,
    reload_system_config,
    save_system_config,
    run_admin_action,
    get_activity_logs,
    get_session_logs,
)

bp = Blueprint('admin', __name__)


# ── Sistema ───────────────────────────────────────────────────────────────────

@bp.route('/system/status', methods=['GET'])
@jwt_required()
@require_permission(20)
@set_session
@api_error_handler
def system_status():
    """Estado dos serviços do sistema."""
    return get_system_status(get_jwt_identity())


@bp.route('/system/config', methods=['POST'])
@jwt_required()
@require_permission(20)
@set_session
@api_error_handler
def system_config():
    """Guarda configurações do sistema."""
    data = request.get_json() or {}
    return save_system_config(data, get_jwt_identity())


@bp.route('/system/reload-config', methods=['POST'])
@jwt_required()
@require_permission(20)
@set_session
@api_error_handler
def reload_config():
    """Recarrega a configuração do sistema."""
    return reload_system_config(get_jwt_identity())


# ── Cache ─────────────────────────────────────────────────────────────────────

@bp.route('/cache/clear', methods=['POST'])
@jwt_required()
@require_permission(20)
@set_session
@api_error_handler
def clear_cache():
    """Limpa todos os caches do sistema."""
    return clear_all_caches(get_jwt_identity())


# ── Ações ─────────────────────────────────────────────────────────────────────

@bp.route('/actions/<string:key>', methods=['POST'])
@jwt_required()
@require_permission(20)
@set_session
@api_error_handler
def admin_action(key):
    """Executa uma ação administrativa pelo identificador."""
    return run_admin_action(key, get_jwt_identity())


# ── Logs ──────────────────────────────────────────────────────────────────────

@bp.route('/logs/activity', methods=['GET'])
@jwt_required()
@require_permission(20)
@set_session
@api_error_handler
def activity_logs():
    """Lista logs de atividade com filtros opcionais."""
    filters = {
        k: v for k, v in request.args.items()
        if k in ('action', 'date_from', 'date_to', 'user_id')
    }
    return get_activity_logs(filters, get_jwt_identity())


@bp.route('/logs/sessions', methods=['GET'])
@jwt_required()
@require_permission(20)
@set_session
@api_error_handler
def session_logs():
    """Lista logs de sessões."""
    return get_session_logs(get_jwt_identity())
