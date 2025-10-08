from .. import db
from sqlalchemy.sql import text
from sqlalchemy.exc import ProgrammingError, OperationalError, SQLAlchemyError
from flask import current_app
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler, ResourceNotFoundError
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from datetime import date
from ..repositories.operations_repository import OperationsRepository, OperationMetaRepository

# ===================================================================
# MODELOS DE DADOS COM PYDANTIC
# ===================================================================

class InternalDocumentCreate(BaseModel):
    pntype: int
    pnts_associate: Optional[int] = None
    pnmemo: str
    pnpk_etar: Optional[int] = None
    pnpk_ee: Optional[int] = None
    pnaddress: Optional[str] = None
    pnpostal: Optional[str] = None
    pndoor: Optional[str] = None
    pnfloor: Optional[str] = None
    pnnut4: Optional[str] = None # Localidade
    pnglat: Optional[float] = None
    pnglong: Optional[float] = None


class OperacaoMetaCreate(BaseModel):
    tt_operacaomodo: int = Field(..., gt=0, description="ID do modo de operação")
    tb_instalacao: int = Field(..., gt=0, description="ID da instalação")
    tt_operacaodia: int = Field(..., gt=0, description="ID do dia de operação")
    tt_operacaoaccao: int = Field(..., gt=0, description="ID da ação")
    ts_operador1: int = Field(..., gt=0, description="ID do operador principal")
    ts_operador2: Optional[int] = None

    @validator('ts_operador2')
    def validate_operator2_different(cls, v, values):
        if v is not None and 'ts_operador1' in values and v == values['ts_operador1']:
            raise ValueError('Operador secundário deve ser diferente do principal')
        return v


class OperacaoMetaUpdate(BaseModel):
    tt_operacaomodo: Optional[int] = Field(None, gt=0)
    tb_instalacao: Optional[int] = Field(None, gt=0)
    tt_operacaodia: Optional[int] = Field(None, gt=0)
    tt_operacaoaccao: Optional[int] = Field(None, gt=0)
    ts_operador1: Optional[int] = Field(None, gt=0)
    ts_operador2: Optional[int] = None

    @validator('ts_operador2')
    def validate_operator2_different(cls, v, values):
        if v is not None and 'ts_operador1' in values and v == values['ts_operador1']:
            raise ValueError('Operador secundário deve ser diferente do principal')
        return v


class OperationFilters(BaseModel):
    """Filtros para busca de operações"""
    installation_id: Optional[int] = None
    operator_id: Optional[int] = None
    mode_id: Optional[int] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    status: Optional[str] = None


class OperationResponse(BaseModel):
    """Resposta padrão para operações"""
    success: bool
    data: Any = None
    message: Optional[str] = None
    error: Optional[str] = None
    total: Optional[int] = None

@api_error_handler
def get_operations_data(current_user):
    """
    Obtém dados de operações a partir de views específicas
    """
    views = {
        'vbr_document_fossa01': 'Limpezas de fossa global',
        'vbr_document_fossa02': 'Limpeza de fossa Carregal do Sal',
        'vbr_document_fossa03': 'Limpeza de fossa Santa Comba Dão',
        'vbr_document_fossa04': 'Limpeza de fossa Tábua',
        'vbr_document_fossa05': 'Limpeza de fossa Tondela',
        'vbr_document_ramais01': 'Ramais',
        'vbr_document_caixas01': 'Caixas',
        'vbr_document_desobstrucao01': 'Desobstrução',
        'vbr_document_pavimentacao01': 'Pavimentações',
        'vbr_document_ramais02': 'Repavimentações',
        'vbr_document_rede01': 'Rede',
        'vbr_document_reparacao': 'Reparações',
    }

    operations_data = {}

    with db_session_manager(current_user) as session:
        for view_name, friendly_name in views.items():
            try:
                query = text(f"SELECT * FROM {view_name}")
                result = session.execute(query)
                data = [dict(row) for row in result.mappings().all()]
                operations_data[view_name] = {
                    'name': friendly_name,
                    'total': len(data),
                    'data': data,
                    'columns': list(result.keys()) if result.returns_rows else []
                }
            except (ProgrammingError, OperationalError) as e:
                current_app.logger.warning(f"A view {friendly_name} ({view_name}) não foi encontrada ou gerou um erro: {str(e)}")
                # Não adiciona a view ao resultado se ela falhar
    return operations_data


