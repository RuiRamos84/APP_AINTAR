from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.error_handler import api_error_handler
from ..services.letter_service import (
    create_letter, get_letter, update_letter, list_letters,
    create_letterstore, get_letterstore, list_letterstores,
    generate_letter_document, delete_letter, generate_free_letter_document
)
import os
import logging

bp = Blueprint('oficios', __name__)


@bp.route('/letters', methods=['POST'])
@jwt_required()
@api_error_handler
def create_letter_route():
    data = request.json
    current_user = get_jwt_identity()
    result = create_letter(data, current_user)
    return jsonify(result), 201


@bp.route('/letters/<int:letter_id>', methods=['GET'])
@jwt_required()
@api_error_handler
def get_letter_route(letter_id):
    current_user = get_jwt_identity()
    result = get_letter(letter_id, current_user)
    return jsonify(result), 200


@bp.route('/letters/<int:letter_id>', methods=['PUT'])
@jwt_required()
@api_error_handler
def update_letter_route(letter_id):
    data = request.json
    current_user = get_jwt_identity()
    result = update_letter(letter_id, data, current_user)
    return jsonify(result), 200


@bp.route('/letters/<int:letter_id>', methods=['DELETE'])
@jwt_required()
@api_error_handler
def delete_letter_route(letter_id):
    current_user = get_jwt_identity()
    result = delete_letter(letter_id, current_user)
    if 'error' in result:
        return jsonify(result), 404
    return jsonify(result), 200


@bp.route('/letters', methods=['GET'])
@jwt_required()
@api_error_handler
def list_letters_route():
    # Tenta obter filtros do query string
    filters = request.args.to_dict()
    # Se não houver filtros no query string, tenta obter do body JSON
    if not filters and request.is_json:
        filters = request.json or {}
    # Processa os filtros
    processed_filters = {}
    if 'tt_doctype' in filters:
        try:
            processed_filters['tt_doctype'] = int(filters['tt_doctype'])
        except ValueError:
            return jsonify({"error": "tt_doctype deve ser um inteiro"}), 400
    if 'active' in filters:
        try:
            processed_filters['active'] = int(filters['active'])
        except ValueError:
            return jsonify({"error": "active deve ser um inteiro"}), 400
    current_user = get_jwt_identity()
    result = list_letters(processed_filters, current_user)
    return jsonify(result), 200


@bp.route('/letterstores', methods=['POST'])
@jwt_required()
@api_error_handler
def create_letterstore_route():
    data = request.json
    current_user = get_jwt_identity()
    result = create_letterstore(data, current_user)
    return jsonify(result), 201


@bp.route('/letterstores/<int:letterstore_id>', methods=['GET'])
@jwt_required()
@api_error_handler
def get_letterstore_route(letterstore_id):
    current_user = get_jwt_identity()
    result = get_letterstore(letterstore_id, current_user)
    return jsonify(result), 200


@bp.route('/letterstores', methods=['GET'])
@jwt_required()
@api_error_handler
def list_letterstores_route():
    current_user = get_jwt_identity()
    # logging.info(f"Listing letterstores for user: {current_user}")
    result = list_letterstores(current_user)
    # logging.info(f"Letterstores result: {result}")
    return jsonify(result), 200


@bp.route('/letters/<int:letter_id>/generate', methods=['POST'])
@jwt_required()
@api_error_handler
def generate_letter_document_route(letter_id):
    document_data = request.json
    current_user = get_jwt_identity()

    required_fields = [
        'NOME', 'MORADA', 'PORTA', 'CODIGO_POSTAL', 'LOCALIDADE', 'DATA',
        'NUMERO_PEDIDO', 'DATA_PEDIDO', 'NIF',
        'MORADA_PEDIDO', 'PORTA_PEDIDO', 'FREGUESIA_PEDIDO',
        'POSTAL_CODE_PEDIDO', 'LOCALIDADE_PEDIDO'
    ]

    for field in required_fields:
        if field not in document_data:
            return jsonify({'error': f'Campo obrigatório ausente: {field}'}), 400

    result = generate_letter_document(
        letter_id, document_data, current_user, )

    if 'error' in result:
        return jsonify(result), 400

    return send_file(
        result['file_path'],
        as_attachment=True,
        download_name=result['filename'],
        mimetype='application/pdf'
    )


@bp.route('/letters/view/<int:letterstore_id>', methods=['GET'])
@jwt_required()
@api_error_handler
def view_letter(letterstore_id):
    try:
        current_user = get_jwt_identity()
        letterstore = get_letterstore(letterstore_id, current_user)

        if not letterstore:
            return jsonify({'error': 'Ofício não encontrado'}), 404

        # Construir o caminho do arquivo
        file_path = os.path.join(
            os.path.dirname(__file__),
            '..',
            '..',
            'temp',
            letterstore['filename']
        )

        if not os.path.exists(file_path):
            return jsonify({'error': 'Arquivo não encontrado'}), 404

        # Enviar o arquivo para visualização com os headers corretos
        response = send_file(
            file_path,
            mimetype='application/pdf',
            as_attachment=False,
            download_name=letterstore['filename']
        )

        # Adicionar headers específicos para visualização inline do PDF
        response.headers["Content-Type"] = "application/pdf"
        response.headers["Content-Disposition"] = "inline; filename=%s" % letterstore['filename']
        return response

    except Exception as e:
        logging.error(f"Erro ao visualizar ofício: {str(e)}")
        return jsonify({'error': 'Erro ao visualizar ofício'}), 500


@bp.route('/letters/download/<int:letterstore_id>', methods=['GET'])
@jwt_required()
@api_error_handler
def download_letter(letterstore_id):
    try:
        current_user = get_jwt_identity()
        letterstore = get_letterstore(letterstore_id, current_user)

        if not letterstore:
            return jsonify({'error': 'Ofício não encontrado'}), 404

        file_path = os.path.join(
            os.path.dirname(__file__),
            '..',
            '..',
            'temp',
            letterstore['filename']
        )

        if not os.path.exists(file_path):
            return jsonify({'error': 'Arquivo não encontrado'}), 404

        # Para download, mantemos as_attachment como True
        return send_file(
            file_path,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=letterstore['filename']
        )

    except Exception as e:
        logging.error(f"Erro ao fazer download do ofício: {str(e)}")
        return jsonify({'error': 'Erro ao fazer download do ofício'}), 500


@bp.route('/letters/generate-free', methods=['POST'])
@jwt_required()
@api_error_handler
def generate_free_letter_document_route():
    document_data = request.json
    required_fields = [
        'NOME', 'MORADA', 'PORTA', 'CODIGO_POSTAL', 'LOCALIDADE',
        'letterBody'  # Campo adicional para o corpo do ofício livre
    ]

    for field in required_fields:
        if field not in document_data:
            return jsonify({'error': f'Campo obrigatório ausente: {field}'}), 400

    current_user = get_jwt_identity()
    result = generate_free_letter_document(document_data, current_user)

    if 'error' in result:
        return jsonify(result), 400

    return send_file(
        result['file_path'],
        as_attachment=True,
        download_name=result['filename'],
        mimetype='application/pdf'
    )
