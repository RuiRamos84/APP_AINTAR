from .. import db
from sqlalchemy.sql import text
from sqlalchemy.exc import ProgrammingError, OperationalError
from flask import current_app, has_app_context
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = get_logger(__name__)


# Estrutura organizada de views do dashboard
DASHBOARD_VIEWS = {
    'pedidos': {
        'vds_pedido_01$001': 'Por tipo',
        'vds_pedido_01$002': 'Por tipo e ano',
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
        'vds_ramal_01$005': 'Metros extensão de rede construidos por ano',
        'vds_ramal_01$006': 'Metros extensão de rede construidos por ano e mes, para o ano corrente',
    },
    'fossas': {
        'vds_fossa_01$001': 'Por estado',
        'vds_fossa_01$002': 'Por município, por ano',
        'vds_fossa_01$003': 'Por ano e mês, para o ano corrente',
        'vds_fossa_01$004': 'Duração (em dias) por ano e município',
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
        'vds_instalacao_01$013': 'Por concelho, total e concluídos',
    
        'vds_instalacao_01$014': 'Por concelho, total e concluídos, para o ano corrente',
        'vds_instalacao_01$015': 'Por concelho e tipo',
        'vds_instalacao_01$016': 'Por conselho e tipo, total e concluidos',

    },
    'analises': { 
        'vds_analise_01$001' : 'Por ano',
        'vds_analise_01$002' : 'Por concelho',
        'vds_analise_01$003' : 'Por ano e conselho',
        'vds_analise_01$004' : 'Por concelho e parâmetro',
        'vds_analise_01$005' : 'Por ano e parâmetro',  
         },
    'incumprimentos': {
        'vds_incumprimento_01$001': 'Por ano',
        'vds_incumprimento_01$002': 'Por concelho',
        'vds_incumprimento_01$003': 'Por parâmetro e concelho',
        'vds_incumprimento_01$004': 'Por ano e concelho',
        'vds_incumprimento_01$005': 'Por ano e parametro',
        'vds_incumprimento_01$006' : 'Por gravidade',
        'vds_incumprimento_01$007' : 'Por ano e gravidade',
        'vds_incumprimento_01$008' : 'Por parâmetro e gravidade',
        'vds_incumprimento_01$009' : 'Por concelho e gravidade',
    },
    'repavimentacoes': {
        'vds_repav_01$001': 'Por estado',
        'vds_repav_01$002': 'Área solicitada por ano',
        'vds_repav_01$003': 'Área solicitada por ano e mes',
        'vds_repav_01$004': 'Área solicitada por ano e semana',


    },
    'transmitacoes': {
        'vds_tramitacao_01$001': 'Por utilizador',
         'vds_tramitacao_01$002': 'Por utilizador e ano',
         'vds_tramitacao_01$003': 'Por utilizador, mes e ano',
    },
    'landing': {
        'vds_landing_01$001': 'Pedidos - Top 10 tipos',
        'vds_landing_01$002': 'Pedidos - Por município',
        'vds_landing_01$003': 'Pedidos - Estado actual',
        'vds_landing_01$004': 'Pedidos - Duração média (dias)',
        'vds_landing_02$001': 'Ramais - Estado corrente vs anterior',
        'vds_landing_02$002': 'Ramais - Por município',
        'vds_landing_03$001': 'Fossas - Estado corrente vs anterior',
        'vds_landing_03$002': 'Fossas - Por município',
    },




    




}


def get_all_valid_views():
    """Retorna lista de todas as views válidas"""
    all_views = []
    for category, views in DASHBOARD_VIEWS.items():
        all_views.extend(views.keys())
    return all_views


