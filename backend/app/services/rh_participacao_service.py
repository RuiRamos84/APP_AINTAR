import json
import os
from datetime import date, time, datetime
from typing import Optional
from flask import jsonify, request, current_app, send_file
from sqlalchemy import text
from pydantic import BaseModel, Field
from werkzeug.utils import secure_filename
from ..utils.utils import format_message, db_session_manager
from app.utils.error_handler import api_error_handler, APIError
from app.utils.file_processing import process_uploaded_file
from app.utils.logger import get_logger

ALLOWED_EXTS  = {'.pdf', '.jpg', '.jpeg', '.png'}
MAX_FILES     = 5

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ok(result: Optional[str], msg: str):
    if not result or '<sucess>' not in result:
        err = format_message(result) if result else msg
        raise APIError(err, 400)


def _rows(rows) -> list:
    out = []
    for r in rows:
        d = dict(r)
        for k, v in d.items():
            if hasattr(v, 'isoformat'):
                d[k] = v.isoformat()
        out.append(d)
    return out


def _get_superior_fk(session, user_fk: int):
    """Devolve o superior hierárquico do colaborador (ts_rh_colaborador.pk = user pk)."""
    row = session.execute(
        text("SELECT superior_fk FROM ts_rh_colaborador WHERE pk = :pk"),
        {'pk': user_fk},
    ).fetchone()
    return row.superior_fk if row else None


def _get_rh_validators(session):
    """Devolve PKs dos utilizadores com rh.validate ou rh.admin (ou super admin)."""
    rows = session.execute(text("""
        SELECT DISTINCT c.pk
        FROM ts_client c
        WHERE c.ts_profile = 0
           OR EXISTS (
               SELECT 1 FROM ts_interface i
               WHERE i.value IN ('rh.validate', 'rh.admin')
                 AND c.interface @> ARRAY[i.pk]
           )
    """)).fetchall()
    return [r.pk for r in rows]


def _emit_rh(notification_type: str, title: str, message: str,
             user_ids: list, route: str = '/rh/pessoal/faltas'):
    """Emite notificação RH via Socket.IO, silenciando falhas."""
    try:
        socketio_events = current_app.extensions.get('socketio_events')
        if socketio_events and user_ids:
            socketio_events.emit_rh_notification(
                user_ids=user_ids,
                notification_type=notification_type,
                title=title,
                message=message,
                route=route,
            )
    except Exception as e:
        logger.warning(f'Falha ao emitir notificação RH ({notification_type}): {e}')


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ParticipacaoCreate(BaseModel):
    user_fk: int
    motivo_fk: Optional[int] = None
    tipo: str = 'dia'
    data_inicio: date
    data_fim: date
    hora_inicio: Optional[time] = None
    hora_fim: Optional[time] = None
    ponto_saida_fk: Optional[int] = None
    ponto_regresso_fk: Optional[int] = None
    data_participacao: Optional[date] = None
    observacoes: Optional[str] = None
    documentos: Optional[list] = Field(default_factory=list)


class ParticipacaoUpdate(BaseModel):
    motivo_fk: Optional[int] = None
    tipo: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    hora_inicio: Optional[time] = None
    hora_fim: Optional[time] = None
    ponto_saida_fk: Optional[int] = None
    ponto_regresso_fk: Optional[int] = None
    data_participacao: Optional[date] = None
    observacoes: Optional[str] = None
    documentos: Optional[list] = None


class ParticipacaoWf(BaseModel):
    ref_pk: int
    step: int
    ts_estado_fk: int
    notas: Optional[str] = None


# ---------------------------------------------------------------------------
# Motivos legais
# ---------------------------------------------------------------------------

