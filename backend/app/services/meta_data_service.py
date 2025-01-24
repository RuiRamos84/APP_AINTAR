from sqlalchemy.sql import text
from .. import db
from flask import current_app
from sqlalchemy.exc import SQLAlchemyError
from functools import lru_cache
from datetime import datetime, timedelta
from ..utils.utils import db_session_manager

metadata_cache = {}
CACHE_DURATION = timedelta(hours=1)


@lru_cache(maxsize=1)
def fetch_meta_data(current_user):
    global metadata_cache
    current_time = datetime.now()
    if metadata_cache and metadata_cache['timestamp'] > current_time - CACHE_DURATION:
        current_app.logger.info("Returning cached metadata")
        return metadata_cache['data'], 200
    queries = {
        'ident_types': "SELECT * FROM vst_0001",
        'types': "SELECT * FROM vsl_profile_doctype",
        'associates': "SELECT * FROM vsl_associate ORDER BY name",
        'what': "SELECT * FROM vst_document_step$what ORDER BY pk",
        'who': "SELECT * FROM vst_document_step$who ORDER BY name",
        'views': "SELECT pk, name, memo FROM vbr_meta ORDER BY pk",
        'etar': "SELECT * FROM vbl_etar order by nome",
        'ee': "SELECT * FROM vbl_ee order by nome",
        'param': "SELECT * FROM vbl_param",
        'presentation': "SELECT * FROM vbl_presentation",
        'spot': "SELECT * FROM vbl_readspot",
        'expense': "select * from vbl_expensedest",
        'epi_shoe_types': "SELECT * FROM vbl_epishoetype ORDER BY pk",
        'epi_what_types': "SELECT * FROM vbl_epiwhat ORDER BY pk",
        'epi_list': "SELECT * FROM vbl_epi ORDER BY name",
        'epi_deliveries': "SELECT * FROM vbl_epi_deliver ORDER BY data DESC LIMIT 1000"
    }
    response_data = {}
    try:
        with db_session_manager(current_user) as session:
            for key, query in queries.items():
                result = session.execute(text(query))
                columns = result.keys()
                response_data[key] = [
                    {column: value for column, value in zip(columns, row)}
                    for row in result
                ]
        metadata_cache = {
            'data': response_data,
            'timestamp': current_time
        }
        return response_data, 200
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Database error while fetching metadata: {str(e)}")
        return {'error': "Database error while fetching metadata"}, 500
    except Exception as e:
        current_app.logger.error(
            f"Unexpected error while fetching metadata: {str(e)}")
        return {'error': "Unexpected error while fetching metadata"}, 500


def clear_meta_data_cache():
    global metadata_cache
    metadata_cache = {}
    fetch_meta_data.cache_clear()
    current_app.logger.info("Metadata cache cleared")
