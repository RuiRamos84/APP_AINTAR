# app/repositories/task_repository.py
from .base_repository import BaseRepository
from app.models import Task, TaskNote
from app import db


class TaskRepository(BaseRepository):
    model = Task

    @classmethod
    def find_by_owner(cls, owner_id):
        return cls.model.query.filter_by(owner=owner_id).all()

    @classmethod
    def find_by_client(cls, client_id):
        return cls.model.query.filter_by(ts_client=client_id).all()

    @classmethod
    def get_pending_notifications(cls, user_id):
        owner_tasks = cls.model.query.filter_by(
            owner=user_id, notification_owner=1).all()
        client_tasks = cls.model.query.filter_by(
            ts_client=user_id, notification_client=1).all()
        return owner_tasks + client_tasks

    @classmethod
    def update_status(cls, task_id, status_id):
        task = cls.get_by_id(task_id)
        if task:
            task.ts_notestatus = status_id
            db.session.commit()
            return True
        return False


class TaskNoteRepository(BaseRepository):
    model = TaskNote

    @classmethod
    def find_by_task(cls, task_id):
        return cls.model.query.filter_by(tb_task=task_id).order_by(TaskNote.when_submit.desc()).all()

    @classmethod
    def add_note(cls, task_id, memo, is_admin=0):
        task = Task.query.get(task_id)
        if not task:
            return None

        note = cls.create(
            tb_task=task_id,
            memo=memo,
            isadmin=is_admin,
            notification_owner=1,
            notification_client=1
        )

        # Atualizar notificações na tarefa
        task.notification_owner = 1
        task.notification_client = 1
        db.session.commit()

        return note
