from flask import current_app, request
from sqlalchemy.sql import text
from sqlalchemy.exc import SQLAlchemyError
from ..utils.utils import db_session_manager
from ..utils.error_handler import api_error_handler
from pydantic import BaseModel
from typing import Optional
import os
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _emit_operacao_notif(notification_type: str, title: str, message: str,
                         user_ids: list, meta_pk: int = None, operacao_pk: int = None):
    """Helper para emitir notificação de operação via Socket.IO (falha silenciosamente)."""
    try:
        socketio_events = current_app.extensions.get('socketio_events')
        if socketio_events:
            socketio_events.emit_operacao_notification(
                user_ids=[uid for uid in user_ids if uid],
                notification_type=notification_type,
                title=title,
                message=message,
                meta_pk=meta_pk,
                operacao_pk=operacao_pk,
            )
    except Exception as e:
        logger.warning(f"[OperaçãoNotif] Falha ao emitir '{notification_type}': {e}")


class OperationControlQuery(BaseModel):
    """Filtros para consulta de controlo de operações"""
    tb_instalacao: int
    last_days: int = 10


@api_error_handler
def query_operation_control(filters: dict, current_user: str):
    """Consultar tarefas de operação para controlo"""
    try:
        query_data = OperationControlQuery.model_validate(filters)

        with db_session_manager(current_user) as session:
            logger.info(
                f"Controlquery - Instalação: {query_data.tb_instalacao}, Last Days: {query_data.last_days}"
            )

            result = session.execute(
                text('SELECT * FROM "fbo_operacao$controlquery"(:tb_instalacao, :last_days)'),
                {'tb_instalacao': query_data.tb_instalacao, 'last_days': query_data.last_days}
            )

            columns = result.keys()
            data = [dict(zip(columns, row)) for row in result.fetchall()]

            logger.info(f"Controlo: {len(data)} tarefas encontradas para instalação {query_data.tb_instalacao}")

            return {'success': True, 'data': data, 'total': len(data)}, 200

    except ValueError as e:
        logger.error(f"Erro de validação: {str(e)}")
        return {'error': f'Dados inválidos: {str(e)}'}, 400
    except SQLAlchemyError as e:
        logger.error(f"Erro ao consultar controlo: {str(e)}")
        return {'error': 'Erro ao consultar tarefas de controlo'}, 500
    except Exception as e:
        logger.error(f"Erro inesperado: {str(e)}")
        return {'error': 'Erro interno do servidor'}, 500


@api_error_handler
def update_operation_control(data: dict, current_user: str):
    """
    Atualizar controlo de uma tarefa de operação.
    Ficheiros são guardados no disco e registados em tb_operacao_annex (type=2).
    """
    try:
        pk = int(data.get('pk'))

        control_tt_operacaocontrolo = data.get('control_tt_operacaocontrolo')
        if control_tt_operacaocontrolo in ('', 'null', None):
            control_tt_operacaocontrolo = None
        else:
            control_tt_operacaocontrolo = int(control_tt_operacaocontrolo)

        control_memo = data.get('control_memo', '')

        # Atualizar dados de controlo via função 3-param
        operador_pk = None
        instalacao_nome = ''
        with db_session_manager(current_user) as session:
            # Obter operador e instalação antes do update para notificação
            op_row = session.execute(text(
                "SELECT pk_operador1, tb_instalacao FROM vbl_operacao WHERE pk = :pk"
            ), {'pk': pk}).fetchone()
            if op_row:
                operador_pk = op_row.pk_operador1
                instalacao_nome = op_row.tb_instalacao or ''

            result = session.execute(
                text("""
                    SELECT "fbo_operacao$controlupdate"(
                        CAST(:pk AS integer),
                        CAST(:control_tt_operacaocontrolo AS integer),
                        CAST(:control_memo AS text)
                    )
                """),
                {
                    'pk': pk,
                    'control_tt_operacaocontrolo': control_tt_operacaocontrolo,
                    'control_memo': control_memo,
                }
            )
            updated_pk = result.scalar()
            session.commit()
            logger.info(f"Controlo atualizado: tarefa {updated_pk}")

        # Notificar operador após validação
        if operador_pk:
            _emit_operacao_notif(
                notification_type='tarefa_validada',
                title='Tarefa validada',
                message=f'A sua execução em {instalacao_nome or "instalação"} foi validada pelo supervisor.',
                user_ids=[operador_pk],
                operacao_pk=pk,
            )

        # Processar e registar ficheiros em tb_operacao_annex
        files = request.files.getlist('files')
        files_saved = 0

        if files:
            base_path = current_app.config.get('FILES_DIR', '/app/files')
            operation_folder = os.path.join(base_path, f'Operação_{pk}')
            os.makedirs(operation_folder, exist_ok=True)

            with db_session_manager(current_user) as session:
                for i, file in enumerate(files[:5]):
                    if not file.filename:
                        continue

                    safe_filename = f"{i + 1}_{file.filename}"
                    file_path = os.path.join(operation_folder, safe_filename)
                    file.save(file_path)
                    os.chmod(file_path, 0o644)
                    logger.info(f"Arquivo salvo: {file_path}")

                    # Registar em tb_operacao_annex (type=2 = anexo de controlo)
                    new_pk = session.execute(text("SELECT fs_nextcode()")).scalar()
                    session.execute(
                        text("""
                            SELECT fbf_operacao_annex(
                                0,
                                CAST(:new_pk AS integer),
                                CAST(:tb_operacao AS integer),
                                2,
                                CAST(current_timestamp AS timestamp),
                                CAST(:descr AS text),
                                CAST(:filename AS text)
                            )
                        """),
                        {
                            'new_pk': new_pk,
                            'tb_operacao': pk,
                            'descr': file.filename,
                            'filename': safe_filename,
                        }
                    )
                    files_saved += 1

                session.commit()

        return {
            'success': True,
            'message': 'Controlo atualizado com sucesso',
            'pk': pk,
            'files_saved': files_saved,
        }, 200

    except ValueError as e:
        logger.error(f"Erro de validação: {str(e)}")
        return {'error': f'Dados inválidos: {str(e)}'}, 400
    except SQLAlchemyError as e:
        logger.error(f"Erro ao atualizar controlo: {str(e)}")
        return {'error': 'Erro ao atualizar controlo'}, 500
    except Exception as e:
        logger.error(f"Erro inesperado: {str(e)}")
        return {'error': 'Erro interno do servidor'}, 500


