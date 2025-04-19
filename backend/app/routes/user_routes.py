from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..services.user_service import (
    send_email,
    create_user_ext,
    activate_user as activate_user_service,
    update_user_info,
    get_user_info,
    update_password,
    password_recovery,
    reset_password,
    fsf_client_vacationadd,
    fsf_client_vacationclean,
)
from ..utils.utils import set_session, token_required, db_session_manager
from app.utils.error_handler import api_error_handler

bp = Blueprint('user', __name__)


@bp.route('/send_mail', methods=['POST'])
@jwt_required()
@token_required
@api_error_handler
def send_mail():
    data = request.get_json()
    print(data)
    email = data.get('email')
    subject = data.get('subject')
    message = data.get('message')
    result = send_email(email, subject, message)
    if result:
        return {'message': 'Email enviado com sucesso.'}, 200
    else:
        return {'message': 'Erro ao enviar o email.'}, 500


@bp.route('/create_user_ext', methods=['POST'])
@api_error_handler
def create_user():
    return create_user_ext(request.get_json())


@bp.route('/activation/<int:id>/<int:activation_code>', methods=['GET'])
@api_error_handler
def activate_user(id, activation_code):
    return activate_user_service(id, activation_code)


@bp.route('/user_info', methods=['GET', 'PUT'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def user_info():
    try:
        current_user = get_jwt_identity()
        with db_session_manager(current_user):
            if request.method == 'GET':
                user_info = get_user_info(current_user)
                return jsonify({'user_info': user_info}), 200
            elif request.method == 'PUT':
                data = request.get_json()
                update_user_info(data, current_user)
                return jsonify({'message': 'Informações do utilizador atualizadas com sucesso'}), 200
    except Exception as e:
        error_message = str(e)
        current_app.logger.error(f"Erro ao processar {request.method} /user_info: {error_message}")
        return jsonify({'erro': f"Erro ao processar {request.method} /user_info: {error_message}"}), 500


@bp.route('/change_password', methods=['PUT'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def change_password_route():
    current_user = get_jwt_identity()
    data = request.get_json()
    old_password = data.get("oldPassword")
    new_password = data.get("newPassword")

    if not old_password or not new_password:
        return jsonify({"erro": "Passwords não fornecidas"}), 400

    success, message = update_password(
        old_password, new_password, current_user)
    if success:
        return jsonify({"mensagem": message}), 200
    else:
        return jsonify({"erro": message}), 400


@bp.route('/password_recovery', methods=['POST'])
@api_error_handler
def password_recovery_route():
    return password_recovery(request.get_json())


@bp.route('/reset_password', methods=['POST'])
@api_error_handler
def reset_password_route():
    return reset_password(request.get_json())


@bp.route('/vacation_status', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def vacation_status():
    try:
        current_user = get_jwt_identity()
        with db_session_manager(current_user):
            data = request.get_json()
            user_id = data.get('user_id')
            vacation = data.get('vacation')
            if vacation is None:
                return jsonify({"error": "Status de férias não fornecido"}), 400
            if vacation == 1:
                result = fsf_client_vacationadd(user_id, current_user)
            else:
                result = fsf_client_vacationclean(user_id, current_user)
            if isinstance(result, int) and result == 1:
                message = "De férias" if vacation == 1 else "A trabalhar"
                return jsonify({"message": "Estado de férias atualizado com sucesso", "status": message}), 200
            else:
                return jsonify({"error": f"Falha ao atualizar o estado de férias: {result}"}), 500
    except Exception as e:
        return jsonify({"error": f"Falha ao atualizar o estado de férias:{str(e)}"}), 500


@bp.after_request
@api_error_handler
def cleanup_session(response):
    if hasattr(g, 'current_user'):
        delattr(g, 'current_user')
    if hasattr(g, 'current_session_id'):
        delattr(g, 'current_session_id')
    return response


# Adicione esta linha no final do arquivo auth_routes.py
bp.after_request(cleanup_session)
