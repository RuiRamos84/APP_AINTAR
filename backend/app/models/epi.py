# models/epi.py
from app import db
from datetime import datetime


class EPI(db.Model):
    __tablename__ = 'vbl_epi'

    pk = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    tt_epishoetype = db.Column(db.Integer, db.ForeignKey(
        'vbl_epishoetype.pk'), nullable=True)
    shoenumber = db.Column(db.String(10), nullable=True)
    tshirt = db.Column(db.String(10), nullable=True)
    sweatshirt = db.Column(db.String(10), nullable=True)
    jacket = db.Column(db.String(10), nullable=True)
    pants = db.Column(db.String(10), nullable=True)

    deliveries = db.relationship('EPIDelivery', back_populates='epi')


class EPIDelivery(db.Model):
    __tablename__ = 'tb_epi_deliver'

    pk = db.Column(db.Integer, primary_key=True)
    tb_epi = db.Column(db.Integer, db.ForeignKey('vbl_epi.pk'))
    tt_epiwhat = db.Column(db.Integer, db.ForeignKey('vbl_epiwhat.pk'))
    data = db.Column(db.Date, nullable=False)
    quantity = db.Column(db.Integer, default=1)
    dim = db.Column(db.String(50), nullable=True)
    memo = db.Column(db.Text, nullable=True)

    epi = db.relationship('EPI', back_populates='deliveries')
