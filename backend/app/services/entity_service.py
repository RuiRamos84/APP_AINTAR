from sqlalchemy.sql import text
from .. import db
from ..utils.utils import format_message, db_session_manager
from datetime import datetime
from flask import g, current_app
from app.repositories import EntityRepository
from sqlalchemy.exc import SQLAlchemyError

from app.utils.serializers import model_to_dict


def get_entity_detail(pk, current_user):
    try:
        entity = EntityRepository.get_by_id(pk)
        if entity:
            return {'entity': model_to_dict(entity)}, 200
        return {'error': 'Entidade não encontrada'}, 404
    except Exception as e:
        current_app.logger.error(
            f"Erro ao obter detalhes da entidade: {str(e)}")
        return {'error': f"Erro ao obter detalhes da entidade: {str(e)}"}, 500


def get_entity_detail_nipc(nipc, current_user):
    try:
        with db_session_manager(current_user) as session:
            entity_query = text("SELECT * FROM vbf_entity WHERE nipc = :nipc")
            entity_result = session.execute(
                entity_query, {'nipc': nipc}).fetchone()
            if entity_result:
                entity_dict = entity_result._asdict()
                return {'entity': entity_dict}, 200
            else:
                return {'message': 'Entidade não encontrada'}, 204
    except Exception as e:
        print({str(e)})
        return {'error': f"Erro ao obter detalhes da entidade: {str(e)}"}, 500


def create_entity(data, current_user):
    try:
        current_app.logger.info(
            f"Iniciando criação de entidade para o usuário: {current_user}")
        current_app.logger.debug(f"Dados recebidos: {data}")

        with db_session_manager(current_user) as session:
            existing_entity = session.execute(
                text("SELECT * FROM vbf_entity WHERE nipc = :nipc"),
                {'nipc': data.get('nipc')}
            ).fetchone()
            if existing_entity:
                current_app.logger.warning(
                    f"Tentativa de criar entidade duplicada com NIPC: {data.get('nipc')}")
                return {'message': 'Entidade já existe'}, 409

            insert_query = text(
                """
                INSERT INTO vbf_entity 
                    (nipc, name, address, postal, door, floor, nut1, nut2, nut3, nut4, phone, email, ident_type, ident_value, descr) 
                VALUES 
                    (:nipc, :name, :address, :postal, :door, :floor, :nut1, :nut2, :nut3, :nut4, :phone, :email, :ident_type, :ident_value, :descr)
                """
            )
            session.execute(
                insert_query,
                {
                    'nipc': data.get('nipc'),
                    'name': data.get('name'),
                    'address': data.get('address'),
                    'postal': data.get('postal'),
                    'door': data.get('door') if data.get('door') else None,
                    'floor': data.get('floor') if data.get('floor') else None,
                    'nut1': data.get('nut1'),
                    'nut2': data.get('nut2'),
                    'nut3': data.get('nut3'),
                    'nut4': data.get('nut4'),
                    'phone': data.get('phone'),
                    'email': data.get('email'),
                    'ident_type': data.get('ident_type') if data.get('ident_type') else None,
                    'ident_value': data.get('ident_value') if data.get('ident_value') else None,
                    'descr': data.get('descr')
                }
            )
            current_app.logger.info(
                f"Entidade criada com sucesso: {data.get('nipc')}")
        return {'message': 'Entidade criada com sucesso'}, 201
    except Exception as e:
        current_app.logger.error(f"Erro ao criar entidade: {str(e)}")
        return {'error': f"Erro ao criar entidade: {str(e)}"}, 500


def update_entity_detail(pk, data, current_user):
    try:
        with db_session_manager(current_user) as session:
            update_query = text(
                """UPDATE vbf_entity SET 
                nipc = :nipc, name = :name, address = :address, postal = :postal, door = :door, floor = :floor, 
                nut1 = :nut1, nut2 = :nut2, nut3 = :nut3, nut4 = :nut4, phone = :phone, email = :email, 
                ident_type = :ident_type, ident_value = :ident_value, descr = :descr 
                WHERE pk = :pk"""
            )

            session.execute(
                update_query,
                {
                    'pk': pk,
                    'nipc': data['nipc'],
                    'name': data['name'],
                    'address': data['address'],
                    'postal': data['postal'],
                    'door': data['door'] if data['door'] else None,
                    'floor': data['floor'] if data['floor'] else None,
                    'nut1': data['nut1'],
                    'nut2': data['nut2'],
                    'nut3': data['nut3'],
                    'nut4': data['nut4'],
                    'phone': data['phone'],
                    'email': data['email'],
                    'ident_type': data['ident_type'] if data['ident_type'] else None,
                    'ident_value': data['ident_value'] if data['ident_value'] else None,
                    'descr': data['descr'],
                }
            )
            return {'message': 'Detalhes da entidade atualizados com sucesso'}, 200
    except Exception as e:
        current_app.logger.error(
            f"Erro ao atualizar detalhes da entidade: {str(e)}")
        return {'error': f"Erro ao atualizar detalhes da entidade: {str(e)}"}, 500


def list_entities(current_user):
    try:
        with db_session_manager(current_user) as session:
            entities_query = text("SELECT * FROM vbf_entity")
            entities_result = session.execute(entities_query).fetchall()

            if entities_result:
                entities_list = []
                for entity in entities_result:
                    entity_dict = entity._asdict()
                    # Log da entidade para ver a estrutura
                    # print(f"Entidade: {entity_dict}")
                    # Não precisa verificar "created_on" pois não existe na view
                    entities_list.append(entity_dict)
                return {'entities': entities_list}, 200
            else:
                return {'error': 'Nenhuma entidade encontrada'}, 404
    except Exception as e:
        print({str(e)})
        return {'error': f"Erro ao listar entidades: {str(e)}"}, 500
