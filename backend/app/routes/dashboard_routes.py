from flask import Blueprint, jsonify, current_app, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.sql import text
from sqlalchemy.exc import SQLAlchemyError
from ..utils.utils import db_session_manager
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from ..services import dashboard_service
from .. import db

logger = get_logger(__name__)


bp = Blueprint('dashboard_routes', __name__)


@bp.route('/dashboard/test', methods=['GET'])
@jwt_required()
@require_permission(400)  # dashboard.view
@api_error_handler
def test_dashboard():
    """Rota de teste para verificar disponibilidade das views"""
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
    """Obtém a estrutura completa do dashboard (categorias e views disponíveis)"""
    structure = dashboard_service.get_dashboard_structure()
    return jsonify(structure), 200


@bp.route('/dashboard/all', methods=['GET'])
@jwt_required()
@require_permission(400)  # dashboard.view
@api_error_handler
def get_all_data():
    """
    Obtém dados de todas as views do dashboard
    Query params opcionais: year, month
    """
    current_user = get_jwt_identity()

    # Obter filtros da query string
    filters = {}
    if request.args.get('year'):
        filters['year'] = request.args.get('year')
    if request.args.get('month'):
        filters['month'] = request.args.get('month')

    data = dashboard_service.get_dashboard_data(current_user, filters if filters else None)
    return jsonify(data), 200


@bp.route('/dashboard/category/<category>', methods=['GET'])
@jwt_required()
@require_permission(400)  # dashboard.view
@api_error_handler
def get_category_data(category):
    """
    Obtém dados de todas as views de uma categoria específica
    Categories: pedidos, ramais, fossas, instalacoes
    Query params opcionais: year, month
    """
    current_user = get_jwt_identity()

    # Obter filtros da query string
    filters = {}
    if request.args.get('year'):
        filters['year'] = request.args.get('year')
    if request.args.get('month'):
        filters['month'] = request.args.get('month')

    try:
        data = dashboard_service.get_dashboard_category_data(
            current_user,
            category,
            filters if filters else None
        )
        return jsonify(data), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route('/dashboard/view/<view_name>', methods=['GET'])
@jwt_required()
@require_permission(400)  # dashboard.view
@api_error_handler
def get_view_data(view_name):
    """
    Obtém dados de uma view específica do dashboard
    Query params opcionais: year, month

    Exemplos de view_name:
    - vds_pedido_01$001
    - vds_ramal_01$002
    - vds_fossa_01$003
    - vds_instalacao_01$001
    """
    current_user = get_jwt_identity()

    # Obter filtros da query string
    filters = {}
    if request.args.get('year'):
        filters['year'] = request.args.get('year')
    if request.args.get('month'):
        filters['month'] = request.args.get('month')

    try:
        data = dashboard_service.get_dashboard_view_data(
            current_user,
            view_name,
            filters if filters else None
        )
        return jsonify(data), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
