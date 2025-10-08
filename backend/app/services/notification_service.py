from flask import current_app
from sqlalchemy import text
from datetime import datetime
from ..utils.utils import db_session_manager

class NotificationService:
    """Serviço para gerir a lógica de negócio de notificações."""

    def get_notification_count(self, session_id: str) -> int:
        """Obtém a contagem de notificações para o utilizador da sessão."""
        with db_session_manager(session_id) as session:
            result = session.execute(text("SELECT fsf_client_notificationcount()"))
            return result.scalar() or 0

    def mark_notification_as_read(self, document_id: int, session_id: str):
        """Marca uma notificação de documento como lida."""
        with db_session_manager(session_id) as session:
            session.execute(text("SELECT fsf_client_notificationclean(:doc_id)"), {"doc_id": document_id})
            session.commit()

    def add_notification(self, document_id: int, session_id: str):
        """Adiciona uma notificação de documento."""
        with db_session_manager(session_id) as session:
            session.execute(text("SELECT fsf_client_notificationadd(:doc_id)"), {"doc_id": document_id})
            session.commit()

class TaskNotificationService:
    """Serviço para gerir a lógica de negócio de notificações de tarefas."""

    def get_task_notification_count(self, user_id: int, session_id: str) -> int:
        """Obtém a contagem de notificações de tarefas não lidas para um utilizador."""
        with db_session_manager(session_id) as session:
            query = text("""
            SELECT COUNT(*) FROM vbl_task 
            WHERE (owner = :user_id AND notification_owner = 1)
            OR (ts_client = :user_id AND notification_client = 1)
            """)
            return session.execute(query, {"user_id": user_id}).scalar() or 0

    def prepare_task_notification(self, task_id: int, session_id: str) -> dict:
        """Prepara os dados para uma notificação de tarefa, determinando o destinatário."""
        with db_session_manager(session_id) as session:
            # Obter o ID do utilizador que está a realizar a ação
            sender_id = session.execute(text("SELECT fs_client()")).scalar()

            task_query = text("""
            SELECT pk, name, owner, ts_client, ts_notestatus, ts_client_name, owner_name
            FROM vbl_task WHERE pk = :task_id
            """)
            task = session.execute(task_query, {"task_id": task_id}).fetchone()

            if not task:
                raise ValueError(f"Tarefa {task_id} não encontrada")

            # Determinar o destinatário
            is_admin_sender = int(sender_id) == task.owner
            recipient_id = task.ts_client if is_admin_sender else task.owner

            # Obter a nota mais recente
            note_query = text("SELECT memo FROM vbl_task_note WHERE tb_task = :task_id ORDER BY when_submit DESC LIMIT 1")
            recent_note = session.execute(note_query, {"task_id": task_id}).fetchone()
            content_preview = "Nova atualização"
            if recent_note:
                content_preview = recent_note.memo[:50] + "..." if len(recent_note.memo) > 50 else recent_note.memo

            notification_data = {
                'taskId': task_id,
                'taskName': task.name,
                'timestamp': datetime.now().isoformat(),
                'status_id': task.ts_notestatus,
                'sender_id': sender_id,
                'senderName': task.owner_name if is_admin_sender else task.ts_client_name,
                'content': content_preview
            }

            return {
                "recipient_id": recipient_id,
                "notification_data": notification_data
            }

    def get_all_task_notifications(self, user_id: int, session_id: str) -> list:
        """Obtém todas as notificações de tarefas não lidas para um utilizador."""
        with db_session_manager(session_id) as session:
            query = text("""
                SELECT 
                    t.pk as task_id, t.name as task_name, t.when_start as timestamp,
                    t.ts_notestatus as status_id, t.owner as owner_id, t.ts_client as client_id,
                    t.owner_name, t.ts_client_name,
                    CASE 
                        WHEN t.owner = :user_id THEN 'owner'
                        WHEN t.ts_client = :user_id THEN 'client'
                        ELSE 'none'
                    END as user_role
                FROM vbl_task t
                WHERE (t.owner = :user_id AND t.notification_owner = 1)
                   OR (t.ts_client = :user_id AND t.notification_client = 1)
                ORDER BY t.when_start DESC
            """)
            tasks = session.execute(query, {"user_id": user_id}).mappings().all()

            notifications = []
            for task in tasks:
                note_query = text("SELECT memo, when_submit, isadmin FROM vbl_task_note WHERE tb_task = :task_id ORDER BY when_submit DESC LIMIT 1")
                recent_note = session.execute(note_query, {"task_id": task['task_id']}).fetchone()

                if recent_note:
                    sender = task['owner_name'] if recent_note.isadmin == 1 else task['ts_client_name']
                    timestamp = recent_note.when_submit.isoformat()
                    preview = recent_note.memo[:50] + "..." if len(recent_note.memo) > 50 else recent_note.memo
                else:
                    sender = "Sistema"
                    timestamp = task['timestamp'].isoformat() if task['timestamp'] else datetime.now().isoformat()
                    preview = "Atualização na tarefa"

                notifications.append({
                    'taskId': task['task_id'],
                    'taskName': task['task_name'],
                    'timestamp': timestamp,
                    'userRole': task['user_role'],
                    'statusId': task['status_id'],
                    'senderName': sender,
                    'content': preview
                })
            return notifications

    def mark_task_notification_as_read(self, task_id: int, user_id: int, session_id: str):
        """Marca as notificações de uma tarefa como lidas para um utilizador."""
        with db_session_manager(session_id) as session:
            task_query = text("SELECT owner, ts_client FROM vbl_task WHERE pk = :task_id")
            task = session.execute(task_query, {"task_id": task_id}).fetchone()

            if not task:
                raise ValueError(f"Tarefa {task_id} não encontrada")

            is_owner = int(user_id) == task.owner
            is_client = int(user_id) == task.ts_client

            if is_owner and is_client:
                update_query = text("UPDATE tb_task SET notification_owner = 0, notification_client = 0 WHERE pk = :task_id")
                session.execute(update_query, {"task_id": task_id})
                notes_query = text("UPDATE tb_task_note SET notification_owner = 0, notification_client = 0 WHERE tb_task = :task_id")
                session.execute(notes_query, {"task_id": task_id})
            else:
                notes_query = text("SELECT pk FROM vbl_task_note WHERE tb_task = :task_id")
                notes = session.execute(notes_query, {"task_id": task_id}).all()
                for note in notes:
                    f_query = text("SELECT fbo_task_note_notification(:note_id)")
                    session.execute(f_query, {"note_id": note.pk})
            
            session.commit()


