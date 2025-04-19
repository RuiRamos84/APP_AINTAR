# models/document.py
from app import db
from datetime import datetime


class Document(db.Model):
    __tablename__ = 'vbf_document'

    pk = db.Column(db.Integer, primary_key=True)
    regnumber = db.Column(db.String(50), unique=True)
    ts_entity = db.Column(db.Integer, db.ForeignKey('vbf_entity.pk'))
    tt_type = db.Column(db.Integer, db.ForeignKey('vst_doctype.pk'))
    ts_associate = db.Column(db.Integer, db.ForeignKey('vsl_associate.pk'))
    tb_representative = db.Column(
        db.Integer, db.ForeignKey('vbf_entity.pk'), nullable=True)
    memo = db.Column(db.Text)
    submission = db.Column(db.DateTime, default=datetime.now)
    address = db.Column(db.String(255))
    postal = db.Column(db.String(20))
    door = db.Column(db.String(10))
    floor = db.Column(db.String(10))
    nut1 = db.Column(db.String(50))
    nut2 = db.Column(db.String(50))
    nut3 = db.Column(db.String(50))
    nut4 = db.Column(db.String(50))
    glat = db.Column(db.Float, nullable=True)
    glong = db.Column(db.Float, nullable=True)
    notification = db.Column(db.Integer, default=1)
    tt_presentation = db.Column(db.Integer, db.ForeignKey(
        'vbl_presentation.pk'), nullable=True)
    who = db.Column(db.Integer, db.ForeignKey('vbf_entity.pk'))

    # Relacionamentos
    entity = db.relationship('User', foreign_keys=[
                             ts_entity], back_populates='documents')
    representative = db.relationship('User', foreign_keys=[tb_representative])
    steps = db.relationship('DocumentStep', back_populates='document')
    annexes = db.relationship('DocumentAnnex', back_populates='document')
    params = db.relationship('DocumentParam', back_populates='document')


class DocumentStep(db.Model):
    __tablename__ = 'vbf_document_step'

    pk = db.Column(db.Integer, primary_key=True)
    tb_document = db.Column(db.Integer, db.ForeignKey('vbf_document.pk'))
    what = db.Column(db.Integer)
    who = db.Column(db.Integer)
    memo = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    ord = db.Column(db.Integer, default=0)

    document = db.relationship('Document', back_populates='steps')


class DocumentAnnex(db.Model):
    __tablename__ = 'vbf_document_annex'

    pk = db.Column(db.Integer, primary_key=True)
    tb_document = db.Column(db.Integer, db.ForeignKey('vbf_document.pk'))
    data = db.Column(db.DateTime, default=datetime.now)
    descr = db.Column(db.String(255))
    filename = db.Column(db.String(255))

    document = db.relationship('Document', back_populates='annexes')


class Param(db.Model):
    __tablename__ = 'vbl_param'

    pk = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)


class DocumentParam(db.Model):
    __tablename__ = 'vbf_document_param'

    pk = db.Column(db.Integer, primary_key=True)
    tb_document = db.Column(db.Integer, db.ForeignKey('vbf_document.pk'))
    tb_param = db.Column(db.Integer, db.ForeignKey('vbl_param.pk'))
    value = db.Column(db.String(255), nullable=True)
    memo = db.Column(db.Text, nullable=True)

    document = db.relationship('Document', back_populates='params')
    param = db.relationship('Param')  # Agora Param está definido
