from sqlalchemy.sql import text
from flask import current_app
from datetime import datetime
from ..utils.utils import format_message, db_session_manager


def list_tasks(current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text("SELECT * FROM vbl_task")
            result = session.execute(query).mappings().all()
            if result:
                return {'tasks': [dict(row) for row in result]}, 200
            return {'message': 'Nenhuma tarefa encontrada'}, 200
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'error': formatted_error}, 500


def create_task(name, ts_client, ts_priority, memo, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_task_new(:name, :ts_client, :ts_priority, :memo)")
            result = session.execute(query, {
                "name": name,
                "ts_client": ts_client,
                "ts_priority": ts_priority,
                "memo": memo
            })
            session.commit()
            task_id = result.scalar()
            return {'message': 'Tarefa criada com sucesso', 'task_id': task_id}, 201
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'error': formatted_error}, 500


# Modificação para add_task_note
def add_task_note(task_id, memo, current_user):
    try:
        with db_session_manager(current_user) as session:
            # Lógica existente...
            query = text("SELECT fbo_task_note_new(:pnpk, :pnmemo)")
            session.execute(query, {"pnpk": task_id, "pnmemo": memo})

            # Obter informações para notificação
            task_query = text(
                "SELECT pk, name, owner, ts_client FROM tb_task WHERE pk = :task_id")
            task = session.execute(task_query, {"task_id": task_id}).fetchone()

            # Determinar destinatário da notificação
            recipient_id = task.owner if current_user == task.ts_client else task.ts_client

            # Emitir notificação via Socket.IO
            try:
                socketio = current_app.extensions['socketio']
                socketio.emit('task_notification', {
                    'task_id': task_id,
                    'task_name': task.name,
                    'notification_type': 'new_note',
                    'timestamp': datetime.now().isoformat()
                }, room=f"user_{recipient_id}")
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao enviar notificação: {str(e)}")

            session.commit()
            return {'message': 'Nota adicionada com sucesso'}, 201
    except Exception as e:
        return {'error': str(e)}, 500


def update_task(task_id, name, ts_client, ts_priority, memo, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT fbo_task_update(:pnpk, :name, :ts_client, :ts_priority, :memo)")
            session.execute(query, {
                "pnpk": task_id,
                "name": name,
                "ts_client": ts_client,
                "ts_priority": ts_priority,
                "memo": memo
            })
            session.commit()
            return {'message': 'Tarefa atualizada com sucesso'}, 200
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'error': formatted_error}, 500


def close_task(task_id, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text("SELECT fbo_task_close(:pnpk)")
            session.execute(query, {"pnpk": task_id})
            session.commit()
            return {'message': 'Tarefa fechada com sucesso'}, 200
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'error': formatted_error}, 500


def update_task_status(task_id, status_id, user_id, current_user):
    try:
        with db_session_manager(current_user) as session:
            # Verificar primeiro se o usuário é o cliente
            check_query = text(
                "SELECT ts_client FROM tb_task WHERE pk = :task_id")
            result = session.execute(
                check_query, {"task_id": task_id}).scalar()

            # Agora user_id deve corresponder ao ts_client corretamente
            if result != user_id:
                return {'error': 'Apenas o cliente pode atualizar o status'}, 403

            # Resto do código como está
            query = text("SELECT fbo_task_status(:pnpk, :status_id)")
            session.execute(query, {"pnpk": task_id, "status_id": status_id})
            session.commit()
            return {'message': 'Status da tarefa atualizado com sucesso'}, 200
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'error': formatted_error}, 500


def get_task_history(task_id, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT * FROM vbl_task_note WHERE tb_task = :task_id ORDER BY when_submit DESC")
            result = session.execute(
                query, {"task_id": task_id}).mappings().all()
            if result:
                return {'history': [dict(row) for row in result]}, 200
            return {'message': 'Nenhum histórico encontrado para esta tarefa'}, 200
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'error': formatted_error}, 500


def update_task_note_notification(task_id, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text("SELECT fbo_task_note_notification(:pnpk)")
            session.execute(query, {"pnpk": task_id})
            session.commit()
            return {'message': 'Notificação atualizada com sucesso'}, 200
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'error': formatted_error}, 500
