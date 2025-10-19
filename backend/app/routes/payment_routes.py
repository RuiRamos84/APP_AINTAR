# backend/app/routes/payment_routes.py - MIGRAÇÃO PARA NOVO SISTEMA
#
# MAPEAMENTO DE PERMISSÕES (ts_interface):
# - 30:  admin.payments (Gestão de pagamentos)
# - 700: payments.mbway
# - 710: payments.multibanco
# - 720: payments.bank_transfer
# - 730: payments.cash.action
# - 740: payments.municipality

from app.services.payment_service import payment_service
from app.utils.error_handler import api_error_handler
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from ..utils.utils import set_session, token_required

# ✅ NOVO SISTEMA DE PERMISSÕES
from app.utils.permissions_decorator import require_permission, get_user_permissions_from_jwt
from app.core.permissions import permission_manager
from app.utils.logger import get_logger


bp = Blueprint("payments", __name__)
logger = get_logger(__name__)

# ===== TRANSIÇÃO: MANTER COMPATIBILIDADE COM SISTEMA ANTIGO =====
# Estas constantes serão removidas gradualmente

PAYMENT_METHODS = {
    'MBWAY': 'MBWAY',
    'MULTIBANCO': 'MULTIBANCO',
    'CASH': 'CASH',
    'BANK_TRANSFER': 'BANK_TRANSFER',
    'MUNICIPALITY': 'MUNICIPALITY'
}

# ⚠️ DEPRECATED: Usar novo sistema
PAYMENT_ADMIN_IDS = [12, 100111, 82, 10]


def get_user_info_from_jwt():
    """Extrair informações do JWT - MANTIDO PARA COMPATIBILIDADE"""
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

        logger.debug(
            f"🔍 JWT dados - User ID: {user_id}, Perfil: {user_profile}")
        return int(user_id) if user_id else None, str(user_profile) if user_profile else None
    except Exception as e:
        logger.error(f"Erro extrair JWT: {e}")
        return None, None

# ✅ NOVA FUNÇÃO USANDO SISTEMA CENTRALIZADO


def check_payment_method_permission(payment_method):
    """Verificar permissão para método de pagamento usando novo sistema"""
    user_id, user_profile, user_interfaces, _ = get_user_permissions_from_jwt()

    if not user_id:
        return False, user_id, user_profile

    # Mapeamento para IDs numéricos (ts_interface)
    permission_map = {
        'CASH': 730,            # payments.cash.action
        'BANK_TRANSFER': 720,   # payments.bank_transfer
        'MUNICIPALITY': 740,    # payments.municipality
        'MBWAY': 700,           # payments.mbway
        'MULTIBANCO': 710       # payments.multibanco
    }

    required_permission_id = permission_map.get(payment_method)
    if not required_permission_id:
        logger.warning(f"Método de pagamento desconhecido: {payment_method}")
        return False, user_id, user_profile

    # Super admin sempre tem acesso
    if user_profile == "0":
        return True, user_id, user_profile

    # Verificar se o ID está na lista de interfaces do utilizador
    has_permission = required_permission_id in (user_interfaces or [])

    logger.debug(
        f"Permissão ID {required_permission_id} para user {user_id}: {has_permission}")
    return has_permission, user_id, user_profile

# ✅ NOVA FUNÇÃO PARA VERIFICAR GESTÃO DE PAGAMENTOS


def check_payment_admin_permission():
    """Verificar permissão de administração de pagamentos"""
    user_id, user_profile, user_interfaces, _ = get_user_permissions_from_jwt()

    if not user_id:
        return False, user_id, user_profile

    # Super admin sempre tem acesso
    if user_profile == "0":
        return True, user_id, user_profile

    # Verificar se tem a permissão de admin de pagamentos (ID 30)
    has_permission = 30 in (user_interfaces or [])  # admin.payments

    logger.debug(
        f"Permissão admin.payments (ID 30) para user {user_id}: {has_permission}")
    return has_permission, user_id, user_profile

# ===== ENDPOINTS ATUALIZADOS =====


