from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.payment_service import payment_service
from app.utils.utils import token_required, set_session

bp = Blueprint("payments", __name__)


@bp.route("/payments/checkout", methods=["POST"])
@jwt_required()
@token_required
@set_session
def create_checkout():
    """Obtém as configurações da SIBS"""
    return jsonify(payment_service.create_checkout())


@bp.route("/payments/mbway", methods=["POST"])
@jwt_required()
@token_required
@set_session
def mbway_payment():
    try:
        data = request.json
        required = ["order_id", "amount", "phone_number"]
        if not data or not all(key in data for key in required):
            return jsonify({"error": "Dados incompletos para MBWay"}), 400

        # Obter o token da sessão para associar o pedido
        session_token = get_jwt_identity()

        # Primeiro, cria o checkout (para MBWay) e guarda os dados na BD
        checkout_response = payment_service.create_checkout(
            data["order_id"],
            data["amount"],
            "MBWAY",  # Método definido para MBWay
            session_token
        )
        if not checkout_response.get("success"):
            return jsonify({
                "error": "Erro ao criar checkout",
                "details": checkout_response.get("error")
            }), 400

        transaction_id = checkout_response.get("transaction_id")
        transaction_signature = checkout_response.get("transaction_signature")

        # Em seguida, efetua o pagamento MBWay com os dados do checkout
        mbway_response = payment_service.create_mbway_payment(
            transaction_id,
            transaction_signature,
            data["phone_number"],
            session_token
        )
        return jsonify(mbway_response), 200 if mbway_response.get("success") else 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/payments/multibanco", methods=["POST"])
@jwt_required()
@token_required
@set_session
def multibanco_payment():
    try:
        data = request.json
        # Espera receber order_id, amount e expiry_date
        required = ["order_id", "amount", "expiry_date"]
        if not data or not all(field in data for field in required):
            return jsonify({"error": "Dados incompletos para Multibanco"}), 400

        session_token = get_jwt_identity()

        # Primeiro, cria o checkout (com método MULTIBANCO)
        checkout_response = payment_service.create_checkout(
            data["order_id"],
            data["amount"],
            "MULTIBANCO",  # Indicamos que é para Multibanco
            session_token
        )
        if not checkout_response.get("success"):
            return jsonify({
                "error": "Erro ao criar checkout",
                "details": checkout_response.get("error")
            }), 400

        transaction_id = checkout_response.get("transaction_id")
        transaction_signature = checkout_response.get("transaction_signature")

        # Em seguida, gera a referência/entidade para Multibanco
        reference_response = payment_service.create_multibanco_reference(
            transaction_id,
            transaction_signature,
            data["expiry_date"],
            session_token
        )
        return jsonify(reference_response), 200 if reference_response.get("success") else 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/payments/status/<transaction_id>", methods=["GET"])
@jwt_required()
@token_required
@set_session
def check_status(transaction_id):
    try:
        session_token = get_jwt_identity()
        response = payment_service.check_payment_status(
            transaction_id, session_token)
        return jsonify(response), 200 if response.get("success") else 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@bp.route("/payments/webhook", methods=["POST"])
def webhook():
    try:
        data = request.json
        response = payment_service.process_webhook(data)
        return jsonify(response), 200 if response.get("success") else 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
