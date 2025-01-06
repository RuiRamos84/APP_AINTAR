# from app import socketio
# from flask_socketio import emit, join_room, leave_room
# from flask import request
# from flask_jwt_extended import decode_token
# import logging

# # Dicionário para armazenar usuários online
# online_users = {}


# def register_socket_events():
#     @socketio.on('connect')
#     def handle_connect():
#         token = request.args.get('token')
#         if token:
#             try:
#                 decoded_token = decode_token(token)
#                 user_name = decoded_token['sub']
#                 online_users[user_name] = request.sid
#                 logging.info(f'Client connected: {user_name}')
#                 logging.debug(f'Current online users: {online_users}')
#                 emit('online_users', list(online_users.keys()), broadcast=True)
#             except Exception as e:
#                 logging.error(f'Connection error: {e}')
#                 return False
#         else:
#             logging.error('Missing Authorization Header')
#             return False

#     @socketio.on('disconnect')
#     def handle_disconnect():
#         user_name = next(
#             (uname for uname, sid in online_users.items() if sid == request.sid), None)
#         if user_name:
#             del online_users[user_name]
#             logging.info(f'Client disconnected: {user_name}')
#             logging.debug(f'Current online users: {online_users}')
#             emit('online_users', list(online_users.keys()), broadcast=True)

#     @socketio.on('get_online_users')
#     def get_online_users():
#         logging.debug(f'get_online_users called. Current online users: {online_users}')
#         emit('online_users', list(online_users.keys()))

#     @socketio.on('private_message')
#     def handle_private_message(data):
#         logging.debug(f'Received private message: {data}')
#         target_user_name = data['target_user_name']
#         message = data['message']
#         sender = data['from']
#         if target_user_name in online_users:
#             logging.debug(f'Sending message to user {target_user_name} in room { online_users[target_user_name]}')
#             emit('private_message', {'message': message, 'from': sender, 'to': target_user_name}, room=online_users[target_user_name])
#         if sender in online_users:
#             logging.debug(f'Sending message to user {sender} in room {online_users[sender]}')
#             emit('private_message', {'message': message, 'from': sender, 'to': target_user_name}, room=online_users[sender])

#     @socketio.on('join_private')
#     def on_join_private(data):
#         user_name = data['from']
#         target_user_name = data['target_user_name']
#         room = get_private_room(user_name, target_user_name)
#         join_room(room)
#         logging.debug(f'User {user_name} joined private room with {target_user_name}')
#         emit('status', {'msg': f'User {user_name} has joined the private chat.'}, room=room)

#     @socketio.on('leave_private')
#     def on_leave_private(data):
#         user_name = data['from']
#         target_user_name = data['target_user_name']
#         room = get_private_room(user_name, target_user_name)
#         leave_room(room)
#         logging.debug(f'User {user_name} left private room with {target_user_name}')
#         emit('status', {'msg': f'User {user_name} has left the private chat.'}, room=room)

#     @socketio.on('typing')
#     def handle_typing(data):
#         room = data['room']
#         username = data['username']
#         logging.debug(f'Typing event: {username} in room {room}')
#         emit('typing', {'username': username}, room=room)


# def get_private_room(user1, user2):
#     return f"private_{min(user1, user2)}_{max(user1, user2)}"
