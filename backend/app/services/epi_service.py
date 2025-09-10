from flask import current_app
from sqlalchemy.sql import text
from ..utils.utils import format_message, db_session_manager
from datetime import datetime


def get_epi_deliveries(current_user, filters=None):
    """
    Obtém o histórico de entregas de EPI com filtros opcionais
    """
    try:
        with db_session_manager(current_user) as session:
            query = "SELECT * FROM vbl_epi_deliver WHERE 1=1"
            params = {}

            if filters:
                if filters.get('start_date'):
                    query += " AND data >= :start_date"
                    params['start_date'] = filters['start_date']
                if filters.get('end_date'):
                    query += " AND data <= :end_date"
                    params['end_date'] = filters['end_date']
                if filters.get('employee_id'):
                    query += " AND tb_epi = :employee_id"
                    params['employee_id'] = filters['employee_id']

            query += " ORDER BY data DESC"
            result = session.execute(text(query), params).mappings().all()

            if result:
                deliveries = []
                for row in result:
                    delivery = dict(row)
                    if isinstance(delivery.get("data"), datetime):
                        delivery["data"] = delivery["data"].isoformat()
                    deliveries.append(delivery)
                    # print(deliveries)
                return {'deliveries': deliveries}, 200
            return {'deliveries': [], 'message': 'Nenhuma entrega encontrada'}, 200

    except Exception as e:
        current_app.logger.error(f"Erro ao obter entregas de EPI: {str(e)}")
        return {'error': format_message(str(e))}, 500


def create_epi_delivery(data, current_user):
    """
    Registra uma nova entrega de EPI usando a função fbo_epi_deliver_create
    """
    try:
        with db_session_manager(current_user) as session:
            # Validar dados e converter tipos
            tb_epi = int(data.get('pntb_epi'))
            tt_epiwhat = int(data.get('pntt_epiwhat'))

            # Converter a data do formato ISO para date
            data_str = data.get('pndata')
            if data_str:
                data_date = datetime.strptime(
                    data_str.split('T')[0], '%Y-%m-%d').date()
            else:
                data_date = None

            # Verificar se já existe entrega para essa combinação
            check_query = text("""
                SELECT COUNT(*) FROM tb_epi_deliver 
                WHERE tb_epi = :tb_epi 
                AND tt_epiwhat = :tt_epiwhat 
                AND data = :data
            """)

            exists = session.execute(check_query, {
                'tb_epi': tb_epi,
                'tt_epiwhat': tt_epiwhat,
                'data': data_date
            }).scalar()

            if exists:
                return {
                    'error': 'Já existe uma entrega registrada para este equipamento nesta data para este funcionário.',
                    'details': 'Escolha uma data diferente ou um equipamento diferente.'
                }, 400

            quantity = int(data.get('pnquantity', 1))
            dim = str(data.get('pndim')) if data.get('pndim') else None
            memo = str(data.get('pnmemo')) if data.get('pnmemo') else ''

            query = text("""
                SELECT fbo_epi_deliver_create(
                    :pntb_epi, :pntt_epiwhat, :pndata, :pnquantity, :pndim, :pnmemo
                ) AS result
            """)

            result = session.execute(query, {
                'pntb_epi': tb_epi,
                'pntt_epiwhat': tt_epiwhat,
                'pndata': data_date,
                'pnquantity': quantity,
                'pndim': dim,
                'pnmemo': memo
            }).scalar()

            if result:
                session.commit()
                formatted_result = format_message(result)
                return {
                    'message': 'Entrega registrada com sucesso',
                    'result': formatted_result
                }, 201

            return {'error': 'Falha ao registrar entrega'}, 400

    except Exception as e:
        current_app.logger.error(f"Erro ao registrar entrega de EPI: {str(e)}")
        return {'error': format_message(str(e))}, 500


