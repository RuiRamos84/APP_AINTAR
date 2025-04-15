from flask import request, current_app
import jwt
from app import socket_io
from flask_socketio import emit, join_room, leave_room, Namespace
from ..utils.utils import db_session_manager
from sqlalchemy import text
from threading import Lock
from datetime import datetime


class SocketIOEvents(Namespace):
    def __init__(self, namespace=None):
        super().__init__(namespace)
        self.connected_users = {}
        self.user_lock = Lock()

    def on_connect(self):
        token = request.args.get('token')
        try:
            decoded_token = jwt.decode(
                token, current_app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            user_id = decoded_token.get('user_id')
            session_id = decoded_token.get('session_id')

            if not user_id or not session_id:
                return False

            room = f'user_{user_id}'
            join_room(room)
            with self.user_lock:
                self.connected_users[user_id] = request.sid

            emit('connection_response', {
                'status': 'connected',
                'userId': user_id,
                'sessionId': session_id
            })

            return True
        except Exception as e:
            current_app.logger.error(f'Erro na conexão Socket.IO: {str(e)}')
            return False

    def emit_notification_count(self, user_id, session_id):
        try:
            with db_session_manager(session_id) as session:
                # Usar a função fsf_client_notificationcount()
                result = session.execute(
                    text("SELECT fsf_client_notificationcount()"))
                count = result.scalar() or 0

                emit('notification_update', {
                     'count': count}, room=f'user_{user_id}')
        except Exception as e:
            current_app.logger.error(f"Erro ao emitir contagem: {str(e)}")

    def on_get_notifications(self, data):
        user_id = data.get('userId')
        session_id = data.get('sessionId')
        if user_id and session_id:
            self.emit_notification_count(user_id, session_id)

    def on_mark_notification_read(self, data):
        document_id = data.get('documentId')
        user_id = data.get('userId')
        session_id = data.get('sessionId')

        if document_id and session_id:
            try:
                with db_session_manager(session_id) as session:
                    # Usar a função fsf_client_notificationclean
                    session.execute(text("SELECT fsf_client_notificationclean(:doc_id)"),
                                    {"doc_id": document_id})
                    session.commit()

                    # Atualizar contagem
                    self.emit_notification_count(user_id, session_id)
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao marcar notificação: {str(e)}")

    def on_add_notification(self, data):
        document_id = data.get('documentId')
        user_id = data.get('userId')
        session_id = data.get('sessionId')

        if document_id and session_id:
            try:
                with db_session_manager(session_id) as session:
                    # Usar a função fsf_client_notificationadd
                    session.execute(text("SELECT fsf_client_notificationadd(:doc_id)"),
                                    {"doc_id": document_id})
                    session.commit()

                    # Atualizar contagem
                    self.emit_notification_count(user_id, session_id)
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao adicionar notificação: {str(e)}")

    # Método para emitir contagem de notificações de tarefas
    def emit_task_notification_count(self, user_id, session_id):
        try:
            with db_session_manager(session_id) as session:
                # Consulta para contar tarefas com notificações não lidas usando view vbl_task
                query = text("""
                SELECT COUNT(*) FROM vbl_task 
                WHERE (owner = :user_id AND notification_owner = 1)
                OR (ts_client = :user_id AND notification_client = 1)
                """)
                result = session.execute(
                    query, {"user_id": user_id}).scalar() or 0

                # Emitir contagem para o utilizador
                room_id = f'user_{user_id}'

                # Verificar se o utilizador está na lista de conectados
                if str(user_id) in self.connected_users:
                    emit('task_notification_count', {
                        'count': result}, room=room_id, namespace='/')

                    # Também atualizar contador genérico para compatibilidade
                    emit('notification_update', {
                        'count': result,
                        'type': 'task_count'
                    }, room=room_id, namespace='/')

                    # current_app.logger.info(f"Emitida contagem de notificações para user {user_id}: {result}")
                else:
                    current_app.logger.info(f"Utilizador {user_id} não está conectado para receber contagem")

        except Exception as e:
            current_app.logger.error(
                f"Erro ao emitir contagem de tarefas: {str(e)}")

    # Handler para quando uma nota é adicionada ou tarefa atualizada
    def emit_task_notification(self, task_id, current_user_id, session_id, notification_type='update'):
        """Emite notificações quando uma tarefa é atualizada"""
        try:
            with db_session_manager(session_id) as session:
                # Usar fs_client() para obter o ID do utilizador real
                session_query = text("SELECT fs_client()")
                user_id = session.execute(session_query).scalar()

                # Buscar dados da tarefa usando view vbl_task
                task_query = text("""
                SELECT t.pk, t.name, t.owner, t.ts_client, 
                    t.ts_notestatus, t.ts_client_name, t.owner_name,
                    t.notification_owner, t.notification_client
                FROM vbl_task t
                WHERE t.pk = :task_id
                """)
                task = session.execute(task_query, {"task_id": task_id}).fetchone()

                if not task:
                    current_app.logger.error(f"Tarefa {task_id} não encontrada")
                    return

                # current_app.logger.info(f"Processando notificação para tarefa {task_id}: user={user_id}, owner={task.owner}, client={task.ts_client}")

                # Determinar quem está a receber
                # Se o utilizador atual é o owner, o recipient é o client
                if int(user_id) == task.owner:
                    recipient_id = task.ts_client
                    is_admin = 1
                    # current_app.logger.info(f"Owner enviando para cliente {recipient_id}")
                # Se o utilizador atual é o client, o recipient é o owner
                elif int(user_id) == task.ts_client:
                    recipient_id = task.owner
                    is_admin = 0
                    # current_app.logger.info(f"Cliente enviando para owner {recipient_id}")
                else:
                    current_app.logger.error(f"Utilizador {user_id} não é owner nem cliente da tarefa {task_id}")
                    return

                # Buscar a nota mais recente para ter detalhes no preview
                note_query = text("""
                    SELECT memo, when_submit
                    FROM vbl_task_note
                    WHERE tb_task = :task_id
                    ORDER BY when_submit DESC
                    LIMIT 1
                """)
                recent_note = session.execute(
                    note_query, {"task_id": task_id}).fetchone()

                # Dados da notificação
                notification_data = {
                    'task_id': task_id,
                    'taskId': task_id,  # Duplicado para compatibilidade
                    'task_name': task.name,
                    'taskName': task.name,  # Duplicado para compatibilidade
                    'notification_type': notification_type,
                    'type': notification_type,  # Duplicado para compatibilidade
                    'timestamp': datetime.now().isoformat(),
                    'status_id': task.ts_notestatus,
                    'sender_id': user_id,
                    'sender_name': task.owner_name if is_admin else task.ts_client_name,
                    # Duplicado para compatibilidade
                    'senderName': task.owner_name if is_admin else task.ts_client_name,
                    'is_admin': is_admin,
                    'content': recent_note.memo[:50] + "..." if recent_note and len(recent_note.memo) > 50 else (recent_note.memo if recent_note else "Nova atualização")
                }

                # Log dos dados da notificação
                # current_app.logger.info(f"Dados da notificação: {notification_data}")

                # Registrar todas as salas e utilizadores conectados
                # current_app.logger.info(f"Utilizadores conectados: {self.connected_users}")

                # Emitir evento para o destinatário
                room_id = f'user_{recipient_id}'

                # Verificar se o utilizador está conectado
                if str(recipient_id) in self.connected_users:
                    # Emitir o evento principal de notificação
                    emit('task_notification', notification_data, room=room_id)
                    # current_app.logger.info(f"Notificação enviada para {recipient_id} na sala {room_id}")

                    # Atualizar contagem para o destinatário
                    self.emit_task_notification_count(recipient_id, session_id)

                    # Também enviar task_notifications atualizado
                    recipients_tasks_query = text("""
                    SELECT 
                        t.pk as task_id, 
                        t.name as task_name, 
                        t.when_start as timestamp,
                        t.ts_notestatus as status_id,
                        t.owner_name, 
                        t.ts_client_name,
                        t.notification_owner,
                        t.notification_client
                    FROM 
                        vbl_task t
                    WHERE 
                        (t.owner = :user_id AND t.notification_owner = 1)
                        OR (t.ts_client = :user_id AND t.notification_client = 1)
                    ORDER BY 
                        t.when_start DESC
                    """)

                    tasks = session.execute(recipients_tasks_query, {
                                            "user_id": recipient_id}).mappings().all()

                    # Converter para lista de notificações
                    notifications = []
                    for task in tasks:
                        notifications.append({
                            'id': task['task_id'],
                            'taskId': task['task_id'],
                            'taskName': task['task_name'],
                            'type': 'new_note',
                            'timestamp': datetime.now().isoformat(),
                            'statusId': task['status_id'],
                            'senderName': task['owner_name'] if is_admin else task['ts_client_name'],
                            'content': recent_note.memo[:50] + "..." if recent_note and len(recent_note.memo) > 50 else (recent_note.memo if recent_note else "Nova atualização")
                        })

                    emit('task_notifications', {
                        'notifications': notifications,
                        'count': len(notifications)
                    }, room=room_id)

                    # current_app.logger.info(f"Lista de notificações atualizada para {recipient_id}: {len(notifications)} notificações")
                else:
                    current_app.logger.info(f"Utilizador {recipient_id} não está conectado, não foi possível enviar notificação")
        except Exception as e:
            current_app.logger.error(
                f"Erro ao emitir notificação de tarefa: {str(e)}")
            current_app.logger.exception(e)  # Log full traceback

    # Handler para marcar notificação de tarefa como lida
    def on_mark_task_notification_read(self, data):
        task_id = data.get('taskId')
        user_id = data.get('userId')
        session_id = data.get('sessionId')

        if task_id and user_id and session_id:
            try:
                with db_session_manager(session_id) as session:
                    # Obter os dados da tarefa
                    task_query = text("""
                    SELECT owner, ts_client FROM vbl_task 
                    WHERE pk = :task_id
                    """)
                    task = session.execute(
                        task_query, {"task_id": task_id}).fetchone()

                    if not task:
                        current_app.logger.error(
                            f"Tarefa {task_id} não encontrada")
                        return

                    # Verificar se o utilizador é owner, client ou ambos
                    is_owner = int(user_id) == task.owner
                    is_client = int(user_id) == task.ts_client

                    # Se o utilizador for owner E client, limpar ambas as notificações
                    if is_owner and is_client:
                        # current_app.logger.info(f"Utilizador {user_id} é owner E client da tarefa {task_id}")

                        # Atualizar a tarefa para limpar ambas as notificações
                        update_query = text("""
                            UPDATE tb_task 
                            SET notification_owner = 0, notification_client = 0
                            WHERE pk = :task_id
                        """)
                        session.execute(update_query, {"task_id": task_id})

                        # Atualizar todas as notas também
                        notes_query = text("""
                            UPDATE tb_task_note
                            SET notification_owner = 0, notification_client = 0
                            WHERE tb_task = :task_id
                        """)
                        session.execute(notes_query, {"task_id": task_id})
                    else:
                        # Buscar todas as notas da tarefa
                        notes_query = text("""
                        SELECT pk FROM vbl_task_note 
                        WHERE tb_task = :task_id
                        ORDER BY when_submit DESC
                        """)
                        notes = session.execute(
                            notes_query, {"task_id": task_id}).all()

                        # Marcar todas as notas como lidas usando fbo_task_note_notification
                        for note in notes:
                            note_query = text(
                                "SELECT fbo_task_note_notification(:note_id)")
                            session.execute(note_query, {"note_id": note.pk})

                    session.commit()

                    # Atualizar contagem
                    self.emit_task_notification_count(user_id, session_id)

                    # Notificar o frontend para atualizar os contadores
                    emit('task_notifications_updated', {
                        'taskId': task_id,
                        'read': True
                    }, room=f'user_{user_id}')

            except Exception as e:
                current_app.logger.error(f"Erro ao marcar notificação: {str(e)}")

    # Handler para obter todas as notificações de tarefa
    def on_get_task_notifications(self, data):
        user_id = data.get('userId')
        session_id = data.get('sessionId')

        if user_id and session_id:
            try:
                with db_session_manager(session_id) as session:
                    # Consulta usando apenas a view vbl_task
                    query = text("""
                        SELECT 
                            t.pk as task_id, 
                            t.name as task_name, 
                            t.when_start as timestamp,
                            t.ts_notestatus as status_id,
                            t.owner as owner_id,
                            t.ts_client as client_id,
                            t.owner_name, 
                            t.ts_client_name,
                            CASE 
                                WHEN t.owner = :user_id THEN 'owner'
                                WHEN t.ts_client = :user_id THEN 'client'
                                ELSE 'none'
                            END as user_role
                        FROM 
                            vbl_task t
                        WHERE 
                            (t.owner = :user_id AND t.notification_owner = 1)
                            OR (t.ts_client = :user_id AND t.notification_client = 1)
                        ORDER BY 
                            t.when_start DESC
                        """)
                    tasks = session.execute(
                        query, {"user_id": user_id}).mappings().all()

                    # Buscar a nota mais recente para cada tarefa
                    notifications = []
                    for task in tasks:
                        recent_note_query = text("""
                            SELECT memo, when_submit, isadmin
                            FROM vbl_task_note
                            WHERE tb_task = :task_id
                            ORDER BY when_submit DESC
                            LIMIT 1
                        """)
                        recent_note = session.execute(
                            recent_note_query, {"task_id": task['task_id']}
                        ).fetchone()

                        if recent_note:
                            notification_type = 'new_note'
                            sender = task['owner_name'] if recent_note.isadmin == 1 else task['ts_client_name']
                            timestamp = recent_note.when_submit.isoformat(
                            ) if recent_note.when_submit else task['timestamp']
                            preview = recent_note.memo[:50] + "..." if len(
                                recent_note.memo) > 50 else recent_note.memo
                        else:
                            notification_type = 'unread_update'
                            sender = "Sistema"
                            timestamp = task['timestamp'].isoformat(
                            ) if task['timestamp'] else None
                            preview = "Atualização na tarefa"

                        notifications.append({
                            'id': task['task_id'],
                            'taskId': task['task_id'],
                            'taskName': task['task_name'],
                            'type': notification_type,
                            'timestamp': timestamp,
                            'userRole': task['user_role'],
                            'ownerId': task['owner_id'],
                            'clientId': task['client_id'],
                            'statusId': task['status_id'],
                            'senderName': sender,
                            'content': preview
                        })

                    # Emitir as notificações
                    emit('task_notifications', {
                        'notifications': notifications,
                        'count': len(notifications)
                    }, room=f'user_{user_id}')
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao obter notificações: {str(e)}")


def add_task_note(task_id, memo, current_user):
    try:
        with db_session_manager(current_user) as session:
            # Adicionar a nota usando fbo_task_note_new
            query = text("SELECT fbo_task_note_new(:pnpk, :pnmemo)")
            session.execute(query, {"pnpk": task_id, "pnmemo": memo})
            session.commit()

            print(
                f"Nota adicionada na tarefa {task_id}, emitindo notificação...")

            # Emitir notificação via Socket.IO
            try:
                socketio_events = current_app.extensions.get('socketio_events')
                if socketio_events:
                    # Passamos a sessão current_user (não o ID do utilizador)
                    print(
                        f"Emitindo task_notification para tarefa {task_id} com session_id {current_user}")
                    socketio_events.emit_task_notification(
                        task_id,
                        current_user,  # Isto é a sessão, não o ID
                        current_user,  # Mesmo valor para session_id
                        notification_type='new_note'
                    )
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao enviar notificação: {str(e)}")

            return {'message': 'Nota adicionada com sucesso'}, 201
    except Exception as e:
        return {'error': str(e)}, 500

# Em update_task_status:


def update_task_status(task_id, status_id, user_id, current_user):
    try:
        with db_session_manager(current_user) as session:
            # Código existente...

            # Após atualizar o status
            try:
                # Obter o socket namespace
                socketio_events = current_app.extensions.get('socketio_events')
                if socketio_events:
                    # Obter o nome do status
                    status_query = text(
                        "SELECT value FROM tb_task_status WHERE pk = :status_id")
                    status = session.execute(
                        status_query, {"status_id": status_id}).fetchone()
                    status_name = status.value if status else f"Status {status_id}"

                    # Emitir notificação
                    socketio_events.emit_task_notification(
                        task_id,
                        task.owner,  # Notificar o dono da tarefa
                        current_user,
                        notification_type='status_update',
                        status=status_name
                    )
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao enviar notificação: {str(e)}")

            # Continue com o código existente...
    except Exception as e:
        return {'error': str(e)}, 500


def register_socket_events(socketio):
    # Criamos uma instância da classe e a registramos no socketio
    socket_events = SocketIOEvents('/')
    socketio.on_namespace(socket_events)

    # Armazenamos a instância para que outros módulos possam acedê-la
    current_app.extensions['socketio_events'] = socket_events

    # current_app.logger.info("Socket.IO events registados com sucesso!")
