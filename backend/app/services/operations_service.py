from .. import db
from sqlalchemy.sql import text
from sqlalchemy.exc import ProgrammingError, OperationalError
from flask import current_app
from ..utils.utils import db_session_manager


def get_operations_data(current_user):
    """
    Obtém dados de operações a partir de views específicas
    (Esta função era anteriormente chamada get_dashboard_data)
    """
    views = {
        'vbr_document_fossa01': 'Limpezas de fossa global',
        'vbr_document_fossa02': 'Limpeza de fossa Carregal do Sal',
        'vbr_document_fossa03': 'Limpeza de fossa Santa Comba Dão',
        'vbr_document_fossa04': 'Limpeza de fossa Tábua',
        'vbr_document_fossa05': 'Limpeza de fossa Tondela',
        'vbr_document_ramais01': 'Ramais',
        'vbr_document_caixas01': 'Caixas',
        'vbr_document_desobstrucao01': 'Desobstrução',
        'vbr_document_pavimentacao01': 'Pavimentações',
        'vbr_document_ramais02': 'Repavimentações',
        'vbr_document_rede01': 'Rede'
    }

    operations_data = {}

    for view_name, friendly_name in views.items():
        try:
            with db_session_manager(current_user) as session:
                query = text(f"SELECT * FROM {view_name}")
                result = session.execute(query)
 
                view_data = {
                    'name': friendly_name,
                    'total': 0,
                    'data': [],
                    'columns': []
                }

                if result.returns_rows:
                    view_data['columns'] = list(result.keys())

                for row in result:
                    view_data['total'] += 1
                    row_dict = {}
                    for column in view_data['columns']:
                        row_dict[column] = getattr(row, column, None)
                    view_data['data'].append(row_dict)

                operations_data[view_name] = view_data

        except Exception as e:
            current_app.logger.error(
                f"Erro ao processar a view {friendly_name}: {str(e)}", exc_info=True)

    return operations_data


def create_internal_document(pntype, pnts_associate, pnmemo, pnpk_etar=None, pnpk_ee=None, current_user=None):
    """
    Cria um documento interno utilizando a função fbo_document_createintern
    
    Parâmetros:
    - pntype: Tipo de documento
    - pnts_associate: Associado
    - pnmemo: Descrição/memo do documento
    - pnpk_etar: PK da ETAR (opcional)
    - pnpk_ee: PK da EE (opcional)
    - current_user: Utilizador atual
    
    Retorna:
    - Tuple com resultado e código de status
    """
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT fbo_document_createintern(
                    :pntype, 
                    :pnts_associate, 
                    :pnmemo, 
                    :pnpk_etar, 
                    :pnpk_ee
                )
            """)
            result = session.execute(query, {
                'pntype': pntype,
                'pnts_associate': pnts_associate,
                'pnmemo': pnmemo,
                'pnpk_etar': pnpk_etar,
                'pnpk_ee': pnpk_ee
            }).scalar()

            return {'result': f'Documento interno criado com sucesso. ID: {result}'}, 201
    except Exception as e:
        return {'error': f"Erro ao criar documento interno: {str(e)}"}, 500
