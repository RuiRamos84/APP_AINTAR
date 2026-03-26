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

    @field_validator(
        'aval_personal_colab', 'aval_personal_rel', 'aval_professional'
    )
    @classmethod
    def check_range(cls, v):
        if not (1 <= v <= 10):
            raise ValueError('Avaliação deve estar entre 1 e 10')
        return v


@api_error_handler
def get_analytics_enriched(current_user: str):
    """Dados enriquecidos: global + rankings por utilizador + nome atual."""
    with db_session_manager(current_user) as session:

        global_rows = session.execute(text("""
            SELECT
                g.periodo_data, g.periodo, g.total_avaliacoes,
                g.media_personal_colab, g.media_personal_rel,
                g.media_profissional, g.media_global
            FROM vbl_aval_results_global g
            JOIN vbl_aval_period p ON p.pk = g.period_pk
            WHERE p.active = 1
            ORDER BY p.year, p.data NULLS LAST, p.pk
        """)).mappings().all()

        user_rows = session.execute(text("""
            SELECT u.*,
                p.year,
                RANK() OVER (
                    PARTITION BY u.period_pk
                    ORDER BY u.media_global DESC
                )::integer AS rank_global,
                RANK() OVER (
                    PARTITION BY u.period_pk
                    ORDER BY u.media_personal_colab DESC
                )::integer AS rank_colab,
                RANK() OVER (
                    PARTITION BY u.period_pk
                    ORDER BY u.media_personal_rel DESC
                )::integer AS rank_rel,
                RANK() OVER (
                    PARTITION BY u.period_pk
                    ORDER BY u.media_profissional DESC
                )::integer AS rank_prof,
                COUNT(*) OVER (
                    PARTITION BY u.period_pk
                )::integer AS total_users
            FROM vbl_aval_results_users u
            JOIN vbl_aval_period p ON p.pk = u.period_pk
            WHERE p.active = 1
            ORDER BY p.year, p.data NULLS LAST, p.pk, u.colaborador
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
    """Dados de evolução — todos os períodos e colaboradores."""
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT
                u.period_pk, u.periodo_data, u.periodo, u.colaborador,
                u.total_avaliacoes, u.media_personal_colab,
                u.media_personal_rel, u.media_profissional, u.media_global,
                p.year
            FROM vbl_aval_results_users u
            JOIN vbl_aval_period p ON p.pk = u.period_pk
            ORDER BY p.year, p.data NULLS LAST, p.pk, u.colaborador
        """)).mappings().all()
        return [dict(r) for r in result]


@api_error_handler
def get_pending_summary(current_user: str):
    """Resumo de avaliações pendentes do utilizador atual."""
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT
                period_pk AS pk,
                year,
                descr,
                COUNT(*)::integer AS remaining
            FROM vbl_aval_assign
            WHERE evaluator_pk = fs_client()
              AND active        = 1
              AND done          = 0
            GROUP BY period_pk, year, descr
            ORDER BY year DESC
        """)).mappings().all()

        periods = [dict(r) for r in result]
        total = sum(p['remaining'] for p in periods)
        return {
            "has_pending": total > 0,
            "total_pending": total,
            "periods": periods,
        }


@api_error_handler
def get_periods(current_user: str):
    """Lista campanhas de avaliação ativas."""
    with db_session_manager(current_user) as session:
        result = session.execute(text("""
            SELECT pk, year, active, descr
            FROM vbl_aval_period
            WHERE active = 1
            ORDER BY year DESC, data DESC NULLS LAST, pk DESC
        """)).mappings().all()
        return [dict(r) for r in result]


@api_error_handler
def get_aval_list(period_pk: int, current_user: str):
    """Lista de atribuições pendentes para o avaliador atual."""
    with db_session_manager(current_user) as session:
        evaluator_pk = session.execute(text("SELECT fs_client()")).scalar()
        if not evaluator_pk:
            raise APIError("Utilizador inválido.", 401)

        result = session.execute(
            text('SELECT pk, ts_target, target_name'
                 ' FROM "fbo_aval$list"(:period, :evaluator)'),
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
            text('SELECT total, done, remaining'
                 ' FROM "fbo_aval$status"(:period, :evaluator)'),
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
        result = session.execute(text("""
            SELECT pk, year, active, descr
            FROM vbl_aval_period
            ORDER BY year DESC
        """)).mappings().all()
        return [dict(r) for r in result]


@api_error_handler
def admin_create_period(data: dict, current_user: str):
    """Cria uma nova campanha de avaliação."""
    validated = CreatePeriodModel.model_validate(data)
    with db_session_manager(current_user) as session:
        session.execute(
            text("""
                INSERT INTO tb_aval_period
                    (pk, year, descr, active, hist_client, hist_time)
                VALUES
                    (nextval('sq_codes'), :year, :descr, :active,
                     fs_client(), current_timestamp)
            """),
            {"year": validated.year, "descr": validated.descr,
             "active": validated.active},
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
                SELECT pk,
                       ts_evaluator AS evaluator_name,
                       ts_target    AS target_name,
                       done
                FROM vbl_aval_assign
                WHERE period_pk = :period
                ORDER BY ts_evaluator, ts_target
            """),
            {"period": period_pk},
        ).mappings().all()
        return [dict(r) for r in result]


@api_error_handler
def admin_get_users(current_user: str):
    """Lista utilizadores elegíveis para atribuição de avaliações."""
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("SELECT pk, name FROM vbl_aval_users")
        ).mappings().all()
        return [dict(r) for r in result]


@api_error_handler
def admin_generate_assignments(period_pk: int, data: dict, current_user: str):
    """Gera atribuições todos-contra-todos (ignora pares já existentes)."""
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
                    (SELECT pk FROM vbl_aval_users WHERE pk = ANY(:ids)) c1
                    CROSS JOIN
                    (SELECT pk FROM vbl_aval_users WHERE pk = ANY(:ids)) c2
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
                    colaborador, total_avaliacoes,
                    media_personal_colab, media_personal_rel,
                    media_profissional, media_global
                FROM vbl_aval_results_users
                WHERE period_pk = :period
                ORDER BY colaborador
            """),
            {"period": period_pk},
        ).mappings().all()
        return [dict(r) for r in result]
