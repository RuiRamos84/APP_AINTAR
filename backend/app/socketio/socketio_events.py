from flask import request, current_app
import jwt
from flask_socketio import emit, join_room, leave_room, Namespace
from threading import Lock
from ..services.notification_service import notification_service, task_notification_service
from app.utils.logger import get_logger

logger = get_logger(__name__)

class SocketIOEvents(Namespace):
    def __init__(self, namespace=None):
        super().__init__(namespace)
        self.connected_users = {}
        self.user_lock = Lock()
        self.socketio = None  # Será definido no register_socket_events

    def on_connect(self):
        token = request.args.get('token')
        user_id_param = request.args.get('userId')

        try:
            if not token:
                logger.warning("Token não fornecido na conexão Socket.IO")
                return False

            decoded_token = jwt.decode(
                token, current_app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            user_id = decoded_token.get('user_id')
            session_id = decoded_token.get('session_id')

            if not user_id or not session_id:
                logger.warning(f"Dados inválidos na conexão Socket.IO - UserID: {user_id}, SessionID: {session_id}")
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
            logger.error(f'Erro na conexão Socket.IO: {str(e)}')
            return False

    def emit_notification_count(self, user_id, session_id):
        """Busca a contagem de notificações no serviço e emite para o utilizador."""
        try:
            count = notification_service.get_notification_count(session_id)
            emit('notification_update', {'count': count}, room=f'user_{user_id}')
        except Exception as e:
            logger.error(f"Erro ao emitir contagem: {str(e)}")

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
                notification_service.mark_notification_as_read(document_id, session_id)
                self.emit_notification_count(user_id, session_id)
            except Exception as e:
                logger.error(
                    f"Erro ao marcar notificação: {str(e)}")

    def on_add_notification(self, data):
        document_id = data.get('documentId')
        user_id = data.get('userId')
        session_id = data.get('sessionId')

        if document_id and session_id:
            try:
                notification_service.add_notification(document_id, session_id)
                self.emit_notification_count(user_id, session_id)
            except Exception as e:
                logger.error(
                    f"Erro ao adicionar notificação: {str(e)}")

    # Método para emitir contagem de notificações de tarefas
    def emit_task_notification_count(self, user_id, session_id):
        try:
            count = task_notification_service.get_task_notification_count(user_id, session_id)
            room_id = f'user_{user_id}'
            if int(user_id) in self.connected_users:
                self.socketio.emit('task_notification_count', {'count': count}, room=room_id, namespace='/')
        except Exception as e:
            logger.error(
                f"Erro ao emitir contagem de tarefas: {str(e)}")

    # Handler para quando uma nota é adicionada ou tarefa atualizada
    def emit_task_notification(self, task_id, session_id, **kwargs):
        """Emite notificações quando uma tarefa é atualizada"""
        try:
            logger.info(f"🔔 EMIT_TASK_NOTIFICATION: task_id={task_id}, session_id={session_id}, kwargs={kwargs}")

            result = task_notification_service.prepare_task_notification(task_id, session_id)
            recipient_id = result['recipient_id']
            notification_data = result['notification_data']

            logger.info(f"👤 Destinatário calculado: recipient_id={recipient_id}")
            logger.info(f"📦 Notification data: {notification_data}")

            notification_data.update(kwargs) # Adiciona dados extra como 'notification_type'
            logger.info(f"📦 Notification data APÓS kwargs: {notification_data}")

            room_id = f'user_{recipient_id}'
            # IMPORTANTE: recipient_id pode ser int ou str, connected_users usa int como chave
            is_connected = int(recipient_id) in self.connected_users

            logger.info(f"🔌 Verificando conexão: recipient_id={recipient_id} (type: {type(recipient_id).__name__}), room={room_id}, is_connected={is_connected}")
            logger.info(f"👥 Utilizadores conectados: {list(self.connected_users.keys())} (types: {[type(k).__name__ for k in self.connected_users.keys()]})")

            if is_connected:
                logger.info(f"✅ Utilizador {recipient_id} ESTÁ CONECTADO - Emitindo notificação")
                self.socketio.emit('task_notification', notification_data, room=room_id, namespace='/')
                logger.info(f"📤 Evento 'task_notification' emitido para room={room_id}")

                self.emit_task_notification_count(recipient_id, session_id)
                logger.info(f"🔢 Contador de notificações atualizado para recipient_id={recipient_id}")

                # Opcional: emitir a lista completa de notificações atualizada
                self.on_get_task_notifications({'userId': recipient_id, 'sessionId': session_id})
                logger.info(f"📋 Lista de notificações atualizada emitida")
            else:
                logger.warning(f"⚠️ Utilizador {recipient_id} NÃO está conectado - Notificação será guardada na BD apenas")

        except Exception as e:
            logger.error(f"❌ ERRO ao emitir notificação de tarefa: {str(e)}", exc_info=True)

    # Handler para marcar notificação de tarefa como lida
    def on_mark_task_notification_read(self, data):
        task_id = data.get('taskId')
        user_id = data.get('userId')
        session_id = data.get('sessionId')

        logger.info(f"📖 MARK_TASK_NOTIFICATION_READ: task_id={task_id}, user_id={user_id}, session_id={session_id}")

        if task_id and user_id and session_id:
            try:
                logger.info(f"💾 Chamando task_notification_service.mark_task_notification_as_read...")
                task_notification_service.mark_task_notification_as_read(task_id, user_id, session_id)
                logger.info(f"✅ Notificação marcada como lida na BD para task_id={task_id}, user_id={user_id}")

                self.emit_task_notification_count(user_id, session_id)
                logger.info(f"🔢 Contador atualizado")

                self.socketio.emit('task_notifications_updated', {'taskId': task_id, 'read': True}, room=f'user_{user_id}', namespace='/')
                logger.info(f"📤 Evento task_notifications_updated emitido")
            except Exception as e:
                logger.error(f"❌ Erro ao marcar notificação: {str(e)}", exc_info=True)

    # Handler para obter todas as notificações de tarefa
    def on_get_task_notifications(self, data):
        user_id = data.get('userId')
        session_id = data.get('sessionId')

        if user_id and session_id:
            try:
                notifications = task_notification_service.get_all_task_notifications(user_id, session_id)
                # Usar self.socketio.emit para funcionar tanto em contexto Socket.IO quanto HTTP
                self.socketio.emit('task_notifications', {
                    'notifications': notifications,
                    'count': len(notifications)
                }, room=f'user_{user_id}', namespace='/')
            except Exception as e:
                logger.error(
                    f"Erro ao obter notificações: {str(e)}")

    # =========================================================================
    # DOCUMENT NOTIFICATION HANDLERS
    # =========================================================================

    def emit_document_transfer(self, document_data, to_user_id):
        """Emite notificação quando documento é transferido"""
        try:
            room_id = f'user_{to_user_id}'
            if int(to_user_id) in self.connected_users:
                self.socketio.emit('document_transferred', document_data, room=room_id, namespace='/')
            # Log removido para reduzir verbosidade
        except Exception as e:
            logger.error(f"Erro ao emitir transferência de documento: {str(e)}")

    def emit_document_status_update(self, document_data, user_id):
        """Emite notificação quando status do documento é atualizado"""
        try:
            room_id = f'user_{user_id}'
            if int(user_id) in self.connected_users:
                self.socketio.emit('document_status_updated', document_data, room=room_id, namespace='/')
        except Exception as e:
            logger.error(f"Erro ao emitir atualização de status: {str(e)}")

    def emit_document_rejected(self, document_data, user_id):
        """Emite notificação quando documento é rejeitado"""
        try:
            room_id = f'user_{user_id}'
            if int(user_id) in self.connected_users:
                self.socketio.emit('document_rejected', document_data, room=room_id, namespace='/')
        except Exception as e:
            logger.error(f"Erro ao emitir rejeição de documento: {str(e)}")


def register_socket_events(socketio):
    # Criamos uma instância da classe e a registramos no socketio
    socket_events = SocketIOEvents('/')
    socket_events.socketio = socketio  # Armazenar referência ao socketio
    socketio.on_namespace(socket_events)

    # Armazenamos a instância para que outros módulos possam acedê-la
    current_app.extensions['socketio_events'] = socket_events
