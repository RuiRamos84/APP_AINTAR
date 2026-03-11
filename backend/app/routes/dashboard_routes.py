from flask import Blueprint, jsonify, current_app, request, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.sql import text
from sqlalchemy.exc import SQLAlchemyError
from ..utils.utils import db_session_manager
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from ..services import dashboard_service
from .. import db, cache

logger = get_logger(__name__)


bp = Blueprint('dashboard_routes', __name__)


@bp.route('/dashboard/test', methods=['GET'])
@jwt_required()
@require_permission(400)  # dashboard.view
@api_error_handler
def test_dashboard():
    """
    Testar Disponibilidade do Dashboard
    ---
    tags:
      - Dashboard
    summary: Rota de teste para verificar a acessibilidade das principais views do Data Warehouse reportadas no Dashboard.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Resultados do teste por view (Existe Sim/Não) e View count total.
    """
    current_user = get_jwt_identity()

    test_views = [
        'vds_pedido_01$001',
        'vds_pedido_01$002',
        'vds_ramal_01$001',
        'vds_fossa_01$001',
        'vds_instalacao_01$001',
    ]

    results = {}

    with db_session_manager(current_user) as session:
        for view_name in test_views:
            try:
                query = text(f"SELECT COUNT(*) as count FROM aintar_server.{view_name}")
                result = session.execute(query)
                count = result.scalar()
                results[view_name] = {
                    'exists': True,
                    'count': count
                }
            except Exception as e:
                results[view_name] = {
                    'exists': False,
                    'error': str(e)
                }

        # Listar todas as views disponíveis
        try:
            query = text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'aintar_server'
                AND table_name LIKE 'vds_%'
                ORDER BY table_name
            """)
            result = session.execute(query)
            available_views = [row[0] for row in result]
        except Exception as e:
            available_views = []
            logger.error(f"Erro ao listar views: {str(e)}")

    return jsonify({
        'test_results': results,
        'available_views': available_views,
        'total_available': len(available_views)
    }), 200


@bp.route('/dashboard/structure', methods=['GET'])
@jwt_required()
@require_permission(400)  # dashboard.view
@api_error_handler
def get_structure():
    """
    Estrutura do Dashboard
    ---
    tags:
      - Dashboard
    summary: Obtém a árvore completa de configuração do dashboard (Grupos, Categorias, Metricas e Views associadas disponíveis).
    security:
      - BearerAuth: []
    responses:
      200:
        description: Estrutura em JSON hierárquico.
    """
    structure = dashboard_service.get_dashboard_structure()
    return jsonify(structure), 200


@bp.route('/dashboard/all', methods=['GET'])
@jwt_required()
@require_permission(400)  # dashboard.view
@api_error_handler
@cache.cached(timeout=300, key_prefix=lambda: f"dashboard_all_{request.args.get('year', '')}_{request.args.get('month', '')}")
def get_all_data():
    """
    Obter Todos os Dados do Dashboard
    ---
    tags:
      - Dashboard
    summary: Compila massivamente TODAS as estatísticas e views pre-computadas disponíveis no momento para exibição geral.
    security:
      - BearerAuth: []
    parameters:
      - in: query
        name: year
        type: string
        description: Ano fiscal
      - in: query
        name: month
        type: string
        description: Mês fiscal
    responses:
      200:
        description: Matriz com o total de dados renderizados para frontend dashboard components.
    """
    current_user = get_jwt_identity()

    # Obter filtros da query string
    filters = {}
    if request.args.get('year'):
        filters['year'] = request.args.get('year')
    if request.args.get('month'):
        filters['month'] = request.args.get('month')

    data = dashboard_service.get_dashboard_data(current_user, filters if filters else None)
    if isinstance(data, tuple) or isinstance(data, Response):
        return data
    return jsonify(data), 200


@bp.route('/dashboard/category/<category>', methods=['GET'])
@jwt_required()
@require_permission(400)  # dashboard.view
@api_error_handler
def get_category_data(category):
    """
    Obter Dados por Categoria de Dashboard
    ---
    tags:
      - Dashboard
    summary: Solicita a extração e cálculo de widgets apenas para uma categoria em específico (pedidos, ramais, fossas, instalacoes).
    security:
      - BearerAuth: []
    parameters:
      - name: category
        in: path
        type: string
        required: true
        description: Slug da categoria
      - in: query
        name: year
        type: string
      - in: query
        name: month
        type: string
    responses:
      200:
        description: Dados seccionados devolvidos.
      400:
        description: Categoria inválida.
    """
    current_user = get_jwt_identity()

    # Obter filtros da query string
    filters = {}
    if request.args.get('year'):
        filters['year'] = request.args.get('year')
    if request.args.get('month'):
        filters['month'] = request.args.get('month')

    data = dashboard_service.get_dashboard_category_data(
        current_user,
        category,
        filters if filters else None
    )
    if isinstance(data, tuple) or isinstance(data, Response):
        return data
    return jsonify(data), 200


@bp.route('/dashboard/cache/clear', methods=['POST'])
@jwt_required()
@require_permission(400)
@api_error_handler
def clear_dashboard_cache():
    """Limpa o cache do dashboard, forçando nova leitura da base de dados."""
    cache.clear()
    return jsonify({'message': 'Cache do dashboard limpo com sucesso'}), 200


@bp.route('/dashboard/landing', methods=['GET'])
@jwt_required()
@require_permission(400)  # dashboard.view
@api_error_handler
@cache.cached(timeout=300, key_prefix="dashboard_landing")
def get_landing():
    """
    Dados da Landing Page do Dashboard
    ---
    tags:
      - Dashboard
    summary: Obtém dados agregados das 8 views da landing page (pedidos, ramais, fossas) num único pedido.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Dicionário indexado por view com data e columns.
    """
    current_user = get_jwt_identity()
    data = dashboard_service.get_landing_data(current_user)
    if isinstance(data, tuple) or isinstance(data, Response):
        return data
    return jsonify(data), 200


@bp.route('/dashboard/view/<view_name>', methods=['GET'])
@jwt_required()
@require_permission(400)  # dashboard.view
@api_error_handler
def get_view_data(view_name):
    """
    Consultar Gráfico Específico (Por View)
    ---
    tags:
      - Dashboard
    summary: Otimiza chamadas focando apenas na View desejada (Ex. vds_pedido_01$001) aplicando filtros sazonais.
    security:
      - BearerAuth: []
    parameters:
      - name: view_name
        in: path
        type: string
        required: true
      - in: query
        name: year
        type: string
      - in: query
        name: month
        type: string
    responses:
      200:
        description: Resultados da Base de Dados da Query View.
      400:
        description: View Name não catalogado no dicionário.
    """
    current_user = get_jwt_identity()

    # Obter filtros da query string
    filters = {}
    if request.args.get('year'):
        filters['year'] = request.args.get('year')
    if request.args.get('month'):
        filters['month'] = request.args.get('month')

    data = dashboard_service.get_dashboard_view_data(
        current_user,
        view_name,
        filters if filters else None
    )
    # Service decorated with @api_error_handler returns (Response, status) on error
    if isinstance(data, tuple) or isinstance(data, Response):
        return data
    return jsonify(data), 200