def get_dashboard_structure():
    """Retorna a estrutura completa do dashboard organizada por categorias"""
    category_names = {
        'pedidos': 'Pedidos',
        'ramais': 'Ramais',
        'fossas': 'Fossas',
        'instalacoes': 'Instalações',
        'analises': 'Análises',
        'incumprimentos': 'Incumprimentos',
        'repavimentacoes': 'Repavimentações',
        'transmitacoes': 'Tramitações',
    }
    return {
        'categories': [
            {
                'id': category,
                'name': category_names.get(category, category.capitalize()),
                'views': [
                    {'id': view_id, 'name': view_name}
                    for view_id, view_name in views.items()
                ]
            }
            for category, views in DASHBOARD_VIEWS.items()
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
            # Construir query base
            # NOTA: f-string é aceitável porque os nomes das views são validados contra DASHBOARD_VIEWS
            query = f"SELECT * FROM aintar_server.{view_name}"

            # Executar primeiro sem filtros para obter as colunas disponíveis
            result = session.execute(text(query))
            columns = list(result.keys()) if result.returns_rows else []
            available_columns = columns

            # Adicionar filtros apenas se as colunas existirem na view
            if filters:
                where_clauses = []

                if 'year' in filters and filters['year'] and 'year' in available_columns:
                    where_clauses.append(f"year = {int(filters['year'])}")
                elif 'year' in filters and filters['year'] and 'ano' in available_columns:
                    where_clauses.append(f"ano = {int(filters['year'])}")

                # Não aplicar filtro de mês em views que mostram tendências mensais
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
                    filtered_query = query + " WHERE " + " AND ".join(where_clauses)
                    result = session.execute(text(filtered_query))
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


LANDING_VIEWS = [
    'vds_landing_01$001',
    'vds_landing_01$002',
    'vds_landing_01$003',
    'vds_landing_01$004',
    'vds_landing_02$001',
    'vds_landing_02$002',
    'vds_landing_03$001',
    'vds_landing_03$002',
]


@api_error_handler
def get_landing_data(current_user):
    """
    Obtém dados de todas as views da landing page em paralelo.
    Enriquece as views de município com o nome real (lookup via vbl_instalacao_municipio).

    Returns:
        Dicionário indexado por nome de view, cada um com 'data' e 'columns'.
    """
    app = current_app._get_current_object()

    # Lookup pk → nome do município (feito uma vez, partilhado por todas as views)
    mun_map = {}
    try:
        with db_session_manager(current_user) as session:
            rows = session.execute(
                text("SELECT DISTINCT pk, value FROM aintar_server.vbl_instalacao_municipio ORDER BY value")
            ).fetchall()
            mun_map = {str(r[0]): r[1] for r in rows}
    except Exception as e:
        logger.warning(f"Não foi possível obter lookup de municípios: {e}")

    # Colunas de município em cada view (nome exacto da coluna na view)
    MUN_VIEWS = {
        'vds_landing_01$002': 'Município',
        'vds_landing_02$002': 'Municipio',
        'vds_landing_03$002': 'Municipio',
    }

    def fetch_view(view_name):
        with app.app_context():
            try:
                with db_session_manager(current_user) as session:
                    res = session.execute(text(f"SELECT * FROM aintar_server.{view_name}"))
                    rows = [dict(r) for r in res.mappings().all()]

                    # Substituir pk numérico pelo nome do município
                    mun_col = MUN_VIEWS.get(view_name)
                    if mun_col and mun_map:
                        for row in rows:
                            raw = row.get(mun_col)
                            if raw is not None:
                                row[mun_col] = mun_map.get(str(raw), str(raw))

                    return view_name, {
                        'data': rows,
                        'columns': list(res.keys()),
                    }
            except Exception as e:
                logger.error(f"Erro ao carregar view landing {view_name}: {e}", exc_info=True)
                return view_name, {'data': [], 'columns': [], 'error': str(e)}

    result = {}
    with ThreadPoolExecutor(max_workers=len(LANDING_VIEWS)) as executor:
        futures = {executor.submit(fetch_view, v): v for v in LANDING_VIEWS}
        for future in as_completed(futures):
            view_name, data = future.result()
            result[view_name] = data
    return result


@api_error_handler
def get_dashboard_data(current_user, filters=None):
    """
    Obtém dados de todas as views do dashboard em paralelo.

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

    categories = list(DASHBOARD_VIEWS.keys())
    app = current_app._get_current_object()

    def fetch_category(category):
        with app.app_context():
            try:
                return category, get_dashboard_category_data(current_user, category, filters)
            except Exception as e:
                logger.error(f"Erro ao processar categoria {category}: {str(e)}", exc_info=True)
                return category, {'category': category, 'views': {}, 'error': str(e)}

    with ThreadPoolExecutor(max_workers=len(categories)) as executor:
        futures = {executor.submit(fetch_category, cat): cat for cat in categories}
        for future in as_completed(futures):
            category, data = future.result()
            dashboard_data['data'][category] = data

    return dashboard_data