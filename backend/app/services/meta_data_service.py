from sqlalchemy.sql import text
from flask import current_app
from sqlalchemy.exc import SQLAlchemyError
from functools import lru_cache
from datetime import datetime, timedelta
from ..utils.utils import db_session_manager
from app.utils.logger import get_logger

logger = get_logger(__name__)



metadata_cache = {}
CACHE_DURATION = timedelta(hours=1)


# @lru_cache(maxsize=1)
def fetch_meta_data(current_user):
    global metadata_cache
    current_time = datetime.now()
    if metadata_cache and metadata_cache['timestamp'] > current_time - CACHE_DURATION:
        logger.info("Returning cached metadata")
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
        'param_doctype': "SELECT * FROM vbl_param_doctype",
        'presentation': "SELECT * FROM vbl_presentation",
        'spot': "SELECT * FROM vbl_readspot",
        'expense': "select * from vbl_expensedest",
        'epi_shoe_types': "SELECT * FROM vbl_epishoetype ORDER BY pk",
        'epi_what_types': "SELECT * FROM vbl_epiwhat ORDER BY pk",
        'epi_list': "SELECT * FROM vbl_epi ORDER BY pk",
        'epi_deliveries': "SELECT * FROM vbl_epi_deliver ORDER BY tb_epi",
        'task_priority': "SELECT * FROM vbl_priority ORDER BY pk",
        'task_status': "SELECT * FROM vbl_notestatus ORDER BY pk",
        'payment_method': "SELECT * FROM vbl_metodopagamento ORDER BY pk",
        'step_transitions': "SELECT * FROM vbl_step_transition ORDER BY doctype, from_step, to_step",
        'analiseParams': "SELECT * FROM vbl_analiseparam",
        'operacaodia': "SELECT * FROM vbl_operacaodia ORDER BY pk",
        'operacaoaccao': "SELECT * FROM vbl_operacaoaccao ORDER BY pk",
        'operacamodo': "SELECT * FROM vbl_operacaomodo ORDER BY pk",
        'analise_forma': "SELECT * FROM vbl_analiseforma ORDER BY pk",
        'analise_param': "SELECT * FROM vbl_analiseparam ORDER BY pk",
        'analise_ponto': "SELECT * FROM vbl_analiseponto ORDER BY pk",
        'opcontrolo': "SELECT * FROM tt_operacaocontrolo",
        'profiles': "SELECT * FROM ts_profile ORDER BY pk",
        'interfaces': "SELECT * FROM ts_interface ORDER BY pk",
        'maintenancetype': "SELECT * FROM vbl_maintenancetype ORDER BY pk",
        'vehicle': "SELECT * FROM vbl_vehicle ORDER BY pk",
        'sensor_types': "SELECT * FROM vbl_sensortype ORDER BY pk",
        'teleparams': "SELECT * FROM vbl_teleparam ORDER BY pk",
        'instalacao': "SELECT * FROM vbl_instalacao ORDER BY nome",
        'tipo_obra': "SELECT * FROM vbl_tipoobra ORDER BY pk",
        'urgencia': "SELECT * FROM tt_urgencia ORDER BY code",
        'despesaobra': "SELECT * FROM vbl_despesaobra ORDER BY pk",
        'contractfrequency': "SELECT * FROM vbl_contractfrequency ORDER BY pk",
        'entities': "SELECT pk, name FROM ts_entity ORDER BY name",
        # ── Recursos Humanos ──────────────────────────────────────────────
        'rh_colaboradores':      "SELECT pk, name FROM ts_client WHERE ts_profile IN (0, 1, 6) AND COALESCE(active, 1) = 1 ORDER BY name",
        'rh_tipo_jornada':       "SELECT pk, descr FROM tt_rh_tipo_jornada ORDER BY pk",
        'rh_ponto_evento':       "SELECT pk, descr, ordem FROM tt_rh_ponto_evento ORDER BY ordem",
        'rh_tipo_ferias':        "SELECT pk, descr, debita_saldo FROM tt_rh_tipo_ferias ORDER BY pk",
        'rh_tipo_falta':         "SELECT pk, descr, requer_justificativo FROM tt_rh_tipo_falta ORDER BY pk",
        'rh_estado_workflow':    "SELECT pk, descr, cor FROM tt_rh_estado_workflow ORDER BY pk",
        'rh_piquete_ocorrencia': "SELECT pk, descr FROM tt_rh_piquete_ocorrencia ORDER BY pk",
    }

    response_data = {}
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


def clear_meta_data_cache():
    global metadata_cache
    metadata_cache = {}
    # fetch_meta_data.cache_clear()
    logger.info("Metadata cache cleared")
