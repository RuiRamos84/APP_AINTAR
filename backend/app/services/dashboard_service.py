from .. import db
from sqlalchemy.sql import text
from sqlalchemy.exc import ProgrammingError, OperationalError
from flask import current_app
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger

logger = get_logger(__name__)


# Estrutura organizada de views do dashboard
DASHBOARD_VIEWS = {
    'pedidos': {
        'vds_pedido_01$001': 'Por tipo',
        'vds_pedido_01$002': 'Por tipo e por ano',
        'vds_pedido_01$003': 'Por tipo, total e concluídos',
        'vds_pedido_01$004': 'Por tipo, total e concluídos, ano corrente',
        'vds_pedido_01$005': 'Por ano de início, total e concluídos',
        'vds_pedido_01$006': 'Por concelho, total e concluídos',
        'vds_pedido_01$007': 'Por concelho, total e concluídos, para o ano corrente',
        'vds_pedido_01$008': 'Por concelho e tipo',
        'vds_pedido_01$009': 'Por concelho e tipo, total e concluídos, ano corrente',
        'vds_pedido_01$010': 'Por estado corrente',
        'vds_pedido_01$011': 'Por estado corrente, ano corrente',
        'vds_pedido_01$012': 'Por utilizador',
        'vds_pedido_01$013': 'Por utilizador, abertos',
        'vds_pedido_01$014': 'Número de tramitações por utilizador',
        'vds_pedido_01$015': 'Número de tramitações por utilizador, ano corrente',
        'vds_pedido_01$016': 'Duração média por passo, só para passos fechados, por ano',
        'vds_pedido_01$017': 'Duração média por técnico, só para passos fechados',
    },
    'ramais': {
        'vds_ramal_01$001': 'Por estado',
        'vds_ramal_01$002': 'Metros construídos por ano',
        'vds_ramal_01$003': 'Metros construídos por ano e mês, para o ano corrente',
        'vds_ramal_01$004': 'Pedidos por município',
    },
    'fossas': {
        'vds_fossa_01$001': 'Por estado',
        'vds_fossa_01$002': 'Por município, por ano',
        'vds_fossa_01$003': 'Por ano e mês, para o ano corrente',
    },
    'instalacoes': {
        'vds_instalacao_01$001': 'Por tipo de instalação, total, abertos e controlados',
        'vds_instalacao_01$002': 'Por tipo de instalação, total, abertos e controlados, para o ano corrente',
        'vds_instalacao_01$003': 'Por tipo de operação, total, abertos e controlados',
        'vds_instalacao_01$004': 'Por tipo de operação, total, abertos e controlados, para o ano corrente',
        'vds_instalacao_01$005': 'Por operador',
        'vds_instalacao_01$006': 'Por operador, para o ano corrente',
        'vds_instalacao_01$007': 'Duração por tipo de instalação',
        'vds_instalacao_01$008': 'Duração por tipo de instalação, para o ano corrente',
        'vds_instalacao_01$009': 'Duração por operação',
        'vds_instalacao_01$010': 'Duração por operação, para o ano corrente',
        'vds_instalacao_01$011': 'Duração por operador',
        'vds_instalacao_01$012': 'Duração por operador, para o ano corrente',
    }
}


def get_all_valid_views():
    """Retorna lista de todas as views válidas"""
    all_views = []
    for category, views in DASHBOARD_VIEWS.items():
        all_views.extend(views.keys())
    return all_views


def get_dashboard_structure():
    """Retorna a estrutura completa do dashboard organizada por categorias"""
    return {
        'categories': [
            {
                'id': 'pedidos',
                'name': 'Pedidos',
                'views': [
                    {'id': view_id, 'name': view_name}
                    for view_id, view_name in DASHBOARD_VIEWS['pedidos'].items()
                ]
            },
            {
                'id': 'ramais',
                'name': 'Ramais',
                'views': [
                    {'id': view_id, 'name': view_name}
                    for view_id, view_name in DASHBOARD_VIEWS['ramais'].items()
                ]
            },
            {
                'id': 'fossas',
                'name': 'Fossas',
                'views': [
                    {'id': view_id, 'name': view_name}
                    for view_id, view_name in DASHBOARD_VIEWS['fossas'].items()
                ]
            },
            {
                'id': 'instalacoes',
                'name': 'Instalações',
                'views': [
                    {'id': view_id, 'name': view_name}
                    for view_id, view_name in DASHBOARD_VIEWS['instalacoes'].items()
                ]
            }
        ]
    }


