import calendar
import json
import os
from flask import jsonify, request, current_app, send_file
from sqlalchemy import text
from typing import Optional
from datetime import date, time, datetime, timedelta
from pydantic import BaseModel, Field
from werkzeug.utils import secure_filename
from flask_jwt_extended import get_jwt
from ..utils.utils import format_message, db_session_manager
from app.utils.error_handler import api_error_handler, APIError, ResourceNotFoundError
from app.utils.file_processing import process_uploaded_file
from app.utils.logger import get_logger
from .rh_gestao_service import _is_rh_admin, _is_full_rh_admin, _is_direct_superior, _assert_pode_validar

_FALTA_ALLOWED_EXTS = {'.pdf', '.jpg', '.jpeg', '.png', '.docx', '.doc'}
_FALTA_MAX_FILES    = 10

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ColaboradorUpsert(BaseModel):
    pk: int
    data_nascimento: Optional[date] = None
    data_admissao: Optional[date] = None
    categoria: Optional[str] = None
    tipo_contrato: Optional[str] = None
    num_mecanografico: Optional[str] = None
    superior_fk: Optional[int] = None
    dias_ferias_base: Optional[int] = None
    elegivel_piquete: Optional[bool] = None
    gps_obrigatorio: Optional[bool] = None
    notas: Optional[str] = None
    tt_rh_equipa_fk: Optional[int] = None
    data_fim_contrato: Optional[date] = None


class ConfigAnoInit(BaseModel):
    user_fk: int
    ano: int
    force: bool = False


class PontoEventoCreate(BaseModel):
    user_fk: int
    tt_evento_fk: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    precisao: Optional[int] = None
    notas: Optional[str] = None
    face_verified: Optional[bool] = None
    face_score: Optional[float] = None


class PontoSubmeter(BaseModel):
    user_fk: int
    ano: int
    mes: int
    notas: Optional[str] = None


class PontoCorrigir(BaseModel):
    ts_registo: str  # ISO datetime string
    notas: Optional[str] = None


class PontoEventoAdminCreate(BaseModel):
    user_fk: int
    tt_evento_fk: int
    ts_registo: str   # "YYYY-MM-DDTHH:MM:SS"
    notas: Optional[str] = None


class WorkflowAction(BaseModel):
    tipo_ref: str
    ref_pk: int
    step: int
    ts_estado_fk: int
    notas: Optional[str] = None


class FeriasCreate(BaseModel):
    user_fk: Optional[int] = None
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
    tt_tipo_falta_fk: Optional[int] = None
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
    dias_transitados: Optional[int] = None
    data_limite_transitados: Optional[date] = None


class PiqueteGerar(BaseModel):
    ano: int
    mes: int


class EscalaCreate(BaseModel):
    tb_user_fk: int
    data_inicio: date
    data_fim: date


class EscalaUpdate(BaseModel):
    tb_user_fk: int
    data_inicio: date
    data_fim: date


class RegrasItem(BaseModel):
    pk: Optional[int] = None
    codigo: str
    descr: str
    valor: Optional[str] = None
    ativo: bool = True


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


def _caller_pk() -> int:
    return get_jwt().get('user_id')


def _dias_problematicos_mes(session, user_fk: int, ano: int, mes: int) -> dict:
    """Dias úteis do mês (segundo o horário activo) sem qualquer registo de
    ponto ou sem Saída registada — excluindo feriados, férias aprovadas e
    faltas não rejeitadas. Usado para bloquear a submissão do mapa mensal
    enquanto houver dias por corrigir."""
    primeiro = date(ano, mes, 1)
    ultimo   = date(ano, mes, calendar.monthrange(ano, mes)[1])

    horario = session.execute(text("""
        SELECT dias_semana FROM ts_rh_horario
        WHERE tb_user_fk = :user_fk AND data_fim IS NULL
        ORDER BY data_inicio DESC LIMIT 1
    """), {'user_fk': user_fk}).mappings().first()
    dias_semana = set(horario['dias_semana']) if horario and horario['dias_semana'] else {1, 2, 3, 4, 5}

    feriados = {r[0] for r in session.execute(text(
        "SELECT data FROM ts_feriados WHERE data BETWEEN :ini AND :fim"
    ), {'ini': primeiro, 'fim': ultimo}).fetchall()}

    dias_ferias = set()
    for data_inicio, data_fim in session.execute(text("""
        SELECT data_inicio, data_fim FROM tb_rh_ferias
        WHERE tb_user_fk = :user_fk AND ts_estado_fk = 3
          AND data_inicio <= :fim AND data_fim >= :ini
    """), {'user_fk': user_fk, 'ini': primeiro, 'fim': ultimo}).fetchall():
        d = max(data_inicio, primeiro)
        while d <= min(data_fim, ultimo):
            dias_ferias.add(d)
            d += timedelta(days=1)

    dias_falta = {r[0] for r in session.execute(text("""
        SELECT data FROM tb_rh_faltas
        WHERE tb_user_fk = :user_fk AND ts_estado_fk != 4
          AND data BETWEEN :ini AND :fim
    """), {'user_fk': user_fk, 'ini': primeiro, 'fim': ultimo}).fetchall()}

    registos = {
        r['data']: set(r['eventos'] or [])
        for r in session.execute(text("""
            SELECT data, ARRAY_AGG(DISTINCT tt_evento_fk) AS eventos
            FROM tb_rh_ponto
            WHERE tb_user_fk = :user_fk AND data BETWEEN :ini AND :fim
            GROUP BY data
        """), {'user_fk': user_fk, 'ini': primeiro, 'fim': ultimo}).mappings().all()
    }

    sem_registo, incompletos = [], []
    d = primeiro
    while d <= ultimo:
        if d.isoweekday() in dias_semana and d not in feriados and d not in dias_ferias and d not in dias_falta:
            eventos = registos.get(d)
            if not eventos:
                sem_registo.append(d.isoformat())
            elif 4 not in eventos:
                incompletos.append(d.isoformat())
        d += timedelta(days=1)

    return {'dias_sem_registo': sem_registo, 'dias_incompletos': incompletos}


