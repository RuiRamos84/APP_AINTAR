from sqlalchemy.sql import text
from pydantic import BaseModel, field_validator
from typing import List
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler, APIError
from app.utils.logger import get_logger

logger = get_logger(__name__)


class SubmitAvalModel(BaseModel):
    pk: int
    aval_personal_colab: int
    aval_personal_rel: int
    aval_professional: int

    @field_validator('aval_personal_colab', 'aval_personal_rel', 'aval_professional')
    @classmethod
    def check_range(cls, v):
        if not (1 <= v <= 10):
            raise ValueError('Avaliação deve estar entre 1 e 10')
        return v


@api_error_handler
def get_analytics_enriched(current_user: str):
    """Dados enriquecidos: global por período + por utilizador com rankings + utilizador atual."""
    with db_session_manager(current_user) as session:

        global_rows = session.execute(text("""
            SELECT
                periodo_data, periodo, total_avaliacoes,
                media_personal_colab, media_personal_rel, media_profissional
            FROM vbl_aval_results_global
            ORDER BY periodo_data
        """)).mappings().all()

        user_rows = session.execute(text("""
            WITH base AS (
                SELECT
                    p.pk                                AS period_pk,
                    p.hist_time                         AS periodo_data,
                    p.descr                             AS periodo,
                    c.name                              AS colaborador,
                    COUNT(*)::integer                   AS total_avaliacoes,
                    ROUND(AVG(r.aval_personal_colab), 2)  AS media_personal_colab,
                    ROUND(AVG(r.aval_personal_rel),   2)  AS media_personal_rel,
                    ROUND(AVG(r.aval_professional),   2)  AS media_profissional,
                    ROUND((AVG(r.aval_personal_colab)
                         + AVG(r.aval_personal_rel)
                         + AVG(r.aval_professional)) / 3, 2) AS media_global
                FROM tb_aval r
                JOIN tb_aval_period p ON p.pk = r.tb_aval_period
                JOIN ts_client c      ON c.pk = r.ts_target
                GROUP BY p.pk, p.hist_time, p.descr, c.name
            )
            SELECT
                *,
                RANK() OVER (PARTITION BY period_pk ORDER BY media_global         DESC)::integer AS rank_global,
                RANK() OVER (PARTITION BY period_pk ORDER BY media_personal_colab DESC)::integer AS rank_colab,
                RANK() OVER (PARTITION BY period_pk ORDER BY media_personal_rel   DESC)::integer AS rank_rel,
                RANK() OVER (PARTITION BY period_pk ORDER BY media_profissional   DESC)::integer AS rank_prof,
                COUNT(*) OVER (PARTITION BY period_pk)::integer                                 AS total_users
            FROM base
            ORDER BY period_pk, colaborador
        """)).mappings().all()

        my_name = session.execute(
            text("SELECT name FROM ts_client WHERE pk = fs_client()")
        ).scalar()

        return {
            "global": [dict(r) for r in global_rows],
            "users":  [dict(r) for r in user_rows],
            "me":     my_name,
        }


@api_error_handler
def get_analytics(current_user: str):
    """Dados completos para análise de evolução — todos os períodos e colaboradores."""
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("""
                SELECT
                    p.pk                               AS period_pk,
                    p.year,
                    p.descr                            AS periodo,
                    c.name                             AS colaborador,
                    COUNT(*)::integer                       AS total_avaliacoes,
                    ROUND(AVG(r.aval_personal_colab), 2)   AS media_personal_colab,
                    ROUND(AVG(r.aval_personal_rel), 2)     AS media_personal_rel,
                    ROUND(AVG(r.aval_professional), 2)     AS media_profissional
                FROM tb_aval r
                JOIN tb_aval_period p ON p.pk = r.tb_aval_period
                JOIN ts_client c      ON c.pk  = r.ts_target
                GROUP BY p.pk, p.year, p.descr, c.name
                ORDER BY p.pk, c.name
            """)
        ).mappings().all()
        return [dict(r) for r in result]