@api_error_handler
def create_internal_document(data: dict, current_user: str):
    """
    Cria um documento interno genérico utilizando a função fbo_document_createintern.
    Valida os dados de entrada com Pydantic.
    """
    doc_data = InternalDocumentCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_document_createintern(
                :pntype, :pnts_associate, :pnmemo, 
                :pnpk_etar, :pnpk_ee,
                :pnaddress, :pnpostal, :pndoor, :pnfloor,
                NULL, NULL, NULL, :pnnut4, -- nut1, nut2, nut3 não são usados aqui
                :pnglat, :pnglong
            )
        """)
        result = session.execute(query, doc_data.model_dump()).scalar()
        return {'message': f'Documento interno criado com sucesso.', 'document_id': result}, 201


# ===================================================================
# NOVAS FUNÇÕES PARA AS VIEWS DE OPERAÇÃO
# ===================================================================

@api_error_handler
def get_operacao_meta_data(current_user):
    """
    Obtém dados das metas de operação usando repository
    """
    try:
        meta_repo = OperationMetaRepository()
        result = meta_repo.find_all(current_user)

        if result['success']:
            return {
                'name': 'Metas de Operação',
                'total': result['total'],
                'data': result['data'],
                'columns': result.get('columns', [])
            }
        else:
            current_app.logger.error(f"Erro ao buscar metas: {result.get('error')}")
            return {'name': 'Metas de Operação', 'total': 0, 'data': [], 'columns': []}

    except Exception as e:
        current_app.logger.error(f"Erro inesperado ao buscar metas: {str(e)}")
        return {'name': 'Metas de Operação', 'total': 0, 'data': [], 'columns': []}


@api_error_handler
def get_operacao_data(current_user, filters: Dict[str, Any] = None):
    """Obtém dados de todas as operações - USA vbl_operacao"""
    try:
        operations_repo = OperationsRepository()
        result = operations_repo.find_all(current_user, filters)
        return {
            'name': 'Operações',
            'total': result['total'],
            'data': result['data'],
            'columns': result.get('columns', [])
        } if result['success'] else {'name': 'Operações', 'total': 0, 'data': [], 'columns': []}
    except Exception as e:
        current_app.logger.error(f"Erro ao buscar operações: {str(e)}")
        return {'name': 'Operações', 'total': 0, 'data': [], 'columns': []}


@api_error_handler
def get_operacao_self_data(user_id: int, current_user: str):
    """
    Obtém tarefas do utilizador - USA vbl_operacao$self
    View retorna PKs (pk_*) + nomes (tt_*, tb_*, ts_*)
    Frontend pode usar metadados para lookups se necessário
    """
    try:
        operations_repo = OperationsRepository()
        result = operations_repo.find_today_tasks(user_id, current_user)
        return {
            'name': 'Minhas Tarefas de Hoje',
            'total': result['total'],
            'data': result['data'],
            'columns': result.get('columns', [])
        } if result['success'] else {'name': 'Minhas Tarefas de Hoje', 'total': 0, 'data': [], 'columns': []}
    except Exception as e:
        current_app.logger.error(f"Erro ao buscar tarefas: {str(e)}")
        return {'name': 'Minhas Tarefas de Hoje', 'total': 0, 'data': [], 'columns': []}


@api_error_handler
def create_operacao_meta(data: dict, current_user: str):
    """
    Cria uma nova meta de operação usando repository
    """
    try:
        # Validar dados com Pydantic
        meta_data = OperacaoMetaCreate.model_validate(data)

        # Usar repository para criar
        meta_repo = OperationMetaRepository()
        result = meta_repo.create(meta_data.model_dump(), current_user)

        if result['success']:
            return {'message': result['message'], 'pk': result['data']['pk']}, 201
        else:
            return {'error': result['error']}, 400

    except ValueError as e:
        current_app.logger.error(f"Erro de validação: {str(e)}")
        return {'error': f'Dados inválidos: {str(e)}'}, 400
    except Exception as e:
        current_app.logger.error(f"Erro inesperado ao criar meta: {str(e)}")
        return {'error': 'Erro interno do servidor'}, 500


@api_error_handler
def get_operacao_meta_by_id(meta_id: int, current_user: str):
    """
    Obtém uma meta de operação específica por ID usando repository
    """
    try:
        meta_repo = OperationMetaRepository()
        result = meta_repo.find_by_id(meta_id, current_user)

        if result['success']:
            return {'meta': result['data']}, 200
        else:
            raise ResourceNotFoundError('Meta de operação não encontrada.')

    except ResourceNotFoundError:
        raise
    except Exception as e:
        current_app.logger.error(f"Erro inesperado ao buscar meta por ID: {str(e)}")
        return {'error': 'Erro interno do servidor'}, 500


@api_error_handler
def update_operacao_meta(meta_id: int, data: dict, current_user: str):
    """
    Atualiza uma meta de operação existente usando repository
    """
    try:
        # Validar dados com Pydantic
        update_data = OperacaoMetaUpdate.model_validate(data)

        # Filtrar apenas campos que não são None
        clean_data = {k: v for k, v in update_data.model_dump().items() if v is not None}

        if not clean_data:
            return {'message': 'Nenhuma alteração fornecida'}, 200

        # Usar repository para atualizar
        meta_repo = OperationMetaRepository()
        result = meta_repo.update(meta_id, clean_data, current_user)

        if result['success']:
            return {'message': result['message']}, 200
        else:
            if 'não encontrado' in result['error']:
                raise ResourceNotFoundError('Meta de operação não encontrada.')
            return {'error': result['error']}, 400

    except ValueError as e:
        current_app.logger.error(f"Erro de validação: {str(e)}")
        return {'error': f'Dados inválidos: {str(e)}'}, 400
    except ResourceNotFoundError:
        raise
    except Exception as e:
        current_app.logger.error(f"Erro inesperado ao atualizar meta: {str(e)}")
        return {'error': 'Erro interno do servidor'}, 500


@api_error_handler
def get_analysis_parameters(operation_id: int, current_user: str):
    """
    Busca parâmetros de análise para operações do tipo 5 (analise)

    Retorna:
    - Registos já existentes (a posteriori) com resultado preenchido
    - Parâmetros que devem ser registados no local (sem resultado)

    Args:
        operation_id: ID da operação (tb_operacao)
        current_user: Session ID para db_session_manager

    Returns:
        Lista de parâmetros de análise com id_analise, ponto, parâmetro, forma, resultado
    """
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT
                    pk as id_analise,
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
                WHERE tb_operacao = :operation_id
                ORDER BY tt_analiseponto, tt_analiseparam
            """)

            result = session.execute(query, {'operation_id': operation_id})
            data = [dict(row._mapping) for row in result.fetchall()]

            current_app.logger.info(f"Parâmetros de análise encontrados para operação {operation_id}: {len(data)} parâmetros")

            return {
                'success': True,
                'data': data,
                'total': len(data)
            }

    except SQLAlchemyError as e:
        current_app.logger.error(f"Erro ao buscar parâmetros de análise para operação {operation_id}: {str(e)}")
        return {
            'success': False,
            'error': 'Erro ao buscar parâmetros de análise',
            'data': []
        }


