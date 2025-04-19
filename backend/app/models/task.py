# models/task.py
from app import db
from datetime import datetime


class Task(db.Model):
    __tablename__ = 'tb_task'

    pk = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    owner = db.Column(db.Integer, db.ForeignKey('vbf_entity.pk'))
    ts_client = db.Column(db.Integer, db.ForeignKey('vbf_entity.pk'))
    ts_priority = db.Column(db.Integer, db.ForeignKey('vbl_priority.pk'))
    ts_notestatus = db.Column(db.Integer, db.ForeignKey('vbl_notestatus.pk'))
    when_start = db.Column(db.DateTime, default=datetime.now)
    notification_owner = db.Column(db.Integer, default=0)
    notification_client = db.Column(db.Integer, default=0)

    owner_user = db.relationship(
        'User', foreign_keys=[owner], back_populates='tasks_owned')
    client_user = db.relationship(
        'User', foreign_keys=[ts_client], back_populates='tasks_assigned')
    notes = db.relationship('TaskNote', back_populates='task')


class TaskNote(db.Model):
    __tablename__ = 'tb_task_note'

    pk = db.Column(db.Integer, primary_key=True)
    tb_task = db.Column(db.Integer, db.ForeignKey('tb_task.pk'))
    memo = db.Column(db.Text)
    when_submit = db.Column(db.DateTime, default=datetime.now)
    isadmin = db.Column(db.Integer, default=0)
    notification_owner = db.Column(db.Integer, default=1)
    notification_client = db.Column(db.Integer, default=1)

    task = db.relationship('Task', back_populates='notes')
