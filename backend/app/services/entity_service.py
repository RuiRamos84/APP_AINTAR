from sqlalchemy.sql import text
from .. import db
from ..utils.utils import format_message, db_session_manager
from datetime import datetime
from flask import g, current_app
from app.repositories import EntityRepository
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from pydantic import BaseModel, EmailStr, constr, Field
from app.utils.serializers import model_to_dict
from app.utils.error_handler import api_error_handler, ResourceNotFoundError, DuplicateResourceError
from typing import Optional

# ===================================================================
# MODELOS DE DADOS COM PYDANTIC
# ===================================================================

class EntityModel(BaseModel):
    nipc: int = Field(..., ge=100000000, le=999999999, description="NIF deve ser um número inteiro de 9 dígitos")
    name: str
    address: str
    postal: str
    door: Optional[str] = None
    floor: Optional[str] = None
    nut1: Optional[str] = None
    nut2: Optional[str] = None
    nut3: Optional[str] = None
    nut4: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    ident_type: Optional[int] = None
    ident_value: Optional[str] = None
    descr: Optional[str] = None

class EntityUpdateModel(EntityModel):
    pass # Herda todos os campos, que já são opcionais em Pydantic para updates


@api_error_handler
def get_entity_detail(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        entity_query = text("SELECT * FROM vbf_entity WHERE pk = :pk")
        entity_result = session.execute(entity_query, {'pk': pk}).fetchone()

        if not entity_result:
            return {'error': 'Entidade não encontrada'}, 404

        # Converter para dict
        entity_dict = dict(entity_result._mapping)

        return {'entity': entity_dict}, 200


@api_error_handler
def get_entity_detail_nipc(nipc: str, current_user: str):
    with db_session_manager(current_user) as session:
        entity_query = text("SELECT * FROM vbf_entity WHERE nipc = :nipc")
        entity_result = session.execute(entity_query, {'nipc': nipc}).fetchone()
        # print(entity_result)
        if not entity_result:
            return {}, 204  # NIF não encontrado, mas é um sucesso para a criação.
        return {'entity': entity_result._asdict()}, 200


@api_error_handler
def create_entity(data: dict, current_user: str):
    entity_data = EntityModel.model_validate(data)
    entity_dict = entity_data.model_dump()

    with db_session_manager(current_user) as session:
        existing_entity = session.execute(
            text("SELECT pk FROM vbf_entity WHERE nipc = :nipc"),
            {'nipc': entity_dict['nipc']}
        ).scalar()
        if existing_entity:
            raise DuplicateResourceError('Entidade já existe')

        insert_query = text("""
            INSERT INTO vbf_entity 
                (nipc, name, address, postal, door, floor, nut1, nut2, nut3, nut4, phone, email, ident_type, ident_value, descr)
            VALUES 
                (:nipc, :name, :address, :postal, :door, :floor, :nut1, :nut2, :nut3, :nut4, :phone, :email, :ident_type, :ident_value, :descr)
        """)
        session.execute(insert_query, entity_dict)
        current_app.logger.info(f"Entidade criada com sucesso: {entity_dict['nipc']}")
    return {'message': 'Entidade criada com sucesso'}, 201


@api_error_handler
def update_entity_detail(pk: int, data: dict, current_user: str):
    update_data = EntityUpdateModel.model_validate(data)
    # Remove chaves com valor None para não substituir campos existentes por nulo no update
    update_dict = update_data.model_dump(exclude_unset=True)

    if not update_dict:
        return {'message': 'Nenhum dado para atualizar'}, 200

    set_clause = ", ".join([f"{key} = :{key}" for key in update_dict.keys()])
    update_query = text(f"UPDATE vbf_entity SET {set_clause} WHERE pk = :pk")
    
    with db_session_manager(current_user) as session:
        result = session.execute(update_query, {**update_dict, 'pk': pk})
        if result.rowcount == 0:
            raise ResourceNotFoundError("Entidade", pk)
    return {'message': 'Detalhes da entidade atualizados com sucesso'}, 200


@api_error_handler
def list_entities(current_user: str):
    with db_session_manager(current_user) as session:
        entities_query = text("SELECT * FROM vbf_entity ORDER BY name")
        entities_result = session.execute(entities_query).mappings().all()
        return {'entities': [dict(row) for row in entities_result]}, 200
