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
        Buscar todas as operações/execuções
        USA apenas vbl_operacao que já tem tudo (nomes + controlo)
        """
        try:
            with db_session_manager(current_user) as session:
                query = text("""
                    SELECT * FROM vbl_operacao
                    ORDER BY pk DESC
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
        Buscar tarefas do dia - USA vbl_operacao$self
        View retorna PKs + nomes. Frontend pode usar metadados para lookups adicionais.
        """
        try:
            with db_session_manager(current_user) as session:
                query = text("SELECT * FROM \"vbl_operacao$self\" ORDER BY pk")
                result = session.execute(query)
                data = [dict(row) for row in result.mappings().all()]

                current_app.logger.info(f"Encontradas {len(data)} tarefas")

                return {
                    'success': True,
                    'data': data,
                    'total': len(data),
                    'columns': list(result.keys())
                }

        except SQLAlchemyError as e:
            current_app.logger.error(f"Erro ao buscar tarefas: {str(e)}")
            return {
                'success': False,
                'data': [],
                'total': 0,
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
        """Buscar todas as metas - USA vbl_operacaometa"""
        try:
            with db_session_manager(current_user) as session:
                query = text("SELECT * FROM vbl_operacaometa ORDER BY pk")
                result = session.execute(query)
                data = [dict(row) for row in result.mappings().all()]

                return {
                    'success': True,
                    'data': data,
                    'total': len(data),
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