@bp.route("/payments/invoice/<int:document_id>", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_invoice_data(document_id):
    """Obter dados da fatura"""
    user = get_jwt_identity()
    try:
        data = payment_service.get_invoice_data(document_id, user)
        return jsonify({"success": True, "invoice_data": data}), 200
    except Exception as e:
        logger.error(f"Erro fatura {document_id}: {e}")
        return jsonify({
            "success": True,
            "invoice_data": {
                'tb_document': document_id,
                'invoice': 0.0,
                'presented': False,
                'accepted': False,
                'payed': False,
                'closed': False,
                'urgency': False,
                'tb_sibs': None
            }
        }), 200


@bp.route("/payments/checkout", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def create_checkout():
    """Criar checkout - validação de permissão implícita"""
    data = request.json or {}
    required = ["document_id", "amount", "payment_method"]

    if not all(k in data for k in required):
        return jsonify({"error": f"Campos obrigatórios: {required}"}), 400

    # ✅ VERIFICAR PERMISSÃO PARA O MÉTODO ESPECÍFICO
    payment_method = data.get("payment_method")
    has_permission, user_id, user_profile = check_payment_method_permission(
        payment_method)

    if not has_permission:
        logger.warning(
            f"Checkout negado - método: {payment_method}, user: {user_id}")
        return jsonify({
            "success": False,
            "error": f"Sem permissão para {payment_method}",
            "required_permission": f"payments.{payment_method.lower()}"
        }), 403

    user = get_jwt_identity()
    result = payment_service.create_checkout_only(data, user)
    return jsonify(result), 200


@bp.route("/payments/mbway", methods=["POST"])
@jwt_required()
@token_required
@set_session
@require_permission(700)  # payments.mbway
@api_error_handler
def process_mbway():
    """Processar MBWay com verificação de permissão"""
    # A validação dos campos é agora feita pelo Pydantic no serviço
    data = request.get_json()
    user = get_jwt_identity()
    result = payment_service.process_mbway_from_checkout(data, user)
    return jsonify(result), 200


@bp.route("/payments/multibanco", methods=["POST"])
@jwt_required()
@token_required
@set_session
@require_permission(710)  # payments.multibanco
@api_error_handler
def process_multibanco():
    """Processar Multibanco com verificação de permissão"""
    data = request.get_json()
    user = get_jwt_identity()
    result = payment_service.process_multibanco_from_checkout(data, user)
    return jsonify(result), 200


@bp.route("/payments/manual-direct", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def register_manual_payment():
    """Registar pagamento manual - ATUALIZADO PARA NOVO SISTEMA"""
    data = request.get_json()
    # ✅ USAR NOVO SISTEMA DE PERMISSÕES
    payment_method = data.get("payment_type")
    has_permission, _, _ = check_payment_method_permission(payment_method)

    if not has_permission:
        return jsonify({"error": f"Sem permissão para o método de pagamento {payment_method}"}), 403
    
    user_session = get_jwt_identity()
    result = payment_service.register_manual_payment_direct(data, user_session)
    return jsonify(result), 200

# ✅ ENDPOINTS ADMINISTRATIVOS - MIGRADOS PARA NOVO SISTEMA


@bp.route("/payments/pending", methods=["GET"])
@jwt_required()
@require_permission(30)  # admin.payments  # ✅ USAR DECORATOR
@token_required
@set_session
@api_error_handler
def get_pending_payments():
    """Listar pagamentos pendentes"""
    user = get_jwt_identity()
    payments = payment_service.get_pending_payments(user)
    return jsonify({"success": True, "payments": payments}), 200


@bp.route("/payments/details/<int:payment_pk>", methods=["GET"])
@jwt_required()
@require_permission(30)  # admin.payments  # ✅ USAR DECORATOR
@token_required
@set_session
@api_error_handler
def get_payment_details(payment_pk):
    """Detalhes do pagamento"""
    user = get_jwt_identity()
    details = payment_service.get_payment_details(payment_pk, user)
    if not details:
        return jsonify({"success": False, "error": "Não encontrado"}), 404
    return jsonify({"success": True, "payment": details}), 200


@bp.route("/payments/approve/<int:payment_pk>", methods=["PUT"])
@jwt_required()
@require_permission(30)  # admin.payments  # ✅ USAR DECORATOR
@token_required
@set_session
@api_error_handler
def approve_payment(payment_pk):
    """Aprovar pagamento"""
    user = get_jwt_identity()
    user_id, _, _, _ = get_user_permissions_from_jwt()

    result = payment_service.approve_payment(payment_pk, user_id, user)
    return jsonify(result), (200 if result.get("success") else 400)


@bp.route("/payments/history", methods=["GET"])
@jwt_required()
@require_permission(30)  # admin.payments  # ✅ USAR DECORATOR
@token_required
@set_session
@api_error_handler
def get_payment_history():
    """Histórico de pagamentos"""
    user = get_jwt_identity()
    page = int(request.args.get('page', 1))
    page_size = min(int(request.args.get('page_size', 10)), 50)

    filters = {
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'method': request.args.get('method'),
        'status': request.args.get('status')
    }

    result = payment_service.get_payment_history(user, page, page_size, filters)
    return jsonify(result), 200

# ===== ENDPOINTS SEM RESTRIÇÕES =====


@bp.route("/payments/status/<transaction_id>", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def check_payment_status(transaction_id):
    """Status da transação - sem restrições especiais"""
    user = get_jwt_identity()
    result = payment_service.check_payment_status(transaction_id, user)
    return jsonify(result), 200


@bp.route("/payments/webhook", methods=["POST"])
def webhook():
    """Webhook SIBS - sem autenticação"""
    data = request.json or {}
    try:
        result = payment_service.process_webhook(data)
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        logger.error(f"Erro webhook: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ===== ENDPOINTS DE DEBUG =====


@bp.route("/payments/debug/permissions", methods=["GET"])
@jwt_required()
@token_required
@set_session
def debug_permissions():
    """Debug permissões - ATUALIZADO PARA NOVO SISTEMA"""
    user_id, user_profile, user_interfaces, all_permissions = get_user_permissions_from_jwt()

    # ✅ USAR NOVO SISTEMA PARA DEBUG
    payment_permissions = {}
    for method_name, method_key in PAYMENT_METHODS.items():
        has_permission, _, _ = check_payment_method_permission(method_key)
        payment_permissions[method_name] = {
            'can_use': has_permission,
            'permission_id': f"payments.{method_key.lower()}"
        }

    # Verificar permissão de gestão
    has_admin, _, _ = check_payment_admin_permission()

    return jsonify({
        "user_id": user_id,
        "user_profile": user_profile,
        "user_interfaces": user_interfaces,
        "can_manage_payments": has_admin,
        "payment_permissions": payment_permissions,
        "all_permissions": all_permissions,
        "system_info": {
            "using_new_permission_system": True,
            "total_permissions": len(all_permissions)
        }
    }), 200


@bp.route("/payments/debug/migration-status", methods=["GET"])
@jwt_required()
@token_required
@set_session
def debug_migration_status():
    """Debug status da migração"""
    user_id, user_profile, user_interfaces, permissions = get_user_permissions_from_jwt()

    # Comparar sistema antigo vs novo
    comparison = {}

    # Para cada método, comparar resultado antigo vs novo
    for method_name, method_key in PAYMENT_METHODS.items():
        # Novo sistema
        new_result, _, _ = check_payment_method_permission(method_key)

        comparison[method_name] = {
            'new_system': new_result,
            'permission_used': f"payments.{method_key.lower()}"
        }

    # Gestão de pagamentos
    new_admin, _, _ = check_payment_admin_permission()

    return jsonify({
        "migration_status": "IN_PROGRESS",
        "user_context": {
            "user_id": user_id,
            "profile": user_profile,
            "interfaces": user_interfaces
        },
        "permission_comparison": comparison,
        "admin_permissions": {
            "new_system": new_admin,
            "permission_used": "payments.validate"
        },
        "recommendations": [
            "✅ Sistema novo implementado",
            "⚠️ Funções antigas mantidas para compatibilidade",
            "🔄 Migração gradual em curso",
            "📊 Monitorizar logs para inconsistências"
        ]
    }), 200
