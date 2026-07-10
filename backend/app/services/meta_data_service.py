import re
from sqlalchemy.sql import text
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
from ..utils.utils import db_session_manager
from app.utils.logger import get_logger

logger = get_logger(__name__)



metadata_cache = {}   # keyed by profile PK — cada perfil tem a sua entrada
CACHE_DURATION = timedelta(hours=1)


# @lru_cache(maxsize=1)
def fetch_meta_data(current_user, profil=None):
    global metadata_cache
    current_time = datetime.now()
    cache_key = str(profil) if profil is not None else 'default'
    entry = metadata_cache.get(cache_key)
    if entry and entry['timestamp'] > current_time - CACHE_DURATION:
        logger.info(f"Returning cached metadata for profile {cache_key}")
        return entry['data'], 200

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
        'instalacaoautocontrolo': "SELECT * FROM tt_instalacaoautocontrolo ORDER BY pk",
        'tipoetar': "SELECT code AS pk, nome AS value FROM tt_tipoetar ORDER BY pk",
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
        'rh_colaboradores':      "SELECT pk, name, data_nascimento FROM vbl_rh_colaborador ORDER BY name",
        'rh_tipo_jornada':       "SELECT pk, descr FROM vbl_rh_tipo_jornada",
        'rh_ponto_evento':       "SELECT pk, descr, ordem FROM vbl_rh_ponto_evento",
        'rh_tipo_ferias':        "SELECT pk, descr, debita_saldo FROM vbl_rh_tipo_ferias",
        'rh_tipo_falta':         "SELECT pk, descr, requer_justificativo FROM vbl_rh_tipo_falta",
        'rh_estado_workflow':    "SELECT pk, descr, cor FROM vbl_rh_estado_workflow",
        'rh_piquete_ocorrencia': "SELECT pk, descr FROM vbl_rh_tipo_ocorrencia",
        'rh_equipas':            "SELECT pk, codigo, nome, max_simultaneos FROM vbl_rh_equipa WHERE ativo = TRUE",
    }

    with db_session_manager(current_user) as session:
        response_data = _fetch_meta_data_combined(session, queries)
        if response_data is None:
            # Após rollback da query combinada, o contexto de sessão PostgreSQL
            # (fs_profile, etc.) pode ter sido perdido — re-estabelecer antes das queries individuais.
            from ..utils.utils import fs_setsession
            fs_setsession(current_user)
            response_data = _fetch_meta_data_individually(session, queries)

    metadata_cache[cache_key] = {
        'data': response_data,
        'timestamp': current_time
    }
    return response_data, 200


_ORDER_BY_RE = re.compile(r'\border\s+by\s+(.+)$', re.IGNORECASE)


def _split_order_by(query):
    """Separa a cláusula ORDER BY de uma query simples (sem ORDER BY no WHERE/subquery).

    Devolve (query_sem_order_by, colunas_order_by | None). As colunas devolvidas
    referem-se às colunas do tipo `t` produzido por `row_to_json(t)`, para serem
    usadas em `json_agg(row_to_json(t) ORDER BY <colunas>)` — preservando a
    ordenação que `json_agg` por si só não garante.
    """
    match = _ORDER_BY_RE.search(query)
    if not match:
        return query, None
    return query[:match.start()].rstrip(), match.group(1).strip()


def _fetch_meta_data_combined(session, queries):
    """Obtém todos os metadados numa única query (1 round-trip em vez de ~45).

    Cada subconsulta é agregada com json_agg, devolvendo uma única linha com
    uma coluna por chave. Se falhar (ex.: alguma view não existe), devolve
    None para o caller recorrer ao modo query-a-query (mais lento, mas tolera
    falhas individuais).
    """
    select_parts = []
    for key, query in queries.items():
        base_query, order_clause = _split_order_by(query)
        if order_clause:
            agg = f"json_agg(row_to_json(t) ORDER BY {order_clause})"
        else:
            agg = "json_agg(row_to_json(t))"
        select_parts.append(f'(SELECT COALESCE({agg}, \'[]\'::json) FROM ({base_query}) t) AS "{key}"')
    sql = "SELECT " + ", ".join(select_parts)

    try:
        row = session.execute(text(sql)).mappings().first()
        return {key: row[key] for key in queries.keys()}
    except SQLAlchemyError as e:
        logger.warning(f"[meta_data] Query combinada falhou, a usar fallback query-a-query: {e}")
        session.rollback()
        return None


def _fetch_meta_data_individually(session, queries):
    """Modo de fallback: uma query por chave, tolerando falhas individuais."""
    response_data = {}
    for key, query in queries.items():
        try:
            result = session.execute(text(query))
            columns = result.keys()
            response_data[key] = [
                {column: value for column, value in zip(columns, row)}
                for row in result
            ]
        except SQLAlchemyError as e:
            logger.warning(f"[meta_data] Falha na query '{key}': {e}")
            response_data[key] = []   # lista vazia — não bloqueia o resto
            session.rollback()        # limpa o estado da transacção
    return response_data


def clear_meta_data_cache():
    global metadata_cache
    metadata_cache = {}
    # fetch_meta_data.cache_clear()
    logger.info("Metadata cache cleared")
