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
    update_operacao,
    # Criação direta via função PostgreSQL
    create_operacao_direct,
    # Inicialização de tarefas mensais
    init_operacao_month,
    init_operacao_remaining,
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
    """
    Dashboard de Operações
    ---
    tags:
      - Operações
    summary: Retorna os dados agregados para o dashboard base de Operações.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Coleção de dados estatísticos diários (Views com dados).
      419:
        description: A sessão atual expirou.
    """
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
    """
    Criar Documento Interno (Operações)
    ---
    tags:
      - Operações
    summary: Injeta/Cria um documento interno a partir da página de Operações usando fbo_document_createintern.
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
    responses:
      201:
        description: Documento interno operado com sucesso.
    """
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
    """
    Metadados das Operações (Lista)
    ---
    tags:
      - Operações
    summary: Lista as Metas e rotinas globais de operações, suporta paginação e pesquisa.
    security:
      - BearerAuth: []
    parameters:
      - in: query
        name: limit
        type: integer
      - in: query
        name: offset
        type: integer
      - in: query
        name: search
        type: string
    responses:
      200:
        description: Dados da grelha de Metadados carregados com paginação.
    """
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
    """
    Criar Metadados de Operação
    ---
    tags:
      - Operações
    summary: Salva as regras e referências das Rotinas (Metas).
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: params
        required: true
        schema:
          type: object
    responses:
      201:
        description: Metadado guardado (Sucesso).
    """
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
    """
    Obter Detalhe de Metadado de Operação
    ---
    tags:
      - Operações
    summary: Puxa parâmetros exclusivos associados a uma Meta Específica.
    security:
      - BearerAuth: []
    parameters:
      - name: meta_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Entidade localizada.
    """
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
    """
    Atualizar Metadado de Operação
    ---
    tags:
      - Operações
    summary: Modifica os campos e periodicidade de uma Rotina Operacional.
    security:
      - BearerAuth: []
    parameters:
      - name: meta_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200:
        description: Metadado alterado.
    """
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
    """
    Remover / Desativar Metadado de Operação
    ---
    tags:
      - Operações
    summary: Apaga a hierarquia de metadados referentes a esta Meta Operacional.
    security:
      - BearerAuth: []
    parameters:
      - name: meta_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Meta apagada (Ou Hard-delete ou Soft-remove).
    """
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
    """
    Listar Todo O Histórico Operacional
    ---
    tags:
      - Operações
    summary: View principal das atuações / inspeções no tereno registadas.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Coleção Histórica.
    """
    current_user = get_jwt_identity()
    try:
        filters = {}
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        instalacao_pk = request.args.get('instalacao_pk', type=int)
        if from_date:
            filters['from_date'] = from_date
        if to_date:
            filters['to_date'] = to_date
        if instalacao_pk:
            filters['instalacao_pk'] = instalacao_pk

        with db_session_manager(current_user):
            data = get_operacao_data(current_user, filters or None)
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
    """
    As Minhas Tarefas de Operação Diária
    ---
    tags:
      - Operações
    summary: Baseado na hierarquia de Rotinas (Metadados), lista que tarefas recaem hoje sobre quem executou o pedido (O Próprio).
    security:
      - BearerAuth: []
    responses:
      200:
        description: Todo-List para as ETAR/E.E./Reservatórios.
    """
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
    Submeter Formulário de Conclusão da Operação (Mobile)
    ---
    tags:
      - Operações
    summary: Marca uma tarefa cíclica como preenchida. Aceita campos Text, Memo e Upload the Fotografia no Payload (formData Multi-part).
    security:
      - BearerAuth: []
    consumes:
      - multipart/form-data
      - application/json
    parameters:
      - name: task_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Tarefa registada e foto guardada (se aplicável).
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
    Registar Execução Ad-hoc (Fornecedor/Operação)
    ---
    tags:
      - Operações
    summary: Ponto de entrada RAW para injetar operações ad-hoc fora da grelha diária de tarefas cíclicas (Ex. Reparações imprevistas).
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
    responses:
      200:
        description: Comando efetuado com sucesso (criado).
    """
    current_user = get_jwt_identity()
    data = request.get_json()

    result, status_code = create_operacao(data, current_user)
    return jsonify(result), status_code


@bp.route('/operacao_direct', methods=['POST'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def create_operacao_direct_route():
    """
    Registar Operação Direta (ETAR / EE / REDE / CAIXA)
    ---
    tags:
      - Operações
    summary: Cria operação ad-hoc para instalações chamando diretamente a função fbo_operacao$createdirect.
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
          required: [data, pk_instalacao, pk_operador, tt_operacaoaccao]
          properties:
            data:
              type: string
              format: date
              description: Data da operação (YYYY-MM-DD)
            pk_instalacao:
              type: integer
              description: PK da instalação (ETAR/EE dinâmico; CAIXA=3, REDE=4)
            pk_operador:
              type: integer
              description: PK do operador
            tt_operacaoaccao:
              type: integer
              description: Código da ação (ex 100 Limpeza, 101 Desobstrução)
            memo:
              type: string
              description: Observações (opcional)
    responses:
      201:
        description: Operação criada com sucesso, retorna pk gerado.
      400:
        description: Dados inválidos.
    """
    current_user = get_jwt_identity()
    data = request.get_json()

    result, status_code = create_operacao_direct(data, current_user)
    return jsonify(result), status_code



@bp.route('/operacao/<int:operacao_id>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(310)  # operation.access
@set_session
@api_error_handler
def update_operacao_route(operacao_id):
    """
    Correção Manual de Operação
    ---
    tags:
      - Operações
    summary: Atualiza relatórios prévios registados erradamente num log do Terreno (Exclusivo para ValueText/ValueMemo).
    security:
      - BearerAuth: []
    parameters:
      - name: operacao_id
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200:
        description: Valuetext transcrito com sucesso.
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


# ---------------------------------------------------------------------------
# Inicialização de tarefas mensais (fbf_operacao$init)
# ---------------------------------------------------------------------------

@bp.route('/operacao_init', methods=['POST'])
@jwt_required()
@token_required
@require_permission(312)  # operation.supervise
@api_error_handler
def operacao_init_route():
    """
    Gerar tarefas operacionais para um mês futuro.

    Chama fbf_operacao$init(modo, mês, ano) que materializa os templates
    (tb_operacaometa) em registos reais (tb_operacao).

    Body JSON:
      - tt_operacaomodo (int): modo de operação
      - month (int): mês 1-12
      - year  (int): ano >= 2024

    Apenas meses FUTUROS são permitidos.
    """
    data = request.get_json()
    result, status = init_operacao_month(data, get_jwt_identity())
    return jsonify(result), status


@bp.route('/operacao_init_remaining', methods=['POST'])
@jwt_required()
@token_required
@require_permission(312)  # operation.supervise
@api_error_handler
def operacao_init_remaining_route():
    """
    Gerar tarefas para os dias RESTANTES do mês corrente.

    Chama fbf_operacao$init_remaining(modo) — aditivo, não apaga existentes.
    Ver: backend/sql/fbf_operacao_init_remaining.sql

    Body JSON:
      - tt_operacaomodo (int): modo de operação
    """
    data = request.get_json()
    result, status = init_operacao_remaining(data, get_jwt_identity())
    return jsonify(result), status
