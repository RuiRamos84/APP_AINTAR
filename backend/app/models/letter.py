# models/letter.py
from app import db
from datetime import datetime


class Letter(db.Model):
    __tablename__ = 'tb_letter'

    pk = db.Column(db.Integer, primary_key=True)
    tt_doctype = db.Column(db.Integer, db.ForeignKey('vst_doctype.pk'))
    name = db.Column(db.String(255), nullable=False)
    body = db.Column(db.Text, nullable=False)
    version = db.Column(db.Float, default=1.0)
    active = db.Column(db.Integer, default=1)

    stores = db.relationship('LetterStore', back_populates='letter')


# models/letter.py - Corrigir relacionamento
class LetterStore(db.Model):
    __tablename__ = 'tb_letterstore'

    pk = db.Column(db.Integer, primary_key=True)
    tb_letter = db.Column(db.Integer, db.ForeignKey(
        'tb_letter.pk'))  # Adicionado
    tb_document = db.Column(db.Integer, db.ForeignKey(
        'vbf_document.pk'), nullable=True)
    data = db.Column(db.DateTime, default=datetime.now)
    descr = db.Column(db.String(255))
    regnumber = db.Column(db.String(50))
    filename = db.Column(db.String(255))

    letter = db.relationship(
        'Letter', back_populates='stores', foreign_keys=[tb_letter])
    document = db.relationship('Document')
