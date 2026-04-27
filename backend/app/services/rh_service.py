from flask import jsonify
from sqlalchemy import text
from typing import Optional
from datetime import date
from pydantic import BaseModel, Field, field_validator
from ..utils.utils import format_message, db_session_manager
from app.utils.error_handler import api_error_handler, APIError, ResourceNotFoundError
from app.utils.logger import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class PontoEventoCreate(BaseModel):
    user_fk: int
    tt_evento_fk: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    precisao: Optional[int] = None
    notas: Optional[str] = None


class PontoSubmeter(BaseModel):
    user_fk: int
    ano: int
    mes: int
    notas: Optional[str] = None


class PontoCorrigir(BaseModel):
    ts_registo: str  # ISO datetime string
    notas: Optional[str] = None


class WorkflowAction(BaseModel):
    tipo_ref: str
    ref_pk: int
    step: int
    ts_estado_fk: int
    notas: Optional[str] = None


class FeriasCreate(BaseModel):
    user_fk: int
    tt_tipo_fk: int
    data_inicio: date
    data_fim: date
    notas: Optional[str] = None


class FeriasUpdate(BaseModel):
    tt_tipo_fk: int
    data_inicio: date
    data_fim: date
    notas: Optional[str] = None


class FaltaCreate(BaseModel):
    user_fk: int
    tt_tipo_falta_fk: int
    data: date
    justificativo_path: Optional[str] = None
    notas: Optional[str] = None
    comunicado_por: Optional[int] = None


class FaltaUpdate(BaseModel):
    tt_tipo_falta_fk: Optional[int] = 0
    justificativo_path: Optional[str] = None
    notas: Optional[str] = None


class HorarioCreate(BaseModel):
    user_fk: int
    tt_jornada_fk: int
    descr: str
    hora_entrada: str
    hora_saida: str
    hora_inicio_almoco: Optional[str] = None
    hora_fim_almoco: Optional[str] = None
    dias_semana: list[int] = [1, 2, 3, 4, 5]
    data_inicio: date
    data_fim: Optional[date] = None


class HorarioUpdate(BaseModel):
    tt_jornada_fk: int
    descr: str
    hora_entrada: str
    hora_saida: str
    hora_inicio_almoco: Optional[str] = None
    hora_fim_almoco: Optional[str] = None
    dias_semana: list[int] = [1, 2, 3, 4, 5]
    data_fim: Optional[date] = None


class ConfigUpsert(BaseModel):
    user_fk: int
    ano: int
    dias_total: int
    notas: Optional[str] = None


class PiqueteGerar(BaseModel):
    ano: int
    mes: int


class OcorrenciaCreate(BaseModel):
    tb_piquete_escala_fk: int
    tt_tipo_fk: int
    descr: str
    equipas_accionadas: Optional[str] = None
    evidencia_path: Optional[str] = None


class OcorrenciaUpdate(BaseModel):
    tt_tipo_fk: int
    descr: str
    equipas_accionadas: Optional[str] = None
    evidencia_path: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _assert_success(result: Optional[str], msg: str):
    if not result or '<sucess>' not in result:
        err = format_message(result) if result else msg
        raise APIError(err, 400)


def _rows_to_list(rows):
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Lookups
# ---------------------------------------------------------------------------

@api_error_handler
def get_lookups(current_user: str):
    with db_session_manager(current_user) as session:
        def fetch(q):
            return _rows_to_list(session.execute(text(q)).mappings().all())

        return jsonify({
            'tipos_jornada':    fetch('SELECT * FROM tt_rh_tipo_jornada ORDER BY pk'),
            'eventos_ponto':    fetch('SELECT * FROM tt_rh_ponto_evento ORDER BY ordem'),
            'tipos_ferias':     fetch('SELECT * FROM tt_rh_tipo_ferias ORDER BY pk'),
            'tipos_falta':      fetch('SELECT * FROM tt_rh_tipo_falta ORDER BY pk'),
            'estados_workflow': fetch('SELECT * FROM tt_rh_estado_workflow ORDER BY pk'),
            'tipos_ocorrencia': fetch('SELECT * FROM tt_rh_piquete_ocorrencia ORDER BY pk'),
        }), 200


# ---------------------------------------------------------------------------
# Colaboradores
# ---------------------------------------------------------------------------

