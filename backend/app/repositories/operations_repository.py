from .base_repository import BaseRepository
from typing import Dict, Any, List
from sqlalchemy.sql import text
from sqlalchemy.exc import SQLAlchemyError
from flask import current_app
from ..utils.utils import db_session_manager


class OperationsRepository(BaseRepository):
    """Repository específico para operações com funcionalidades especializadas"""

    def __init__(self):
        super().__init__('vbl_operacao', 'tb_operacao')

    def find_all(self, current_user: str, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Buscar operações/execuções com filtro de data opcional.
        - Sem filtro: devolve apenas mês atual (pendentes + concluídas)
        - Com from_date/to_date: filtra concluídas pelo intervalo, pendentes sempre incluídas
        USA vbl_operacao (nomes + controlo já resolvidos)
        """
        try:
            with db_session_manager(current_user) as session:
                f = filters or {}
                from_date = f.get('from_date')
                to_date = f.get('to_date')

                # Expor tt_operacaomodo: NULL = pontual/direta, valor preenchido = programada
                if from_date and to_date:
                    query = text("""
                        SELECT v.*, o.tt_operacaomodo
                        FROM vbl_operacao v
                        LEFT JOIN tb_operacao o ON o.pk = v.pk
                        WHERE v.updt_time IS NULL
                           OR v.updt_time::date BETWEEN :from_date AND :to_date
                        ORDER BY v.pk DESC
                    """)
                    result = session.execute(query, {'from_date': from_date, 'to_date': to_date})
                else:
                    # Default: mês atual
                    query = text("""
                        SELECT v.*, o.tt_operacaomodo
                        FROM vbl_operacao v
                        LEFT JOIN tb_operacao o ON o.pk = v.pk
                        WHERE v.updt_time IS NULL
                           OR v.updt_time::date >= DATE_TRUNC('month', CURRENT_DATE)
                        ORDER BY v.pk DESC
                    """)
                    result = session.execute(query)

                data = [dict(row) for row in result.mappings().all()]

                return {
                    'success': True,
                    'data': data,
                    'total': len(data),
                    'columns': list(result.keys())
                }

        except SQLAlchemyError as e:
            current_app.logger.error(f"Erro ao buscar operações: {str(e)}")
            return {
                'success': False,
                'data': [],
                'total': 0,
                'error': 'Erro ao buscar operações'
            }

    def find_by_operator(self, operator_id: int, current_user: str) -> Dict[str, Any]:
        """Buscar operações de um operador específico"""
        return self.find_all(current_user, {'ts_operador1': operator_id})

    def find_today_tasks(self, user_id: int, current_user: str) -> Dict[str, Any]:
        """
        Buscar tarefas do dia:
        - Pendentes via vbl_operacao$self
        - Concluídas via vbl_operacao (filtradas por operador + valuetext preenchido)
        - Stats (total_assigned, total_completed)
        """
        try:
            with db_session_manager(current_user) as session:
                # 1. Tarefas pendentes (sem updt_client = não concluídas)
                query = text("""
                    SELECT * FROM "vbl_operacao$self"
                    WHERE updt_client IS NULL
                    ORDER BY pk
                """)
                result = session.execute(query)
                data = [dict(row) for row in result.mappings().all()]
                columns = list(result.keys())

                # 2. Tarefas concluídas hoje pelo utilizador
                completed_query = text("""
                    SELECT * FROM vbl_operacao
                    WHERE pk_operador1 = :user_id
                    AND updt_client IS NOT NULL
                    AND updt_time::date = CURRENT_DATE
                    ORDER BY updt_time DESC
                """)
                completed_result = session.execute(completed_query, {'user_id': user_id})
                completed_data = [dict(row) for row in completed_result.mappings().all()]

                # 3. Stats
                total_assigned = len(data) + len(completed_data)
                stats = {
                    'total_assigned': total_assigned,
                    'total_completed': len(completed_data),
                }

                current_app.logger.info(
                    f"Tarefas: {len(data)} pendentes, "
                    f"{stats['total_completed']}/{stats['total_assigned']} concluídas"
                )

                return {
                    'success': True,
                    'data': data,
                    'completed': completed_data,
                    'total': len(data),
                    'stats': stats,
                    'columns': columns
                }

        except SQLAlchemyError as e:
            current_app.logger.error(f"Erro ao buscar tarefas: {str(e)}")
            return {
                'success': False,
                'data': [],
                'completed': [],
                'total': 0,
                'stats': {'total_assigned': 0, 'total_completed': 0},
                'error': 'Erro ao buscar tarefas'
            }

    def get_analytics_data(self, current_user: str, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Buscar dados para analytics - USA vbl_operacaometa"""
        try:
            with db_session_manager(current_user) as session:
                base_query = text("""
                    SELECT
                        COUNT(*) as total_operations,
                        COUNT(DISTINCT ts_operador1) as active_operators,
                        COUNT(DISTINCT tb_instalacao) as total_installations,
                        COUNT(DISTINCT tt_operacaoaccao) as total_action_types
                    FROM vbl_operacaometa
                """)

                result = session.execute(base_query).fetchone()

                operator_query = text("""
                    SELECT
                        ts_operador1 as operator_name,
                        COUNT(*) as total_tasks
                    FROM vbl_operacaometa
                    WHERE ts_operador1 IS NOT NULL
                    GROUP BY ts_operador1
                    ORDER BY total_tasks DESC
                """)

                operator_stats = session.execute(operator_query).fetchall()

                return {
                    'success': True,
                    'data': {
                        'overview': dict(result._mapping) if result else {},
                        'operator_stats': [dict(row._mapping) for row in operator_stats]
                    }
                }

        except SQLAlchemyError as e:
            current_app.logger.error(f"Erro ao buscar analytics: {str(e)}")
            return {'success': False, 'error': 'Erro ao calcular estatísticas'}


class OperationMetaRepository(BaseRepository):
    """Repository para metas de operação"""

    def __init__(self):
        super().__init__('vbl_operacaometa', 'tb_operacaometa')

    def find_all(self, current_user: str, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Buscar metas com paginação e pesquisa - USA vbl_operacaometa"""
        try:
            filters = filters or {}
            limit = filters.get('limit')
            offset = filters.get('offset', 0)
            search = filters.get('search', '').strip()

            with db_session_manager(current_user) as session:
                params = {}
                where_clause = ""

                if search:
                    where_clause = " WHERE CAST(pk AS TEXT) || ' ' || COALESCE(CAST(tb_instalacao AS TEXT),'') || ' ' || COALESCE(CAST(tt_operacaoaccao AS TEXT),'') || ' ' || COALESCE(CAST(ts_operador1 AS TEXT),'') ILIKE :search"
                    params['search'] = f'%{search}%'

                # Total sem paginação
                count_sql = f"SELECT COUNT(*) FROM vbl_operacaometa{where_clause}"
                total = session.execute(text(count_sql), params).scalar()

                # Query paginada
                data_sql = f"SELECT * FROM vbl_operacaometa{where_clause} ORDER BY pk"

                if limit:
                    data_sql += " LIMIT :limit OFFSET :offset"
                    params['limit'] = min(int(limit), 200)
                    params['offset'] = int(offset)

                result = session.execute(text(data_sql), params)
                data = [dict(row) for row in result.mappings().all()]

                return {
                    'success': True,
                    'data': data,
                    'total': total,
                    'columns': list(result.keys())
                }

        except SQLAlchemyError as e:
            current_app.logger.error(f"Erro ao buscar metas: {str(e)}")
            return {
                'success': False,
                'data': [],
                'total': 0,
                'error': 'Erro ao buscar metas de operação'
            }

    def find_by_installation_name(self, installation_name: str, current_user: str) -> Dict[str, Any]:
        """Buscar metas por nome da instalação - USA vbl_operacaometa"""
        try:
            with db_session_manager(current_user) as session:
                query = text("""
                    SELECT * FROM vbl_operacaometa
                    WHERE tb_instalacao ILIKE :search_pattern
                    ORDER BY pk DESC
                """)
                result = session.execute(query, {'search_pattern': f'%{installation_name}%'})
                data = [dict(row) for row in result.mappings().all()]

                return {'success': True, 'data': data, 'total': len(data)}
        except SQLAlchemyError as e:
            current_app.logger.error(f"Erro ao buscar por instalação: {str(e)}")
            return {'success': False, 'data': [], 'total': 0, 'error': 'Erro ao buscar metas'}