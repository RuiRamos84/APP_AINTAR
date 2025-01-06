from .. import db
from sqlalchemy.sql import text
from sqlalchemy.exc import ProgrammingError, OperationalError
from flask import current_app
from ..utils.utils import db_session_manager


def get_dashboard_data(current_user):
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

    dashboard_data = {}

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

                dashboard_data[view_name] = view_data

                # current_app.logger.info(f"Processados {view_data['total']} registros para a view {friendly_name}")
                # current_app.logger.info(f"Colunas da view {friendly_name}: {view_data['columns']}")

        except Exception as e:
            current_app.logger.error(f"Erro ao processar a view {friendly_name}: {str(e)}", exc_info=True)

    # current_app.logger.info(f"Total de views processadas: {len(dashboard_data)}")
    return dashboard_data
