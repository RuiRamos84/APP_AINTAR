from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services.payment_service import payment_service
from ..utils.utils import token_required, set_session
import logging
from app.utils.error_handler import api_error_handler

bp = Blueprint("payments", __name__)
logger = logging.getLogger(__name__)

# Utilizadores com permissões de gestão de pagamentos
PAYMENT_ADMINS = {12, 16}
PAYMENT_SUBMITTERS = {12, 16, 17}


def check_payment_permissions(required_level="admin"):
    """Verificar permissões de pagamento"""
    user = get_jwt()["user_id"]
    user_id = user.get('user_id') if isinstance(user, dict) else user

    if required_level == "admin" and user_id not in PAYMENT_ADMINS:
        return False, user_id
    elif required_level == "submit" and user_id not in PAYMENT_SUBMITTERS:
        return False, user_id

    return True, user_id


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


# MULTIBANCO (usa checkout)
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


@bp.route("/payments/manual", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def process_manual_payment():
    data = request.json or {}
    required = ["document_id", "amount", "payment_type", "payment_details"]

    if not all(k in data for k in required):
        return jsonify({"error": f"Campos obrigatórios: {required}"}), 400

    has_permission, user_id = check_payment_permissions("submit")
    if not has_permission:
        return jsonify({"error": "Sem permissão"}), 403

    user = get_jwt_identity()

    try:
        result = payment_service.process_manual_direct(
            data["document_id"],
            data["amount"],
            data["payment_type"],
            data["payment_details"],
            user
        )
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/manual-direct", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def register_manual_payment():
    """Registar pagamento manual direto (sem checkout prévio)"""
    data = request.json or {}
    required = ["document_id", "amount", "payment_type", "reference_info"]

    if not all(k in data for k in required):
        return jsonify({"error": f"Campos obrigatórios: {required}"}), 400

    # Verificar permissões
    has_permission, user_id = check_payment_permissions("submit")
    if not has_permission:
        logger.warning(f"User {user_id} tentou pagamento manual sem permissão")
        return jsonify({"error": "Sem permissão"}), 403

    user = get_jwt_identity()

    try:
        result = payment_service.register_manual_payment(
            data["document_id"],
            data["amount"],
            data["payment_type"],
            data["reference_info"],
            user
        )
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        logger.error(f"Erro no pagamento manual: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@bp.route("/payments/pending", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_pending_payments():
    """Listar pagamentos pendentes de validação"""
    # Verificar permissões
    has_permission, user_id = check_payment_permissions("admin")
    if not has_permission:
        return jsonify({"error": "Sem permissão"}), 403

    user = get_jwt_identity()

    try:
        payments = payment_service.get_pending_payments(user)
        print(f"Pagamentos pendentes: {payments}")  # Debugging line
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
    # Verificar permissões
    has_permission, user_id = check_payment_permissions("admin")
    if not has_permission:
        logger.warning(
            f"User {user_id} tentou aprovar pagamento sem permissão")
        return jsonify({"error": "Sem permissão"}), 403

    user = get_jwt_identity()

    try:
        result = payment_service.approve_payment(payment_pk, user_id, user)
        return jsonify(result), (200 if result.get("success") else 400)
    except Exception as e:
        logger.error(f"Erro ao aprovar pagamento {payment_pk}: {e}")
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
    has_permission, user_id = check_payment_permissions("admin")
    if not has_permission:
        return jsonify({"error": "Sem permissão"}), 403

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