@api_error_handler
def get_dashboard_view_data(current_user, view_name, filters=None):
    """
    Obtém dados de uma view específica do dashboard

    Args:
        current_user: Utilizador autenticado
        view_name: Nome da view (ex: 'vds_pedido_01$001')
        filters: Dicionário opcional com filtros (ex: {'year': 2024})

    Returns:
        Dicionário com dados da view
    """
    # Validar se a view existe
    if view_name not in get_all_valid_views():
        raise ValueError(f"View inválida: {view_name}")

    # Obter nome amigável da view
    friendly_name = None
    category = None
    for cat, views in DASHBOARD_VIEWS.items():
        if view_name in views:
            friendly_name = views[view_name]
            category = cat
            break

    with db_session_manager(current_user) as session:
        try:
            # NOTA: A passagem de nomes de tabelas/views como parâmetros não é suportada diretamente.
            # A abordagem de f-string é aceitável aqui porque os nomes das views são controlados internamente.

            # Primeiro, verificar quais colunas existem na view
            check_query = f"SELECT * FROM aintar_server.{view_name} LIMIT 0"
            check_result = session.execute(text(check_query))
            available_columns = list(check_result.keys())

            # Construir query base
            query = f"SELECT * FROM aintar_server.{view_name}"

            # Adicionar filtros apenas se as colunas existirem na view
            if filters:
                where_clauses = []

                if 'year' in filters and filters['year'] and 'year' in available_columns:
                    where_clauses.append(f"year = {int(filters['year'])}")
                elif 'year' in filters and filters['year'] and 'ano' in available_columns:
                    where_clauses.append(f"ano = {int(filters['year'])}")

                # Não aplicar filtro de mês em views que mostram tendências mensais
                # Estas views são desenhadas para mostrar dados de TODOS os meses
                should_skip_month_filter = (
                    friendly_name and (
                        'por ano e mês' in friendly_name.lower() or
                        'por mês' in friendly_name.lower() or
                        'por ano e mes' in friendly_name.lower() or
                        'por mes' in friendly_name.lower()
                    )
                )

                if not should_skip_month_filter:
                    if 'month' in filters and filters['month'] and 'month' in available_columns:
                        where_clauses.append(f"month = {int(filters['month'])}")
                    elif 'month' in filters and filters['month'] and 'mes' in available_columns:
                        where_clauses.append(f"mes = {int(filters['month'])}")

                if where_clauses:
                    query += " WHERE " + " AND ".join(where_clauses)

            result = session.execute(text(query))
            columns = list(result.keys()) if result.returns_rows else []
            data = [dict(row) for row in result.mappings().all()]

            return {
                'view_id': view_name,
                'name': friendly_name,
                'category': category,
                'total': len(data),
                'data': data,
                'columns': columns
            }

        except Exception as e:
            logger.error(f"Erro ao processar a view {view_name}: {str(e)}", exc_info=True)
            raise


@api_error_handler
def get_dashboard_category_data(current_user, category, filters=None):
    """
    Obtém dados de todas as views de uma categoria específica

    Args:
        current_user: Utilizador autenticado
        category: Categoria (pedidos, ramais, fossas, instalacoes)
        filters: Dicionário opcional com filtros

    Returns:
        Dicionário com dados de todas as views da categoria
    """
    if category not in DASHBOARD_VIEWS:
        raise ValueError(f"Categoria inválida: {category}")

    category_data = {
        'category': category,
        'views': {}
    }

    for view_name, friendly_name in DASHBOARD_VIEWS[category].items():
        try:
            view_data = get_dashboard_view_data(current_user, view_name, filters)
            category_data['views'][view_name] = view_data
        except Exception as e:
            logger.error(f"Erro ao processar view {view_name}: {str(e)}", exc_info=True)
            category_data['views'][view_name] = {
                'view_id': view_name,
                'name': friendly_name,
                'category': category,
                'total': 0,
                'data': [],
                'columns': [],
                'error': str(e)
            }

    return category_data


@api_error_handler
def get_dashboard_data(current_user, filters=None):
    """
    Obtém dados de todas as views do dashboard (mantido por compatibilidade)

    Args:
        current_user: Utilizador autenticado
        filters: Dicionário opcional com filtros

    Returns:
        Dicionário com dados de todas as views organizadas por categoria
    """
    dashboard_data = {
        'structure': get_dashboard_structure(),
        'data': {}
    }

    for category in DASHBOARD_VIEWS.keys():
        try:
            category_data = get_dashboard_category_data(current_user, category, filters)
            dashboard_data['data'][category] = category_data
        except Exception as e:
            logger.error(f"Erro ao processar categoria {category}: {str(e)}", exc_info=True)
            dashboard_data['data'][category] = {
                'category': category,
                'views': {},
                'error': str(e)
            }

    return dashboard_data