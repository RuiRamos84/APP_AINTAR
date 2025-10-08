from flask import current_app, request
from sqlalchemy.sql import text
from sqlalchemy.exc import SQLAlchemyError
from ..utils.utils import db_session_manager
from ..utils.error_handler import api_error_handler
from pydantic import BaseModel, field_validator
from typing import Optional
import os


class OperationControlQuery(BaseModel):
    """Filtros para consulta de controlo de operações"""
    tb_instalacao: int  # PK da instalação
    last_days: int = 10  # Quantos dias atrás pesquisar


class OperationControlUpdate(BaseModel):
    """Dados para atualizar controlo de operação"""
    pk: int
    control_check: int  # 0 ou 1
    control_tt_operacaocontrolo: Optional[int] = None
    control_memo: Optional[str] = None
    control_foto: Optional[str] = None


@api_error_handler
def query_operation_control(filters: dict, current_user: str):
    """
    Consultar tarefas de operação para controlo

    Args:
        filters: Dict com tb_instalacao e last_days
        current_user: Session ID para db_session_manager

    Returns:
        Lista de tarefas dos últimos N dias da instalação
    """
    try:
        # Validar filtros
        query_data = OperationControlQuery.model_validate(filters)

        with db_session_manager(current_user) as session:
            # Log dos parâmetros recebidos
            current_app.logger.info(
                f"Controlquery - Instalação: {query_data.tb_instalacao}, Last Days: {query_data.last_days}"
            )

            query = text("""
                SELECT * FROM fbo_operacao$controlquery(:tb_instalacao, :last_days)
            """)

            result = session.execute(query, {
                'tb_instalacao': query_data.tb_instalacao,
                'last_days': query_data.last_days
            })

            # Converter para lista de dicts
            columns = result.keys()
            data = [dict(zip(columns, row)) for row in result.fetchall()]

            # fbo_operacao$controlquery já retorna tt_operacaoaccao_refvalue resolvido
            # Não é necessário fazer query adicional

            # Log detalhado do resultado
            if data:
                current_app.logger.info(
                    f"Controlo: {len(data)} tarefas encontradas. Primeira tarefa data: {data[0].get('data')}, Última: {data[-1].get('data')}"
                )
            else:
                current_app.logger.info(
                    f"Controlo: Nenhuma tarefa encontrada para instalação {query_data.tb_instalacao}"
                )

            return {
                'success': True,
                'data': data,
                'total': len(data)
            }, 200

    except ValueError as e:
        current_app.logger.error(f"Erro de validação: {str(e)}")
        return {'error': f'Dados inválidos: {str(e)}'}, 400
    except SQLAlchemyError as e:
        current_app.logger.error(f"Erro ao consultar controlo: {str(e)}")
        return {'error': 'Erro ao consultar tarefas de controlo'}, 500
    except Exception as e:
        current_app.logger.error(f"Erro inesperado: {str(e)}")
        return {'error': 'Erro interno do servidor'}, 500


