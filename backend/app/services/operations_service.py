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
from app.utils.logger import get_logger

logger = get_logger(__name__)



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


class OperacaoCreate(BaseModel):
    """Dados para criar operação (execução real) via vbf_operacao"""
    data: date = Field(..., description="Data da operação")
    descr: Optional[str] = Field(None, description="Descrição (facultativo)")
    tt_operacaomodo: int = Field(..., gt=0, description="ID do modo de operação")
    tb_instalacao: int = Field(..., gt=0, description="ID da instalação")
    ts_operador1: int = Field(..., gt=0, description="ID do operador principal")
    ts_operador2: Optional[int] = Field(None, description="ID do operador secundário (opcional)")
    tt_operacaoaccao: int = Field(..., gt=0, description="ID da ação")

    @validator('ts_operador2')
    def validate_operator2_different(cls, v, values):
        if v is not None and 'ts_operador1' in values and v == values['ts_operador1']:
            raise ValueError('Operador secundário deve ser diferente do principal')
        return v


class OperacaoUpdate(BaseModel):
    """Dados para atualizar operação - APENAS valuetext e valuememo permitidos"""
    valuetext: Optional[str] = Field(None, description="Texto de resposta/resultado")
    valuememo: Optional[str] = Field(None, description="Observações adicionais (facultativo)")

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
                logger.warning(f"A view {friendly_name} ({view_name}) não foi encontrada ou gerou um erro: {str(e)}")
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
def get_operacao_meta_data(current_user, filters=None):
    """
    Obtém dados das metas de operação com paginação e pesquisa
    """
    try:
        meta_repo = OperationMetaRepository()
        result = meta_repo.find_all(current_user, filters)

        if result['success']:
            return {
                'name': 'Metas de Operação',
                'total': result['total'],
                'data': result['data'],
                'columns': result.get('columns', [])
            }
        else:
            logger.error(f"Erro ao buscar metas: {result.get('error')}")
            return {'name': 'Metas de Operação', 'total': 0, 'data': [], 'columns': []}

    except Exception as e:
        logger.error(f"Erro inesperado ao buscar metas: {str(e)}")
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
        logger.error(f"Erro ao buscar operações: {str(e)}")
        return {'name': 'Operações', 'total': 0, 'data': [], 'columns': []}


@api_error_handler
def get_operacao_self_data(user_id: int, current_user: str):
    """
    Obtém tarefas do utilizador - USA vbl_operacao$self
    View retorna PKs (pk_*) + nomes (tt_*, tb_*, ts_*)
    Inclui stats: total_assigned e total_completed do operador
    """
    try:
        operations_repo = OperationsRepository()
        result = operations_repo.find_today_tasks(user_id, current_user)
        if result['success']:
            return {
                'name': 'Minhas Tarefas de Hoje',
                'total': result['total'],
                'data': result['data'],
                'completed': result.get('completed', []),
                'stats': result.get('stats', {}),
                'columns': result.get('columns', [])
            }
        return {
            'name': 'Minhas Tarefas de Hoje',
            'total': 0,
            'data': [],
            'completed': [],
            'stats': {'total_assigned': 0, 'total_completed': 0},
            'columns': []
        }
    except Exception as e:
        logger.error(f"Erro ao buscar tarefas: {str(e)}")
        return {
            'name': 'Minhas Tarefas de Hoje',
            'total': 0,
            'data': [],
            'completed': [],
            'stats': {'total_assigned': 0, 'total_completed': 0},
            'columns': []
        }


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
        logger.error(f"Erro de validação: {str(e)}")
        return {'error': f'Dados inválidos: {str(e)}'}, 400
    except Exception as e:
        logger.error(f"Erro inesperado ao criar meta: {str(e)}")
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
        logger.error(f"Erro inesperado ao buscar meta por ID: {str(e)}")
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
        logger.error(f"Erro de validação: {str(e)}")
        return {'error': f'Dados inválidos: {str(e)}'}, 400
    except ResourceNotFoundError:
        raise
    except Exception as e:
        logger.error(f"Erro inesperado ao atualizar meta: {str(e)}")
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

            logger.info(f"Parâmetros de análise encontrados para operação {operation_id}: {len(data)} parâmetros")

            return {
                'success': True,
                'data': data,
                'total': len(data)
            }

    except SQLAlchemyError as e:
        logger.error(f"Erro ao buscar parâmetros de análise para operação {operation_id}: {str(e)}")
        return {
            'success': False,
            'error': 'Erro ao buscar parâmetros de análise',
            'data': []
        }