@api_error_handler
def get_motivos(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, artigo, descricao, parcial_ok
            FROM ts_rh_falta_motivo
            WHERE ativo = TRUE
            ORDER BY pk
        """)).mappings().all()
        return jsonify(_rows(rows)), 200


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@api_error_handler
def get_participacoes(
    current_user: str,
    user_fk: Optional[int] = None,
    ano: Optional[int] = None,
    mes: Optional[int] = None,
    estado: Optional[int] = None,
    tipo: Optional[str] = None,
):
    filters = ['1=1']
    params: dict = {}

    if user_fk:
        filters.append('tb_user_fk = :user_fk')
        params['user_fk'] = user_fk
    if ano:
        filters.append('EXTRACT(YEAR FROM data_inicio) = :ano')
        params['ano'] = ano
    if mes:
        filters.append('EXTRACT(MONTH FROM data_inicio) = :mes')
        params['mes'] = mes
    if estado:
        filters.append('ts_estado_fk = :estado')
        params['estado'] = estado
    if tipo:
        filters.append('tipo = :tipo')
        params['tipo'] = tipo

    where = ' AND '.join(filters)
    with db_session_manager(current_user) as session:
        rows = session.execute(
            text(f'SELECT * FROM vbl_rh_participacao WHERE {where} ORDER BY data_inicio DESC'),
            params,
        ).mappings().all()
        return jsonify(_rows(rows)), 200


@api_error_handler
def criar_participacao(data: dict, current_user: str):
    p = ParticipacaoCreate.model_validate(data)
    docs = json.dumps(p.documentos or [])

    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_participacao(
                0::SMALLINT, NULL,
                :user_fk, :motivo_fk, :tipo,
                :data_inicio, :data_fim,
                CAST(:hora_inicio AS TIME), CAST(:hora_fim AS TIME),
                :ponto_saida_fk, :ponto_regresso_fk,
                :data_participacao, :observacoes,
                CAST(:documentos AS JSONB)
            ) AS result
        """), {
            'user_fk':           p.user_fk,
            'motivo_fk':         p.motivo_fk,
            'tipo':              p.tipo,
            'data_inicio':       p.data_inicio,
            'data_fim':          p.data_fim,
            'hora_inicio':       str(p.hora_inicio) if p.hora_inicio else None,
            'hora_fim':          str(p.hora_fim)    if p.hora_fim    else None,
            'ponto_saida_fk':    p.ponto_saida_fk,
            'ponto_regresso_fk': p.ponto_regresso_fk,
            'data_participacao': p.data_participacao,
            'observacoes':       p.observacoes,
            'documentos':        docs,
        }).scalar()

    _ok(result, 'Erro ao criar participação')
    pk = format_message(result)
    logger.info(f'Participação criada: pk={pk}, user={p.user_fk}, tipo={p.tipo}')

    # Notificar o superior hierárquico que tem uma nova participação para validar
    with db_session_manager(current_user) as session:
        superior_fk = _get_superior_fk(session, p.user_fk)
        if not superior_fk:
            validators = _get_rh_validators(session)

    if superior_fk:
        _emit_rh(
            notification_type='participacao_pendente',
            title='Nova participação para validar',
            message=f'Participação #{pk} aguarda a sua aprovação (nível 1).',
            user_ids=[superior_fk],
        )
    else:
        # Sem superior definido — notificar administradores RH directamente
        _emit_rh(
            notification_type='participacao_pendente',
            title='Nova participação para validar',
            message=f'Participação #{pk} aguarda validação (sem superior definido).',
            user_ids=validators,
        )

    return jsonify({'message': 'Participação registada', 'pk': pk}), 201


@api_error_handler
def editar_participacao(pk: int, data: dict, current_user: str):
    p = ParticipacaoUpdate.model_validate(data)

    with db_session_manager(current_user) as session:
        # Preservar documentos existentes se não fornecidos na actualização
        if p.documentos is None:
            row = session.execute(
                text("SELECT documentos FROM tb_rh_participacao WHERE pk = :pk"),
                {'pk': pk},
            ).fetchone()
            docs = json.dumps(row.documentos if row and row.documentos else [])
        else:
            docs = json.dumps(p.documentos)

        result = session.execute(text("""
            SELECT fbo_rh_participacao(
                1::SMALLINT, :pk,
                NULL, :motivo_fk, :tipo,
                :data_inicio, :data_fim,
                CAST(:hora_inicio AS TIME), CAST(:hora_fim AS TIME),
                :ponto_saida_fk, :ponto_regresso_fk,
                :data_participacao, :observacoes,
                CAST(:documentos AS JSONB)
            ) AS result
        """), {
            'pk':                pk,
            'motivo_fk':         p.motivo_fk,
            'tipo':              p.tipo,
            'data_inicio':       p.data_inicio,
            'data_fim':          p.data_fim,
            'hora_inicio':       str(p.hora_inicio) if p.hora_inicio else None,
            'hora_fim':          str(p.hora_fim)    if p.hora_fim    else None,
            'ponto_saida_fk':    p.ponto_saida_fk,
            'ponto_regresso_fk': p.ponto_regresso_fk,
            'data_participacao': p.data_participacao,
            'observacoes':       p.observacoes,
            'documentos':        docs,
        }).scalar()

    _ok(result, 'Erro ao actualizar participação')
    return jsonify({'message': 'Participação actualizada'}), 200


# ---------------------------------------------------------------------------
# Anexos (upload / download)
# ---------------------------------------------------------------------------

def _upload_dir(pk: int) -> str:
    base = current_app.config.get('FILES_DIR', '')
    return os.path.join(base, 'rh', str(pk))


