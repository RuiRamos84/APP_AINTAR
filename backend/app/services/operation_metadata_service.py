from flask import current_app
from sqlalchemy.sql import text
from sqlalchemy.exc import SQLAlchemyError
from ..utils.utils import db_session_manager
from ..utils.error_handler import api_error_handler
from pydantic import BaseModel
from typing import Optional


class OperationMetadataQuery(BaseModel):
    """Filtros para consulta de metadata de operações"""
    tb_instalacao: Optional[int] = None
    tt_operacaomodo: Optional[int] = None


class OperationMetadataCreate(BaseModel):
    """Dados para criar metadata de operação"""
    tt_operacaomodo: int
    tb_instalacao: int
    tt_operacaodia: int
    tt_operacaoaccao: int
    ts_operador1: int
    ts_operador2: Optional[int] = None


class OperationMetadataUpdate(BaseModel):
    """Dados para atualizar metadata de operação"""
    pk: int
    tt_operacaomodo: Optional[int] = None
    tb_instalacao: Optional[int] = None
    tt_operacaodia: Optional[int] = None
    tt_operacaoaccao: Optional[int] = None
    ts_operador1: Optional[int] = None
    ts_operador2: Optional[int] = None


@api_error_handler
def query_operation_metadata(filters: dict, current_user: str):
    """
    Consultar metadata de operações (voltas/tarefas template)

    Args:
        filters: Dict com filtros opcionais (tb_instalacao, tt_operacaomodo)
        current_user: Session ID para db_session_manager

    Returns:
        Lista de metadata de operações
    """
    try:
        query_data = OperationMetadataQuery.model_validate(filters)

        with db_session_manager(current_user) as session:
            # Query usando vbf_operacaometa (PKs numéricos) com JOINs para nomes
            # IMPORTANTE: Retorna os IDs originais E os nomes para edição no frontend
            sql = """
                SELECT
                    b.pk,
                    -- IDs originais (necessários para edição)
                    b.tt_operacaomodo AS tt_operacaomodo,
                    b.tb_instalacao AS tb_instalacao,
                    b.tt_operacaodia AS tt_operacaodia,
                    b.tt_operacaoaccao AS tt_operacaoaccao,
                    b.ts_operador1 AS ts_operador1,
                    b.ts_operador2 AS ts_operador2,
                    -- Nomes legíveis (para exibição)
                    m.value AS tt_operacaomodo_nome,
                    i.nome ||
                        CASE i.tipo
                            WHEN 1 THEN ' (ETAR)'
                            WHEN 2 THEN ' (EE)'
                            ELSE ''
                        END AS tb_instalacao_nome,
                    d.value AS tt_operacaodia_nome,
                    a.name AS tt_operacaoaccao_nome,
                    c1.name AS ts_operador1_nome,
                    c2.name AS ts_operador2_nome
                FROM vbf_operacaometa b
                JOIN tt_operacaomodo m ON b.tt_operacaomodo = m.pk
                JOIN tb_instalacao i ON b.tb_instalacao = i.pk
                JOIN tt_operacaodia d ON b.tt_operacaodia = d.pk
                JOIN tt_operacaoaccao a ON b.tt_operacaoaccao = a.pk
                JOIN ts_client c1 ON b.ts_operador1 = c1.pk
                LEFT JOIN ts_client c2 ON b.ts_operador2 = c2.pk
                WHERE 1=1
            """

            params = {}

            # Filtro por instalação
            if query_data.tb_instalacao:
                sql += " AND b.tb_instalacao = :tb_instalacao"
                params['tb_instalacao'] = query_data.tb_instalacao

            # Filtro por modo de operação
            if query_data.tt_operacaomodo:
                sql += " AND b.tt_operacaomodo = :tt_operacaomodo"
                params['tt_operacaomodo'] = query_data.tt_operacaomodo

            # Ordenar
            sql += " ORDER BY b.tb_instalacao, b.tt_operacaodia, b.tt_operacaoaccao"

            query = text(sql)
            result = session.execute(query, params)

            # Converter para lista de dicts
            columns = result.keys()
            data = [dict(zip(columns, row)) for row in result.fetchall()]

            current_app.logger.info(f"Query de metadata retornou {len(data)} registros")

            return {
                'success': True,
                'data': data,
                'total': len(data)
            }, 200

    except Exception as e:
        current_app.logger.error(f"Erro ao consultar metadata de operações: {str(e)}")
        return {'error': 'Erro ao consultar metadata de operações'}, 500