def _mes_pendente_ou_nao_submetido(session, user_fk: int, data_evento) -> bool:
    """True se o mapa mensal desse (utilizador, ano, mês) ainda não existe ou está Pendente (1)."""
    estado = session.execute(text("""
        SELECT ts_estado_fk FROM tb_rh_ponto_mensal
        WHERE tb_user_fk = :user_fk
          AND ano = EXTRACT(YEAR FROM CAST(:data AS DATE))::INT
          AND mes = EXTRACT(MONTH FROM CAST(:data AS DATE))::INT
    """), {'user_fk': user_fk, 'data': data_evento}).scalar()
    return estado is None or estado == 1


def _rows_to_list(rows):
    out = []
    for r in rows:
        d = dict(r)
        for k, v in d.items():
            if isinstance(v, (date, datetime, time)):
                d[k] = v.isoformat()
        out.append(d)
    return out


# ---------------------------------------------------------------------------
# Lookups
# ---------------------------------------------------------------------------

@api_error_handler
def get_lookups(current_user: str):
    with db_session_manager(current_user) as session:
        def fetch(q):
            return _rows_to_list(session.execute(text(q)).mappings().all())

        return jsonify({
            'tipos_jornada':    fetch('SELECT * FROM vbl_rh_tipo_jornada'),
            'eventos_ponto':    fetch('SELECT * FROM vbl_rh_ponto_evento'),
            'tipos_ferias':     fetch('SELECT * FROM vbl_rh_tipo_ferias'),
            'tipos_falta':      fetch('SELECT * FROM vbl_rh_tipo_falta'),
            'estados_workflow': fetch('SELECT * FROM vbl_rh_estado_workflow'),
            'tipos_ocorrencia': fetch('SELECT * FROM vbl_rh_tipo_ocorrencia'),
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
        data = {k: str(v) if hasattr(v, 'isoformat') and not hasattr(v, 'year') else v
                for k, v in dict(row).items()}
        return jsonify(data), 200


@api_error_handler
def get_saldo_ferias(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(
            text('SELECT * FROM vbl_rh_saldo_ferias WHERE tb_user_fk = :pk'),
            {'pk': pk}
        ).mappings().first()
        if not row:
            year = date.today().year
            dias = session.execute(
                text('SELECT fn_rh_calcular_ferias_ano(:pk, :ano) AS dias'),
                {'pk': pk, 'ano': year}
            ).scalar() or 22
            return jsonify({
                'tb_user_fk': pk,
                'colaborador_nome': None,
                'ano': year,
                'dias_total': dias,
                'dias_gozados': 0,
                'dias_pendentes': 0,
                'dias_disponiveis': dias,
            }), 200
        return jsonify(dict(row)), 200


# ---------------------------------------------------------------------------
# Ponto
# ---------------------------------------------------------------------------

@api_error_handler
def check_entrada(user_fk: int, current_user: str):
    """
    Devolve o PRIMEIRO evento de ponto em falta que já devia ter sido registado.
    Verifica todos os eventos do horário activo por ordem (Entrada → Almoços → Saída).
    Condições globais que inibem qualquer alerta:
      - Sem horário activo / hoje não é dia de trabalho / feriado / férias aprovadas / falta registada
    """
    from datetime import datetime, timedelta

    GRACE = timedelta(minutes=15)

    with db_session_manager(current_user) as session:
        row = session.execute(text("""
            SELECT
                h.tt_jornada_fk,
                h.descr               AS horario_descr,
                h.dias_semana,
                h.hora_entrada,
                h.hora_inicio_almoco,
                h.hora_fim_almoco,
                h.hora_saida,
                -- Eventos já registados hoje (bitmask via array)
                ARRAY(
                    SELECT tt_evento_fk FROM tb_rh_ponto
                    WHERE tb_user_fk = :user_fk AND data = CURRENT_DATE
                ) AS eventos_registados,
                EXISTS(
                    SELECT 1 FROM ts_feriados WHERE data = CURRENT_DATE
                ) AS is_feriado,
                EXISTS(
                    SELECT 1 FROM tb_rh_ferias f
                    WHERE f.tb_user_fk = :user_fk
                      AND CURRENT_DATE BETWEEN f.data_inicio AND f.data_fim
                      AND f.ts_estado_fk = 3
                ) AS tem_ferias,
                EXISTS(
                    SELECT 1 FROM tb_rh_faltas fa
                    WHERE fa.tb_user_fk = :user_fk
                      AND fa.data = CURRENT_DATE
                      AND fa.ts_estado_fk != 4
                ) AS tem_falta
            FROM ts_rh_horario h
            WHERE h.tb_user_fk = :user_fk AND h.data_fim IS NULL
            ORDER BY h.data_inicio DESC
            LIMIT 1
        """), {'user_fk': user_fk}).mappings().first()

        no_alert = jsonify({'needs_check': False}), 200

        if not row:
            return no_alert

        # Dia da semana (1=Segunda … 7=Domingo)
        today_dow   = date.today().isoweekday()
        dias_semana = list(row['dias_semana'] or [1, 2, 3, 4, 5])
        if today_dow not in dias_semana:
            return no_alert
        if row['is_feriado'] or row['tem_ferias'] or row['tem_falta']:
            return no_alert

        now          = datetime.now().time()
        registados   = list(row['eventos_registados'] or [])
        jornada      = row['tt_jornada_fk']   # 1=Partida, 2=Contínua
        horario_descr = row['horario_descr']

        # Sequência de eventos a verificar: (evento_fk, label, hora_prevista)
        # Jornada contínua (2) não tem almoço
        candidatos = [
            (1, 'Entrada',         row['hora_entrada']),
        ]
        if jornada != 2 and row['hora_inicio_almoco']:
            candidatos.append((2, 'Início de Almoço', row['hora_inicio_almoco']))
        if jornada != 2 and row['hora_fim_almoco']:
            candidatos.append((3, 'Fim de Almoço',    row['hora_fim_almoco']))
        candidatos.append((4, 'Saída', row['hora_saida']))

        for evento_fk, label, hora_prevista in candidatos:
            if hora_prevista is None:
                continue
            # Só alertar se já passou hora_prevista + tolerância de 15 min
            limite = (datetime.combine(date.today(), hora_prevista) + GRACE).time()
            if now < limite:
                break   # eventos seguintes também ainda não são devidos
            if evento_fk not in registados:
                return jsonify({
                    'needs_check':   True,
                    'evento_fk':     evento_fk,
                    'evento_label':  label,
                    'hora_prevista': hora_prevista.strftime('%H:%M'),
                    'horario_descr': horario_descr,
                }), 200

        return no_alert


@api_error_handler
def registar_ponto_evento(data: dict, current_user: str):
    from flask import current_app
    payload = PontoEventoCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_ponto_evento(
                :user_fk, :tt_evento_fk, :latitude, :longitude, :precisao, :notas
            ) AS result
        """), payload.model_dump()).scalar()
        _assert_success(result, 'Erro ao registar evento de ponto')

        # Persistir dados de reconhecimento facial (UPDATE pela chave única user+data+evento)
        if payload.face_verified is not None:
            fonte = 'app+face' if payload.face_verified else 'app'
            session.execute(text("""
                UPDATE tb_rh_ponto
                SET face_verified = :face_verified,
                    face_score    = :face_score,
                    fonte         = :fonte
                WHERE tb_user_fk  = :user_fk
                  AND data        = CURRENT_DATE
                  AND tt_evento_fk = :tt_evento_fk
            """), {
                'face_verified': payload.face_verified,
                'face_score':    payload.face_score,
                'fonte':         fonte,
                'user_fk':       payload.user_fk,
                'tt_evento_fk':  payload.tt_evento_fk,
            })

        # Emitir alerta de geofencing ao superior hierárquico se fora do local
        if result and 'fora_local=true' in result.lower():
            try:
                row = session.execute(text("""
                    SELECT c.name AS colaborador_nome, col.superior_fk
                    FROM ts_client c
                    LEFT JOIN ts_rh_colaborador col ON col.pk = c.pk
                    WHERE c.pk = :user_fk
                """), {'user_fk': payload.user_fk}).fetchone()

                if row and row.superior_fk:
                    socketio_events = current_app.extensions.get('socketio_events')
                    if socketio_events:
                        socketio_events.emit_rh_notification(
                            user_ids=[row.superior_fk],
                            notification_type='ponto_fora_local',
                            title='Ponto fora do local',
                            message=f'{row.colaborador_nome} registou ponto fora do local definido.',
                            route='/rh/pessoal/ponto',
                        )
            except Exception as e:
                logger.warning(f'Falhou notificação geofencing: {e}')

        # Ao registar Regresso (evento 6): criar participação parcial automaticamente
        participacao_criada = False
        participacao_pk = None

        if payload.tt_evento_fk == 6:
            try:
                ev6 = session.execute(text("""
                    SELECT pk, ts_registo::TIME AS hora
                    FROM tb_rh_ponto
                    WHERE tb_user_fk = :user_fk
                      AND data = CURRENT_DATE
                      AND tt_evento_fk = 6
                    ORDER BY ts_registo DESC LIMIT 1
                """), {'user_fk': payload.user_fk}).fetchone()

                ev5 = session.execute(text("""
                    SELECT p.pk, p.ts_registo::TIME AS hora
                    FROM tb_rh_ponto p
                    WHERE p.tb_user_fk = :user_fk
                      AND p.data = CURRENT_DATE
                      AND p.tt_evento_fk = 5
                      AND NOT EXISTS (
                          SELECT 1 FROM tb_rh_participacao pt
                          WHERE pt.ponto_saida_fk = p.pk
                      )
                    ORDER BY p.ts_registo DESC LIMIT 1
                """), {'user_fk': payload.user_fk}).fetchone()

                if ev5 and ev6:
                    hora_saida   = str(ev5.hora)[:5]
                    hora_regresso = str(ev6.hora)[:5]
                    part_result = session.execute(text("""
                        SELECT fbo_rh_participacao(
                            0::SMALLINT, NULL,
                            :user_fk, NULL, 'parcial',
                            CURRENT_DATE, CURRENT_DATE,
                            CAST(:hora_inicio AS TIME), CAST(:hora_fim AS TIME),
                            :ponto_saida_fk, :ponto_regresso_fk,
                            CURRENT_DATE, NULL,
                            '[]'::JSONB
                        ) AS result
                    """), {
                        'user_fk':           payload.user_fk,
                        'hora_inicio':        hora_saida,
                        'hora_fim':           hora_regresso,
                        'ponto_saida_fk':     ev5.pk,
                        'ponto_regresso_fk':  ev6.pk,
                    }).scalar()

                    if part_result and '<sucess>' in part_result.lower():
                        participacao_criada = True
                        participacao_pk = format_message(part_result)
                        logger.info(f'Participação parcial auto-criada: pk={participacao_pk}, user={payload.user_fk}')
            except Exception as e:
                logger.warning(f'Falhou auto-criação de participação ao registar regresso: {e}')

        return jsonify({
            'message': 'Evento registado',
            'result': format_message(result),
            'participacao_criada': participacao_criada,
            'participacao_pk': participacao_pk,
        }), 201


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
        problemas = _dias_problematicos_mes(session, payload.user_fk, payload.ano, payload.mes)
        if problemas['dias_sem_registo'] or problemas['dias_incompletos']:
            raise APIError(
                'Existem dias por corrigir antes de submeter o mapa mensal.',
                400,
                payload=problemas,
            )

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
        registo = session.execute(
            text('SELECT tb_user_fk, data FROM tb_rh_ponto WHERE pk = :pk'), {'pk': pk}
        ).fetchone()
        if not registo:
            raise APIError('Registo de ponto não encontrado', 404)

        if not _is_full_rh_admin(session):
            caller_pk = _caller_pk()
            if not _is_direct_superior(session, registo.tb_user_fk, caller_pk):
                raise APIError('Só pode corrigir registos de colaboradores da sua equipa', 403)
            if not _mes_pendente_ou_nao_submetido(session, registo.tb_user_fk, registo.data):
                raise APIError('Só é possível corrigir enquanto o mapa mensal está pendente', 403)

        result = session.execute(text("""
            SELECT fbo_rh_ponto_corrigir(:pk, CAST(:ts_registo AS TIMESTAMP), :notas) AS result
        """), {'pk': pk, **payload.model_dump()}).scalar()
        _assert_success(result, 'Erro ao corrigir registo de ponto')
        return jsonify({'message': 'Registo corrigido', 'result': format_message(result)}), 200


@api_error_handler
def adicionar_ponto_admin(data: dict, current_user: str):
    """Adiciona evento de ponto com timestamp personalizado (admin RH ou supervisor da equipa)."""
    payload = PontoEventoAdminCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        if not _is_full_rh_admin(session):
            caller_pk = _caller_pk()
            if not _is_direct_superior(session, payload.user_fk, caller_pk):
                raise APIError('Só pode adicionar registos de colaboradores da sua equipa', 403)
            if not _mes_pendente_ou_nao_submetido(session, payload.user_fk, payload.ts_registo[:10]):
                raise APIError('Só é possível adicionar registos enquanto o mapa mensal está pendente', 403)

        row = session.execute(text("""
            INSERT INTO tb_rh_ponto (pk, tb_user_fk, tt_evento_fk, data, ts_registo, fonte, notas)
            VALUES (
                fs_nextcode(),
                :user_fk,
                :tt_evento_fk,
                CAST(:ts_registo AS DATE),
                CAST(:ts_registo AS TIMESTAMP WITHOUT TIME ZONE),
                'correcao',
                :notas
            )
            RETURNING pk
        """), {
            'user_fk': payload.user_fk,
            'tt_evento_fk': payload.tt_evento_fk,
            'ts_registo': payload.ts_registo,
            'notas': payload.notas or 'Registo manual (responsável)',
        }).fetchone()
        return jsonify({'ok': True, 'pk': row.pk}), 201


# ---------------------------------------------------------------------------
# Workflow genérico
# ---------------------------------------------------------------------------

@api_error_handler
def executar_workflow(data: dict, current_user_pk: int, current_user: str):
    payload = WorkflowAction.model_validate(data)
    with db_session_manager(current_user) as session:
        _assert_pode_validar(session, payload.tipo_ref, payload.ref_pk, payload.step, current_user_pk)
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
    # Pedidos são sempre em nome próprio — ignora qualquer user_fk submetido pelo cliente.
    p = payload.model_dump()
    p['user_fk'] = _caller_pk()
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_ferias(
                0, NULL, :user_fk, :tt_tipo_fk,
                :data_inicio, :data_fim, :notas
            ) AS result
        """), p).scalar()
        _assert_success(result, 'Erro ao criar pedido de férias')
        return jsonify({'message': 'Pedido de férias criado', 'result': format_message(result)}), 201


@api_error_handler
def editar_ferias(pk: int, data: dict, current_user: str):
    payload = FeriasUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        if not _is_rh_admin(current_user, session):
            owner = session.execute(
                text('SELECT tb_user_fk FROM tb_rh_ferias WHERE pk = :pk'), {'pk': pk}
            ).scalar()
            if owner != _caller_pk():
                raise APIError('Não tem permissão para editar este pedido', 403)
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
        # Só chefes/RH/admin podem ver pedidos de outros colaboradores.
        if not _is_rh_admin(current_user, session):
            user_fk = _caller_pk()
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
# Férias — conflitos de equipa e mapa anual
# ---------------------------------------------------------------------------

@api_error_handler
def get_conflitos_ferias(current_user: str, user_fk: int, data_inicio: str, data_fim: str, excluir_pk: Optional[int] = None):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT * FROM fn_rh_ferias_conflitos(
                :user_fk,
                CAST(:data_inicio AS DATE),
                CAST(:data_fim AS DATE),
                :excluir_pk
            )
        """), {
            'user_fk': user_fk,
            'data_inicio': data_inicio,
            'data_fim': data_fim,
            'excluir_pk': excluir_pk,
        }).mappings().all()
        return jsonify(_rows_to_list(rows)), 200


@api_error_handler
def get_mapa_ferias(current_user: str, ano: int, equipa_fk: Optional[int] = None):
    with db_session_manager(current_user) as session:
        filters = ['ano = :ano']
        params: dict = {'ano': ano}
        if equipa_fk:
            filters.append('tt_rh_equipa_fk = :equipa_fk')
            params['equipa_fk'] = equipa_fk
        where = ' AND '.join(filters)
        rows = session.execute(
            text(f'SELECT * FROM vbl_rh_ferias_mapa WHERE {where} ORDER BY equipa_codigo, colaborador_nome, data_inicio'),
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
        p = payload.model_dump()
        if _is_rh_admin(current_user, session):
            # Chefe/RH a comunicar falta de outro colaborador.
            p['comunicado_por'] = _caller_pk()
        else:
            # Auto-registo — sempre em nome próprio.
            p['user_fk'] = _caller_pk()
            p['comunicado_por'] = None
        result = session.execute(text("""
            SELECT fbo_rh_faltas(
                0, NULL, :user_fk, :tt_tipo_falta_fk, :data,
                :justificativo_path, :notas, :comunicado_por
            ) AS result
        """), p).scalar()
        _assert_success(result, 'Erro ao registar falta')
        return jsonify({'message': 'Falta registada', 'result': format_message(result)}), 201


@api_error_handler
def editar_falta(pk: int, data: dict, current_user: str):
    payload = FaltaUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        if not _is_rh_admin(current_user, session):
            owner = session.execute(
                text('SELECT tb_user_fk FROM tb_rh_faltas WHERE pk = :pk'), {'pk': pk}
            ).scalar()
            if owner != _caller_pk():
                raise APIError('Não tem permissão para editar esta falta', 403)
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
        if not _is_rh_admin(current_user, session):
            user_fk = _caller_pk()
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
# Faltas — Anexos
# ---------------------------------------------------------------------------

def _falta_upload_dir(pk: int, user_fk: int, data: date) -> str:
    base = current_app.config.get('FILES_DIR', '')
    ano  = str(data.year)
    mes  = str(data.month).zfill(2)
    return os.path.join(base, 'rh', 'faltas', str(user_fk), ano, mes, str(pk))


def _falta_record(session, pk: int):
    row = session.execute(
        text("SELECT pk, tb_user_fk, data, documentos FROM tb_rh_faltas WHERE pk = :pk"),
        {'pk': pk},
    ).fetchone()
    if not row:
        raise APIError('Falta não encontrada', 404)
    return row


@api_error_handler
def upload_anexos_falta(pk: int, current_user: str):
    files = request.files.getlist('files')
    if not files or all(f.filename == '' for f in files):
        raise APIError('Nenhum ficheiro enviado', 400)

    with db_session_manager(current_user) as session:
        row  = _falta_record(session, pk)
        docs = list(row.documentos or [])

        if len(docs) >= _FALTA_MAX_FILES:
            raise APIError(f'Limite de {_FALTA_MAX_FILES} anexos por falta atingido', 400)

        upload_dir = _falta_upload_dir(pk, row.tb_user_fk, row.data)
        os.makedirs(upload_dir, exist_ok=True)

        novos, erros = [], []

        for f in files[:(_FALTA_MAX_FILES - len(docs))]:
            if not f.filename:
                continue
            ext = os.path.splitext(f.filename)[1].lower()
            if ext not in _FALTA_ALLOWED_EXTS:
                erros.append(f'{f.filename}: tipo não permitido (PDF, JPEG, PNG, DOCX)')
                continue

            file_pk   = session.execute(text("SELECT fs_nextcode()")).scalar()
            safe_name = f"{file_pk}{ext}"
            file_path = os.path.join(upload_dir, safe_name)
            f.save(file_path)

            final_path, _, _ = process_uploaded_file(file_path, safe_name)
            final_name = os.path.basename(final_path)

            entrada = {
                'pk':            file_pk,
                'nome_original': secure_filename(f.filename),
                'filename':      final_name,
                'data':          datetime.now().isoformat(),
                'tamanho':       os.path.getsize(final_path),
            }
            docs.append(entrada)
            novos.append(entrada)

        if novos:
            session.execute(
                text("UPDATE tb_rh_faltas SET documentos = CAST(:docs AS JSONB) WHERE pk = :pk"),
                {'docs': json.dumps(docs), 'pk': pk},
            )

    return jsonify({'adicionados': novos, 'erros': erros, 'total': len(novos)}), 201


@api_error_handler
def download_anexo_falta(pk: int, filename: str, current_user: str):
    if '..' in filename or '/' in filename or '\\' in filename:
        raise APIError('Nome de ficheiro inválido', 400)

    with db_session_manager(current_user) as session:
        row = _falta_record(session, pk)

    file_path = os.path.join(_falta_upload_dir(pk, row.tb_user_fk, row.data), filename)
    if not os.path.isfile(file_path):
        raise APIError('Ficheiro não encontrado', 404)

    return send_file(file_path, as_attachment=False)


@api_error_handler
def delete_anexo_falta(pk: int, filename: str, current_user: str):
    if '..' in filename or '/' in filename or '\\' in filename:
        raise APIError('Nome de ficheiro inválido', 400)

    with db_session_manager(current_user) as session:
        row  = _falta_record(session, pk)
        docs = list(row.documentos or [])

        docs_novos = [d for d in docs if d.get('filename') != filename]
        if len(docs_novos) == len(docs):
            raise APIError('Ficheiro não encontrado nos anexos', 404)

        file_path = os.path.join(_falta_upload_dir(pk, row.tb_user_fk, row.data), filename)
        if os.path.isfile(file_path):
            os.remove(file_path)

        session.execute(
            text("UPDATE tb_rh_faltas SET documentos = CAST(:docs AS JSONB) WHERE pk = :pk"),
            {'docs': json.dumps(docs_novos), 'pk': pk},
        )

    return jsonify({'message': 'Anexo removido'}), 200


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
                CAST(:hora_entrada AS TIME), CAST(:hora_saida AS TIME),
                CAST(:hora_inicio_almoco AS TIME), CAST(:hora_fim_almoco AS TIME),
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
                CAST(:hora_entrada AS TIME), CAST(:hora_saida AS TIME),
                CAST(:hora_inicio_almoco AS TIME), CAST(:hora_fim_almoco AS TIME),
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
            # Filtra pela coluna base (data_fim IS NULL) — mais seguro que a coluna calculada
            filters.append('data_fim IS NULL')
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
    p = payload.model_dump()
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_config_upsert(
                :user_fk, :ano, :dias_total, :notas,
                :dias_transitados, :data_limite_transitados
            ) AS result
        """), p).scalar()
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
            text(f'SELECT * FROM vbl_rh_config WHERE {where} ORDER BY ano DESC'),
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
        
        if result and "<sucess>" in result:
            # Forçar atualização do estado para "Aprovado RH" (3) na base de dados
            session.execute(text("UPDATE tb_rh_piquete_escala SET ts_estado_fk = 3 WHERE pk = :pk"), {'pk': pk})
            
        _assert_success(result, 'Erro ao confirmar piquete')
        return jsonify({'message': 'Piquete confirmado', 'result': format_message(result)}), 200