@api_error_handler
def get_pending_summary(current_user: str):
    """Resumo de avaliações pendentes para o utilizador atual (todas as campanhas ativas)."""
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("""
                SELECT
                    p.pk,
                    p.year,
                    p.descr,
                    COUNT(*)::integer AS remaining
                FROM tb_aval_assign a
                JOIN tb_aval_period p ON p.pk = a.tb_aval_period
                WHERE a.ts_evaluator = fs_client()
                  AND p.active = 1
                  AND a.done   = 0
                GROUP BY p.pk, p.year, p.descr
                ORDER BY p.year DESC
            """)
        ).mappings().all()

        periods = [dict(r) for r in result]
        total = sum(p['remaining'] for p in periods)
        return {"has_pending": total > 0, "total_pending": total, "periods": periods}


@api_error_handler
def get_periods(current_user: str):
    """Lista campanhas de avaliação ativas (colaborador)."""
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("SELECT pk, year, active, descr FROM vbl_aval_period WHERE active = 1 ORDER BY year DESC")
        ).mappings().all()
        return [dict(r) for r in result]


@api_error_handler
def get_aval_list(period_pk: int, current_user: str):
    """Lista de atribuições pendentes para o avaliador atual."""
    with db_session_manager(current_user) as session:
        evaluator_pk = session.execute(text("SELECT fs_client()")).scalar()
        if not evaluator_pk:
            raise APIError("Utilizador inválido.", 401)

        result = session.execute(
            text('SELECT pk, ts_target, target_name FROM "fbo_aval$list"(:period, :evaluator)'),
            {"period": period_pk, "evaluator": evaluator_pk}
        ).mappings().all()
        return [dict(r) for r in result]


@api_error_handler
def get_aval_status(period_pk: int, current_user: str):
    """Estado da avaliação do utilizador atual (total, done, remaining)."""
    with db_session_manager(current_user) as session:
        evaluator_pk = session.execute(text("SELECT fs_client()")).scalar()
        if not evaluator_pk:
            raise APIError("Utilizador inválido.", 401)

        row = session.execute(
            text('SELECT total, done, remaining FROM "fbo_aval$status"(:period, :evaluator)'),
            {"period": period_pk, "evaluator": evaluator_pk}
        ).fetchone()

        if not row:
            return {"total": 0, "done": 0, "remaining": 0}
        return dict(row._mapping)


@api_error_handler
def submit_evaluation(data: dict, current_user: str):
    """Submete uma avaliação anónima pelo pk da atribuição."""
    validated = SubmitAvalModel.model_validate(data)

    with db_session_manager(current_user) as session:
        session.execute(
            text('SELECT "fbo_aval$submit"(:pk, :colab, :rel, :professional)'),
            {
                "pk":           validated.pk,
                "colab":        validated.aval_personal_colab,
                "rel":          validated.aval_personal_rel,
                "professional": validated.aval_professional,
            }
        )

    return {"message": "Avaliação submetida com sucesso."}, 200


# ─────────────────────────────────────────────
# ADMIN — Gestão de campanhas e atribuições
# ─────────────────────────────────────────────

class CreatePeriodModel(BaseModel):
    year: int
    descr: str
    active: int = 1


class GenerateAssignmentsModel(BaseModel):
    user_ids: List[int]


@api_error_handler
def admin_get_all_periods(current_user: str):
    """Lista todas as campanhas (admin)."""
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("SELECT pk, year, active, descr FROM vbl_aval_period ORDER BY year DESC")
        ).mappings().all()
        return [dict(r) for r in result]