@api_error_handler
def complete_task_operation(task_id: int, user_id: int, current_user: str, completion_data: dict):
    """
    Marca tarefa como concluída - USA vbf_operacao$self

    Suporta:
    - valuetext: Resultado principal
    - valuememo: Comentário adicional
    - photo: Foto anexada (Flask FileStorage)
    """
    try:
        from datetime import datetime
        from .operations.attachments import save_operation_photo

        valuetext = completion_data.get('valuetext', '')
        valuememo = completion_data.get('valuememo', '')
        photo = completion_data.get('photo', None)

        with db_session_manager(current_user) as session:
            # 1. Verificar permissão e obter dados da tarefa
            check_query = text("""
                SELECT pk, tb_instalacao
                FROM "vbl_operacao$self"
                WHERE pk = :task_id
            """)
            task = session.execute(check_query, {'task_id': task_id}).fetchone()

            if not task:
                return {'success': False, 'error': 'Tarefa não encontrada ou sem permissão'}

            instalacao_nome = task.tb_instalacao
            photo_path = None

            # 2. Guardar foto se fornecida
            if photo:
                try:
                    photo_path = save_operation_photo(
                        photo_file=photo,
                        operation_pk=task_id,
                        instalacao_nome=instalacao_nome,
                        current_user=current_user
                    )
                    logger.info(f"Foto guardada para operação {task_id}: {photo_path}")
                except Exception as photo_error:
                    logger.error(f"Erro ao guardar foto: {str(photo_error)}")
                    # Continuar sem a foto - não deve bloquear a conclusão
                    photo_path = None

            # 3. Atualizar tarefa com resultado, comentário e caminho da foto
            update_fields = ['valuetext = :valuetext']
            params = {'valuetext': valuetext, 'task_id': task_id}

            if valuememo:
                update_fields.append('valuememo = :valuememo')
                params['valuememo'] = valuememo

            if photo_path:
                update_fields.append('photo_path = :photo_path')
                params['photo_path'] = photo_path

            update_query = text(f"""
                UPDATE vbf_operacao
                SET {', '.join(update_fields)}
                WHERE pk = :task_id
            """)

            result = session.execute(update_query, params)
            rows_affected = result.rowcount
            logger.info(f"UPDATE vbf_operacao pk={task_id}: {rows_affected} linhas afetadas, valuetext='{valuetext}'")

            if rows_affected == 0:
                logger.warning(f"UPDATE vbf_operacao não afetou nenhuma linha para pk={task_id}")
                return {'success': False, 'error': 'Tarefa não pôde ser atualizada'}

            session.commit()

            response_data = {
                'task_id': task_id,
                'completed_at': datetime.now().isoformat(),
                'valuetext': valuetext
            }

            if valuememo:
                response_data['valuememo'] = valuememo
            if photo_path:
                response_data['photo_path'] = photo_path

            return {
                'success': True,
                'message': 'Tarefa concluída com sucesso',
                'data': response_data
            }

    except Exception as e:
        logger.error(f"Erro ao completar tarefa {task_id}: {str(e)}")
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
        logger.error(f"Erro inesperado ao eliminar meta: {str(e)}")
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
        logger.error(f"Erro ao calcular analytics: {str(e)}")
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
        logger.error(f"Erro ao buscar operações por operador: {str(e)}")
        return {'error': 'Erro ao buscar operações'}, 500


# ===================================================================
# FUNÇÕES PARA CRIAR/ATUALIZAR OPERAÇÕES (EXECUÇÕES REAIS)
# ===================================================================