@api_error_handler
def criar_escala_piquete(data: dict, current_user: str):
    payload = EscalaCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        exists = session.execute(text("""
            SELECT 1 FROM tb_rh_piquete_escala
            WHERE tb_user_fk = :user_fk AND data_inicio = :data_inicio
        """), {'user_fk': payload.tb_user_fk, 'data_inicio': payload.data_inicio}).scalar()

        if exists:
            raise APIError('Este colaborador já tem uma escala registada com esta data de início.', 400)

        session.execute(text("""
            INSERT INTO tb_rh_piquete_escala (pk, tb_user_fk, data_inicio, data_fim, confirmado, ts_estado_fk, gerado_auto)
            VALUES (fs_nextcode(), :user_fk, :data_inicio, :data_fim, FALSE, 1, FALSE)
        """), {'user_fk': payload.tb_user_fk, 'data_inicio': payload.data_inicio, 'data_fim': payload.data_fim})
        return jsonify({'message': 'Escala criada com sucesso'}), 200


@api_error_handler
def editar_escala_piquete(pk: int, data: dict, current_user: str):
    payload = EscalaUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        exists = session.execute(text("""
            SELECT 1 FROM tb_rh_piquete_escala
            WHERE tb_user_fk = :user_fk
              AND data_inicio = :data_inicio
              AND pk != :pk
        """), {'user_fk': payload.tb_user_fk, 'data_inicio': payload.data_inicio, 'pk': pk}).scalar()

        if exists:
            raise APIError('Este colaborador já tem outra escala registada com esta data de início.', 400)

        session.execute(text("""
            UPDATE tb_rh_piquete_escala
            SET tb_user_fk = :user_fk,
                data_inicio = :data_inicio,
                data_fim = :data_fim,
                confirmado = FALSE,
                ts_confirmacao = NULL,
                ts_estado_fk = 1,
                gerado_auto = FALSE
            WHERE pk = :pk
        """), {'pk': pk, 'user_fk': payload.tb_user_fk, 'data_inicio': payload.data_inicio, 'data_fim': payload.data_fim})
        return jsonify({'message': 'Escala atualizada com sucesso'}), 200