@api_error_handler
def get_control_annexes(operation_pk: int, current_user: str):
    """Listar todos os anexos de uma operação (tb_operacao_annex)"""
    try:
        with db_session_manager(current_user) as session:
            result = session.execute(
                text("""
                    SELECT pk, tb_operacao, type, data, descr, filename
                    FROM vbl_operacao_annex
                    WHERE tb_operacao = :pk
                    ORDER BY data
                """),
                {'pk': operation_pk}
            )
            columns = result.keys()
            data = [dict(zip(columns, row)) for row in result.fetchall()]
            return {'success': True, 'data': data, 'total': len(data)}, 200

    except SQLAlchemyError as e:
        logger.error(f"Erro ao buscar anexos: {str(e)}")
        return {'error': 'Erro ao buscar anexos'}, 500
    except Exception as e:
        logger.error(f"Erro inesperado: {str(e)}")
        return {'error': 'Erro interno do servidor'}, 500


@api_error_handler
def get_annex_file_info(annex_pk: int, current_user: str):
    """Obter informação de um anexo para servir o ficheiro"""
    try:
        with db_session_manager(current_user) as session:
            row = session.execute(
                text("SELECT tb_operacao, filename, descr FROM vbl_operacao_annex WHERE pk = :pk"),
                {'pk': annex_pk}
            ).fetchone()

            if not row:
                return {'error': 'Anexo não encontrado'}, 404

            tb_operacao, filename, descr = row
            return {
                'success': True,
                'tb_operacao': tb_operacao,
                'filename': filename,
                'descr': descr or filename,
            }, 200

    except SQLAlchemyError as e:
        logger.error(f"Erro ao buscar info do anexo: {str(e)}")
        return {'error': 'Erro ao buscar anexo'}, 500
    except Exception as e:
        logger.error(f"Erro inesperado: {str(e)}")
        return {'error': 'Erro interno do servidor'}, 500


@api_error_handler
def get_municipalities(current_user: str):
    """Obter lista de municípios/associados"""
    try:
        with db_session_manager(current_user) as session:
            result = session.execute(
                text("SELECT DISTINCT pk, value FROM vbl_instalacao_municipio ORDER BY value")
            )
            data = [{'pk': row[0], 'value': row[1]} for row in result.fetchall()]
            return {'success': True, 'data': data, 'total': len(data)}, 200

    except SQLAlchemyError as e:
        logger.error(f"Erro ao buscar municípios: {str(e)}")
        return {'error': 'Erro ao buscar municípios'}, 500


@api_error_handler
def get_installation_types(current_user: str):
    """Obter tipos de instalação (ETAR, EE, etc)"""
    try:
        with db_session_manager(current_user) as session:
            result = session.execute(
                text("SELECT DISTINCT pk, value FROM vbl_instalacao_tipo ORDER BY value")
            )
            data = [{'pk': row[0], 'value': row[1]} for row in result.fetchall()]
            return {'success': True, 'data': data, 'total': len(data)}, 200

    except SQLAlchemyError as e:
        logger.error(f"Erro ao buscar tipos de instalação: {str(e)}")
        return {'error': 'Erro ao buscar tipos'}, 500


@api_error_handler
def get_installations(municipio_pk: int, tipo_pk: int, current_user: str):
    """Obter instalações filtradas por município e tipo"""
    try:
        with db_session_manager(current_user) as session:
            result = session.execute(
                text("""
                    SELECT pk, value FROM vbl_instalacao
                    WHERE pk_municipio = :municipio_pk AND pk_tipo = :tipo_pk
                    ORDER BY value
                """),
                {'municipio_pk': municipio_pk, 'tipo_pk': tipo_pk}
            )
            data = [{'pk': row[0], 'value': row[1]} for row in result.fetchall()]
            return {'success': True, 'data': data, 'total': len(data)}, 200

    except SQLAlchemyError as e:
        logger.error(f"Erro ao buscar instalações: {str(e)}")
        return {'error': 'Erro ao buscar instalações'}, 500
