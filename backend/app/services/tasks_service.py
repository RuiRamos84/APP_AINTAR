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
            # A função fbo_task_new já implementa a lógica de notificação para o cliente
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

            # Notificar o cliente via Socket.IO
            try:
                socketio_events = current_app.extensions.get('socketio_events')
                if socketio_events:
                    socketio_events.emit_task_notification(
                        task_id,
                        current_user,
                        current_user,
                        notification_type='new_task'
                    )
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao enviar notificação: {str(e)}")

            return {'message': 'Tarefa criada com sucesso', 'task_id': task_id}, 201
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'error': formatted_error}, 500


def add_task_note(task_id, memo, current_user):
    try:
        with db_session_manager(current_user) as session:
            # Adicionar a nota usando fbo_task_note_new
            query = text("SELECT fbo_task_note_new(:pnpk, :pnmemo)")
            session.execute(query, {"pnpk": task_id, "pnmemo": memo})
            session.commit()

            print(
                f"Nota adicionada na tarefa {task_id}, emitindo notificação...")

            # Emitir notificação via Socket.IO - ADICIONE LOGS AQUI
            try:
                socketio_events = current_app.extensions.get('socketio_events')
                if socketio_events:
                    # Confirmar que estamos chamando o método correto
                    print(f"Emitindo task_notification para tarefa {task_id}")
                    socketio_events.emit_task_notification(
                        task_id,
                        current_user,
                        current_user,
                        notification_type='new_note'
                    )
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao enviar notificação: {str(e)}")

            return {'message': 'Nota adicionada com sucesso'}, 201
    except Exception as e:
        return {'error': str(e)}, 500


def update_task(task_id, name, ts_client, ts_priority, memo, current_user):
    try:
        with db_session_manager(current_user) as session:
            # Verificar o cliente atual antes da atualização
            check_query = text(
                "SELECT ts_client FROM vbl_task WHERE pk = :task_id")
            task_check = session.execute(
                check_query, {"task_id": task_id}).fetchone()

            if not task_check:
                return {'error': 'Tarefa não encontrada'}, 404

            old_client = task_check.ts_client

            # Atualizar a tarefa com a função fbo_task_update
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

            # Se o cliente mudou, adicionar uma nota e notificar
            if old_client != ts_client:
                # Adicionar uma nota automática usando fbo_task_note_new
                note_query = text("SELECT fbo_task_note_new(:pnpk, :pnmemo)")
                session.execute(note_query, {
                    "pnpk": task_id,
                    "pnmemo": "Tarefa atribuída a um novo cliente"
                })
                session.commit()

            # Emitir notificação via Socket.IO
            try:
                socketio_events = current_app.extensions.get('socketio_events')
                if socketio_events:
                    socketio_events.emit_task_notification(
                        task_id,
                        current_user,
                        current_user,
                        notification_type='task_update'
                    )
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao enviar notificação: {str(e)}")

            return {'message': 'Tarefa atualizada com sucesso'}, 200
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'error': formatted_error}, 500


def close_task(task_id, current_user):
    try:
        with db_session_manager(current_user) as session:
            # Fechar a tarefa usando fbo_task_close
            query = text("SELECT fbo_task_close(:pnpk)")
            session.execute(query, {"pnpk": task_id})

            # Adicionar uma nota de fechamento usando fbo_task_note_new
            note_query = text("SELECT fbo_task_note_new(:pnpk, :pnmemo)")
            session.execute(note_query, {
                "pnpk": task_id,
                "pnmemo": "Tarefa encerrada"
            })
            session.commit()

            # Emitir notificação via Socket.IO
            try:
                socketio_events = current_app.extensions.get('socketio_events')
                if socketio_events:
                    socketio_events.emit_task_notification(
                        task_id,
                        current_user,
                        current_user,
                        notification_type='task_closed'
                    )
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao enviar notificação: {str(e)}")

            return {'message': 'Tarefa fechada com sucesso'}, 200
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'error': formatted_error}, 500


def update_task_status(task_id, status_id, user_id, current_user):
    try:
        with db_session_manager(current_user) as session:
            # Atualizar o status usando fbo_task_status
            query = text("SELECT fbo_task_status(:pnpk, :status_id)")
            session.execute(query, {"pnpk": task_id, "status_id": status_id})

            # # Obter o nome do status
            # status_query = text(
            #     "SELECT value FROM tb_task_status WHERE pk = :status_id")
            # status = session.execute(
            #     status_query, {"status_id": status_id}).fetchone()
            # status_name = status.value if status else f"Status {status_id}"

            # # Adicionar uma nota sobre a mudança de status usando fbo_task_note_new
            # note_query = text("SELECT fbo_task_note_new(:pnpk, :pnmemo)")
            # session.execute(note_query, {
            #     "pnpk": task_id,
            #     "pnmemo": f"Status atualizado para: {status_name}"
            # })
            session.commit()

            # Emitir notificação via Socket.IO
            try:
                socketio_events = current_app.extensions.get('socketio_events')
                if socketio_events:
                    socketio_events.emit_task_notification(
                        task_id,
                        user_id,
                        current_user,
                        notification_type='status_update'
                    )
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao enviar notificação: {str(e)}")

            return {'message': 'Status da tarefa atualizado com sucesso'}, 200
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'error': formatted_error}, 500


def get_task_history(task_id, current_user):
    try:
        with db_session_manager(current_user) as session:
            # Usar a view vbl_task_note
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


def get_notification_count(current_user, user_id):
    """Retorna a contagem de notificações não lidas para um utilizador"""
    try:
        with db_session_manager(current_user) as session:
            query = text("""
            SELECT COUNT(*) FROM vbl_task 
            WHERE (owner = :user_id AND notification_owner = 1) OR (ts_client = :user_id AND notification_client = 1)
            """)
            result = session.execute(query, {"user_id": user_id}).scalar() or 0
            # print(result)
            return result
    except Exception as e:
        current_app.logger.error(f"Erro ao contar notificações: {str(e)}")
        return 0


def update_task_note_notification(task_id, current_user):
    """Marca todas as notificações de uma tarefa como lidas"""
    try:
        with db_session_manager(current_user) as session:
            # Obter os dados da tarefa
            task_query = text("""
            SELECT owner, ts_client FROM vbl_task 
            WHERE pk = :task_id
            """)
            task = session.execute(task_query, {"task_id": task_id}).fetchone()

            if not task:
                return {'error': 'Tarefa não encontrada'}, 404

            # Obter o ID do utilizador atual
            user_query = text("SELECT fs_client()")
            user_id = session.execute(user_query).scalar()

            # Determinar se o utilizador é owner, client ou ambos
            is_owner = int(user_id) == task.owner
            is_client = int(user_id) == task.ts_client

            # Se o utilizador for owner E client, limpar ambas as notificações
            if is_owner and is_client:
                current_app.logger.info(
                    f"Utilizador {user_id} é owner E client da tarefa {task_id}")

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

                # Marcar notas como lidas usando fbo_task_note_notification
                for note in notes:
                    note_query = text(
                        "SELECT fbo_task_note_notification(:note_id)")
                    session.execute(note_query, {"note_id": note.pk})

            session.commit()

            # Atualizar contagem via Socket.IO
            try:
                socketio_events = current_app.extensions.get('socketio_events')
                if socketio_events:
                    socketio_events.emit_task_notification_count(
                        user_id, current_user)
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao enviar atualização: {str(e)}")

            return {'message': 'Notificações atualizadas com sucesso'}, 200
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'error': formatted_error}, 500