@api_error_handler
def create_operacao(data: dict, current_user: str):
    """
    Criar nova operação (execução real) via vbf_operacao

    Campos obrigatórios:
    - data: Data da operação
    - tt_operacaomodo: Modo de operação
    - tb_instalacao: Instalação
    - ts_operador1: Operador principal
    - tt_operacaoaccao: Ação

    Campos opcionais:
    - descr: Descrição
    - ts_operador2: Operador secundário
    """
    try:
        # Validar dados com Pydantic
        operacao_data = OperacaoCreate.model_validate(data)

        with db_session_manager(current_user) as session:
            # INSERT via view vbf_operacao
            # NOTA: A função fbf_operacao precisa de ser corrigida no PostgreSQL
            #       para não duplicar a coluna tb_instalacao
            query = text("""
                INSERT INTO vbf_operacao
                    (data, descr, tt_operacaomodo, tb_instalacao,
                     ts_operador1, ts_operador2, tt_operacaoaccao)
                VALUES
                    (:data, :descr, :tt_operacaomodo, :tb_instalacao,
                     :ts_operador1, :ts_operador2, :tt_operacaoaccao)
            """)

            session.execute(query, operacao_data.model_dump())
            session.commit()

            logger.info(f"Operação criada com sucesso")

            return {
                'success': True,
                'message': 'Operação criada com sucesso'
            }, 201

    except ValueError as e:
        logger.error(f"Erro de validação ao criar operação: {str(e)}")
        return {'success': False, 'error': f'Dados inválidos: {str(e)}'}, 400
    except SQLAlchemyError as e:
        logger.error(f"Erro de BD ao criar operação: {str(e)}")
        return {'success': False, 'error': 'Erro ao criar operação'}, 500
    except Exception as e:
        logger.error(f"Erro inesperado ao criar operação: {str(e)}")
        return {'success': False, 'error': 'Erro interno do servidor'}, 500


@api_error_handler
def update_operacao(operacao_id: int, data: dict, current_user: str):
    """
    Atualizar operação (execução real) via vbf_operacao

    APENAS permite atualizar:
    - valuetext: Texto de resposta/resultado
    - valuememo: Observações adicionais

    Todos os outros campos são IMUTÁVEIS após criação
    """
    try:
        # Validar dados com Pydantic - apenas valuetext e valuememo
        update_data = OperacaoUpdate.model_validate(data)

        # Filtrar campos None
        clean_data = {k: v for k, v in update_data.model_dump().items() if v is not None}

        if not clean_data:
            return {
                'success': True,
                'message': 'Nenhum campo para atualizar'
            }, 200

        with db_session_manager(current_user) as session:
            # Verificar se operação existe
            check_query = text("SELECT pk FROM vbf_operacao WHERE pk = :pk")
            exists = session.execute(check_query, {'pk': operacao_id}).fetchone()

            if not exists:
                return {
                    'success': False,
                    'error': 'Operação não encontrada'
                }, 404

            # Montar UPDATE apenas com campos permitidos
            set_clause = ", ".join([f"{key} = :{key}" for key in clean_data.keys()])
            update_query = text(f"""
                UPDATE vbf_operacao
                SET {set_clause}
                WHERE pk = :pk
            """)

            session.execute(update_query, {**clean_data, 'pk': operacao_id})
            session.commit()

            logger.info(f"Operação {operacao_id} atualizada: {list(clean_data.keys())}")

            return {
                'success': True,
                'message': 'Operação atualizada com sucesso',
                'updated_fields': list(clean_data.keys())
            }, 200

    except ValueError as e:
        logger.error(f"Erro de validação ao atualizar operação {operacao_id}: {str(e)}")
        return {'success': False, 'error': f'Dados inválidos: {str(e)}'}, 400
    except SQLAlchemyError as e:
        logger.error(f"Erro de BD ao atualizar operação {operacao_id}: {str(e)}")
        return {'success': False, 'error': 'Erro ao atualizar operação'}, 500
    except Exception as e:
        logger.error(f"Erro inesperado ao atualizar operação {operacao_id}: {str(e)}")
        return {'success': False, 'error': 'Erro interno do servidor'}, 500
