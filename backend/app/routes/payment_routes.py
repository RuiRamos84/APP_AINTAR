# backend/app/routes/payment_routes.py - VERSÃO CORRIGIDA

import logging
from app.services.payment_service import payment_service
from app.utils.error_handler import api_error_handler
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from ..utils.utils import set_session, token_required

bp = Blueprint("payments", __name__)
logger = logging.getLogger(__name__)

# ===== GESTÃO CENTRALIZADA DE PERMISSÕES (SINCRONIZADA COM FRONTEND) =====

PAYMENT_METHODS = {
    'MBWAY': 'MBWAY',
    'MULTIBANCO': 'MULTIBANCO',
    'CASH': 'CASH',
    'BANK_TRANSFER': 'BANK_TRANSFER',
    'MUNICIPALITY': 'MUNICIPALITY'
}

ADMIN_PROFILES = ['0']

# ✅ REGRAS EXACTAS DO FRONTEND
PERMISSION_RULES = {
    PAYMENT_METHODS['MBWAY']: {
        'profiles': ['0', '1', '2', '3'],
        'description': 'Disponível para todos os perfis exceto 4'
    },
    PAYMENT_METHODS['MULTIBANCO']: {
        'profiles': ['0', '1', '2', '3'],
        'description': 'Disponível para todos os perfis exceto 4'
    },
    PAYMENT_METHODS['BANK_TRANSFER']: {
        'profiles': ['0', '1', '2', '3'],
        'description': 'Disponível para todos os perfis exceto 4'
    },
    PAYMENT_METHODS['CASH']: {
        'profiles': ['0', '1'],  # Perfis base
        'description': 'Perfis 0,1 + utilizadores específicos',
        'restrictedUsers': [12, 15]  # IDs específicos que TAMBÉM podem
    },
    PAYMENT_METHODS['MUNICIPALITY']: {
        'profiles': ['0', '2'],
        'description': 'Admin e municípios'
    }
}

# ✅ GESTÃO DE PAGAMENTOS - IDs ESPECÍFICOS
PAYMENT_ADMIN_IDS = [12, 100111]  # Apenas utilizador 12 e 100111


def can_use_payment_method(user_profile, payment_method, user_id=None):
    """Verificar se utilizador pode usar método específico"""
    if not user_profile or not payment_method:
        return False

    rule = PERMISSION_RULES.get(payment_method)
    if not rule:
        return False

    # CASH: lógica especial (perfis OU IDs específicos)
    if payment_method == PAYMENT_METHODS['CASH']:
        # Pode usar se: tem perfil permitido OU está na lista de IDs
        has_profile = str(user_profile) in rule.get('profiles', [])
        has_id = user_id and int(user_id) in rule.get('restrictedUsers', [])
        return has_profile or has_id

    # Admin sempre pode (exceto CASH que tem lógica acima)
    if str(user_profile) in ADMIN_PROFILES:
        return True

    # Outros métodos: verificar perfil
    return str(user_profile) in rule.get('profiles', [])


def can_manage_payments(user_id):
    """Verificar permissões de gestão de pagamentos"""
    return user_id and int(user_id) in PAYMENT_ADMIN_IDS


def debug_user_permissions(user_profile, user_id, payment_method=None):
    """Debug detalhado"""
    logger.info(
        f"=== Permissões Pagamento - Perfil: {user_profile}, User ID: {user_id} ===")

    for method_name, method_key in PAYMENT_METHODS.items():
        can_use = can_use_payment_method(user_profile, method_key, user_id)
        rule = PERMISSION_RULES[method_key]

        # Log detalhado para CASH
        if method_key == PAYMENT_METHODS['CASH']:
            has_profile = str(user_profile) in rule.get('profiles', [])
            has_id = user_id and int(user_id) in rule.get(
                'restrictedUsers', [])
            logger.info(
                f"{method_name}: {'✅' if can_use else '❌'} - Perfil: {has_profile}, ID: {has_id}")
        else:
            logger.info(
                f"{method_name}: {'✅' if can_use else '❌'} - {rule['description']}")

    logger.info(
        f"Gestão pagamentos: {'✅' if can_manage_payments(user_id) else '❌'} (IDs permitidos: {PAYMENT_ADMIN_IDS})")


def get_user_info_from_jwt():
    """Extrair informações do JWT"""
    try:
        jwt_data = get_jwt()

        # User ID
        user_id = jwt_data.get('user_id')
        if isinstance(user_id, dict):
            user_id = user_id.get('user_id')

        # Perfil
        user_profile = (
            jwt_data.get('profil') or
            jwt_data.get('profile') or
            jwt_data.get('user_profile')
        )

        logger.info(
            f"🔍 JWT dados - User ID: {user_id}, Perfil: {user_profile}")
        return int(user_id) if user_id else None, str(user_profile) if user_profile else None

    except Exception as e:
        logger.error(f"Erro extrair JWT: {e}")
        return None, None


def check_payment_permissions(required_level="submit", payment_method=None):
    """Verificar permissões centralizadas"""
    user_id, user_profile = get_user_info_from_jwt()

    if not user_id:
        logger.warning("❌ User ID não encontrado")
        return False, None, None

    # Debug em desenvolvimento
    debug_user_permissions(user_profile, user_id, payment_method)

    if required_level == "admin":
        has_permission = can_manage_payments(user_id)
        if not has_permission:
            logger.warning(f"❌ User {user_id} não é admin de pagamentos")
        return has_permission, user_id, user_profile

    elif required_level == "submit" and payment_method:
        has_permission = can_use_payment_method(
            user_profile, payment_method, user_id)
        if not has_permission:
            logger.warning(
                f"❌ User {user_id} (perfil {user_profile}) não pode usar {payment_method}")
        return has_permission, user_id, user_profile

    return False, user_id, user_profile