@api_error_handler
def complete_task_operation(task_id: int, user_id: int, current_user: str, completion_data: dict):
    """Marca tarefa como concluída - USA vbf_operacao$self"""
    try:
        from datetime import datetime

        valuetext = completion_data.get('valuetext', '')

        with db_session_manager(current_user) as session:
            # Verificar permissão
            check_query = text("SELECT pk FROM vbl_operacao$self WHERE pk = :task_id")
            if not session.execute(check_query, {'task_id': task_id}).fetchone():
                return {'success': False, 'error': 'Tarefa não encontrada ou sem permissão'}

            # Atualizar
            update_query = text("UPDATE vbf_operacao$self SET valuetext = :valuetext WHERE pk = :task_id")
            session.execute(update_query, {'valuetext': valuetext, 'task_id': task_id})
            session.commit()

            return {
                'success': True,
                'message': 'Tarefa concluída com sucesso',
                'data': {
                    'task_id': task_id,
                    'completed_at': datetime.now().isoformat(),
                    'valuetext': valuetext
                }
            }

    except Exception as e:
        current_app.logger.error(f"Erro ao completar tarefa {task_id}: {str(e)}")
        return {'success': False, 'error': 'Erro ao completar tarefa'}


@api_error_handler
def delete_operacao_meta(meta_id: int, current_user: str):
    """
    Elimina uma meta de operação usando repository
    """
    try:
        meta_repo = OperationMetaRepository()
        result = meta_repo.delete(meta_id, current_user)

        if result['success']:
            return {'message': result['message']}, 200
        else:
            if 'não encontrado' in result['error']:
                raise ResourceNotFoundError('Meta de operação não encontrada.')
            return {'error': result['error']}, 400

    except ResourceNotFoundError:
        raise
    except Exception as e:
        current_app.logger.error(f"Erro inesperado ao eliminar meta: {str(e)}")
        return {'error': 'Erro interno do servidor'}, 500


# ===================================================================
# NOVAS FUNÇÕES PARA ANALYTICS E FUNCIONALIDADES AVANÇADAS
# ===================================================================

@api_error_handler
def get_operations_analytics(current_user: str, filters: Dict[str, Any] = None):
    """
    Obtém dados de analytics das operações
    """
    try:
        operations_repo = OperationsRepository()
        result = operations_repo.get_analytics_data(current_user, filters)

        if result['success']:
            return result['data'], 200
        else:
            return {'error': result['error']}, 400

    except Exception as e:
        current_app.logger.error(f"Erro ao calcular analytics: {str(e)}")
        return {'error': 'Erro ao calcular estatísticas'}, 500


@api_error_handler
def get_operations_by_operator(operator_id: int, current_user: str):
    """
    Obtém operações de um operador específico
    """
    try:
        operations_repo = OperationsRepository()
        result = operations_repo.find_by_operator(operator_id, current_user)

        if result['success']:
            return {
                'name': f'Operações do Operador {operator_id}',
                'total': result['total'],
                'data': result['data'],
                'columns': result.get('columns', [])
            }
        else:
            return {'error': result['error']}, 400

    except Exception as e:
        current_app.logger.error(f"Erro ao buscar operações por operador: {str(e)}")
        return {'error': 'Erro ao buscar operações'}, 500