@api_error_handler
def upload_anexos(pk: int, current_user: str):
    files = request.files.getlist('files')
    if not files or all(f.filename == '' for f in files):
        raise APIError('Nenhum ficheiro enviado', 400)

    upload_dir = _upload_dir(pk)
    os.makedirs(upload_dir, exist_ok=True)

    novos, erros = [], []

    with db_session_manager(current_user) as session:
        row = session.execute(
            text("SELECT pk, documentos FROM tb_rh_participacao WHERE pk = :pk"),
            {'pk': pk},
        ).fetchone()
        if not row:
            raise APIError('Participação não encontrada', 404)

        docs = list(row.documentos or [])

        for f in files[:MAX_FILES]:
            if not f.filename:
                continue
            ext = os.path.splitext(f.filename)[1].lower()
            if ext not in ALLOWED_EXTS:
                erros.append(f'{f.filename}: tipo não permitido (use PDF, JPEG ou PNG)')
                continue

            file_pk = session.execute(text("SELECT fs_nextcode()")).scalar()
            safe_name = f"{file_pk}{ext}"
            file_path = os.path.join(upload_dir, safe_name)
            f.save(file_path)

            final_path, _, _ = process_uploaded_file(file_path, safe_name)
            final_name = os.path.basename(final_path)

            entrada = {
                'pk':           file_pk,
                'nome_original': secure_filename(f.filename),
                'filename':      final_name,
                'data':          datetime.now().isoformat(),
                'tamanho':       os.path.getsize(final_path),
            }
            docs.append(entrada)
            novos.append(entrada)

        if novos:
            session.execute(
                text("UPDATE tb_rh_participacao SET documentos = CAST(:docs AS JSONB) WHERE pk = :pk"),
                {'docs': json.dumps(docs), 'pk': pk},
            )

    logger.info(f'Participação {pk}: {len(novos)} anexo(s) adicionado(s)')
    return jsonify({'adicionados': novos, 'erros': erros, 'total': len(novos)}), 201


@api_error_handler
def download_anexo(pk: int, filename: str, _current_user: str):
    if '..' in filename or '/' in filename or '\\' in filename:
        raise APIError('Nome de ficheiro inválido', 400)

    file_path = os.path.join(_upload_dir(pk), filename)
    if not os.path.isfile(file_path):
        raise APIError('Ficheiro não encontrado', 404)

    return send_file(file_path, as_attachment=False)


# ---------------------------------------------------------------------------
# Workflow (3 níveis)
# ---------------------------------------------------------------------------

_ESTADO_LABEL = {
    2: 'Validado pelo chefe direto',
    4: 'Rejeitado pelo chefe direto',
    5: 'Autorizado pelo Admin RH — aguarda despacho da Presidência',
    6: 'Aprovado (despachado)',
    7: 'Rejeitado pela Presidência',
}

# Estados que requerem validação pelo nível seguinte
_ESTADOS_UPSTREAM = {
    2: 'Nova participação para validar (nível 2 — Admin RH)',
    5: 'Nova participação para despacho (nível 3 — Presidência)',
}


@api_error_handler
def executar_wf(data: dict, user_fk: int, current_user: str):
    p = ParticipacaoWf.model_validate(data)

    collab_user_fk = None
    validators = []

    with db_session_manager(current_user) as session:
        part = session.execute(
            text("SELECT tb_user_fk FROM tb_rh_participacao WHERE pk = :pk"),
            {'pk': p.ref_pk},
        ).fetchone()
        if part:
            collab_user_fk = part.tb_user_fk

        # Pré-carregar validadores se vamos precisar de notificação upstream
        if p.ts_estado_fk in _ESTADOS_UPSTREAM:
            validators = _get_rh_validators(session)

        result = session.execute(text("""
            SELECT fbo_rh_participacao_wf(
                :ref_pk, :step::SMALLINT, :user_fk, :ts_estado_fk, :notas
            ) AS result
        """), {
            'ref_pk':       p.ref_pk,
            'step':         p.step,
            'user_fk':      user_fk,
            'ts_estado_fk': p.ts_estado_fk,
            'notas':        p.notas,
        }).scalar()

    _ok(result, 'Erro no workflow')
    logger.info(f'Workflow participação: pk={p.ref_pk}, step={p.step}, estado={p.ts_estado_fk}')

    estado_label = _ESTADO_LABEL.get(p.ts_estado_fk, 'estado actualizado')

    # 1. Notificar o colaborador sobre o progresso da sua participação
    if collab_user_fk and collab_user_fk != user_fk:
        _emit_rh(
            notification_type='participacao_workflow',
            title='Participação de Ausência actualizada',
            message=f'Participação #{p.ref_pk}: {estado_label}.',
            user_ids=[collab_user_fk],
        )

    # 2. Notificar validadores do nível seguinte quando o estado avança
    upstream_msg = _ESTADOS_UPSTREAM.get(p.ts_estado_fk)
    if upstream_msg and validators:
        _emit_rh(
            notification_type='participacao_pendente',
            title=upstream_msg,
            message=f'Participação #{p.ref_pk} aguarda acção.',
            user_ids=validators,
        )

    return jsonify({'message': 'Acção executada', 'result': format_message(result)}), 200