@api_error_handler
def get_piquete_regras(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("SELECT * FROM ts_rh_piquete_regras ORDER BY pk")).mappings().all()
        return jsonify(_rows_to_list(rows)), 200


@api_error_handler
def upsert_piquete_regras(data: list, current_user: str):
    items = [RegrasItem.model_validate(item) for item in data]
    with db_session_manager(current_user) as session:
        existing = {r.pk for r in session.execute(text("SELECT pk FROM ts_rh_piquete_regras")).all()}
        incoming = {item.pk for item in items if item.pk}

        to_delete = existing - incoming
        if to_delete:
            session.execute(text("DELETE FROM ts_rh_piquete_regras WHERE pk = ANY(:pks)"), {'pks': list(to_delete)})

        for item in items:
            p = item.model_dump()
            if item.pk:
                session.execute(text("""
                    UPDATE ts_rh_piquete_regras
                    SET codigo = :codigo, descr = :descr, valor = :valor, ativo = :ativo
                    WHERE pk = :pk
                """), p)
            else:
                session.execute(text("""
                    INSERT INTO ts_rh_piquete_regras (pk, codigo, descr, valor, ativo)
                    VALUES (fs_nextcode(), :codigo, :descr, :valor, :ativo)
                """), p)

        return jsonify({'message': 'Regras atualizadas com sucesso'}), 200


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