@api_error_handler
def create_operation_metadata(data: dict, current_user: str):
    """
    Criar nova metadata de operação

    Args:
        data: Dict com dados da metadata
        current_user: Session ID para db_session_manager

    Returns:
        Confirmação de criação
    """
    try:
        create_data = OperationMetadataCreate.model_validate(data)

        with db_session_manager(current_user) as session:
            # Insert usando vbf_operacaometa sem RETURNING (view não suporta)
            query = text("""
                INSERT INTO vbf_operacaometa
                    (tt_operacaomodo, tb_instalacao, tt_operacaodia, tt_operacaoaccao, ts_operador1, ts_operador2)
                VALUES
                    (:tt_operacaomodo, :tb_instalacao, :tt_operacaodia, :tt_operacaoaccao, :ts_operador1, :ts_operador2)
            """)

            session.execute(query, {
                'tt_operacaomodo': create_data.tt_operacaomodo,
                'tb_instalacao': create_data.tb_instalacao,
                'tt_operacaodia': create_data.tt_operacaodia,
                'tt_operacaoaccao': create_data.tt_operacaoaccao,
                'ts_operador1': create_data.ts_operador1,
                'ts_operador2': create_data.ts_operador2
            })

            session.commit()

            current_app.logger.info(f"Metadata de operação criada com sucesso")

            return {
                'success': True,
                'message': 'Metadata de operação criada com sucesso'
            }, 201

    except Exception as e:
        current_app.logger.error(f"Erro ao criar metadata de operação: {str(e)}")
        return {'error': 'Erro ao criar metadata de operação'}, 500


@api_error_handler
def update_operation_metadata(data: dict, current_user: str):
    """
    Atualizar metadata de operação

    Args:
        data: Dict com pk e campos a atualizar
        current_user: Session ID para db_session_manager

    Returns:
        Confirmação de atualização
    """
    try:
        update_data = OperationMetadataUpdate.model_validate(data)

        # Extrair campos a atualizar (excluindo None e pk)
        update_dict = update_data.model_dump(exclude_none=True, exclude={'pk'})

        if not update_dict:
            return {'message': 'Nenhum dado para atualizar'}, 200

        with db_session_manager(current_user) as session:
            # Montar SET clause dinamicamente
            set_clause = ", ".join([f"{key} = :{key}" for key in update_dict.keys()])
            query = text(f"""
                UPDATE vbf_operacaometa
                SET {set_clause}
                WHERE pk = :pk
            """)

            session.execute(query, {**update_dict, 'pk': update_data.pk})
            session.commit()

            current_app.logger.info(f"Metadata de operação {update_data.pk} atualizada com sucesso")

            return {
                'success': True,
                'message': 'Metadata de operação atualizada com sucesso',
                'pk': update_data.pk
            }, 200

    except Exception as e:
        current_app.logger.error(f"Erro ao atualizar metadata de operação: {str(e)}")
        return {'error': 'Erro ao atualizar metadata de operação'}, 500


@api_error_handler
def delete_operation_metadata(pk: int, current_user: str):
    """
    Eliminar metadata de operação

    Args:
        pk: Primary key da metadata
        current_user: Session ID para db_session_manager

    Returns:
        Confirmação de eliminação
    """
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                DELETE FROM vbf_operacaometa
                WHERE pk = :pk
            """)

            result = session.execute(query, {'pk': pk})
            session.commit()

            if result.rowcount == 0:
                return {'error': 'Metadata de operação não encontrada'}, 404

            current_app.logger.info(f"Metadata de operação {pk} eliminada com sucesso")

            return {
                'success': True,
                'message': 'Metadata de operação eliminada com sucesso'
            }, 200

    except Exception as e:
        current_app.logger.error(f"Erro ao eliminar metadata de operação: {str(e)}")
        return {'error': 'Erro ao eliminar metadata de operação'}, 500


@api_error_handler
def get_operation_metadata_by_pk(pk: int, current_user: str):
    """
    Obter metadata de operação por PK

    Args:
        pk: Primary key da metadata
        current_user: Session ID para db_session_manager

    Returns:
        Dados da metadata
    """
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT
                    pk,
                    tt_operacaomodo,
                    tb_instalacao,
                    tt_operacaodia,
                    tt_operacaoaccao,
                    ts_operador1,
                    ts_operador2
                FROM vbl_operacaometa
                WHERE pk = :pk
            """)

            result = session.execute(query, {'pk': pk})
            row = result.fetchone()

            if not row:
                return {
                    'success': False,
                    'message': 'Metadata de operação não encontrada'
                }, 404

            columns = result.keys()
            data = dict(zip(columns, row))

            return {
                'success': True,
                'data': data
            }, 200

    except Exception as e:
        current_app.logger.error(f"Erro ao obter metadata de operação {pk}: {str(e)}")
        return {'error': 'Erro ao obter metadata de operação'}, 500
