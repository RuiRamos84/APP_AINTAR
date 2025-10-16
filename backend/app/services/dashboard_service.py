from .. import db
from sqlalchemy.sql import text
from sqlalchemy.exc import ProgrammingError, OperationalError
from flask import current_app
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger

logger = get_logger(__name__)




@api_error_handler
def get_dashboard_data(current_user):
    views = {
        'vbr_document_fossa01': 'Limpezas de fossa global',
        'vbr_document_fossa02': 'Limpeza de fossa Carregal do Sal',
        'vbr_document_fossa03': 'Limpeza de fossa Santa Comba Dão',
        'vbr_document_fossa04': 'Limpeza de fossa Tábua',
        'vbr_document_fossa05': 'Limpeza de fossa Tondela',
        'vbr_document_fossa06': 'Limpeza de fossa cobradas pelo município',
        'vbr_document_ramais01': 'Ramais',
        'vbr_document_caixas01': 'Caixas',
        'vbr_document_desobstrucao01': 'Desobstrução',
        'vbr_document_pavimentacao01': 'Pavimentações',
        'vbr_document_ramais02': 'Repavimentações',
        'vbr_document_rede01': 'Rede',
        'vbl_document$late': 'Late',
    }

    dashboard_data = {}

    with db_session_manager(current_user) as session:
        for view_name, friendly_name in views.items():
            try:
                # NOTA: A passagem de nomes de tabelas/views como parâmetros não é suportada diretamente.
                # A abordagem de f-string é aceitável aqui porque os nomes das views são controlados internamente.
                query = text(f"SELECT * FROM {view_name}")
                result = session.execute(query)
                
                columns = list(result.keys()) if result.returns_rows else []
                data = [dict(row) for row in result.mappings().all()]

                dashboard_data[view_name] = {
                    'name': friendly_name,
                    'total': len(data),
                    'data': data,
                    'columns': columns
                }
            except Exception as e:
                logger.error(f"Erro ao processar a view {friendly_name}: {str(e)}", exc_info=True)
                dashboard_data[view_name] = {
                    'name': friendly_name,
                    'total': 0,
                    'data': [],
                    'columns': [],
                    'error': 'Falha ao carregar dados'
                }
    return dashboard_data
