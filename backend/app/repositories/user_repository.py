# app/repositories/user_repository.py
from .base_repository import BaseRepository
from app.models import User
from app import db
from sqlalchemy.exc import IntegrityError


class UserRepository(BaseRepository):
    model = User

    @classmethod
    def find_by_email(cls, email):
        return cls.model.query.filter_by(email=email).first()

    @classmethod
    def find_by_nipc(cls, nipc):
        return cls.model.query.filter_by(nipc=nipc).first()

    @classmethod
    def toggle_vacation(cls, user_id, status):
        user = cls.get_by_id(user_id)
        if user:
            user.vacation = status
            db.session.commit()
            return True
        return False

    @classmethod
    def toggle_dark_mode(cls, user_id, status):
        user = cls.get_by_id(user_id)
        if user:
            user.dark_mode = status
            db.session.commit()
            return True
        return False
