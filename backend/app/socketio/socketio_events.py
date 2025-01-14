from flask import request, current_app
import jwt
from app import socket_io
from flask_socketio import emit, join_room, leave_room, Namespace
from ..services.notification_service import get_notifications, add_notification, delete_notifications, get_notifications_count
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
            user_id = decoded_token.get('sub')
            if not user_id:
                return False

            room = f'user_{user_id}'
            join_room(room)
            with self.user_lock:
                self.connected_users[user_id] = request.sid
            current_app.logger.info(f'Cliente conectado via Socket.IO: {request.sid} (User ID: {user_id})')
            emit('connection_response', {'status': 'connected', 'userId': user_id})
            return True
        except Exception as e:
            current_app.logger.error(
                f'Erro durante a conexão Socket.IO: {str(e)}')
            return False

    def on_disconnect(self):
        with self.user_lock:
            for user_id, sid in list(self.connected_users.items()):
                if sid == request.sid:
                    current_app.logger.info(f'Cliente desconectado do Socket.IO: {request.sid} (User ID: {user_id})')
                    del self.connected_users[user_id]
                    leave_room(f'user_{user_id}')
                    break
            else:
                current_app.logger.warning(
                    f'Desconexão de cliente não identificado: {request.sid}')

    def emit_notification(user_id, notification):
        try:
            emit('notification', notification, room=f"user_{user_id}")
        except Exception as e:
            current_app.logger.error(f"Erro ao emitir notificação: {str(e)}")

    def on_join(self, data):
        user_id = data['userId']
        current_app.logger.info(
            f'User with ID {user_id} joined the room - {request.sid}')
        join_room(user_id)
        with self.user_lock:
            self.connected_users[user_id] = request.sid
        emit('join_room', room=request.sid)

        # Send pending notifications to the user
        notifications = get_notifications(user_id)
        if notifications:
            emit('pending_notifications', {'count': notifications}, room=request.sid)

    def on_new_order_created(self, data):
        order_id = data['orderId']
        user_id = data['userId']
        current_app.logger.info(
            f'Received "new_order_created" event with order {order_id} for user {user_id}')
        result = add_notification(user_id)
        if not isinstance(result, str) or not result.startswith("Error"):
            emit('new_notification', {
                'type': 'new_order',
                'orderId': order_id,
                'userId': user_id
            }, room=f'user_{user_id}')
        else:
            current_app.logger.error(
                f'Error adding notification for user {user_id}: {result}')

    def on_order_assigned(self, data):
        order_id = data['orderId']
        user_id = data['userId']
        current_app.logger.info(
            f'Received "order_assigned" event for order {order_id} and user {user_id}')
        result = add_notification(user_id)
        if not isinstance(result, str) or not result.startswith("Error"):
            emit('new_notification', {
                'type': 'order_assigned',
                'orderId': order_id,
                'userId': user_id
            }, room=f'user_{user_id}')
        else:
            current_app.logger.error(
                f'Error adding notification for user {user_id}: {result}')

    def on_new_notification(self, data):
        # Este método não será chamado diretamente, mas está aqui para referência
        emit('new_notification', data, room=data['room'])

    def on_new_step_added(self, data):
        order_id = data['orderId']
        user_id = data['userId']
        current_app.logger.info(
            f'Received "new_step_added" event for order {order_id} and user {user_id}')
        result = add_notification(user_id)
        if not isinstance(result, str) or not result.startswith("Error"):
            notification_count = get_notifications_count(user_id)
            emit('new_notification', {
                'type': 'new_step',
                'orderId': order_id,
                'userId': user_id
            }, room=f'user_{user_id}')
            emit('notification_count', {'count': notification_count}, room=f'user_{user_id}')
        else:
            current_app.logger.error(
                f'Error adding notification for user {user_id}: {result}')

    def on_get_notifications_count(self, data):
        user_id = data['userId']
        notification_count = get_notifications_count(user_id)
        emit('notification_count', {'count': notification_count}, room=f'user_{user_id}')

    def on_clear_notifications(self, data):
        user_id = data['userId']
        result = delete_notifications(user_id)
        if not isinstance(result, str) or not result.startswith("Error"):
            emit('notifications_cleared', {'message': 'Notifications cleared successfully'}, room=f'user_{user_id}')
        else:
            emit('notifications_error', {'message': result}, room=f'user_{user_id}')


def register_socket_events(socketio):
    socketio.on_namespace(SocketIOEvents('/'))