# ---------------------------------------------------------------------------
# Perfil RH do colaborador (ts_rh_colaborador)
# ---------------------------------------------------------------------------

# Nota: get_colaborador_perfil foi removido — era duplicado de get_colaborador.
# O route /rh/colaboradores/<pk>/perfil chama get_colaborador directamente.

@api_error_handler
def upsert_colaborador_perfil(data: dict, current_user: str):
    payload = ColaboradorUpsert.model_validate(data)
    p = payload.model_dump()
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_colaborador(
                0, :pk,
                :data_nascimento, :data_admissao, :categoria, :tipo_contrato,
                :num_mecanografico, :superior_fk,
                :dias_ferias_base, :elegivel_piquete, :notas, :gps_obrigatorio,
                :tt_rh_equipa_fk, :data_fim_contrato
            ) AS result
        """), p).scalar()
        _assert_success(result, 'Erro ao guardar perfil RH')
        return jsonify({'message': 'Perfil RH guardado', 'result': format_message(result)}), 200


@api_error_handler
def init_config_ano(data: dict, current_user: str):
    payload = ConfigAnoInit.model_validate(data)
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_config_ano_init(:user_fk, :ano, :force) AS result
        """), payload.model_dump()).scalar()
        _assert_success(result, 'Erro ao inicializar configuração anual')
        return jsonify({'message': 'Configuração anual inicializada', 'result': format_message(result)}), 200


