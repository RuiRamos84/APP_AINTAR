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
            # Validar dados necessários
            required_fields = ['pntb_epi', 'pntt_epiwhat']
            if not all(field in data for field in required_fields):
                missing_fields = [
                    field for field in required_fields if field not in data]
                return {
                    'error': f'Campos obrigatórios ausentes: {", ".join(missing_fields)}'
                }, 400

            # Se a data não for fornecida, usar a data atual
            if 'pndata' not in data or data['pndata'] is None:
                data['pndata'] = datetime.now().date()

            # Chamar a função do banco de dados com o nome correto dos parâmetros
            query = text("""
                SELECT fbo_epi_deliver_create(
                    :pntb_epi, :pntt_epiwhat, :pndata, :pnquantity, :pndim, :pnmemo
                ) AS result
            """)

            result = session.execute(query, {
                'pntb_epi': data['pntb_epi'],
                'pntt_epiwhat': data['pntt_epiwhat'],
                'pndata': data['pndata'],
                'pnquantity': data.get('pnquantity', 1),
                'pndim': data.get('pndim', None),
                'pnmemo': data.get('pnmemo', '')
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
