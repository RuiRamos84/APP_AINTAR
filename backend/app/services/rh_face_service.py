import os

import numpy as np
import requests
from flask import jsonify
from sqlalchemy import text
from app import cache
from app.utils.error_handler import api_error_handler
from ..utils.utils import db_session_manager
from app.utils.logger import get_logger
from . import audit_service

logger = get_logger(__name__)

# Micro-serviço Node (face-service/) que corre o face-api com tfjs-node.
# Calcula descritores 128-D no MESMO espaço vectorial dos templates criados
# pelo frontend-v2 no browser — os thresholds e comparações abaixo mantêm-se.
# Usado pela app Android, onde o motor JS (Hermes) é lento demais para
# inferência local. Nunca exposto directamente: só o Flask lhe fala.
FACE_SERVICE_URL = os.getenv('FACE_SERVICE_URL', 'http://127.0.0.1:5101')
FACE_SERVICE_TIMEOUT = 30

# Limiar de distância euclidiana: face-api.js recomenda 0.6; usamos 0.5 para maior rigor
FACE_THRESHOLD = 0.50
# Mínimo de templates para enrollment válido
MIN_TEMPLATES = 3
# Versão do texto de consentimento — subir quando o aviso de privacidade mudar
# de conteúdo, para forçar novo consentimento explícito no próximo enrolamento
CONSENT_TIPO = 'biometrico'

# Cache dos templates activos por utilizador (Redis, mesmo padrão de auth_service.py).
# Aquecida em get_face_status (chamada pelo frontend ao abrir o modal de captura,
# antes de a câmara sequer arrancar) para poupar o round-trip à BD no momento
# sensível a latência — verify_face, chamado logo a seguir à captura. TTL curto
# porque a janela entre abrir o modal e verificar é sempre de poucos segundos;
# invalidada explicitamente em qualquer escrita (enroll/reset/erase) para nunca
# devolver um "verified" com base em templates já desactivados/apagados.
FACE_TEMPLATES_CACHE_TTL = 120


def _templates_cache_key(user_fk: int) -> str:
    return f'rh_face_templates:{user_fk}'


def _invalidate_templates_cache(user_fk: int):
    cache.delete(_templates_cache_key(user_fk))


def _euclidean(a: list, b: list) -> float:
    return float(np.linalg.norm(np.array(a, dtype=np.float64) - np.array(b, dtype=np.float64)))


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