@api_error_handler
def get_colaboradores(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(
            text('SELECT * FROM vbl_rh_colaborador ORDER BY name')
        ).mappings().all()
        return jsonify(_rows_to_list(rows)), 200


@api_error_handler
def get_colaborador(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(
            text('SELECT * FROM vbl_rh_colaborador WHERE pk = :pk'),
            {'pk': pk}
        ).mappings().first()
        if not row:
            raise ResourceNotFoundError('Colaborador', pk)
        return jsonify(dict(row)), 200


@api_error_handler
def get_saldo_ferias(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(
            text('SELECT * FROM vbl_rh_saldo_ferias WHERE tb_user_fk = :pk'),
            {'pk': pk}
        ).mappings().first()
        if not row:
            raise ResourceNotFoundError('Saldo de férias', pk)
        return jsonify(dict(row)), 200


# ---------------------------------------------------------------------------
# Ponto
# ---------------------------------------------------------------------------

@api_error_handler
def registar_ponto_evento(data: dict, current_user: str):
    payload = PontoEventoCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_ponto_evento(
                :user_fk, :tt_evento_fk, :latitude, :longitude, :precisao, :notas
            ) AS result
        """), payload.model_dump()).scalar()
        _assert_success(result, 'Erro ao registar evento de ponto')
        return jsonify({'message': 'Evento registado', 'result': format_message(result)}), 201


@api_error_handler
def get_ponto(current_user: str, user_fk: Optional[int], data_inicio: Optional[str], data_fim: Optional[str]):
    with db_session_manager(current_user) as session:
        filters = ['1=1']
        params: dict = {}
        if user_fk:
            filters.append('tb_user_fk = :user_fk')
            params['user_fk'] = user_fk
        if data_inicio:
            filters.append('data >= :data_inicio')
            params['data_inicio'] = data_inicio
        if data_fim:
            filters.append('data <= :data_fim')
            params['data_fim'] = data_fim
        where = ' AND '.join(filters)
        rows = session.execute(
            text(f'SELECT * FROM vbl_rh_ponto WHERE {where} ORDER BY data DESC, evento_ordem'),
            params
        ).mappings().all()
        return jsonify(_rows_to_list(rows)), 200


@api_error_handler
def submeter_ponto_mensal(data: dict, current_user: str):
    payload = PontoSubmeter.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_ponto_submeter(:user_fk, :ano, :mes, :notas) AS result
        """), payload.model_dump()).scalar()
        _assert_success(result, 'Erro ao submeter mapa mensal')
        return jsonify({'message': 'Mapa mensal submetido', 'result': format_message(result)}), 201


@api_error_handler
def get_ponto_mensal(current_user: str, user_fk: Optional[int], ano: Optional[int], mes: Optional[int], estado: Optional[int]):
    with db_session_manager(current_user) as session:
        filters = ['1=1']
        params: dict = {}
        if user_fk:
            filters.append('tb_user_fk = :user_fk')
            params['user_fk'] = user_fk
        if ano:
            filters.append('ano = :ano')
            params['ano'] = ano
        if mes:
            filters.append('mes = :mes')
            params['mes'] = mes
        if estado:
            filters.append('ts_estado_fk = :estado')
            params['estado'] = estado
        where = ' AND '.join(filters)
        rows = session.execute(
            text(f'SELECT * FROM vbl_rh_ponto_mensal WHERE {where} ORDER BY ano DESC, mes DESC'),
            params
        ).mappings().all()
        return jsonify(_rows_to_list(rows)), 200


@api_error_handler
def corrigir_ponto(pk: int, data: dict, current_user: str):
    payload = PontoCorrigir.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_ponto_corrigir(:pk, :ts_registo::TIMESTAMP, :notas) AS result
        """), {'pk': pk, **payload.model_dump()}).scalar()
        _assert_success(result, 'Erro ao corrigir registo de ponto')
        return jsonify({'message': 'Registo corrigido', 'result': format_message(result)}), 200


# ---------------------------------------------------------------------------
# Workflow genérico
# ---------------------------------------------------------------------------

@api_error_handler
def executar_workflow(data: dict, current_user_pk: int, current_user: str):
    payload = WorkflowAction.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_workflow(
                :tipo_ref, :ref_pk, :step, :user_fk, :ts_estado_fk, :notas
            ) AS result
        """), {**payload.model_dump(), 'user_fk': current_user_pk}).scalar()
        _assert_success(result, 'Erro no workflow')
        return jsonify({'message': 'Workflow executado', 'result': format_message(result)}), 200


# ---------------------------------------------------------------------------
# Férias
# ---------------------------------------------------------------------------

@api_error_handler
def criar_ferias(data: dict, current_user: str):
    payload = FeriasCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_ferias(
                0, NULL, :user_fk, :tt_tipo_fk,
                :data_inicio, :data_fim, :notas
            ) AS result
        """), payload.model_dump()).scalar()
        _assert_success(result, 'Erro ao criar pedido de férias')
        return jsonify({'message': 'Pedido de férias criado', 'result': format_message(result)}), 201


@api_error_handler
def editar_ferias(pk: int, data: dict, current_user: str):
    payload = FeriasUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_ferias(
                1, :pk, NULL, :tt_tipo_fk,
                :data_inicio, :data_fim, :notas
            ) AS result
        """), {'pk': pk, **payload.model_dump()}).scalar()
        _assert_success(result, 'Erro ao editar pedido de férias')
        return jsonify({'message': 'Pedido de férias actualizado', 'result': format_message(result)}), 200


