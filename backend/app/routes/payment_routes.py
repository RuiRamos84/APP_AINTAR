from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.services.payment_service import payment_service
from ..utils.utils import token_required, set_session
import logging
from app.utils.error_handler import api_error_handler

bp = Blueprint("payments", __name__)
logger = logging.getLogger(__name__)


@bp.route("/payments/invoice-amount/<int:document_id>", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_invoice_amount(document_id):
    user = get_jwt_identity()
    data = payment_service.get_invoice_amount(document_id, user)
    if not data:
        return jsonify({"success": False, "message": "Fatura não encontrada"}), 404
    return jsonify({"success": True, "invoice_data": data}), 200


@bp.route("/payments/pending", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_pending_payments():
    """Obter pagamentos pendentes de validação"""
    current_user = get_jwt_identity()
    user = get_jwt()["user_id"]
    # print(f"User: {user}")

    # Verificar permissões
    user_id = user.get('user_id') if isinstance(user, dict) else user
    # print(f"User ID: {user_id}")
    if user_id not in (12, 16):
        return jsonify({"error": "Sem permissão"}), 403

    try:
        payments = payment_service.get_pending_payments(current_user)
        return jsonify({"success": True, "payments": payments}), 200
    except Exception as e:
        logger.error(f"Erro ao obter pagamentos pendentes: {e}")
        return jsonify({"error": str(e)}), 500


@bp.route("/payments/mbway", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def mbway_payment():
    data = request.json or {}
    required = ["order_id", "amount", "phone_number"]
    if not all(k in data for k in required):
        return jsonify({"error": "Dados incompletos para MBWay"}), 400
    user = get_jwt_identity()
    try:
        amount = float(data["amount"]) if not isinstance(
            data["amount"], dict) else float(next(data["amount"].values()))
    except:
        return jsonify({"error": "Valor inválido"}), 400
    chk = payment_service.create_checkout(
        data["order_id"], amount, "MBWAY", user)
    if not chk.get("success"):
        return jsonify({"error": "Erro checkout", "details": chk.get("error")}), 400
    resp = payment_service.create_mbway_payment(
        chk["transaction_id"], chk["transaction_signature"], data["phone_number"], user
    )
    return jsonify(resp), (200 if resp.get("success") else 400)


@bp.route("/payments/multibanco", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def multibanco_payment():
    data = request.json or {}
    required = ["order_id", "amount", "expiry_date"]
    if not all(k in data for k in required):
        return jsonify({"error": "Dados incompletos para Multibanco"}), 400
    user = get_jwt_identity()
    try:
        amount = float(data["amount"]) if not isinstance(
            data["amount"], dict) else float(next(data["amount"].values()))
    except:
        return jsonify({"error": "Valor inválido"}), 400
    chk = payment_service.create_checkout(
        data["order_id"], amount, "MULTIBANCO", user)
    if not chk.get("success"):
        return jsonify({"error": "Erro checkout", "details": chk.get("error")}), 400
    resp = payment_service.create_multibanco_reference(
        chk["transaction_id"], chk["transaction_signature"], data["expiry_date"], user
    )
    return jsonify(resp), (200 if resp.get("success") else 400)


@bp.route("/payments/status/<transaction_id>/<int:document_id>", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def check_status(transaction_id, document_id):
    user = get_jwt_identity()
    resp = payment_service.check_payment_status(
        transaction_id, document_id, user)
    return jsonify(resp), (200 if resp.get("success") else 400)


@bp.route("/payments/webhook", methods=["POST"])
@jwt_required()
def webhook():
    resp = payment_service.process_webhook(request.json or {})
    return jsonify(resp), (200 if resp.get("success") else 400)


@bp.route("/payments/manual", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def manual_payment():
    data = request.json or {}
    required = ["order_id", "amount", "payment_type", "reference_info"]
    if not all(k in data for k in required):
        return jsonify({"error": "Dados incompletos para pagamento manual"}), 400

    user = get_jwt_identity()
    user_id = user.get('user_id') if isinstance(user, dict) else user

    # Verificar permissões
    if user_id not in (12, 16, 17):
        logger.warning(f"User {user_id} attempted unauthorized manual payment")
        return jsonify({"error": "Sem permissão"}), 403

    try:
        amount = float(data["amount"]) if not isinstance(
            data["amount"], dict) else float(next(data["amount"].values()))
    except:
        return jsonify({"error": "Valor inválido"}), 400

    resp = payment_service.register_manual_payment(
        data["order_id"], amount, data["payment_type"], data["reference_info"], user
    )
    return jsonify(resp), (200 if resp.get("success") else 400)


@bp.route("/payments/approve/<int:payment_pk>", methods=["PUT"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def approve_payment(payment_pk):
    user = get_jwt_identity()
    user_id = user.get('user_id') if isinstance(user, dict) else user
    # print(f"User ID: {user_id}")
    # Verificar permissões
    if user_id not in (12, 16):
        logger.warning(
            f"User {user_id} attempted unauthorized payment approval")
        return jsonify({"error": "Sem permissão"}), 403

    resp = payment_service.approve_payment(payment_pk, user_id)
    return jsonify(resp), (200 if resp.get("success") else 400)
