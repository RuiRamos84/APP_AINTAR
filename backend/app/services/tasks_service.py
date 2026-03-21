from sqlalchemy.sql import text
from flask import current_app
from datetime import datetime
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler, ResourceNotFoundError
from pydantic import BaseModel
from typing import Optional
from app.utils.logger import get_logger

logger = get_logger(__name__)



# ===================================================================
# MODELOS DE DADOS COM PYDANTIC
# ===================================================================

class TaskCreate(BaseModel):
    name: str
    ts_client: int
    ts_priority: int
    memo: Optional[str] = None

class TaskUpdate(TaskCreate):
    pass

class TaskNoteAdd(BaseModel):
    memo: str

class BulkTaskAction(BaseModel):
    task_ids: list[int]
    action: str  # 'close' | 'reopen' | 'status' | 'priority'
    status_id: Optional[int] = None
    priority_id: Optional[int] = None


@api_error_handler
def list_tasks(current_user):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_task")
        result = session.execute(query).mappings().all()
        return {'tasks': [dict(row) for row in result]}, 200


@api_error_handler
def create_task(data: dict, current_user: str):
    task_data = TaskCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_task_new(:name, :ts_client, :ts_priority, :memo)")
        result = session.execute(query, task_data.model_dump()).scalar()

        # Parsear XML retornado pela stored procedure
        # Formato: <result><sucess>144533</sucess><source>fbo_task_new</source></result>
        task_id = result
        if isinstance(result, str) and result.startswith('<result>'):
            import re
            match = re.search(r'<sucess>(\d+)</sucess>', result)
            if match:
                task_id = int(match.group(1))
                logger.info(f"✅ Task ID extraído do XML: {task_id}")
            else:
                logger.error(f"❌ Não foi possível extrair task_id do XML: {result}")

        logger.info(f"📝 Tarefa criada com ID: {task_id}")

        try:
            socketio_events = current_app.extensions.get('socketio_events')
            if socketio_events:
                socketio_events.emit_task_notification(task_id, current_user, notification_type='new_task')
        except Exception as e:
            logger.warning(f"Falha ao enviar notificação de nova tarefa via Socket.IO: {str(e)}")

        return {'message': 'Tarefa criada com sucesso', 'task_id': task_id}, 201


@api_error_handler
def add_task_note(task_id: int, data: dict, current_user: str):
    note_data = TaskNoteAdd.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_task_note_new(:pnpk, :pnmemo)")
        session.execute(query, {"pnpk": task_id, "pnmemo": note_data.memo})

        try:
            socketio_events = current_app.extensions.get('socketio_events')
            if socketio_events:
                socketio_events.emit_task_notification(task_id, current_user, notification_type='new_note')
        except Exception as e:
            logger.warning(f"Falha ao enviar notificação de nova nota via Socket.IO: {str(e)}")
        
        return {'message': 'Nota adicionada com sucesso'}, 201


@api_error_handler
def update_task(task_id: int, data: dict, current_user: str):
    task_data = TaskUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        check_query = text("SELECT ts_client FROM vbl_task WHERE pk = :task_id")
        task_check = session.execute(check_query, {"task_id": task_id}).fetchone()

        if not task_check:
            raise ResourceNotFoundError('Tarefa', task_id)

        old_client = task_check.ts_client

        query = text("SELECT fbo_task_update(:pnpk, :name, :ts_client, :ts_priority, :memo)")
        session.execute(query, {"pnpk": task_id, **task_data.model_dump()})

        if old_client != task_data.ts_client:
            note_query = text("SELECT fbo_task_note_new(:pnpk, :pnmemo)")
            session.execute(note_query, {"pnpk": task_id, "pnmemo": "Tarefa atribuída a um novo cliente"})

        try:
            socketio_events = current_app.extensions.get('socketio_events')
            if socketio_events:
                socketio_events.emit_task_notification(task_id, current_user, notification_type='task_update')
        except Exception as e:
            logger.warning(f"Falha ao enviar notificação de atualização de tarefa via Socket.IO: {str(e)}")

        return {'message': 'Tarefa atualizada com sucesso'}, 200


