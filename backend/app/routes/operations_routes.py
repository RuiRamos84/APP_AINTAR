from flask import Blueprint, jsonify, current_app, request
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from ..utils.utils import db_session_manager
from ..services.operations_service import (
    get_operations_data,
    create_internal_document,
    # Funções para as novas views
    get_operacao_meta_data,
    get_operacao_data,
    get_operacao_self_data,
    create_operacao_meta,
    update_operacao_meta,
    delete_operacao_meta,
    get_operacao_meta_by_id,
    complete_task_operation,
    get_analysis_parameters,
    # Funções para criar/atualizar operações (execuções reais)
    create_operacao,
    update_operacao
)
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from ..utils.utils import token_required, db_session_manager, set_session
from app.utils.error_handler import api_error_handler
from app.utils.permissions_decorator import require_permission
from sqlalchemy.exc import SQLAlchemyError
from app.utils.logger import get_logger

logger = get_logger(__name__)

bp = Blueprint('operations', __name__)

# Lista de views permitidas para a rota de referência (segurança)
ALLOWED_OPERATION_REFS = [
    'vbl_operacaodia',
    'vbl_operacaomodo',
    'vbl_operacaoaccao',
    # Adicione outras views de referência permitidas aqui
]


@bp.route('/operations', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def get_operations():
    """Obter dados de operações (antiga funcionalidade de dashboard)"""
    current_user = get_jwt_identity()
    try:
        with db_session_manager(current_user):
            data = get_operations_data(current_user)
            # Filtre apenas as views que têm dados
            data = {k: v for k, v in data.items() if v.get('data')}
            return jsonify(data), 200
    except SQLAlchemyError as e:
        logger.error(
            f"Erro de banco de dados ao buscar dados de operações: {str(e)}", exc_info=True)
        return jsonify({"error": "Erro de banco de dados", "message": "Não foi possível recuperar dados de operações devido a um erro de banco de dados"}), 500
    except Exception as e:
        if "SESSÃO INVÁLIDA" in str(e):
            logger.error(
                f"Sessão inválida: {str(e)}", exc_info=True)
            return jsonify({"error": "Sessão inválida", "message": "Sua sessão expirou. Por favor, faça login novamente."}), 419
        else:
            logger.error(
                f"Erro ao buscar dados de operações: {str(e)}", exc_info=True)
            return jsonify({"error": "Erro interno do servidor", "message": "Ocorreu um erro inesperado ao buscar dados de operações"}), 500


@bp.route('/internal_document', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def add_internal_document():
    """Criar um documento interno utilizando fbo_document_createintern"""
    current_user = get_jwt_identity()
    data = request.get_json()
    
    # O serviço `create_internal_document` já usa Pydantic para validação,
    # então podemos passar o dicionário `data` diretamente.
    # A validação de campos obrigatórios como 'pntype' e 'pnmemo' será tratada lá.
    result, status_code = create_internal_document(data, current_user)
    
    return jsonify(result), status_code


@bp.after_request
def cleanup_session(response):
    """Limpar sessão após requisição"""
    return response


# ==================== NOVAS ROTAS PARA OPERAÇÕES ====================
# Nota: operacao_dia, operacao_accao e operacao_modo são carregados via metaData

@bp.route('/operacao_meta', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def get_operacao_meta():
    """Obter dados das metas de operação com paginação"""
    current_user = get_jwt_identity()
    try:
        filters = {
            'limit': request.args.get('limit', type=int),
            'offset': request.args.get('offset', 0, type=int),
            'search': request.args.get('search'),
        }
        # Remover filtros vazios
        filters = {k: v for k, v in filters.items() if v is not None}

        with db_session_manager(current_user):
            data = get_operacao_meta_data(current_user, filters)
            return jsonify(data), 200
    except SQLAlchemyError as e:
        logger.error(f"Erro de banco de dados ao buscar metas de operação: {str(e)}", exc_info=True)
        return jsonify({"error": "Erro de banco de dados", "message": "Não foi possível recuperar metas de operação"}), 500
    except Exception as e:
        logger.error(f"Erro ao buscar metas de operação: {str(e)}", exc_info=True)
        return jsonify({"error": "Erro interno do servidor", "message": "Ocorreu um erro inesperado"}), 500


@bp.route('/operacao_meta', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def create_operacao_meta_route():
    """Criar nova meta de operação"""
    current_user = get_jwt_identity()
    data = request.get_json()

    result, status_code = create_operacao_meta(data, current_user)
    return jsonify(result), status_code


@bp.route('/operacao_meta/<int:meta_id>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def get_operacao_meta_by_id_route(meta_id):
    """Obter meta de operação específica"""
    current_user = get_jwt_identity()

    result, status_code = get_operacao_meta_by_id(meta_id, current_user)
    return jsonify(result), status_code


@bp.route('/operacao_meta/<int:meta_id>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def update_operacao_meta_route(meta_id):
    """Atualizar meta de operação"""
    current_user = get_jwt_identity()
    data = request.get_json()

    result, status_code = update_operacao_meta(meta_id, data, current_user)
    return jsonify(result), status_code


@bp.route('/operacao_meta/<int:meta_id>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def delete_operacao_meta_route(meta_id):
    """Eliminar meta de operação"""
    current_user = get_jwt_identity()

    result, status_code = delete_operacao_meta(meta_id, current_user)
    return jsonify(result), status_code


@bp.route('/operacao', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def get_operacao():
    """Obter dados de todas as operações"""
    current_user = get_jwt_identity()
    try:
        with db_session_manager(current_user):
            data = get_operacao_data(current_user)
            return jsonify(data), 200
    except SQLAlchemyError as e:
        logger.error(f"Erro de banco de dados ao buscar operações: {str(e)}", exc_info=True)
        return jsonify({"error": "Erro de banco de dados", "message": "Não foi possível recuperar operações"}), 500
    except Exception as e:
        logger.error(f"Erro ao buscar operações: {str(e)}", exc_info=True)
        return jsonify({"error": "Erro interno do servidor", "message": "Ocorreu um erro inesperado"}), 500


@bp.route('/operacao_self', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def get_operacao_self():
    """Obter tarefas do utilizador autenticado para o dia atual"""
    current_user = get_jwt_identity()  # Session ID (para db_session_manager)
    user_id = get_jwt()["user_id"]     # PK do utilizador (para filtrar tarefas)

    try:
        with db_session_manager(current_user):
            data = get_operacao_self_data(user_id, current_user)
            return jsonify(data), 200
    except SQLAlchemyError as e:
        logger.error(f"Erro de banco de dados ao buscar tarefas do utilizador {user_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Erro de banco de dados", "message": "Não foi possível recuperar tarefas do utilizador"}), 500
    except Exception as e:
        logger.error(f"Erro ao buscar tarefas do utilizador {user_id}: {str(e)}", exc_info=True)
        return jsonify({"error": "Erro interno do servidor", "message": "Ocorreu um erro inesperado"}), 500


@bp.route('/operacao_complete/<int:task_id>', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def complete_task(task_id):
    """
    Marcar uma tarefa como concluída

    Suporta:
    - Form data: valuetext, valuememo
    - File: photo (imagem)
    """
    current_user = get_jwt_identity()  # Session ID (para db_session_manager)
    user_id = get_jwt()["user_id"]     # PK do utilizador (para verificação de permissões)

    with db_session_manager(current_user):
        try:
            # Obter dados do form (não JSON quando há ficheiros)
            completion_data = {}

            # Dados de texto do form
            if request.form.get('valuetext'):
                completion_data['valuetext'] = request.form.get('valuetext')
            if request.form.get('valuememo'):
                completion_data['valuememo'] = request.form.get('valuememo')

            # Foto (ficheiro)
            if 'photo' in request.files:
                photo_file = request.files['photo']
                if photo_file and photo_file.filename:
                    completion_data['photo'] = photo_file

            # Se não há ficheiros, tentar obter dados como JSON
            if not request.files and request.is_json:
                completion_data = request.get_json() or {}

            logger.info(f"Completando tarefa {task_id} com dados: {list(completion_data.keys())}")

            result = complete_task_operation(task_id, user_id, current_user, completion_data)

            if result['success']:
                return jsonify(result), 200
            else:
                return jsonify({"error": result['error']}), 400

        except SQLAlchemyError as e:
            logger.error(f"Erro de banco de dados ao completar tarefa {task_id}: {str(e)}", exc_info=True)
            return jsonify({"error": "Erro de banco de dados", "message": "Não foi possível completar a tarefa"}), 500
        except Exception as e:
            logger.error(f"Erro ao completar tarefa {task_id}: {str(e)}", exc_info=True)
            return jsonify({"error": "Erro interno do servidor", "message": "Ocorreu um erro inesperado"}), 500


@bp.route('/operacao_analysis/<int:operation_id>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@api_error_handler
@set_session
def get_operation_analysis(operation_id):
    """Obter parâmetros de análise para uma operação (type 5)"""
    current_user = get_jwt_identity()

    # get_analysis_parameters já usa db_session_manager internamente
    result = get_analysis_parameters(operation_id, current_user)

    if result.get('success'):
        return jsonify(result['data']), 200
    else:
        return jsonify({"error": result.get('error', 'Erro ao buscar parâmetros')}), 400


@bp.route('/operacao_reference/<string:ref_obj>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@api_error_handler
@set_session
def get_operation_reference_options(ref_obj):
    """
    Obter opções de referência para operações do tipo 3 (referência)

    Args:
        ref_obj: Nome da view/tabela de referência (ex: vbl_operacaodia)

    Returns:
        Lista de opções com pk e value
    """
    current_user = get_jwt_identity()

    if ref_obj not in ALLOWED_OPERATION_REFS:
        return jsonify({"error": f"Referência '{ref_obj}' não permitida"}), 403

    try:
        with db_session_manager(current_user) as session:
            # Buscar pk e value da view de referência
            query = text(f"""
                SELECT pk, value
                FROM {ref_obj}
                ORDER BY value
            """)

            result = session.execute(query)
            rows = result.fetchall()
            data = [{"pk": row[0], "value": row[1]} for row in rows]

            logger.info(f"Opções de referência encontradas para {ref_obj}: {len(data)} opções")

            return jsonify({
                'success': True,
                'data': data,
                'total': len(data)
            }), 200

    except SQLAlchemyError as e:
        logger.error(f"Erro ao buscar opções de referência para {ref_obj}: {str(e)}")
        return jsonify({"error": "Erro ao buscar opções de referência"}), 500


# ===================================================================
# ROTAS PARA CRIAR/ATUALIZAR OPERAÇÕES (EXECUÇÕES REAIS)
# ===================================================================

@bp.route('/operacao', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def create_operacao_route():
    """
    Criar nova operação (execução real) via vbf_operacao

    Body:
    {
        "data": "2025-10-09",
        "descr": "Descrição opcional",
        "tt_operacaomodo": 1,
        "tb_instalacao": 123,
        "ts_operador1": 456,
        "ts_operador2": 789,  // opcional
        "tt_operacaoaccao": 101
    }
    """
    current_user = get_jwt_identity()
    data = request.get_json()

    result, status_code = create_operacao(data, current_user)
    return jsonify(result), status_code


@bp.route('/operacao/<int:operacao_id>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def update_operacao_route(operacao_id):
    """
    Atualizar operação (execução real) via vbf_operacao

    APENAS permite atualizar valuetext e valuememo

    Body:
    {
        "valuetext": "Resultado da operação",
        "valuememo": "Observações adicionais"  // opcional
    }
    """
    current_user = get_jwt_identity()
    data = request.get_json()

    result, status_code = update_operacao(operacao_id, data, current_user)
    return jsonify(result), status_code


@bp.route('/operacao_photo/<path:photo_path>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@api_error_handler
def download_operation_photo_route(photo_path):
    """
    Download/visualização de foto de operação

    photo_path: TarefasOperação/<instalação>/<ano>/<mes>/<filename>
    Exemplo: TarefasOperação/Albergaria (ETAR)/2025/10/operacao_138869_20251014_093634.jpg
    """
    from ..services.operations.attachments import download_operation_photo

    try:
        # Extrair componentes do path
        parts = photo_path.split('/')

        if len(parts) < 5 or parts[0] != 'TarefasOperação':
            return jsonify({'error': 'Caminho inválido'}), 400

        instalacao_nome = parts[1]
        ano = parts[2]
        mes = parts[3]
        filename = '/'.join(parts[4:])  # Juntar resto (caso tenha / no nome)

        return download_operation_photo(instalacao_nome, ano, mes, filename)

    except Exception as e:
        logger.error(f"Erro ao fazer download da foto: {str(e)}")
        return jsonify({"error": "Erro ao fazer download da foto"}), 500
