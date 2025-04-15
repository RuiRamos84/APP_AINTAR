from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.payment_service import payment_service
from ..utils.utils import token_required, set_session, db_session_manager
import logging

logger = logging.getLogger(__name__)

bp = Blueprint("payments", __name__)


@bp.route("/payments/invoice-amount/<int:document_id>", methods=["GET"])
@jwt_required()
@token_required
@set_session
def get_invoice_amount(document_id):
    try:
        current_user = get_jwt_identity()
        invoice_data = payment_service.get_invoice_amount(
            document_id, current_user)

        if invoice_data is None:
            return jsonify({
                "success": False,
                "message": "Não foi possível obter os dados da fatura"
            }), 404

        # Retorna todos os dados para que o front-end possa decidir o que fazer
        print(invoice_data)
        return jsonify({
            "success": True,
            "invoice_data": invoice_data
        }), 200
    except Exception as e:
        logger.error(f"Erro na rota get_invoice_amount: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@bp.route("/payments/mbway", methods=["POST"])
@jwt_required()
@token_required
@set_session
def mbway_payment():
    try:
        data = request.json
        print(data)
        required = ["order_id", "amount", "phone_number"]
        if not data or not all(key in data for key in required):
            return jsonify({"error": "Dados incompletos para MBWay"}), 400

        # Obter o token da sessão para associar o pedido
        current_user = get_jwt_identity()

        # Converter o valor para float, independentemente do formato recebido
        amount = data["amount"]
        try:
            # Se for string, converter para float
            if isinstance(amount, str):
                amount = float(amount)
            # Se for dicionário, extrair o valor apropriado
            elif isinstance(amount, dict):
                if "invoice" in amount:
                    amount = float(amount["invoice"])
                elif "total" in amount:
                    amount = float(amount["total"])
                elif "amount" in amount:
                    amount = float(amount["amount"])

            # Garantir que amount é um número
            amount = float(amount)
        except (ValueError, TypeError):
            return jsonify({"error": "Valor de pagamento inválido ou mal formatado"}), 400

        # Primeiro, cria o checkout (para MBWay) e guarda os dados na BD
        checkout_response = payment_service.create_checkout(
            data["order_id"],
            amount,  # Agora garantimos que é float
            "MBWAY",  # Método definido para MBWay
            current_user
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
            current_user
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

        current_user = get_jwt_identity()

        # Converter o valor para float, independentemente do formato recebido
        amount = data["amount"]
        try:
            # Se for string, converter para float
            if isinstance(amount, str):
                amount = float(amount)
            # Se for dicionário, extrair o valor apropriado
            elif isinstance(amount, dict):
                if "invoice" in amount:
                    amount = float(amount["invoice"])
                elif "total" in amount:
                    amount = float(amount["total"])
                elif "amount" in amount:
                    amount = float(amount["amount"])

            # Garantir que amount é um número
            amount = float(amount)
        except (ValueError, TypeError):
            return jsonify({"error": "Valor de pagamento inválido ou mal formatado"}), 400

        # Primeiro, cria o checkout (com método MULTIBANCO)
        checkout_response = payment_service.create_checkout(
            data["order_id"],
            amount,  # Agora garantimos que é float
            "MULTIBANCO",  # Indicamos que é para Multibanco
            current_user
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
            current_user
        )
        return jsonify(reference_response), 200 if reference_response.get("success") else 400

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/payments/status/<transaction_id>/<int:document_id>", methods=["GET"])
@jwt_required()
@token_required
@set_session
def check_status(transaction_id, document_id):
    try:
        current_user = get_jwt_identity()
        response = payment_service.check_payment_status(
            transaction_id, document_id, current_user)
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
