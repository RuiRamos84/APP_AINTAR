# app/repositories/entity_repository.py
from .base_repository import BaseRepository
from app.models import User  # Assuming User is our Entity model
from app import db
from sqlalchemy import or_


class EntityRepository(BaseRepository):
    model = User  # Usando User, já que vbf_entity parece ser a tabela compartilhada

    @classmethod
    def find_by_nipc(cls, nipc):
        return cls.model.query.filter_by(nipc=nipc).first()

    @classmethod
    def find_by_name(cls, name):
        return cls.model.query.filter(User.name.ilike(f"%{name}%")).all()

    @classmethod
    def search_entities(cls, search_term):
        """Pesquisa entidades por nome, NIPC ou email"""
        return cls.model.query.filter(
            or_(
                User.name.ilike(f"%{search_term}%"),
                User.nipc.ilike(f"%{search_term}%"),
                User.email.ilike(f"%{search_term}%")
            )
        ).all()

    @classmethod
    def create_entity(cls, data):
        """Criar uma nova entidade com validação"""
        # Verificar se já existe entidade com mesmo NIPC
        if cls.find_by_nipc(data['nipc']):
            return None, "Entidade com este NIPC já existe"

        # Criar nova entidade
        entity = cls.create(
            nipc=data['nipc'],
            name=data['name'],
            address=data['address'],
            postal=data['postal'],
            door=data.get('door'),
            floor=data.get('floor'),
            nut1=data.get('nut1'),
            nut2=data.get('nut2'),
            nut3=data.get('nut3'),
            nut4=data.get('nut4'),
            phone=data.get('phone'),
            email=data.get('email')
        )

        return entity, None