@api_error_handler
def get_ferias(current_user: str, user_fk: Optional[int], ano: Optional[int], estado: Optional[int]):
    with db_session_manager(current_user) as session:
        filters = ['1=1']
        params: dict = {}
        if user_fk:
            filters.append('tb_user_fk = :user_fk')
            params['user_fk'] = user_fk
        if ano:
            filters.append("EXTRACT(YEAR FROM data_inicio) = :ano")
            params['ano'] = ano
        if estado:
            filters.append('ts_estado_fk = :estado')
            params['estado'] = estado
        where = ' AND '.join(filters)
        rows = session.execute(
            text(f'SELECT * FROM vbl_rh_ferias WHERE {where} ORDER BY data_inicio DESC'),
            params
        ).mappings().all()
        return jsonify(_rows_to_list(rows)), 200


# ---------------------------------------------------------------------------
# Faltas
# ---------------------------------------------------------------------------

@api_error_handler
def criar_falta(data: dict, current_user: str):
    payload = FaltaCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_faltas(
                0, NULL, :user_fk, :tt_tipo_falta_fk, :data,
                :justificativo_path, :notas, :comunicado_por
            ) AS result
        """), payload.model_dump()).scalar()
        _assert_success(result, 'Erro ao registar falta')
        return jsonify({'message': 'Falta registada', 'result': format_message(result)}), 201


@api_error_handler
def editar_falta(pk: int, data: dict, current_user: str):
    payload = FaltaUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_faltas(
                1, :pk, NULL, :tt_tipo_falta_fk, NULL,
                :justificativo_path, :notas, NULL
            ) AS result
        """), {'pk': pk, **payload.model_dump()}).scalar()
        _assert_success(result, 'Erro ao editar falta')
        return jsonify({'message': 'Falta actualizada', 'result': format_message(result)}), 200


@api_error_handler
def get_faltas(current_user: str, user_fk: Optional[int], ano: Optional[int], estado: Optional[int]):
    with db_session_manager(current_user) as session:
        filters = ['1=1']
        params: dict = {}
        if user_fk:
            filters.append('tb_user_fk = :user_fk')
            params['user_fk'] = user_fk
        if ano:
            filters.append("EXTRACT(YEAR FROM data) = :ano")
            params['ano'] = ano
        if estado:
            filters.append('ts_estado_fk = :estado')
            params['estado'] = estado
        where = ' AND '.join(filters)
        rows = session.execute(
            text(f'SELECT * FROM vbl_rh_faltas WHERE {where} ORDER BY data DESC'),
            params
        ).mappings().all()
        return jsonify(_rows_to_list(rows)), 200


# ---------------------------------------------------------------------------
# Horários
# ---------------------------------------------------------------------------

@api_error_handler
def criar_horario(data: dict, current_user: str):
    payload = HorarioCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_horario(
                0, NULL, :user_fk, :tt_jornada_fk, :descr,
                :hora_entrada::TIME, :hora_saida::TIME,
                :hora_inicio_almoco::TIME, :hora_fim_almoco::TIME,
                :dias_semana, :data_inicio, :data_fim
            ) AS result
        """), payload.model_dump()).scalar()
        _assert_success(result, 'Erro ao criar horário')
        return jsonify({'message': 'Horário criado', 'result': format_message(result)}), 201


@api_error_handler
def editar_horario(pk: int, data: dict, current_user: str):
    payload = HorarioUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_horario(
                1, :pk, NULL, :tt_jornada_fk, :descr,
                :hora_entrada::TIME, :hora_saida::TIME,
                :hora_inicio_almoco::TIME, :hora_fim_almoco::TIME,
                :dias_semana, CURRENT_DATE, :data_fim
            ) AS result
        """), {'pk': pk, **payload.model_dump()}).scalar()
        _assert_success(result, 'Erro ao editar horário')
        return jsonify({'message': 'Horário actualizado', 'result': format_message(result)}), 200


@api_error_handler
def get_horarios(current_user: str, user_fk: Optional[int], apenas_activos: bool):
    with db_session_manager(current_user) as session:
        filters = ['1=1']
        params: dict = {}
        if user_fk:
            filters.append('tb_user_fk = :user_fk')
            params['user_fk'] = user_fk
        if apenas_activos:
            filters.append('activo = TRUE')
        where = ' AND '.join(filters)
        rows = session.execute(
            text(f'SELECT * FROM vbl_rh_horario WHERE {where} ORDER BY colaborador_nome, data_inicio DESC'),
            params
        ).mappings().all()
        return jsonify(_rows_to_list(rows)), 200