@api_error_handler
def update_operation_control(data: dict, current_user: str):
    """
    Atualizar controlo de uma tarefa de operação com suporte a arquivos

    Args:
        data: Dict com pk, control_check, control_tt_operacaocontrolo, control_memo, control_foto
        current_user: Session ID para db_session_manager

    Returns:
        PK da tarefa atualizada
    """
    try:
        # Extrair dados do formulário
        pk = int(data.get('pk'))
        control_check = int(data.get('control_check', 0))

        # Converter string vazia para None (NULL no banco)
        control_tt_operacaocontrolo = data.get('control_tt_operacaocontrolo')
        if control_tt_operacaocontrolo == '' or control_tt_operacaocontrolo == 'null':
            control_tt_operacaocontrolo = None
        elif control_tt_operacaocontrolo is not None:
            control_tt_operacaocontrolo = int(control_tt_operacaocontrolo)

        control_memo = data.get('control_memo', '')
        control_foto = data.get('control_foto', '')

        # Processar arquivos se existirem
        files = request.files.getlist('files')
        file_paths = []

        if files and len(files) > 0:
            # Criar pasta Operação_(pk)
            base_path = current_app.config.get('FILES_DIR', '/app/files')
            operation_folder = os.path.join(base_path, f'Operação_{pk}')
            os.makedirs(operation_folder, exist_ok=True)

            # Salvar cada arquivo
            for i, file in enumerate(files[:5]):  # Máximo 5 arquivos
                if file.filename:
                    # Gerar nome único
                    name, ext = os.path.splitext(file.filename)
                    safe_filename = f"{i+1}_{file.filename}"
                    file_path = os.path.join(operation_folder, safe_filename)

                    file.save(file_path)
                    os.chmod(file_path, 0o644)
                    file_paths.append(safe_filename)

                    current_app.logger.info(f"Arquivo salvo: {file_path}")

            # Atualizar control_foto com lista de arquivos
            if file_paths:
                control_foto = ','.join(file_paths)

        with db_session_manager(current_user) as session:
            query = text("""
                SELECT fbo_operacao$controlupdate(
                    :pk,
                    :control_check,
                    :control_tt_operacaocontrolo,
                    :control_memo,
                    :control_foto
                )
            """)

            result = session.execute(query, {
                'pk': pk,
                'control_check': control_check,
                'control_tt_operacaocontrolo': control_tt_operacaocontrolo,
                'control_memo': control_memo,
                'control_foto': control_foto
            })

            session.commit()
            updated_pk = result.scalar()

            current_app.logger.info(
                f"Controlo atualizado: tarefa {updated_pk}, check={control_check}, arquivos={len(file_paths)}"
            )

            return {
                'success': True,
                'message': 'Controlo atualizado com sucesso',
                'pk': updated_pk,
                'files_saved': len(file_paths)
            }, 200

    except ValueError as e:
        current_app.logger.error(f"Erro de validação: {str(e)}")
        return {'error': f'Dados inválidos: {str(e)}'}, 400
    except SQLAlchemyError as e:
        current_app.logger.error(f"Erro ao atualizar controlo: {str(e)}")
        return {'error': 'Erro ao atualizar controlo'}, 500
    except Exception as e:
        current_app.logger.error(f"Erro inesperado: {str(e)}")
        return {'error': 'Erro interno do servidor'}, 500


@api_error_handler
def get_municipalities(current_user: str):
    """
    Obter lista de municípios/associados

    Returns:
        Lista de municípios com pk e value
    """
    try:
        with db_session_manager(current_user) as session:
            # Ajustar conforme a view/tabela de municípios
            query = text("""
                SELECT DISTINCT
                    pk,
                    value
                FROM vbl_instalacao_municipio
                ORDER BY value
            """)

            result = session.execute(query)
            data = [{'pk': row[0], 'value': row[1]} for row in result.fetchall()]

            return {
                'success': True,
                'data': data,
                'total': len(data)
            }, 200

    except SQLAlchemyError as e:
        current_app.logger.error(f"Erro ao buscar municípios: {str(e)}")
        return {'error': 'Erro ao buscar municípios'}, 500


@api_error_handler
def get_installation_types(current_user: str):
    """
    Obter tipos de instalação (ETAR, EE, etc)

    Returns:
        Lista de tipos com pk e value
    """
    try:
        with db_session_manager(current_user) as session:
            # Ajustar conforme a view/tabela de tipos
            query = text("""
                SELECT DISTINCT
                    pk,
                    value
                FROM vbl_instalacao_tipo
                ORDER BY value
            """)

            result = session.execute(query)
            data = [{'pk': row[0], 'value': row[1]} for row in result.fetchall()]

            return {
                'success': True,
                'data': data,
                'total': len(data)
            }, 200

    except SQLAlchemyError as e:
        current_app.logger.error(f"Erro ao buscar tipos de instalação: {str(e)}")
        return {'error': 'Erro ao buscar tipos'}, 500


@api_error_handler
def get_installations(municipio_pk: int, tipo_pk: int, current_user: str):
    """
    Obter instalações filtradas por município e tipo

    Args:
        municipio_pk: PK do município
        tipo_pk: PK do tipo de instalação
        current_user: Session ID

    Returns:
        Lista de instalações com pk e value
    """
    try:
        with db_session_manager(current_user) as session:
            # Ajustar conforme estrutura da view de instalações
            query = text("""
                SELECT
                    pk,
                    value
                FROM vbl_instalacao
                WHERE pk_municipio = :municipio_pk
                AND pk_tipo = :tipo_pk
                ORDER BY value
            """)

            result = session.execute(query, {
                'municipio_pk': municipio_pk,
                'tipo_pk': tipo_pk
            })
            data = [{'pk': row[0], 'value': row[1]} for row in result.fetchall()]

            return {
                'success': True,
                'data': data,
                'total': len(data)
            }, 200

    except SQLAlchemyError as e:
        current_app.logger.error(f"Erro ao buscar instalações: {str(e)}")
        return {'error': 'Erro ao buscar instalações'}, 500
