from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.permissions_decorator import require_permission
from ..utils.utils import set_session, token_required
from ..services import operation_control_service
import os
from app.utils.logger import get_logger

logger = get_logger(__name__)



bp = Blueprint('operation_control', __name__, url_prefix='/api/v1/operation_control')


@bp.route('/query', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)  # Mesma permissão de operações
@set_session
def query_control():
    """
    Consultar tarefas de operação para controlo

    Body:
    {
        "tb_instalacao": 123,
        "last_days": 10
    }
    """
    current_user = get_jwt_identity()
    data = request.get_json()

    result, status_code = operation_control_service.query_operation_control(data, current_user)
    return jsonify(result), status_code


@bp.route('/update', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def update_control():
    """
    Atualizar controlo de uma tarefa (suporta multipart/form-data para arquivos)

    FormData:
        pk: int
        control_check: int
        control_tt_operacaocontrolo: int (opcional)
        control_memo: str (opcional)
        control_foto: str (opcional)
        files: File[] (até 5 arquivos)
    """
    current_user = get_jwt_identity()

    # Aceitar tanto JSON quanto FormData
    if request.content_type and 'multipart/form-data' in request.content_type:
        data = request.form.to_dict()
    else:
        data = request.get_json()

    result, status_code = operation_control_service.update_operation_control(data, current_user)
    return jsonify(result), status_code


@bp.route('/municipalities', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def get_municipalities():
    """Obter lista de municípios/associados"""
    current_user = get_jwt_identity()

    result, status_code = operation_control_service.get_municipalities(current_user)
    return jsonify(result), status_code


@bp.route('/installation_types', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def get_installation_types():
    """Obter tipos de instalação"""
    current_user = get_jwt_identity()

    result, status_code = operation_control_service.get_installation_types(current_user)
    return jsonify(result), status_code


@bp.route('/installations', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def get_installations():
    """
    Obter instalações filtradas

    Query params:
    - municipio_pk: int
    - tipo_pk: int
    """
    current_user = get_jwt_identity()

    municipio_pk = request.args.get('municipio_pk', type=int)
    tipo_pk = request.args.get('tipo_pk', type=int)

    if not municipio_pk or not tipo_pk:
        return jsonify({'error': 'municipio_pk e tipo_pk são obrigatórios'}), 400

    result, status_code = operation_control_service.get_installations(
        municipio_pk, tipo_pk, current_user
    )
    return jsonify(result), status_code


@bp.route('/download/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
def download_attachment(pk):
    """
    Download de anexo de operação

    URL: /operation_control/download/{pk}?filename={filename}
    """
    try:
        logger.info(f"Download solicitado para pk={pk}")
        filename = request.args.get('filename')
        logger.info(f"Filename: {filename}")

        if not filename:
            return jsonify({'error': 'Parâmetro filename obrigatório'}), 400

        base_path = current_app.config.get('FILES_DIR', '/app/files')
        operation_folder = os.path.join(base_path, f'Operação_{pk}')
        file_path = os.path.join(operation_folder, filename)

        logger.info(f"Tentando acessar arquivo: {file_path}")

        # Verificar se o arquivo existe
        if not os.path.exists(file_path):
            logger.error(f"Arquivo não encontrado: {file_path}")
            return jsonify({'error': 'Arquivo não encontrado'}), 404

        # Verificar se o path está dentro da pasta permitida (segurança)
        if not os.path.abspath(file_path).startswith(os.path.abspath(operation_folder)):
            logger.error(f"Tentativa de acesso não autorizado: {file_path}")
            return jsonify({'error': 'Acesso negado'}), 403

        logger.info(f"Servindo arquivo: {file_path}")
        return send_file(file_path, as_attachment=True, download_name=filename)

    except Exception as e:
        logger.error(f"Erro ao baixar anexo: {str(e)}")
        return jsonify({'error': 'Erro ao baixar arquivo'}), 500