@api_error_handler
def get_face_status(user_fk: int, current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT descriptor FROM tb_rh_face_template
            WHERE tb_user_fk = :user_fk AND ativo = TRUE
        """), {'user_fk': user_fk}).fetchall()

    templates = [list(row[0]) for row in rows]
    # Aquece a cache agora — este endpoint é sempre chamado pelo frontend antes
    # de abrir a câmara, alguns segundos antes do verify_face que se segue.
    cache.set(_templates_cache_key(user_fk), templates, timeout=FACE_TEMPLATES_CACHE_TTL)

    return jsonify({
        'enrolled': len(templates) >= MIN_TEMPLATES,
        'template_count': len(templates),
    }), 200


# ---------------------------------------------------------------------------
# Enrollment
# ---------------------------------------------------------------------------

@api_error_handler
def enroll_face(data: dict, user_fk: int, current_user: str):
    """
    Recebe lista de descritores (mínimo MIN_TEMPLATES).
    Desactiva templates anteriores e guarda os novos.
    data = { "descriptors": [[float x128], ...] }
    """
    descriptors = data.get('descriptors', [])
    if len(descriptors) < MIN_TEMPLATES:
        return jsonify({'error': f'São necessários pelo menos {MIN_TEMPLATES} capturas para o registo.'}), 400

    for d in descriptors:
        if len(d) != 128:
            return jsonify({'error': 'Descritor facial inválido (esperados 128 valores).'}), 400

    with db_session_manager(current_user) as session:
        # RGPD art.9 — dado biométrico é categoria especial: sem consentimento
        # explícito activo, não há enrolamento, mesmo que o pedido chegue por
        # fora da UI (curl/DevTools). O ecrã de consentimento é só a UX;
        # esta guarda é que garante a conformidade.
        tem_consentimento = session.execute(text("""
            SELECT COUNT(*) FROM tb_rh_consentimento
            WHERE tb_user_fk = :user_fk AND tipo = :tipo
              AND consentido = TRUE AND revogado_em IS NULL
        """), {'user_fk': user_fk, 'tipo': CONSENT_TIPO}).scalar() or 0
        if tem_consentimento == 0:
            return jsonify({
                'error': 'É necessário consentimento explícito para o registo biométrico. Aceite o aviso de privacidade primeiro.',
            }), 403

        # Impede re-enrolamento livre: se já existe um registo activo, só um
        # reset de admin (DELETE /rh/face/<user_fk>/reset) pode reabrir o
        # enrolamento — caso contrário qualquer pessoa junto ao dispositivo
        # substituiria o rosto registado sem intervenção do RH (buddy punching).
        ja_enrolado = session.execute(text("""
            SELECT COUNT(*) FROM tb_rh_face_template
            WHERE tb_user_fk = :user_fk AND ativo = TRUE
        """), {'user_fk': user_fk}).scalar() or 0
        if ja_enrolado > 0:
            return jsonify({
                'error': 'Já existe um registo facial activo. Contacte o RH para efectuar reset antes de um novo registo.',
            }), 409

        # Desactivar templates anteriores
        session.execute(text("""
            UPDATE tb_rh_face_template SET ativo = FALSE
            WHERE tb_user_fk = :user_fk AND ativo = TRUE
        """), {'user_fk': user_fk})

        # Inserir novos
        for descriptor in descriptors:
            pk = session.execute(text('SELECT fs_nextcode()')).scalar()
            session.execute(text("""
                INSERT INTO tb_rh_face_template (pk, tb_user_fk, descriptor)
                VALUES (:pk, :user_fk, :descriptor)
            """), {'pk': pk, 'user_fk': user_fk, 'descriptor': descriptor})

    _invalidate_templates_cache(user_fk)
    logger.info(f'Face enrollment: user={user_fk}, {len(descriptors)} templates guardados')
    return jsonify({'message': 'Rosto registado com sucesso.', 'template_count': len(descriptors)}), 201


# ---------------------------------------------------------------------------
# Consentimento RGPD (art.9 — dado biométrico é categoria especial)
# ---------------------------------------------------------------------------

@api_error_handler
def get_consent_status(user_fk: int, current_user: str):
    """Devolve o consentimento activo (não revogado) do utilizador, se existir."""
    with db_session_manager(current_user) as session:
        row = session.execute(text("""
            SELECT versao_texto, ts_consentimento FROM tb_rh_consentimento
            WHERE tb_user_fk = :user_fk AND tipo = :tipo
              AND consentido = TRUE AND revogado_em IS NULL
            ORDER BY ts_consentimento DESC LIMIT 1
        """), {'user_fk': user_fk, 'tipo': CONSENT_TIPO}).fetchone()

    if not row:
        return jsonify({'consentido': False, 'versao': None, 'ts_consentimento': None}), 200

    return jsonify({
        'consentido': True,
        'versao': row.versao_texto,
        'ts_consentimento': row.ts_consentimento.isoformat(),
    }), 200


@api_error_handler
def register_consent(data: dict, user_fk: int, current_user: str, ip: str = None):
    """
    Regista consentimento explícito para o registo biométrico.
    data = { "versao": "2026-07" }
    """
    versao = data.get('versao')
    if not versao:
        return jsonify({'error': 'Versão do aviso de privacidade em falta.'}), 400

    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT fbo_rh_consentimento(0, :user_fk, :tipo, :versao, TRUE, :ip)
        """), {'user_fk': user_fk, 'tipo': CONSENT_TIPO, 'versao': versao, 'ip': ip}).scalar()

        if result and result.startswith('<error>'):
            return jsonify({'error': result.replace('<error>', '').replace('</error>', '')}), 400

        audit_service.record(
            session, hist_client=user_fk,
            action='rh.consent.registar', resource='consentimento', resource_id=user_fk,
            meta={'versao': versao}, ip=ip,
        )

    logger.info(f'Consentimento biométrico registado: user={user_fk}, versao={versao}')
    return jsonify({'message': 'Consentimento registado.'}), 201


