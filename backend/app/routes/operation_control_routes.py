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
    Consultar Controlo de Tarefas
    ---
    tags:
      - Operações Instalações (Controlo)
    summary: Avalia as tarefas agendadas face ao report diário das Instalações filtrando a pesquisa.
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            tb_instalacao:
              type: integer
            last_days:
              type: integer
    responses:
      200:
        description: Listagem de operações.
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
    Atualizar Tarefa (Com Anexos)
    ---
    tags:
      - Operações Instalações (Controlo)
    summary: Edita ou finaliza a verificação de controlo da Instalação/Rota. Suporta form-data com array de ficheiros.
    security:
      - BearerAuth: []
    consumes:
      - multipart/form-data
      - application/json
    parameters:
      - in: formData
        name: pk
        type: integer
      - in: formData
        name: control_check
        type: integer
      - in: formData
        name: control_memo
        type: string
      - in: formData
        name: files
        type: file
      - in: body
        name: body
        schema:
          type: object
    responses:
      200:
        description: Registo e anexos guardados.
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
    """
    Obter Municípios Abrangidos
    ---
    tags:
      - Core (Sistema e Metadados)
    summary: Tabela de lookup para municípios com instalações do sistema associadas aplicáveis.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Lista de IDs/Nomes.
    """
    current_user = get_jwt_identity()

    result, status_code = operation_control_service.get_municipalities(current_user)
    return jsonify(result), status_code


@bp.route('/installation_types', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def get_installation_types():
    """
    Obter Tipologias de Instalação
    ---
    tags:
      - Core (Sistema e Metadados)
    summary: Exemplos incluem ETAR, EE, Reservatório, Furo, etc. Lookup Array.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Tipos.
    """
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
    Filtrar Instalações (Hierarquia Combinada)
    ---
    tags:
      - Operações Instalações (Controlo)
    summary: Cruza dados de Municípios e Tipologias para listar de forma dependente as estruturas.
    security:
      - BearerAuth: []
    parameters:
      - in: query
        name: municipio_pk
        type: integer
        required: true
      - in: query
        name: tipo_pk
        type: integer
        required: true
    responses:
      200:
        description: Conjunto de Instalações.
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


@bp.route('/annexes/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def get_annexes(pk):
    """
    Listar Anexos de Operação (tb_operacao_annex)
    ---
    tags:
      - Operações Instalações (Controlo)
    summary: Puxa o conjunto de files associado ao detalhe da Operação ID.
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Array de IDs de anexos/nomes.
    """
    current_user = get_jwt_identity()
    result, status_code = operation_control_service.get_control_annexes(pk, current_user)
    return jsonify(result), status_code


@bp.route('/annex/<int:annex_pk>/download', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
@set_session
def download_annex(annex_pk):
    """
    Download Direto de Anexo Controlado
    ---
    tags:
      - Operações Instalações (Controlo)
    summary: Obtém em stream o arquivo correspondente na Storage.
    security:
      - BearerAuth: []
    parameters:
      - name: annex_pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: File.
    """
    current_user = get_jwt_identity()

    info_result, status_code = operation_control_service.get_annex_file_info(annex_pk, current_user)
    if status_code != 200:
        return jsonify(info_result), status_code

    tb_operacao = info_result['tb_operacao']
    filename = info_result['filename']
    descr = info_result['descr']

    base_path = current_app.config.get('FILES_DIR', '/app/files')
    operation_folder = os.path.join(base_path, f'Operação_{tb_operacao}')
    file_path = os.path.join(operation_folder, filename)

    if not os.path.exists(file_path):
        logger.error(f"Ficheiro não encontrado: {file_path}")
        return jsonify({'error': 'Ficheiro não encontrado'}), 404

    if not os.path.abspath(file_path).startswith(os.path.abspath(base_path)):
        return jsonify({'error': 'Acesso negado'}), 403

    return send_file(file_path, as_attachment=False, download_name=descr)


@bp.route('/download/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)
def download_attachment(pk):
    """
    Ponto de Partilha/Acesso Seguro ao Storage
    ---
    tags:
      - Operações Instalações (Controlo)
    summary: Valida acesso HTTP com base na Path original associada à operação submetida.
    security:
      - BearerAuth: []
    parameters:
      - name: pk
        in: path
        type: integer
        required: true
      - in: query
        name: filename
        type: string
        required: true
    responses:
      200:
        description: Emissão do anexo descarregado.
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