@api_error_handler
def admin_create_period(data: dict, current_user: str):
    """Cria uma nova campanha de avaliação."""
    validated = CreatePeriodModel.model_validate(data)
    with db_session_manager(current_user) as session:
        session.execute(
            text("""
                INSERT INTO tb_aval_period (pk, year, descr, active, hist_client, hist_time)
                VALUES (nextval('sq_codes'), :year, :descr, :active, fs_client(), current_timestamp)
            """),
            {"year": validated.year, "descr": validated.descr, "active": validated.active},
        )
    return {"message": "Campanha criada com sucesso."}, 201


@api_error_handler
def admin_toggle_period(period_pk: int, current_user: str):
    """Ativa/desativa uma campanha."""
    with db_session_manager(current_user) as session:
        session.execute(
            text("""
                UPDATE tb_aval_period
                SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END
                WHERE pk = :pk
            """),
            {"pk": period_pk},
        )
    return {"message": "Estado da campanha atualizado."}, 200


@api_error_handler
def admin_get_assignments(period_pk: int, current_user: str):
    """Lista todas as atribuições de um período com nomes."""
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("""
                SELECT
                    a.pk,
                    c1.name AS evaluator_name,
                    c2.name AS target_name,
                    a.done
                FROM tb_aval_assign a
                JOIN ts_client c1 ON c1.pk = a.ts_evaluator
                JOIN ts_client c2 ON c2.pk = a.ts_target
                WHERE a.tb_aval_period = :period
                ORDER BY c1.name, c2.name
            """),
            {"period": period_pk},
        ).mappings().all()
        return [dict(r) for r in result]


@api_error_handler
def admin_get_users(current_user: str):
    """Lista utilizadores ativos para seleção de atribuições."""
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("SELECT pk, name FROM ts_client WHERE validated = 0 AND ts_entity = 1 ORDER BY name")
        ).mappings().all()
        return [dict(r) for r in result]


@api_error_handler
def admin_generate_assignments(period_pk: int, data: dict, current_user: str):
    """Gera atribuições todos-contra-todos via CROSS JOIN (ignora pares já existentes)."""
    validated = GenerateAssignmentsModel.model_validate(data)
    user_ids = validated.user_ids

    if len(user_ids) < 2:
        raise APIError("São necessários pelo menos 2 utilizadores.", 400)

    with db_session_manager(current_user) as session:
        result = session.execute(
            text("""
                INSERT INTO tb_aval_assign
                    (pk, tb_aval_period, ts_evaluator, ts_target,
                     done, hist_client, hist_time)
                SELECT
                    nextval('sq_codes'), :period, c1.pk, c2.pk,
                    0, fs_client(), current_timestamp
                FROM
                    (SELECT pk FROM ts_client WHERE pk = ANY(:ids)) c1
                    CROSS JOIN
                    (SELECT pk FROM ts_client WHERE pk = ANY(:ids)) c2
                WHERE c1.pk != c2.pk
                  AND NOT EXISTS (
                      SELECT 1 FROM tb_aval_assign x
                      WHERE x.tb_aval_period = :period
                        AND x.ts_evaluator   = c1.pk
                        AND x.ts_target      = c2.pk
                  )
            """),
            {"period": period_pk, "ids": user_ids},
        )
        count = result.rowcount

    return {"message": f"{count} atribuições geradas.", "count": count}, 200


@api_error_handler
def admin_get_results(period_pk: int, current_user: str):
    """Resultados agregados por colaborador para um período."""
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("""
                SELECT
                    c.name                           AS colaborador,
                    COUNT(*)::integer                       AS total_avaliacoes,
                    ROUND(AVG(r.aval_personal_colab), 2)   AS media_personal_colab,
                    ROUND(AVG(r.aval_personal_rel), 2)     AS media_personal_rel,
                    ROUND(AVG(r.aval_professional), 2)     AS media_profissional
                FROM tb_aval r
                JOIN ts_client c ON c.pk = r.ts_target
                WHERE r.tb_aval_period = :period
                GROUP BY c.name
                ORDER BY c.name
            """),
            {"period": period_pk},
        ).mappings().all()
        return [dict(r) for r in result]