@api_error_handler
def close_task(task_id: int, current_user: str):
    with db_session_manager(current_user) as session:
        session.execute(text("SELECT fbo_task_close(:pnpk)"), {"pnpk": task_id})
        session.execute(text("SELECT fbo_task_note_new(:pnpk, :pnmemo)"), {"pnpk": task_id, "pnmemo": "Tarefa encerrada"})

        try:
            socketio_events = current_app.extensions.get('socketio_events')
            if socketio_events:
                socketio_events.emit_task_notification(task_id, current_user, notification_type='task_closed')
        except Exception as e:
            logger.warning(f"Falha ao enviar notificação de tarefa fechada via Socket.IO: {str(e)}")

        return {'message': 'Tarefa fechada com sucesso'}, 200


@api_error_handler
def reopen_task(task_id: int, current_user: str):
    with db_session_manager(current_user) as session:
        session.execute(text("SELECT fbo_task_open(:pnpk)"), {"pnpk": task_id})
        session.execute(text("SELECT fbo_task_note_new(:pnpk, :pnmemo)"), {"pnpk": task_id, "pnmemo": "Tarefa reaberta"})

        try:
            socketio_events = current_app.extensions.get('socketio_events')
            if socketio_events:
                socketio_events.emit_task_notification(task_id, current_user, notification_type='task_reopened')
        except Exception as e:
            logger.warning(f"Falha ao enviar notificação de tarefa reaberta via Socket.IO: {str(e)}")

        return {'message': 'Tarefa reaberta com sucesso'}, 200


@api_error_handler
def update_task_status(task_id: int, status_id: int, user_id: int, current_user: str):
    with db_session_manager(current_user) as session:
        # Log antes de executar
        logger.info(f"🔄 UPDATE_TASK_STATUS: task_id={task_id}, status_id={status_id}, user_id={user_id}, current_user={current_user}")

        query = text("SELECT fbo_task_status(:pnpk, :status_id)")
        result = session.execute(query, {"pnpk": task_id, "status_id": status_id}).scalar()

        logger.info(f"✅ Stored procedure fbo_task_status executada com sucesso para task_id={task_id}")
        logger.info(f"📦 Resultado da stored procedure: {result} (type: {type(result).__name__})")

        try:
            socketio_events = current_app.extensions.get('socketio_events')
            if socketio_events:
                logger.info(f"📡 Tentando emitir notificação Socket.IO para task_id={task_id}, session_id={current_user}, type=status_update")
                socketio_events.emit_task_notification(task_id, current_user, notification_type='status_update')
                logger.info(f"✅ emit_task_notification chamado com sucesso")
            else:
                logger.error(f"❌ socketio_events NÃO encontrado em current_app.extensions!")
        except Exception as e:
            logger.error(f"❌ ERRO ao enviar notificação de status de tarefa via Socket.IO: {str(e)}", exc_info=True)

        return {'message': 'Status da tarefa atualizado com sucesso'}, 200


