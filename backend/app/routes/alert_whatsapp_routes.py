# app/routes/alert_whatsapp_routes.py
"""
Rotas de alertas via WhatsApp (microserviço whatsapp-web.js)

Endpoints:
    GET  /api/v1/alertas/whatsapp/status     — estado da ligação WhatsApp
    GET  /api/v1/alertas/whatsapp/qr         — QR code para ligar
    POST /api/v1/alertas/whatsapp/desligar   — termina sessão WhatsApp
    GET  /api/v1/alertas/whatsapp/ultimo     — obtém o alerta de sensor mais recente
    POST /api/v1/alertas/whatsapp/enviar     — envia alerta de sensor por WhatsApp

Autenticação: JWT obrigatório em todos os endpoints
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from app import limiter
from app.services.alert_whatsapp_service import get_latest_alert
from app.services.whatsapp_web_service import (
    get_whatsapp_status,
    get_qr_code,
    open_whatsapp,
    join_whatsapp_group,
    disconnect_whatsapp,
    get_whatsapp_groups,
    send_sensor_alert_whatsapp,
    send_sensor_alert_to_group,
    send_alert_to_default_group,
    get_configured_groups,
    add_configured_group,
    remove_configured_group,
    toggle_configured_group,
    WA_GROUP_INVITE,
)

logger = get_logger(__name__)

bp = Blueprint('alert_whatsapp', __name__)


@bp.route('/whatsapp/status', methods=['GET'])
@limiter.exempt
@jwt_required()
@api_error_handler
def get_status():
    """Devolve o estado actual da ligação WhatsApp."""
    return get_whatsapp_status()


@bp.route('/whatsapp/qr', methods=['GET'])
@limiter.exempt
@jwt_required()
@api_error_handler
def get_qr():
    """Devolve o QR code para ligar o WhatsApp (ou status 'connected'/'loading')."""
    return get_qr_code()


@bp.route('/whatsapp/open', methods=['POST'])
@limiter.exempt
@jwt_required()
@api_error_handler
def abrir_whatsapp():
    """Abre o Chrome com web.whatsapp.com para registo via QR code."""
    return open_whatsapp()


@bp.route('/whatsapp/connect', methods=['POST'])
@limiter.exempt
@jwt_required()
@api_error_handler
def ligar_whatsapp():
    """Liga em headless usando a sessão guardada após login manual no Chrome."""
    from app.services.whatsapp_web_service import _call
    data, status = _call('POST', '/connect')
    return data, status


@bp.route('/whatsapp/desligar', methods=['POST'])
@jwt_required()
@api_error_handler
def desligar():
    """Termina a sessão WhatsApp e apaga os dados locais."""
    return disconnect_whatsapp()


@bp.route('/whatsapp/entrar-grupo', methods=['POST'])
@jwt_required()
@api_error_handler
def entrar_grupo():
    """Entra num grupo WhatsApp via link de convite."""
    try:
        body        = request.get_json(force=True, silent=True) or {}
        invite_code = body.get('invite_code', '').strip()
        if not invite_code:
            return jsonify({'status': 'error', 'message': 'invite_code obrigatório'}), 400
        return join_whatsapp_group(invite_code=invite_code)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@bp.route('/whatsapp/grupos', methods=['GET'])
@jwt_required()
@api_error_handler
def listar_grupos():
    """Lista todos os grupos WhatsApp onde a conta participa."""
    return get_whatsapp_groups()


@bp.route('/whatsapp/enviar-grupo', methods=['POST'])
@jwt_required()
@api_error_handler
def enviar_alerta_grupo():
    """
    Envia o alerta de sensor para um grupo WhatsApp.

    Body JSON:
        group_id: str — ID do grupo (ex: "120363...@g.us")
        pk:       int — PK do registo (opcional)
    """
    try:
        body     = request.get_json(force=True, silent=True) or {}
        group_id = body.get('group_id', '').strip()
        pk       = body.get('pk', None)

        if not group_id:
            return jsonify({'status': 'error', 'message': 'group_id obrigatório'}), 400

        return send_sensor_alert_to_group(group_id=group_id, pk=pk)

    except Exception as e:
        logger.error(f"Erro ao enviar alerta para grupo: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@bp.route('/whatsapp/config/grupos', methods=['GET'])
@jwt_required()
@api_error_handler
def listar_grupos_config():
    """Lista os grupos guardados em tb_whatsapp_config."""
    return get_configured_groups()


@bp.route('/whatsapp/config/grupos', methods=['POST'])
@jwt_required()
@api_error_handler
def adicionar_grupo_config():
    """Adiciona um grupo à lista de auto-alerta."""
    try:
        body        = request.get_json(force=True, silent=True) or {}
        group_id    = body.get('group_id', '').strip()
        group_name  = body.get('group_name', '').strip()
        invite_link = body.get('invite_link', '').strip() or None
        if not group_id or not group_name:
            return jsonify({'status': 'error', 'message': 'group_id e group_name obrigatórios'}), 400
        return add_configured_group(group_id=group_id, group_name=group_name, invite_link=invite_link)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@bp.route('/whatsapp/config/grupos/<int:pk>', methods=['DELETE'])
@jwt_required()
@api_error_handler
def remover_grupo_config(pk):
    """Remove um grupo da lista de auto-alerta."""
    return remove_configured_group(pk=pk)


@bp.route('/whatsapp/config/grupos/<int:pk>/toggle', methods=['PATCH'])
@jwt_required()
@api_error_handler
def toggle_grupo_config(pk):
    """Activa ou desactiva um grupo."""
    try:
        body  = request.get_json(force=True, silent=True) or {}
        ativo = bool(body.get('ativo', True))
        return toggle_configured_group(pk=pk, ativo=ativo)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@bp.route('/whatsapp/grupo-padrao', methods=['GET'])
@jwt_required()
@api_error_handler
def get_grupo_padrao():
    """Devolve o link de convite do grupo padrão configurado em .env."""
    return jsonify({'invite': WA_GROUP_INVITE}), 200


@bp.route('/whatsapp/enviar-padrao', methods=['POST'])
@jwt_required()
@api_error_handler
def enviar_alerta_padrao():
    """
    Envia o alerta mais recente para o grupo padrão definido em WA_GROUP_INVITE.
    Junta-se ao grupo automaticamente se ainda não estiver configurado.
    """
    try:
        body = request.get_json(force=True, silent=True) or {}
        pk   = body.get('pk', None)
        return send_alert_to_default_group(pk=pk)
    except Exception as e:
        logger.error(f"Erro ao enviar alerta para grupo padrão: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@bp.route('/whatsapp/ultimo', methods=['GET'])
@jwt_required()
@api_error_handler
def get_ultimo_alerta():
    """
    Obtém o alerta de sensor mais recente da tb_sensordataraw.

    Query params:
        pk: PK específico (opcional)
    """
    try:
        pk = request.args.get('pk', None, type=int)
        return get_latest_alert(pk=pk)
    except Exception as e:
        logger.error(f"Erro ao obter último alerta: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


@bp.route('/whatsapp/enviar', methods=['POST'])
@jwt_required()
@api_error_handler
def enviar_alerta_whatsapp():
    """
    Envia o alerta de sensor por WhatsApp via microserviço whatsapp-web.js.

    Body JSON:
        phone: str — número com código de país (ex: +351912345678)
        pk:    int — PK do registo (opcional, usa o mais recente se omitido)
    """
    try:
        body  = request.get_json(force=True, silent=True) or {}
        phone = body.get('phone', '').strip()
        pk    = body.get('pk', None)

        if not phone:
            return jsonify({'status': 'error', 'message': 'Número de telefone obrigatório'}), 400

        return send_sensor_alert_whatsapp(phone=phone, pk=pk)

    except Exception as e:
        logger.error(f"Erro ao enviar alerta WhatsApp: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
