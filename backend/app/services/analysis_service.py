from flask import current_app
from sqlalchemy.sql import text
from sqlalchemy.exc import SQLAlchemyError
from ..utils.utils import db_session_manager
from ..utils.error_handler import api_error_handler
from pydantic import BaseModel
from typing import Optional


class AnalysisQuery(BaseModel):
    """Filtros para consulta de análises"""
    tb_instalacao: Optional[int] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None


class AnalysisUpdate(BaseModel):
    """Dados para atualizar resultado de análise"""
    pk: int
    resultado: Optional[str] = None


@api_error_handler
def query_analysis(filters: dict, current_user: str):
    """
    Consultar análises de instalações

    Args:
        filters: Dict com filtros opcionais (tb_instalacao, data_inicio, data_fim)
        current_user: Session ID para db_session_manager

    Returns:
        Lista de análises
    """
    try:
        query_data = AnalysisQuery.model_validate(filters)

        with db_session_manager(current_user) as session:
            # Query base - filtrar apenas laboratório usando a view atualizada
            sql = """
                SELECT
                    pk,
                    data,
                    pk_instalacao,
                    tb_instalacao,
                    tt_analiseponto,
                    tt_analiseparam,
                    tt_analiseforma,
                    resultado,
                    operador1,
                    operador2,
                    tb_operacao,
                    updt_client,
                    updt_time
                FROM vbl_instalacao_analise
                WHERE LOWER(tt_analiseforma) LIKE '%laborat%'
            """

            params = {}

            # Filtro por instalação
            if query_data.tb_instalacao:
                sql += " AND pk_instalacao = :tb_instalacao"
                params['tb_instalacao'] = query_data.tb_instalacao

            # Filtro por data início
            if query_data.data_inicio:
                sql += " AND data >= :data_inicio"
                params['data_inicio'] = query_data.data_inicio

            # Filtro por data fim
            if query_data.data_fim:
                sql += " AND data <= :data_fim"
                params['data_fim'] = query_data.data_fim

            # Ordenar por data decrescente
            sql += " ORDER BY data DESC"

            query = text(sql)
            result = session.execute(query, params)

            # Converter para lista de dicts
            columns = result.keys()
            data = [dict(zip(columns, row)) for row in result.fetchall()]

            current_app.logger.info(f"Query de análises retornou {len(data)} registros")

            return {
                'success': True,
                'data': data,
                'total': len(data)
            }, 200

    except Exception as e:
        current_app.logger.error(f"Erro ao consultar análises: {str(e)}")
        return {'error': 'Erro ao consultar análises'}, 500


@api_error_handler
def update_analysis(data: dict, current_user: str):
    """
    Atualizar resultado de análise

    Args:
        data: Dict com pk e resultado
        current_user: Session ID para db_session_manager

    Returns:
        Confirmação de atualização
    """
    try:
        update_data = AnalysisUpdate.model_validate(data)

        with db_session_manager(current_user) as session:
            # Update usando vbf_instalacao_analise - triggers da BD preenchem updt_client e updt_time
            query = text("""
                UPDATE vbf_instalacao_analise
                SET resultado = :resultado
                WHERE pk = :pk
            """)

            session.execute(query, {
                'pk': update_data.pk,
                'resultado': update_data.resultado
            })

            session.commit()

            current_app.logger.info(f"Análise {update_data.pk} atualizada com sucesso")

            return {
                'success': True,
                'message': 'Resultado de análise atualizado com sucesso',
                'pk': update_data.pk
            }, 200

    except Exception as e:
        current_app.logger.error(f"Erro ao atualizar análise: {str(e)}")
        return {'error': 'Erro ao atualizar análise'}, 500


@api_error_handler
def get_analysis_by_pk(pk: int, current_user: str):
    """
    Obter análise por PK

    Args:
        pk: Primary key da análise
        current_user: Session ID para db_session_manager

    Returns:
        Dados da análise
    """
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT
                    pk,
                    data,
                    pk_instalacao,
                    tb_instalacao,
                    tt_analiseponto,
                    tt_analiseparam,
                    tt_analiseforma,
                    resultado,
                    operador1,
                    operador2,
                    tb_operacao
                FROM vbl_instalacao_analise
                WHERE pk = :pk
            """)

            result = session.execute(query, {'pk': pk})
            row = result.fetchone()

            if not row:
                return {
                    'success': False,
                    'message': 'Análise não encontrada'
                }, 404

            columns = result.keys()
            data = dict(zip(columns, row))

            return {
                'success': True,
                'data': data
            }, 200

    except Exception as e:
        current_app.logger.error(f"Erro ao obter análise {pk}: {str(e)}")
        return {'error': 'Erro ao obter análise'}, 500
