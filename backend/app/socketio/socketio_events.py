from flask import request, current_app
import jwt
from app import socket_io
from flask_socketio import emit, join_room, leave_room, Namespace
from ..utils.utils import db_session_manager
from sqlalchemy import text
from threading import Lock


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


def register_socket_events(socketio):
    socketio.on_namespace(SocketIOEvents('/'))