class TaskService:
    """Serviço para gerir a lógica de negócio de tarefas."""

    def _get_socketio_events_instance(self):
        return current_app.extensions.get('socketio_events')

    def add_note_to_task(self, task_id: int, memo: str, session_id: str):
        """Adiciona uma nota a uma tarefa e emite uma notificação."""
        with db_session_manager(session_id) as session:
            query = text("SELECT fbo_task_note_new(:pnpk, :pnmemo)")
            session.execute(query, {"pnpk": task_id, "pnmemo": memo})
            session.commit()

        # Emitir notificação via Socket.IO após a transação
        socketio_events = self._get_socketio_events_instance()
        if socketio_events:
            socketio_events.emit_task_notification(
                task_id=task_id,
                session_id=session_id,
                notification_type='new_note'
            )
        else:
            current_app.logger.warning("Instância de SocketIOEvents não encontrada para emitir notificação.")

    def update_task_status(self, task_id: int, status_id: int, session_id: str):
        """Atualiza o estado de uma tarefa e emite uma notificação."""
        with db_session_manager(session_id) as session:
            # A lógica de atualização do estado da tarefa (fbo_task_status)
            # deve ser chamada aqui, dentro da rota que usa este serviço.
            # Este método foca-se na notificação.
            
            status_query = text("SELECT value FROM tb_task_status WHERE pk = :status_id")
            status = session.execute(status_query, {"status_id": status_id}).fetchone()
            status_name = status.value if status else f"Status {status_id}"

        socketio_events = self._get_socketio_events_instance()
        if socketio_events:
            socketio_events.emit_task_notification(
                task_id=task_id,
                session_id=session_id,
                notification_type='status_update',
                status=status_name
            )
        else:
            current_app.logger.warning("Instância de SocketIOEvents não encontrada para emitir notificação.")


# Instâncias dos serviços para serem importadas noutros módulos
notification_service = NotificationService()
task_notification_service = TaskNotificationService()
task_service = TaskService()

def create_notification(user: str, title: str, message: str, type: str = 'info', data: dict = None):
    """Criar notificação genérica para sistema de ofícios"""
    try:
        with db_session_manager(user) as session:
            query = text("""
                INSERT INTO tb_notifications (pk, user_id, title, message, type, data, read, created_at)
                VALUES (fs_nextcode(), :user, :title, :message, :type, :data, false, NOW())
            """)
            session.execute(query, {
                'user': user,
                'title': title,
                'message': message,
                'type': type,
                'data': str(data) if data else None
            })
            session.commit()
    except Exception as e:
        current_app.logger.warning(f"Notification error: {e}")
