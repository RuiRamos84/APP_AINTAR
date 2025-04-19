# models/etar_ee.py
from app import db
from datetime import datetime


class ETAR(db.Model):
    __tablename__ = 'vbf_etar'

    pk = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    address = db.Column(db.String(255))
    freguesia = db.Column(db.String(100))
    concelho = db.Column(db.String(100))
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

    volumes = db.relationship('ETARVolume', back_populates='etar')
    energy_readings = db.relationship('ETAREnergy', back_populates='etar')


class EE(db.Model):
    __tablename__ = 'vbf_ee'

    pk = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    address = db.Column(db.String(255))
    freguesia = db.Column(db.String(100))
    concelho = db.Column(db.String(100))
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

    volumes = db.relationship('EEVolume', back_populates='ee')
    energy_readings = db.relationship('EEEnergy', back_populates='ee')


class ETARVolume(db.Model):
    __tablename__ = 'tb_etar_volumeread'

    pk = db.Column(db.Integer, primary_key=True)
    tb_etar = db.Column(db.Integer, db.ForeignKey('vbf_etar.pk'))
    data = db.Column(db.Date, nullable=False)
    val = db.Column(db.Float, nullable=False)
    spot = db.Column(db.Integer, db.ForeignKey('vbl_readspot.pk'))

    etar = db.relationship('ETAR', back_populates='volumes')


class EEVolume(db.Model):
    __tablename__ = 'tb_ee_volumeread'

    pk = db.Column(db.Integer, primary_key=True)
    tb_ee = db.Column(db.Integer, db.ForeignKey('vbf_ee.pk'))
    data = db.Column(db.Date, nullable=False)
    val = db.Column(db.Float, nullable=False)
    spot = db.Column(db.Integer, db.ForeignKey('vbl_readspot.pk'))

    ee = db.relationship('EE', back_populates='volumes')

# models/etar_ee.py - Adicione as classes de energia


class ETAREnergy(db.Model):
    __tablename__ = 'tb_etar_energyread'

    pk = db.Column(db.Integer, primary_key=True)
    tb_etar = db.Column(db.Integer, db.ForeignKey('vbf_etar.pk'))
    data = db.Column(db.Date, nullable=False)
    val_vazio = db.Column(db.Float, nullable=True)
    val_ponta = db.Column(db.Float, nullable=True)
    val_cheia = db.Column(db.Float, nullable=True)

    etar = db.relationship('ETAR', back_populates='energy_readings')


class EEEnergy(db.Model):
    __tablename__ = 'tb_ee_energyread'

    pk = db.Column(db.Integer, primary_key=True)
    tb_ee = db.Column(db.Integer, db.ForeignKey('vbf_ee.pk'))
    data = db.Column(db.Date, nullable=False)
    val_vazio = db.Column(db.Float, nullable=True)
    val_ponta = db.Column(db.Float, nullable=True)
    val_cheia = db.Column(db.Float, nullable=True)

    ee = db.relationship('EE', back_populates='energy_readings')