# ---------------------------------------------------------------------------
# Descritor a partir de foto (clientes sem capacidade de inferência local)
# ---------------------------------------------------------------------------

@api_error_handler
def compute_descriptor_from_photo(data: dict, user_fk: int):
    """
    Recebe uma fotografia e devolve o descritor facial 128-D calculado pelo
    face-service. O cliente usa depois esse descritor nos endpoints normais
    de enroll/verify — o fluxo e as validações existentes não mudam.
    data = { "image": "<base64 jpeg/png>", "minConfidence"?: float }
    Devolve { detected: bool, descriptor: [float x128] | null, ms: int }
    """
    image = data.get('image') if data else None
    if not image or not isinstance(image, str):
        return jsonify({'error': "Campo 'image' (base64) em falta."}), 400

    payload = {'image': image}
    if isinstance(data.get('minConfidence'), (int, float)):
        payload['minConfidence'] = data['minConfidence']

    try:
        resp = requests.post(
            f'{FACE_SERVICE_URL}/descriptor',
            json=payload,
            timeout=FACE_SERVICE_TIMEOUT,
        )
    except requests.exceptions.RequestException as exc:
        logger.error(f'face-service inacessível ({FACE_SERVICE_URL}): {exc}')
        return jsonify({
            'error': 'Serviço de reconhecimento facial indisponível. Tente novamente ou contacte o administrador.',
        }), 503

    if resp.status_code != 200:
        try:
            detail = resp.json().get('error', '')
        except ValueError:
            detail = ''
        logger.error(f'face-service devolveu {resp.status_code}: {detail}')
        return jsonify({'error': detail or 'Erro no serviço de reconhecimento facial.'}), 502

    result = resp.json()
    logger.info(
        f"Face descriptor: user={user_fk}, detected={result.get('detected')}, ms={result.get('ms')}"
    )
    return jsonify({
        'detected': bool(result.get('detected')),
        'descriptor': result.get('descriptor'),
        'ms': result.get('ms'),
    }), 200


# ---------------------------------------------------------------------------
# Verify
# ---------------------------------------------------------------------------

@api_error_handler
def verify_face(data: dict, user_fk: int, current_user: str):
    """
    Recebe um descritor e compara com os templates do utilizador.
    data = { "descriptor": [float x128] }
    Devolve { verified: bool, score: float }
    """
    descriptor = data.get('descriptor')
    if not descriptor or len(descriptor) != 128:
        return jsonify({'error': 'Descritor facial inválido.'}), 400

    templates = cache.get(_templates_cache_key(user_fk))
    if templates is None:
        # Cache fria (utilizador não passou por get_face_status recentemente,
        # ou a entrada expirou) — cai para a BD, comportamento idêntico ao de
        # sempre. A cache é só uma optimização de latência, nunca a única fonte.
        with db_session_manager(current_user) as session:
            rows = session.execute(text("""
                SELECT descriptor FROM tb_rh_face_template
                WHERE tb_user_fk = :user_fk AND ativo = TRUE
            """), {'user_fk': user_fk}).fetchall()
        templates = [list(row[0]) for row in rows]
        cache.set(_templates_cache_key(user_fk), templates, timeout=FACE_TEMPLATES_CACHE_TTL)

    if not templates:
        return jsonify({
            'verified': False,
            'score': None,
            'error': 'Sem rosto registado. Efectue o registo facial primeiro.',
        }), 200

    min_dist = min(_euclidean(descriptor, template) for template in templates)
    verified = min_dist <= FACE_THRESHOLD

    logger.info(f'Face verify: user={user_fk}, score={min_dist:.4f}, verified={verified}')
    return jsonify({'verified': verified, 'score': round(min_dist, 4)}), 200


# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------

@api_error_handler
def reset_face_templates(user_fk: int, current_user: str, requester_fk: int = None, ip: str = None):
    # Invalidar antes de escrever (não depois): fecha a janela em que um
    # verify_face concorrente podia acertar na cache ainda quente com
    # templates que este reset está prestes a desactivar. Pior caso se a
    # transacção falhar: cache vazia, próximo verify paga 1 query extra.
    _invalidate_templates_cache(user_fk)

    with db_session_manager(current_user) as session:
        session.execute(text("""
            UPDATE tb_rh_face_template SET ativo = FALSE
            WHERE tb_user_fk = :user_fk AND ativo = TRUE
        """), {'user_fk': user_fk})

        if requester_fk and requester_fk != user_fk:
            audit_service.record(
                session, hist_client=requester_fk,
                action='rh.face.reset', resource='face_template', resource_id=user_fk, ip=ip,
            )

    who = f'por admin user={requester_fk}' if requester_fk and requester_fk != user_fk else 'pelo próprio'
    logger.info(f'Face templates reset: user={user_fk} ({who})')
    return jsonify({'message': 'Templates faciais removidos.'}), 200


# ---------------------------------------------------------------------------
# Apagamento físico (direito ao apagamento — RGPD art.17)
# ---------------------------------------------------------------------------

@api_error_handler
def erase_face_data(user_fk: int, current_user: str, requester_fk: int = None, ip: str = None):
    """
    Apaga fisicamente os templates faciais (DELETE, não soft-delete) e revoga
    o consentimento activo. Distinto de reset_face_templates: o reset é gestão
    operacional (permite reabrir o enrolamento); isto é o direito ao apagamento
    — usado em offboarding ou pedido de titular de dados.
    """
    # Ver nota em reset_face_templates: invalidar antes de escrever fecha a
    # janela de corrida com um verify_face concorrente.
    _invalidate_templates_cache(user_fk)

    with db_session_manager(current_user) as session:
        deleted = session.execute(text("""
            DELETE FROM tb_rh_face_template WHERE tb_user_fk = :user_fk
        """), {'user_fk': user_fk}).rowcount

        session.execute(text("""
            SELECT fbo_rh_consentimento(1, :user_fk, :tipo)
        """), {'user_fk': user_fk, 'tipo': CONSENT_TIPO})

        audit_service.record(
            session, hist_client=requester_fk,
            action='rh.face.erase', resource='face_template', resource_id=user_fk,
            meta={'templates_apagados': deleted}, ip=ip,
        )

    logger.info(f'Dados biométricos apagados fisicamente: user={user_fk}, {deleted} templates, por admin={requester_fk}')
    return jsonify({'message': 'Dados biométricos apagados definitivamente.', 'templates_apagados': deleted}), 200


# ---------------------------------------------------------------------------
# Lista de utilizadores com estado facial (Admin)
# ---------------------------------------------------------------------------

@api_error_handler
def get_face_users_status(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT
                c.pk,
                c.name,
                COALESCE(COUNT(ft.pk) FILTER (WHERE ft.ativo = TRUE), 0) AS template_count
            FROM vbl_rh_colaborador c
            LEFT JOIN tb_rh_face_template ft ON ft.tb_user_fk = c.pk
            GROUP BY c.pk, c.name
            ORDER BY c.name
        """)).mappings().all()

        return jsonify([
            {
                'user_fk': r['pk'],
                'name': r['name'],
                'enrolled': r['template_count'] >= MIN_TEMPLATES,
                'template_count': int(r['template_count']),
            }
            for r in rows
        ]), 200
