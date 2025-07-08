from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services.payment_service import payment_service
from ..utils.utils import token_required, set_session
import logging
from app.utils.error_handler import api_error_handler

bp = Blueprint("payments", __name__)
logger = logging.getLogger(__name__)

# ===== GESTÃO CENTRALIZADA DE PERMISSÕES =====

# Métodos de pagamento
PAYMENT_METHODS = {
    'MBWAY': 'MBWAY',
    'MULTIBANCO': 'MULTIBANCO',
    'CASH': 'CASH',
    'BANK_TRANSFER': 'BANK_TRANSFER',
    'MUNICIPALITY': 'MUNICIPALITY'
}

# Perfis especiais com acesso total
ADMIN_PROFILES = ['0']

# Regras de permissão por método (sincronizadas com frontend)
PERMISSION_RULES = {
    PAYMENT_METHODS['MBWAY']: {
        'profiles': ['0', '1', '2', '3'],
        'description': 'Disponível para todos os perfis'
    },
    PAYMENT_METHODS['MULTIBANCO']: {
        'profiles': ['0', '1', '2', '3'],
        'description': 'Disponível para todos os perfis'
    },
    PAYMENT_METHODS['BANK_TRANSFER']: {
        'profiles': ['0', '1', '2', '3'],
        'description': 'Disponível para todos os perfis'
    },
    PAYMENT_METHODS['CASH']: {
        'profiles': [],  # Lista vazia - só IDs específicos
        'description': 'Restrito apenas a utilizadores específicos',
        'restrictedUsers': [12, 15]
    },
    PAYMENT_METHODS['MUNICIPALITY']: {
        'profiles': ['0', '2'],
        'description': 'Restrito a admin e municípios'
    }
}

# Gestão de pagamentos (ver/aprovar todos)
PAYMENT_ADMIN_IDS = [12, 16]


def can_use_payment_method(user_profile, payment_method, user_id=None):
    """Verificar se utilizador pode usar método específico (sincronizado com frontend)"""
    if not user_profile or not payment_method:
        return False

    rule = PERMISSION_RULES.get(payment_method)
    if not rule:
        return False

    # Admin sempre pode (excepto se tiver restrictedUsers definidos)
    if str(user_profile) in ADMIN_PROFILES and not rule.get('restrictedUsers'):
        return True

    # Se tem restrictedUsers, só esses podem
    if rule.get('restrictedUsers'):
        return user_id and int(user_id) in rule['restrictedUsers']

    # Senão, verificar perfil normal
    return str(user_profile) in rule.get('profiles', [])


def can_manage_payments(user_id):
    """Verificar permissões de gestão de pagamentos"""
    return user_id and int(user_id) in PAYMENT_ADMIN_IDS


def can_process_cash_payments(user_id):
    """Verificar permissões para processar pagamentos CASH específicos"""
    cash_processor_ids = PERMISSION_RULES[PAYMENT_METHODS['CASH']].get(
        'restrictedUsers', [])
    return user_id and int(user_id) in cash_processor_ids


def debug_user_permissions(user_profile, user_id, payment_method=None):
    """Debug: listar permissões do utilizador"""
    logger.info(
        f"=== Permissões Pagamento - Perfil: {user_profile}, User ID: {user_id} ===")

    for method_name, method_key in PAYMENT_METHODS.items():
        can_use = can_use_payment_method(user_profile, method_key, user_id)
        rule = PERMISSION_RULES[method_key]
        logger.info(
            f"{method_name}: {'✅' if can_use else '❌'} - {rule['description']}")

    logger.info(
        f"Gestão pagamentos: {'✅' if can_manage_payments(user_id) else '❌'}")

    if payment_method:
        logger.info(
            f"Método solicitado ({payment_method}): {'✅' if can_use_payment_method(user_profile, payment_method, user_id) else '❌'}")


def get_user_info_from_jwt():
    """Extrair informações do utilizador do JWT (agora com profil incluído)"""
    try:
        jwt_data = get_jwt()

        # Extrair user_id
        user_id = jwt_data.get('user_id')
        if isinstance(user_id, dict):
            user_id = user_id.get('user_id')

        # Extrair perfil (agora deve estar no JWT)
        user_profile = (
            jwt_data.get('profil') or
            jwt_data.get('profile') or
            jwt_data.get('user_profile')
        )

        # Fallback temporário para mapeamento (remover depois)
        if not user_profile and user_id:
            user_profile = USER_PROFILE_MAPPING.get(int(user_id))
            logger.warning(
                f"⚠️ Usando fallback mapping para user {user_id}: {user_profile}")

        logger.info(
            f"🔍 JWT dados - User ID: {user_id}, Perfil: {user_profile}")
        return int(user_id) if user_id else None, str(user_profile) if user_profile else None

    except Exception as e:
        logger.error(f"Erro ao extrair dados JWT: {e}")
        return None, None


