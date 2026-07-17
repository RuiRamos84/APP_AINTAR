import json
from flask import current_app
from sqlalchemy import text
from datetime import datetime
from ..utils.utils import db_session_manager, db_system_session
from app.utils.logger import get_logger

logger = get_logger(__name__)


def get_alert_recipients(session, permission: str) -> list:
    """
    PKs dos utilizadores ativos com a permissão de alerta indicada
    (ts_interface.value — ex: 'payments.alerts', 'fleet.alerts').

    Quem recebe alertas de um módulo é controlado por permissão dedicada,
    atribuível na UI de permissões — nunca por nomes/PKs hardcoded no código.
    Devolve [] se a permissão ainda não existir na BD (migração por aplicar).
    """
    rows = session.execute(text("""
        SELECT c.pk
        FROM ts_client c
        WHERE COALESCE(c.active, 1) = 1
          AND EXISTS (
              SELECT 1 FROM ts_interface i
              WHERE i.value = :permission AND c.interface @> ARRAY[i.pk]
          )
    """), {'permission': permission}).fetchall()
    return [r.pk for r in rows]


class CentralNotificationService:
    """
    Serviço para a tabela central de notificações (tb_notification),
    usada pelos tipos que não têm persistência própria (operação, RH, ...).
    Tasks e documentos continuam a usar os seus próprios flags por agora.
    """

    def add(self, ts_client: int, type_: str, notification_type: str,
            title: str, message: str = None, route: str = None,
            metadata: dict = None) -> int:
        """
        Persiste uma notificação para um utilizador. Usa sessão de sistema
        porque é chamada a partir de contextos sem JWT (scheduler, webhooks,
        rotinas de operação/RH em background).
        """
        with db_system_session() as session:
            pk = session.execute(text("SELECT fs_nextcode()")).scalar()
            session.execute(text("""
                SELECT fbf_notification(0, :pk, :ts_client, :type, :notification_type,
                                        :title, :message, :route, :metadata)
            """), {
                'pk': pk, 'ts_client': ts_client, 'type': type_,
                'notification_type': notification_type, 'title': title,
                'message': message, 'route': route,
                'metadata': json.dumps(metadata) if metadata is not None else None,
            })
            return pk

    def get_feed(self, current_user: str, limit: int = 50, offset: int = 0) -> list:
        """Lista as notificações do utilizador autenticado (mais recentes primeiro)."""
        with db_session_manager(current_user) as session:
            rows = session.execute(text("""
                SELECT * FROM vbl_notification ORDER BY hist_time DESC LIMIT :limit OFFSET :offset
            """), {'limit': limit, 'offset': offset}).mappings().all()
            return [dict(r) for r in rows]

    def get_unread_count(self, current_user: str) -> int:
        with db_session_manager(current_user) as session:
            return session.execute(text(
                "SELECT count(*) FROM vbl_notification WHERE read = 0"
            )).scalar() or 0

    def mark_read(self, pk: int, current_user: str):
        with db_session_manager(current_user) as session:
            session.execute(text("SELECT fbf_notification$read(:pk)"), {'pk': pk})

    def mark_all_read(self, current_user: str):
        with db_session_manager(current_user) as session:
            session.execute(text("SELECT fbf_notification$readall()"))

    def mark_read_by_entity(self, current_user: str, type_: str, entity_key: str, entity_id: int):
        """
        Marca como lidas as notificações centrais do utilizador para uma
        entidade específica (ex: type_='task', entity_key='task_id'). Usado
        pelos endpoints legados de mark-read de tasks/documentos para manterem
        a tabela central sincronizada (fase C da unificação).
        """
        with db_session_manager(current_user) as session:
            # Uma só ida à BD: a query chama fbf_notification$read por linha
            # encontrada — mantém a escrita via fbf_* sem o N+1 do loop antigo.
            session.execute(text("""
                SELECT "fbf_notification$read"(pk) FROM vbl_notification
                WHERE type = :type AND read = 0 AND metadata->>:entity_key = :entity_id
            """), {'type': type_, 'entity_key': entity_key, 'entity_id': str(entity_id)})


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
            logger.info(f"🔍 PREPARE_TASK_NOTIFICATION: task_id={task_id}, session_id={session_id}, sender_id={sender_id}")

            task_query = text("""
            SELECT pk, name, owner, ts_client, ts_notestatus, ts_client_name, owner_name
            FROM vbl_task WHERE pk = :task_id
            """)
            task = session.execute(task_query, {"task_id": task_id}).fetchone()

            if not task:
                logger.error(f"❌ Tarefa {task_id} NÃO encontrada!")
                raise ValueError(f"Tarefa {task_id} não encontrada")

            logger.info(f"📋 Tarefa encontrada: pk={task.pk}, name={task.name}, owner={task.owner}, ts_client={task.ts_client}")

            # Determinar o destinatário
            is_admin_sender = int(sender_id) == task.owner
            recipient_id = task.ts_client if is_admin_sender else task.owner

            logger.info(f"🎯 LÓGICA DE DESTINATÁRIO:")
            logger.info(f"   - sender_id = {sender_id}")
            logger.info(f"   - task.owner = {task.owner}")
            logger.info(f"   - task.ts_client = {task.ts_client}")
            logger.info(f"   - is_admin_sender (sender == owner) = {is_admin_sender}")
            logger.info(f"   - recipient_id = {recipient_id} ({'ts_client' if is_admin_sender else 'owner'})")

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
                logger.error(f"❌ Tarefa {task_id} não encontrada!")
                raise ValueError(f"Tarefa {task_id} não encontrada")

            is_owner = int(user_id) == task.owner
            is_client = int(user_id) == task.ts_client

            logger.info(f"🔍 Marcar como lida: task_id={task_id}, user_id={user_id}, is_owner={is_owner}, is_client={is_client}")

            # Fazer todos os UPDATEs na mesma transação, evitando deadlock
            # 1. Atualizar flag na tabela principal tb_task
            # 2. Atualizar flags nas notas direto (sem stored procedure)

            if is_owner and is_client:
                logger.info(f"👤 User é OWNER E CLIENT - Limpando ambas flags")
                update_query = text("UPDATE tb_task SET notification_owner = 0, notification_client = 0 WHERE pk = :task_id")
                session.execute(update_query, {"task_id": task_id})
                notes_query = text("UPDATE tb_task_note SET notification_owner = 0, notification_client = 0 WHERE tb_task = :task_id")
                session.execute(notes_query, {"task_id": task_id})
            else:
                # Atualizar flag na tabela principal tb_task
                if is_owner:
                    logger.info(f"👤 User é OWNER - Limpando notification_owner")
                    update_query = text("UPDATE tb_task SET notification_owner = 0 WHERE pk = :task_id")
                    session.execute(update_query, {"task_id": task_id})
                    # Atualizar notas direto, sem stored procedure (evita deadlock)
                    notes_query = text("UPDATE tb_task_note SET notification_owner = 0 WHERE tb_task = :task_id")
                    session.execute(notes_query, {"task_id": task_id})
                elif is_client:
                    logger.info(f"👤 User é CLIENT - Limpando notification_client")
                    update_query = text("UPDATE tb_task SET notification_client = 0 WHERE pk = :task_id")
                    session.execute(update_query, {"task_id": task_id})
                    # Atualizar notas direto, sem stored procedure (evita deadlock)
                    notes_query = text("UPDATE tb_task_note SET notification_client = 0 WHERE tb_task = :task_id")
                    session.execute(notes_query, {"task_id": task_id})

                logger.info(f"📝 Flags de notas atualizadas direto na tb_task_note")

            session.commit()
            logger.info(f"✅ Commit realizado - Notificação marcada como lida na BD")


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
            logger.warning("Instância de SocketIOEvents não encontrada para emitir notificação.")

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
            logger.warning("Instância de SocketIOEvents não encontrada para emitir notificação.")


# Instâncias dos serviços para serem importadas noutros módulos
notification_service = NotificationService()
task_notification_service = TaskNotificationService()
task_service = TaskService()
central_notification_service = CentralNotificationService()