# ---------------------------------------------------------------------------
# Config (saldo)
# ---------------------------------------------------------------------------

@api_error_handler
def upsert_config(data: dict, current_user: str):
    payload = ConfigUpsert.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_config_upsert(:user_fk, :ano, :dias_total, :notas) AS result
        """), payload.model_dump()).scalar()
        _assert_success(result, 'Erro ao guardar configuração')
        return jsonify({'message': 'Configuração guardada', 'result': format_message(result)}), 200


@api_error_handler
def get_config(current_user: str, user_fk: Optional[int], ano: Optional[int]):
    with db_session_manager(current_user) as session:
        filters = ['1=1']
        params: dict = {}
        if user_fk:
            filters.append('tb_user_fk = :user_fk')
            params['user_fk'] = user_fk
        if ano:
            filters.append('ano = :ano')
            params['ano'] = ano
        where = ' AND '.join(filters)
        rows = session.execute(
            text(f'SELECT * FROM ts_rh_config WHERE {where} ORDER BY ano DESC'),
            params
        ).mappings().all()
        return jsonify(_rows_to_list(rows)), 200


# ---------------------------------------------------------------------------
# Piquete
# ---------------------------------------------------------------------------

@api_error_handler
def get_piquete(current_user: str, ano: Optional[int], mes: Optional[int], user_fk: Optional[int]):
    with db_session_manager(current_user) as session:
        filters = ['1=1']
        params: dict = {}
        if ano:
            filters.append('ano = :ano')
            params['ano'] = ano
        if mes:
            filters.append('mes = :mes')
            params['mes'] = mes
        if user_fk:
            filters.append('tb_user_fk = :user_fk')
            params['user_fk'] = user_fk
        where = ' AND '.join(filters)
        rows = session.execute(
            text(f'SELECT * FROM vbl_rh_piquete WHERE {where} ORDER BY data_inicio DESC'),
            params
        ).mappings().all()
        return jsonify(_rows_to_list(rows)), 200


@api_error_handler
def gerar_escala_piquete(data: dict, current_user: str):
    payload = PiqueteGerar.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_piquete_generate(:ano, :mes) AS result
        """), payload.model_dump()).scalar()
        _assert_success(result, 'Erro ao gerar escala de piquete')
        return jsonify({'message': 'Escala gerada', 'result': format_message(result)}), 200


@api_error_handler
def confirmar_piquete(pk: int, current_user_pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_piquete_confirmar(:pk, :user_fk) AS result
        """), {'pk': pk, 'user_fk': current_user_pk}).scalar()
        _assert_success(result, 'Erro ao confirmar piquete')
        return jsonify({'message': 'Piquete confirmado', 'result': format_message(result)}), 200


@api_error_handler
def get_ocorrencias(current_user: str, escala_fk: Optional[int], ano: Optional[int], mes: Optional[int]):
    with db_session_manager(current_user) as session:
        filters = ['1=1']
        params: dict = {}
        if escala_fk:
            filters.append('tb_piquete_escala_fk = :escala_fk')
            params['escala_fk'] = escala_fk
        if ano:
            filters.append("EXTRACT(YEAR FROM semana_inicio) = :ano")
            params['ano'] = ano
        if mes:
            filters.append("EXTRACT(MONTH FROM semana_inicio) = :mes")
            params['mes'] = mes
        where = ' AND '.join(filters)
        rows = session.execute(
            text(f'SELECT * FROM vbl_rh_piquete_ocorrencias WHERE {where} ORDER BY created_at DESC'),
            params
        ).mappings().all()
        return jsonify(_rows_to_list(rows)), 200


@api_error_handler
def criar_ocorrencia(data: dict, current_user_pk: int, current_user: str):
    payload = OcorrenciaCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_ocorrencia(
                0, NULL, :tb_piquete_escala_fk, :tt_tipo_fk, :descr,
                :equipas_accionadas, :evidencia_path, :created_by
            ) AS result
        """), {**payload.model_dump(), 'created_by': current_user_pk}).scalar()
        _assert_success(result, 'Erro ao criar ocorrência')
        return jsonify({'message': 'Ocorrência registada', 'result': format_message(result)}), 201


@api_error_handler
def editar_ocorrencia(pk: int, data: dict, current_user: str):
    payload = OcorrenciaUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_ocorrencia(
                1, :pk, NULL, :tt_tipo_fk, :descr,
                :equipas_accionadas, :evidencia_path, NULL
            ) AS result
        """), {'pk': pk, **payload.model_dump()}).scalar()
        _assert_success(result, 'Erro ao editar ocorrência')
        return jsonify({'message': 'Ocorrência actualizada', 'result': format_message(result)}), 200