def check_payment_permissions(required_level="submit", payment_method=None):
    """Verificar permissões de pagamento com método específico"""
    user_id, user_profile = get_user_info_from_jwt()

    logger.info(
        f"🔍 Verificando permissões - User ID: {user_id}, Perfil: {user_profile}, Level: {required_level}, Method: {payment_method}")

    if not user_id:
        logger.warning("❌ User ID não encontrado no JWT")
        return False, None, None

    # Debug das permissões em desenvolvimento
    if logger.level <= logging.INFO:
        debug_user_permissions(user_profile, user_id, payment_method)

    # Verificar permissões específicas
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
        else:
            logger.info(
                f"✅ User {user_id} (perfil {user_profile}) pode usar {payment_method}")
        return has_permission, user_id, user_profile

    # Fallback
    logger.warning(
        f"⚠️ Verificação de permissão incompleta: level={required_level}, method={payment_method}")
    return False, user_id, user_profile

# ===== ENDPOINTS COM PERMISSÕES CENTRALIZADAS =====


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
        if not data:
            return jsonify({"success": False, "message": "Fatura não encontrada"}), 404

        return jsonify({"success": True, "invoice_data": data}), 200
    except Exception as e:
        logger.error(f"Erro ao obter fatura {document_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/document/<int:document_id>/status", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_document_payment_status(document_id):
    """Estado completo do pagamento do documento"""
    user = get_jwt_identity()

    try:
        status = payment_service.get_document_payment_status(document_id, user)
        return jsonify({"success": True, "payment_status": status}), 200
    except Exception as e:
        logger.error(f"Erro ao obter estado do documento {document_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


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
            data["document_id"],
            data["amount"],
            data["payment_method"],
            user
        )
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
            data["transaction_id"],
            data["phone_number"],
            user
        )
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
            data["transaction_id"],
            user
        )
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/status/<transaction_id>", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def check_payment_status(transaction_id):
    """Verificar estado de uma transação"""
    user = get_jwt_identity()

    try:
        result = payment_service.check_payment_status(transaction_id, user)
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        logger.error(f"Erro ao verificar estado {transaction_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/manual-direct", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def register_manual_payment():
    """Registar pagamento manual direto com permissões centralizadas"""
    data = request.json or {}
    required = ["document_id", "amount", "payment_type", "reference_info"]

    if not all(k in data for k in required):
        return jsonify({"error": f"Campos obrigatórios: {required}"}), 400

    # Verificar permissões usando lógica centralizada
    payment_method = data.get("payment_type")
    has_permission, user_id, user_profile = check_payment_permissions(
        "submit", payment_method)

    if not has_permission:
        return jsonify({
            "success": False,
            "error": f"Sem permissão para pagamento {payment_method}",
            "user_id": user_id,
            "user_profile": user_profile,
            "method": payment_method
        }), 403

    user = get_jwt_identity()

    try:
        result = payment_service.register_manual_payment_direct(
            data["document_id"],
            data["amount"],
            data["payment_type"],
            data["reference_info"],
            user
        )
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        logger.error(f"Erro no pagamento manual direto: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/pending", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_pending_payments():
    """Listar pagamentos pendentes de validação"""
    # Verificar permissões usando lógica centralizada
    has_permission, user_id, user_profile = check_payment_permissions("admin")
    if not has_permission:
        return jsonify({
            "success": False,
            "error": "Sem permissão para gestão de pagamentos",
            "user_id": user_id
        }), 403

    user = get_jwt_identity()

    try:
        payments = payment_service.get_pending_payments(user)
        return jsonify({"success": True, "payments": payments}), 200
    except Exception as e:
        logger.error(f"Erro ao obter pagamentos pendentes: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/approve/<int:payment_pk>", methods=["PUT"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def approve_payment(payment_pk):
    """Aprovar pagamento pendente"""
    # Verificar permissões usando lógica centralizada
    has_permission, user_id, user_profile = check_payment_permissions("admin")
    if not has_permission:
        return jsonify({
            "success": False,
            "error": "Sem permissão para aprovar pagamentos",
            "user_id": user_id
        }), 403

    user = get_jwt_identity()

    try:
        result = payment_service.approve_payment(payment_pk, user_id, user)
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        logger.error(f"Erro ao aprovar pagamento {payment_pk}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/sibs/<order_id>", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_sibs_data(order_id):
    """Dados SIBS por order_id"""
    user = get_jwt_identity()

    try:
        result = payment_service.get_sibs_data(order_id, user)
        if not result:
            return jsonify({"success": False, "error": "Dados não encontrados"}), 404

        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        logger.error(f"Erro SIBS data {order_id}: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/webhook", methods=["POST"])
def webhook():
    """Processar webhook SIBS (sem autenticação)"""
    data = request.json or {}

    try:
        result = payment_service.process_webhook(data)
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        logger.error(f"Erro no webhook: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/history", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_payment_history():
    """Histórico de pagamentos com filtros e paginação"""
    has_permission, user_id, user_profile = check_payment_permissions("admin")
    if not has_permission:
        return jsonify({
            "success": False,
            "error": "Sem permissão para ver histórico",
            "user_id": user_id
        }), 403

    user = get_jwt_identity()

    # Parâmetros de paginação
    page = int(request.args.get('page', 1))
    page_size = min(int(request.args.get('page_size', 10)), 50)

    # Filtros
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

# ===== ENDPOINT DE DEBUG DAS PERMISSÕES =====


@bp.route("/payments/debug/permissions", methods=["GET"])
@jwt_required()
@token_required
@set_session
def debug_permissions():
    """Debug das permissões do utilizador atual"""
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
        "can_process_cash": can_process_cash_payments(user_id),
        "permissions": permissions
    }), 200
