from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from sqlalchemy.sql import text
from sqlalchemy.exc import SQLAlchemyError
from flask import current_app
from ..utils.utils import db_session_manager


class BaseRepository(ABC):
    """
    Repository base simplificado para operações comuns
    Foca na simplicidade sem perder robustez
    """

    def __init__(self, view_name: str, table_name: str = None):
        self.view_name = view_name
        self.table_name = table_name or view_name.replace('vbl_', 'tb_')

    def find_all(self, current_user: str, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """Buscar todos os registros com filtros opcionais"""
        try:
            with db_session_manager(current_user) as session:
                query = f"SELECT * FROM {self.view_name}"
                params = {}

                if filters:
                    where_clauses = []
                    for key, value in filters.items():
                        if value is not None:
                            where_clauses.append(f"{key} = :{key}")
                            params[key] = value

                    if where_clauses:
                        query += " WHERE " + " AND ".join(where_clauses)

                result = session.execute(text(query), params)
                data = [dict(row) for row in result.mappings().all()]

                return {
                    'success': True,
                    'data': data,
                    'total': len(data),
                    'columns': list(result.keys()) if result.returns_rows else []
                }

        except SQLAlchemyError as e:
            current_app.logger.error(f"Erro na query {self.view_name}: {str(e)}")
            return {
                'success': False,
                'data': [],
                'total': 0,
                'error': f"Erro ao buscar dados de {self.view_name}"
            }

    def find_by_id(self, record_id: int, current_user: str) -> Dict[str, Any]:
        """Buscar registro por ID"""
        try:
            with db_session_manager(current_user) as session:
                query = text(f"SELECT * FROM {self.view_name} WHERE pk = :id")
                result = session.execute(query, {'id': record_id}).fetchone()

                if result:
                    return {
                        'success': True,
                        'data': dict(result._mapping)
                    }
                else:
                    return {
                        'success': False,
                        'error': 'Registro não encontrado'
                    }

        except SQLAlchemyError as e:
            current_app.logger.error(f"Erro ao buscar por ID em {self.view_name}: {str(e)}")
            return {
                'success': False,
                'error': f"Erro ao buscar registro"
            }

    def create(self, data: Dict[str, Any], current_user: str) -> Dict[str, Any]:
        """Criar novo registro na tabela correspondente"""
        if not self.table_name:
            return {
                'success': False,
                'error': 'Operação de criação não suportada'
            }

        try:
            with db_session_manager(current_user) as session:
                # Obter próximo PK
                new_pk = session.execute(text("SELECT fs_nextcode()")).scalar()

                # Preparar campos e valores
                fields = ['pk'] + list(data.keys())
                placeholders = [':pk'] + [f':{key}' for key in data.keys()]

                query = text(f"""
                    INSERT INTO {self.table_name} ({', '.join(fields)})
                    VALUES ({', '.join(placeholders)})
                """)

                params = {'pk': new_pk, **data}
                session.execute(query, params)

                return {
                    'success': True,
                    'data': {'pk': new_pk},
                    'message': 'Registro criado com sucesso'
                }

        except SQLAlchemyError as e:
            current_app.logger.error(f"Erro ao criar registro em {self.table_name}: {str(e)}")
            return {
                'success': False,
                'error': f"Erro ao criar registro: {str(e)}"
            }

    def update(self, record_id: int, data: Dict[str, Any], current_user: str) -> Dict[str, Any]:
        """Atualizar registro existente"""
        if not self.table_name:
            return {
                'success': False,
                'error': 'Operação de atualização não suportada'
            }

        try:
            with db_session_manager(current_user) as session:
                # Verificar se existe
                check_query = text(f"SELECT pk FROM {self.table_name} WHERE pk = :id")
                exists = session.execute(check_query, {'id': record_id}).fetchone()

                if not exists:
                    return {
                        'success': False,
                        'error': 'Registro não encontrado'
                    }

                # Preparar update
                if not data:
                    return {
                        'success': True,
                        'message': 'Nenhuma alteração fornecida'
                    }

                set_clauses = [f"{key} = :{key}" for key in data.keys()]
                query = text(f"""
                    UPDATE {self.table_name}
                    SET {', '.join(set_clauses)}
                    WHERE pk = :id
                """)

                params = {**data, 'id': record_id}
                session.execute(query, params)

                return {
                    'success': True,
                    'message': 'Registro atualizado com sucesso'
                }

        except SQLAlchemyError as e:
            current_app.logger.error(f"Erro ao atualizar registro em {self.table_name}: {str(e)}")
            return {
                'success': False,
                'error': f"Erro ao atualizar registro: {str(e)}"
            }

    def delete(self, record_id: int, current_user: str) -> Dict[str, Any]:
        """Eliminar registro"""
        if not self.table_name:
            return {
                'success': False,
                'error': 'Operação de eliminação não suportada'
            }

        try:
            with db_session_manager(current_user) as session:
                # Verificar se existe
                check_query = text(f"SELECT pk FROM {self.table_name} WHERE pk = :id")
                exists = session.execute(check_query, {'id': record_id}).fetchone()

                if not exists:
                    return {
                        'success': False,
                        'error': 'Registro não encontrado'
                    }

                # Eliminar
                query = text(f"DELETE FROM {self.table_name} WHERE pk = :id")
                session.execute(query, {'id': record_id})

                return {
                    'success': True,
                    'message': 'Registro eliminado com sucesso'
                }

        except SQLAlchemyError as e:
            current_app.logger.error(f"Erro ao eliminar registro em {self.table_name}: {str(e)}")
            return {
                'success': False,
                'error': f"Erro ao eliminar registro: {str(e)}"
            }
