import numpy as np
from flask import jsonify
from sqlalchemy import text
from app.utils.error_handler import api_error_handler
from ..utils.utils import db_session_manager
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Limiar de distância euclidiana: face-api.js recomenda 0.6; usamos 0.5 para maior rigor
FACE_THRESHOLD = 0.50
# Mínimo de templates para enrollment válido
MIN_TEMPLATES = 3


def _euclidean(a: list, b: list) -> float:
    return float(np.linalg.norm(np.array(a, dtype=np.float64) - np.array(b, dtype=np.float64)))


# ---------------------------------------------------------------------------
# Status
# ---------------------------------------------------------------------------

@api_error_handler
def get_face_status(user_fk: int, current_user: str):
    with db_session_manager(current_user) as session:
        count = session.execute(text("""
            SELECT COUNT(*) FROM tb_rh_face_template
            WHERE tb_user_fk = :user_fk AND ativo = TRUE
        """), {'user_fk': user_fk}).scalar() or 0

        return jsonify({
            'enrolled': count >= MIN_TEMPLATES,
            'template_count': count,
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

    logger.info(f'Face enrollment: user={user_fk}, {len(descriptors)} templates guardados')
    return jsonify({'message': 'Rosto registado com sucesso.', 'template_count': len(descriptors)}), 201


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

    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT descriptor FROM tb_rh_face_template
            WHERE tb_user_fk = :user_fk AND ativo = TRUE
        """), {'user_fk': user_fk}).fetchall()

    if not rows:
        return jsonify({
            'verified': False,
            'score': None,
            'error': 'Sem rosto registado. Efectue o registo facial primeiro.',
        }), 200

    min_dist = min(_euclidean(descriptor, list(row[0])) for row in rows)
    verified = min_dist <= FACE_THRESHOLD

    logger.info(f'Face verify: user={user_fk}, score={min_dist:.4f}, verified={verified}')
    return jsonify({'verified': verified, 'score': round(min_dist, 4)}), 200


# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------

@api_error_handler
def reset_face_templates(user_fk: int, current_user: str, requester_fk: int = None):
    with db_session_manager(current_user) as session:
        session.execute(text("""
            UPDATE tb_rh_face_template SET ativo = FALSE
            WHERE tb_user_fk = :user_fk AND ativo = TRUE
        """), {'user_fk': user_fk})

    who = f'por admin user={requester_fk}' if requester_fk and requester_fk != user_fk else 'pelo próprio'
    logger.info(f'Face templates reset: user={user_fk} ({who})')
    return jsonify({'message': 'Templates faciais removidos.'}), 200


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