# ===== ENDPOINTS =====

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
    data = request.json or {}
    required = ["document_id", "amount", "payment_method"]

    if not all(k in data for k in required):
        return jsonify({"error": f"Campos obrigatórios: {required}"}), 400

    user = get_jwt_identity()
    try:
        result = payment_service.create_checkout_only(
            data["document_id"], data["amount"], data["payment_method"], user)
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/mbway", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def process_mbway():
    data = request.json or {}
    required = ["transaction_id", "phone_number"]

    if not all(k in data for k in required):
        return jsonify({"error": f"Campos obrigatórios: {required}"}), 400

    user = get_jwt_identity()
    try:
        result = payment_service.process_mbway_from_checkout(
            data["transaction_id"], data["phone_number"], user)
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/multibanco", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def process_multibanco():
    data = request.json or {}
    required = ["transaction_id"]

    if not all(k in data for k in required):
        return jsonify({"error": f"Campos obrigatórios: {required}"}), 400

    user = get_jwt_identity()
    try:
        result = payment_service.process_multibanco_from_checkout(
            data["transaction_id"], user)
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/manual-direct", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def register_manual_payment():
    """Registar pagamento manual com permissões centralizadas"""
    data = request.json or {}
    required = ["document_id", "amount", "payment_type", "reference_info"]

    if not all(k in data for k in required):
        return jsonify({"error": f"Campos obrigatórios: {required}"}), 400

    # ✅ VERIFICAR PERMISSÕES
    payment_method = data.get("payment_type")
    has_permission, user_id, user_profile = check_payment_permissions(
        "submit", payment_method)

    if not has_permission:
        return jsonify({
            "success": False,
            "error": f"Sem permissão para {payment_method}",
            "user_id": user_id,
            "user_profile": user_profile
        }), 403

    user = get_jwt_identity()
    try:
        result = payment_service.register_manual_payment_direct(
            data["document_id"], data["amount"], data["payment_type"],
            data["reference_info"], user, user_id)
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        logger.error(f"Erro pagamento manual: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/pending", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_pending_payments():
    """Listar pagamentos pendentes"""
    has_permission, user_id, user_profile = check_payment_permissions("admin")
    if not has_permission:
        return jsonify({
            "success": False,
            "error": "Sem permissão para gestão",
            "user_id": user_id,
            "required_ids": PAYMENT_ADMIN_IDS
        }), 403

    user = get_jwt_identity()
    try:
        payments = payment_service.get_pending_payments(user)
        return jsonify({"success": True, "payments": payments}), 200
    except Exception as e:
        logger.error(f"Erro pendentes: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/details/<int:payment_pk>", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_payment_details(payment_pk):
    """Detalhes do pagamento"""
    has_permission, user_id, user_profile = check_payment_permissions("admin")
    if not has_permission:
        return jsonify({"success": False, "error": "Sem permissão"}), 403

    user = get_jwt_identity()
    try:
        details = payment_service.get_payment_details(payment_pk, user)
        if not details:
            return jsonify({"success": False, "error": "Não encontrado"}), 404
        return jsonify({"success": True, "payment": details}), 200
    except Exception as e:
        logger.error(f"Erro detalhes {payment_pk}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/approve/<int:payment_pk>", methods=["PUT"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def approve_payment(payment_pk):
    """Aprovar pagamento"""
    has_permission, user_id, user_profile = check_payment_permissions("admin")
    if not has_permission:
        return jsonify({"success": False, "error": "Sem permissão"}), 403

    user = get_jwt_identity()
    try:
        result = payment_service.approve_payment(payment_pk, user_id, user)
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        logger.error(f"Erro aprovar {payment_pk}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/history", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_payment_history():
    """Histórico de pagamentos"""
    has_permission, user_id, user_profile = check_payment_permissions("admin")
    if not has_permission:
        return jsonify({
            "success": False,
            "error": "Sem permissão para histórico",
            "user_id": user_id,
            "required_ids": PAYMENT_ADMIN_IDS
        }), 403

    user = get_jwt_identity()
    page = int(request.args.get('page', 1))
    page_size = min(int(request.args.get('page_size', 10)), 50)

    filters = {
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'method': request.args.get('method'),
        'status': request.args.get('status')
    }

    try:
        result = payment_service.get_payment_history(
            user, page, page_size, filters)
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Erro histórico: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/status/<transaction_id>", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def check_payment_status(transaction_id):
    """Status da transação"""
    user = get_jwt_identity()
    try:
        result = payment_service.check_payment_status(transaction_id, user)
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        logger.error(f"Erro status {transaction_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/webhook", methods=["POST"])
def webhook():
    """Webhook SIBS"""
    data = request.json or {}
    try:
        result = payment_service.process_webhook(data)
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        logger.error(f"Erro webhook: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/debug/permissions", methods=["GET"])
@jwt_required()
@token_required
@set_session
def debug_permissions():
    """Debug permissões"""
    user_id, user_profile = get_user_info_from_jwt()

    permissions = {}
    for method_name, method_key in PAYMENT_METHODS.items():
        permissions[method_name] = {
            'can_use': can_use_payment_method(user_profile, method_key, user_id),
            'rule': PERMISSION_RULES[method_key]
        }

    return jsonify({
        "user_id": user_id,
        "user_profile": user_profile,
        "can_manage_payments": can_manage_payments(user_id),
        "payment_admin_ids": PAYMENT_ADMIN_IDS,
        "permissions": permissions
    }), 200