@api_error_handler
def get_task_history(task_id: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_task_note WHERE tb_task = :task_id ORDER BY when_submit DESC")
        result = session.execute(query, {"task_id": task_id}).mappings().all()
        return {'history': [dict(row) for row in result]}, 200


def get_notification_count(current_user, user_id):
    """Retorna a contagem de notificações não lidas para um utilizador"""
    with db_session_manager(current_user) as session:
        query = text("""
        SELECT COUNT(*) FROM vbl_task 
        WHERE (owner = :user_id AND notification_owner = 1) OR (ts_client = :user_id AND notification_client = 1)
        """)
        result = session.execute(query, {"user_id": user_id}).scalar() or 0
        return result


@api_error_handler
def update_task_note_notification(task_id: int, current_user: str):
    """Marca todas as notificações de uma tarefa como lidas"""
    with db_session_manager(current_user) as session:
        task_query = text("SELECT owner, ts_client FROM vbl_task WHERE pk = :task_id")
        task = session.execute(task_query, {"task_id": task_id}).fetchone()

        if not task:
            raise ResourceNotFoundError('Tarefa', task_id)

        user_query = text("SELECT fs_client()")
        user_id = session.execute(user_query).scalar()

        is_owner = int(user_id) == task.owner
        is_client = int(user_id) == task.ts_client

        if is_owner and is_client:
            logger.info(f"Utilizador {user_id} é owner E client da tarefa {task_id}")
            update_query = text("""
                UPDATE tb_task 
                SET notification_owner = 0, notification_client = 0
                WHERE pk = :task_id
            """)
            session.execute(update_query, {"task_id": task_id})
            notes_query = text("""
                UPDATE tb_task_note
                SET notification_owner = 0, notification_client = 0
                WHERE tb_task = :task_id
            """)
            session.execute(notes_query, {"task_id": task_id})
        else:
            notes_query = text("SELECT pk FROM vbl_task_note WHERE tb_task = :task_id ORDER BY when_submit DESC")
            notes = session.execute(notes_query, {"task_id": task_id}).all()
            for note in notes:
                note_query = text("SELECT fbo_task_note_notification(:note_id)")
                session.execute(note_query, {"note_id": note.pk})

        try:
            socketio_events = current_app.extensions.get('socketio_events')
            if socketio_events:
                socketio_events.emit_task_notification_count(user_id, current_user)
        except Exception as e:
            logger.warning(f"Falha ao enviar atualização de contagem de notificação via Socket.IO: {str(e)}")
        
        return {'message': 'Notificações atualizadas com sucesso'}, 200


def bulk_task_action_service(data: dict, current_user: str):
    """Executa uma ação em massa sobre um conjunto de tarefas."""
    bulk_data = BulkTaskAction.model_validate(data)

    if bulk_data.action not in ('close', 'reopen', 'status', 'priority'):
        return {'message': 'Ação inválida', 'succeeded': [], 'failed': []}, 400

    if bulk_data.action == 'status' and bulk_data.status_id is None:
        return {'message': 'status_id obrigatório para ação "status"', 'succeeded': [], 'failed': []}, 400

    if bulk_data.action == 'priority' and bulk_data.priority_id is None:
        return {'message': 'priority_id obrigatório para ação "priority"', 'succeeded': [], 'failed': []}, 400

    succeeded = []
    failed = []

    _notification_type_map = {
        'close': 'task_closed',
        'reopen': 'task_reopened',
        'status': 'status_update',
        'priority': 'task_update',
    }

    for task_id in bulk_data.task_ids:
        try:
            with db_session_manager(current_user) as session:
                if bulk_data.action == 'close':
                    session.execute(text("SELECT fbo_task_close(:pnpk)"), {"pnpk": task_id})
                    session.execute(text("SELECT fbo_task_note_new(:pnpk, :pnmemo)"),
                                    {"pnpk": task_id, "pnmemo": "Tarefa encerrada (ação em massa)"})

                elif bulk_data.action == 'reopen':
                    session.execute(text("SELECT fbo_task_open(:pnpk)"), {"pnpk": task_id})
                    session.execute(text("SELECT fbo_task_note_new(:pnpk, :pnmemo)"),
                                    {"pnpk": task_id, "pnmemo": "Tarefa reaberta (ação em massa)"})

                elif bulk_data.action == 'status':
                    session.execute(text("SELECT fbo_task_status(:pnpk, :status_id)"),
                                    {"pnpk": task_id, "status_id": bulk_data.status_id})

                elif bulk_data.action == 'priority':
                    task = session.execute(
                        text("SELECT name, ts_client, memo FROM vbl_task WHERE pk = :pk"),
                        {"pk": task_id}
                    ).fetchone()
                    if not task:
                        failed.append(task_id)
                        continue
                    session.execute(
                        text("SELECT fbo_task_update(:pnpk, :name, :ts_client, :ts_priority, :memo)"),
                        {"pnpk": task_id, "name": task.name, "ts_client": task.ts_client,
                         "ts_priority": bulk_data.priority_id, "memo": task.memo}
                    )

            succeeded.append(task_id)

            try:
                socketio_events = current_app.extensions.get('socketio_events')
                if socketio_events:
                    socketio_events.emit_task_notification(
                        task_id, current_user,
                        notification_type=_notification_type_map[bulk_data.action]
                    )
            except Exception as e:
                logger.warning(f"Falha ao enviar notificação Socket.IO para task {task_id}: {str(e)}")

        except Exception as e:
            logger.error(f"Erro na ação em massa para task {task_id}: {str(e)}")
            failed.append(task_id)

    total = len(succeeded)
    return {
        'message': f'{total} tarefa(s) processada(s) com sucesso',
        'succeeded': succeeded,
        'failed': failed,
    }, 200
