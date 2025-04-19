# app/repositories/document_repository.py
from .base_repository import BaseRepository
from app.models import Document, DocumentStep, DocumentAnnex, DocumentParam
from app import db
from sqlalchemy import func
from datetime import datetime


class DocumentRepository(BaseRepository):
    model = Document

    @classmethod
    def find_by_regnumber(cls, regnumber):
        return cls.model.query.filter_by(regnumber=regnumber).first()

    @classmethod
    def find_by_entity(cls, entity_id):
        return cls.model.query.filter_by(ts_entity=entity_id).all()

    @classmethod
    def find_by_owner(cls, owner_id):
        return cls.model.query.filter_by(who=owner_id).all()

    @classmethod
    def create_with_regnumber(cls, **kwargs):
        # Gera número de registro automático
        year = datetime.now().year
        max_reg = db.session.query(func.max(Document.regnumber))\
            .filter(Document.regnumber.like(f'REG-{year}%')).scalar()

        if max_reg:
            num = int(max_reg.split('-')[-1]) + 1
        else:
            num = 1

        regnumber = f"REG-{year}-{num:04d}"
        kwargs['regnumber'] = regnumber

        document = cls.create(**kwargs)
        return document


class DocumentStepRepository(BaseRepository):
    model = DocumentStep

    @classmethod
    def find_by_document(cls, document_id):
        return cls.model.query.filter_by(tb_document=document_id).order_by(DocumentStep.ord).all()

    @classmethod
    def add_step(cls, document_id, what, who, memo=None):
        # Verificar o próximo ord
        max_ord = db.session.query(func.max(DocumentStep.ord))\
            .filter_by(tb_document=document_id).scalar() or 0

        step = cls.create(
            tb_document=document_id,
            what=what,
            who=who,
            memo=memo,
            ord=max_ord + 1
        )
        return step


class DocumentAnnexRepository(BaseRepository):
    model = DocumentAnnex

    @classmethod
    def find_by_document(cls, document_id):
        return cls.model.query.filter_by(tb_document=document_id).order_by(DocumentAnnex.data.desc()).all()