@api_error_handler
def init_config_ano_todos(ano: int, current_user: str):
    """Inicializa saldo anual para TODOS os colaboradores com perfil RH elegível."""
    with db_session_manager(current_user) as session:
        # Usa vbl_rh_colaborador para garantir o filtro de perfis (ts_profile IN 0,1,6)
        rows = session.execute(
            text('SELECT pk FROM vbl_rh_colaborador')
        ).fetchall()
        results = []
        for (pk,) in rows:
            r = session.execute(text("""
                SELECT fbo_rh_config_ano_init(:user_fk, :ano, FALSE) AS result
            """), {'user_fk': pk, 'ano': ano}).scalar()
            results.append({'user_fk': pk, 'result': format_message(r) if r else None})
        return jsonify({'ano': ano, 'total': len(results), 'detalhes': results}), 200


# ---------------------------------------------------------------------------
# Geofencing — Locais predefinidos
# ---------------------------------------------------------------------------

class LocalCreate(BaseModel):
    nome: str
    descr: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    raio_metros: int = Field(200, ge=10, le=10000)


class LocalUpdate(BaseModel):
    nome: Optional[str] = None
    descr: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    raio_metros: Optional[int] = Field(None, ge=10, le=10000)
    ativo: Optional[bool] = None


@api_error_handler
def get_locais(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(
            text('SELECT * FROM vbl_rh_local ORDER BY nome')
        ).mappings().all()
        return jsonify(_rows_to_list(rows)), 200


@api_error_handler
def criar_local(data: dict, current_user: str):
    payload = LocalCreate.model_validate(data)
    p = payload.model_dump()
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_local(0, NULL, :nome, :descr, :latitude, :longitude, :raio_metros, TRUE) AS result
        """), p).scalar()
        _assert_success(result, 'Erro ao criar local')
        return jsonify({'message': 'Local criado'}), 201


@api_error_handler
def editar_local(pk: int, data: dict, current_user: str):
    payload = LocalUpdate.model_validate(data)
    p = payload.model_dump()
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_local(1, :pk, :nome, :descr, :latitude, :longitude, :raio_metros, :ativo) AS result
        """), {'pk': pk, **p}).scalar()
        _assert_success(result, 'Erro ao editar local')
        return jsonify({'message': 'Local actualizado'}), 200


@api_error_handler
def eliminar_local(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_local(2, :pk) AS result
        """), {'pk': pk}).scalar()
        _assert_success(result, 'Erro ao eliminar local')
        return jsonify({'message': 'Local eliminado'}), 200


@api_error_handler
def set_local_colaborador(user_pk: int, local_fk: Optional[int], current_user: str):
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_col_set_local(:user_pk, :local_fk) AS result
        """), {'user_pk': user_pk, 'local_fk': local_fk}).scalar()
        _assert_success(result, 'Erro ao atribuir local')
        return jsonify({'message': 'Local atribuído'}), 200


@api_error_handler
def get_ponto_alertas(current_user: str, user_fk: Optional[int], data_inicio: Optional[str], data_fim: Optional[str]):
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
            text(f'SELECT * FROM vbl_rh_ponto_alertas WHERE {where} ORDER BY ts_registo DESC'),
            params
        ).mappings().all()
        return jsonify(_rows_to_list(rows)), 200
