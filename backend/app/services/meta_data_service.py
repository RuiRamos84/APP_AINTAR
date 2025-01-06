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
        'expense': "select * from vbl_expensedest"
    }
    response_data = {}
    try:
        with db_session_manager(current_user) as session:
            for key, query in queries.items():
                # current_app.logger.debug(f"Executing query for {key}: {query}")
                result = session.execute(text(query))
                # current_app.logger.debug(f"Query for {key} returned results")
                columns = result.keys()
                response_data[key] = [
                    {column: value for column, value in zip(columns, row)}
                    for row in result
                ]
                # current_app.logger.debug(f"Processed {len(response_data[key])} rows for {key}")
        # print(response_data)
        metadata_cache = {
            'data': response_data,
            'timestamp': current_time
        }

        # current_app.logger.info("Metadata fetched and cached successfully")
        return response_data, 200
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error while fetching metadata: {str(e)}")
        return {'error': "Database error while fetching metadata"}, 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error while fetching metadata: {str(e)}")
        return {'error': "Unexpected error while fetching metadata"}, 500


def clear_meta_data_cache():
    global metadata_cache
    metadata_cache = {}
    fetch_meta_data.cache_clear()
    current_app.logger.info("Metadata cache cleared")