def update_epi_preferences(user_pk, data, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT fbo_epi_update(
                    :pk, :tt_epishoetype, :shoenumber, :tshirt, :sweatshirt, 
                    :jacket, :pants, :apron, :gown, :welderboot, :waterproof,
                    :reflectivevest, :galoshes, :gloves, :mask, :memo
                )
            """)

            result = session.execute(query, {
                'pk': user_pk,
                'tt_epishoetype': data.get('tt_epishoetype'),
                'shoenumber': data.get('shoenumber'),
                'tshirt': data.get('tshirt'),
                'sweatshirt': data.get('sweatshirt'),
                'jacket': data.get('jacket'),
                'pants': data.get('pants'),
                'apron': data.get('apron'),
                'gown': data.get('gown'),
                'welderboot': data.get('welderboot'),
                'waterproof': data.get('waterproof'),
                'reflectivevest': data.get('reflectivevest'),
                'galoshes': data.get('galoshes'),
                'gloves': data.get('gloves'),
                'mask': data.get('mask'),
                'memo': data.get('memo', '')
            }).scalar()

            if result:
                session.commit()
                return {
                    'message': 'Preferências atualizadas com sucesso',
                    'result': format_message(result)
                }, 200

            return {'error': 'Falha ao atualizar preferências'}, 400

    except Exception as e:
        current_app.logger.error(
            f"Erro ao atualizar preferências de EPI: {str(e)}")
        return {'error': format_message(str(e))}, 500


def update_epi_delivery(pk, data, current_user):
    """
    Atualiza uma entrega de EPI usando a função fbo_epi_deliver_update
    """
    try:
        with db_session_manager(current_user) as session:
            # Converter a data do formato ISO para date
            data_str = data.get('pndata')
            if data_str:
                data_date = datetime.strptime(
                    data_str.split('T')[0], '%Y-%m-%d').date()
            else:
                data_date = None

            quantity = int(data.get('pnquantity', 1))
            dim = str(data.get('pndim')) if data.get('pndim') else None
            memo = str(data.get('pnmemo')) if data.get('pnmemo') else ''

            query = text("""
                SELECT fbo_epi_deliver_update(
                    :pnpk, :pndata, :pnquantity, :pndim, :pnmemo
                ) AS result
            """)

            result = session.execute(query, {
                'pnpk': pk,
                'pndata': data_date,
                'pnquantity': quantity,
                'pndim': dim,
                'pnmemo': memo
            }).scalar()

            if result:
                session.commit()
                formatted_result = format_message(result)
                return {
                    'message': 'Entrega atualizada com sucesso',
                    'result': formatted_result
                }, 200

            return {'error': 'Falha ao atualizar entrega'}, 400

    except Exception as e:
        current_app.logger.error(f"Erro ao atualizar entrega de EPI: {str(e)}")
        return {'error': format_message(str(e))}, 500


def return_epi_delivery(pk, data, current_user):
    """
    Anula uma entrega de EPI usando a função fbo_epi_deliver_return
    """
    try:
        with db_session_manager(current_user) as session:
            # Converter a data do formato ISO para date
            data_str = data.get('pndata')
            if data_str:
                data_date = datetime.strptime(
                    data_str.split('T')[0], '%Y-%m-%d').date()
            else:
                data_date = datetime.now().date()

            memo = str(data.get('pnmemo')) if data.get('pnmemo') else ''

            query = text("""
                SELECT fbo_epi_deliver_return(
                    :pnpk, :pndata, :pnmemo
                ) AS result
            """)

            result = session.execute(query, {
                'pnpk': pk,
                'pndata': data_date,
                'pnmemo': memo
            }).scalar()

            if result:
                session.commit()
                formatted_result = format_message(result)
                return {
                    'message': 'Entrega anulada com sucesso',
                    'result': formatted_result
                }, 200

            return {'error': 'Falha ao anular entrega'}, 400

    except Exception as e:
        current_app.logger.error(f"Erro ao anular entrega de EPI: {str(e)}")
        return {'error': format_message(str(e))}, 500


def create_epi(data, current_user):
    """
    Cria um novo colaborador EPI usando a função fbo_epi_insert
    """
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT aintar_server_dev.fbo_epi_insert(
                    :pk, :name, :tt_epishoetype, :shoenumber, :tshirt, :sweatshirt, 
                    :jacket, :pants, :apron, :gown, :welderboot, :waterproof,
                    :reflectivevest, :galoshes, :gloves, :mask, :memo
                ) AS result
            """)

            result = session.execute(query, {
                'pk': data.get('pk'),
                'name': data.get('name'),
                'tt_epishoetype': data.get('tt_epishoetype'),
                'shoenumber': data.get('shoenumber'),
                'tshirt': data.get('tshirt', ''),
                'sweatshirt': data.get('sweatshirt', ''),
                'jacket': data.get('jacket', ''),
                'pants': data.get('pants', ''),
                'apron': data.get('apron', ''),
                'gown': data.get('gown', ''),
                'welderboot': data.get('welderboot', ''),
                'waterproof': data.get('waterproof', ''),
                'reflectivevest': data.get('reflectivevest', ''),
                'galoshes': data.get('galoshes', ''),
                'gloves': data.get('gloves', ''),
                'mask': data.get('mask', ''),
                'memo': data.get('memo', '')
            }).scalar()

            if result:
                session.commit()
                # Limpar cache após inserção
                from ..services.meta_data_service import clear_meta_data_cache
                clear_meta_data_cache()

                formatted_result = format_message(result)
                return {
                    'message': 'Colaborador criado com sucesso',
                    'result': formatted_result
                }, 201

            return {'error': 'Falha ao criar colaborador'}, 400

    except Exception as e:
        current_app.logger.error(f"Erro ao criar colaborador EPI: {str(e)}")
        return {'error': format_message(str(e))}, 500
