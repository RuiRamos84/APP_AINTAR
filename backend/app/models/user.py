# models/user.py
from app import db
from datetime import datetime


class User(db.Model):
    __tablename__ = 'vbf_entity'

    pk = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    nipc = db.Column(db.String(20), unique=True)
    address = db.Column(db.String(255))
    postal = db.Column(db.String(20))
    door = db.Column(db.String(10))
    floor = db.Column(db.String(10))
    nut1 = db.Column(db.String(50))
    nut2 = db.Column(db.String(50))
    nut3 = db.Column(db.String(50))
    nut4 = db.Column(db.String(50))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    ident_type = db.Column(db.String(50))
    ident_value = db.Column(db.String(50))
    descr = db.Column(db.Text)

    # Relacionamentos
    documents = db.relationship(
        'Document', foreign_keys='Document.ts_entity', back_populates='entity')
    tasks_owned = db.relationship(
        'Task', foreign_keys='Task.owner', back_populates='owner_user')
    tasks_assigned = db.relationship(
        'Task', foreign_keys='Task.ts_client', back_populates='client_user')
