# app/repositories/base_repository.py
from app import db


class BaseRepository:
    model = None

    @classmethod
    def get_by_id(cls, id):
        return cls.model.query.get(id)

    @classmethod
    def get_all(cls):
        return cls.model.query.all()

    @classmethod
    def create(cls, **kwargs):
        instance = cls.model(**kwargs)
        db.session.add(instance)
        db.session.commit()
        return instance

    @classmethod
    def update(cls, id, **kwargs):
        instance = cls.get_by_id(id)
        if instance:
            for key, value in kwargs.items():
                setattr(instance, key, value)
            db.session.commit()
        return instance

    @classmethod
    def delete(cls, id):
        instance = cls.get_by_id(id)
        if instance:
            db.session.delete(instance)
            db.session.commit()
            return True
        return False
