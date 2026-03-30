from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.utils import token_required, set_session
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from ..services import aval_service

bp = Blueprint('aval', __name__)
logger = get_logger(__name__)


@bp.route('/aval/analytics/enriched', methods=['GET'])
@jwt_required()
@token_required
@require_permission('aval.view')  # ts_interface: aval.view
@set_session
@api_error_handler
def get_analytics_enriched():
    """Dados enriquecidos: global + por utilizador com rankings + 'me'."""
    current_user = get_jwt_identity()
    return aval_service.get_analytics_enriched(current_user)


@bp.route('/aval/analytics', methods=['GET'])
@jwt_required()
@token_required
@require_permission('aval.view')  # ts_interface: aval.view
@set_session
@api_error_handler
def get_analytics():
    """Dados completos para análise de evolução de avaliações."""
    current_user = get_jwt_identity()
    return aval_service.get_analytics(current_user)


@bp.route('/aval/pending', methods=['GET'])
@jwt_required()
@token_required
@require_permission('aval.view')  # ts_interface: aval.view
@set_session
@api_error_handler
def get_pending_summary():
    """Resumo de avaliações pendentes para o utilizador atual."""
    current_user = get_jwt_identity()
    return aval_service.get_pending_summary(current_user)


@bp.route('/aval/periods', methods=['GET'])
@jwt_required()
@token_required
@require_permission('aval.view')  # ts_interface: aval.view
@set_session
@api_error_handler
def get_periods():
    """
    Lista de Campanhas de Avaliação
    ---
    tags:
      - Avaliação Anónima
    summary: Devolve todas as campanhas de avaliação disponíveis.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Lista de campanhas.
    """
    current_user = get_jwt_identity()
    return aval_service.get_periods(current_user)


@bp.route('/aval/<int:period_pk>/list', methods=['GET'])
@jwt_required()
@token_required
@require_permission('aval.view')  # ts_interface: aval.view
@set_session
@api_error_handler
def get_aval_list(period_pk):
    """
    Lista de Avaliações Pendentes
    ---
    tags:
      - Avaliação Anónima
    summary: Devolve as atribuições por concluir para o avaliador atual.
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: period_pk
        type: integer
        required: true
    responses:
      200:
        description: Lista de pessoas a avaliar.
    """
    current_user = get_jwt_identity()
    return aval_service.get_aval_list(period_pk, current_user)


@bp.route('/aval/<int:period_pk>/status', methods=['GET'])
@jwt_required()
@token_required
@require_permission('aval.view')  # ts_interface: aval.view
@set_session
@api_error_handler
def get_aval_status(period_pk):
    """
    Estado da Avaliação
    ---
    tags:
      - Avaliação Anónima
    summary: Devolve o progresso do avaliador (total, concluídas, pendentes).
    security:
      - BearerAuth: []
    parameters:
      - in: path
        name: period_pk
        type: integer
        required: true
    responses:
      200:
        description: Estatísticas de progresso.
    """
    current_user = get_jwt_identity()
    return aval_service.get_aval_status(period_pk, current_user)


@bp.route('/aval/submit', methods=['POST'])
@jwt_required()
@token_required
@require_permission('aval.view')  # ts_interface: aval.view — submeter é acção de participante
@set_session
@api_error_handler
def submit_evaluation():
    """
    Submeter Avaliação Anónima
    ---
    tags:
      - Avaliação Anónima
    summary: Submete a avaliação pessoal e profissional (1-10).
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [pk, aval_personal, aval_professional]
          properties:
            pk:
              type: integer
              description: PK da atribuição (tb_aval_assign.pk)
            aval_personal:
              type: integer
              minimum: 1
              maximum: 10
            aval_professional:
              type: integer
              minimum: 1
              maximum: 10
    responses:
      200:
        description: Avaliação submetida.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    return aval_service.submit_evaluation(data, current_user)


# ─────────────────────────────────────────────
# ADMIN — Gestão de campanhas e atribuições
# ─────────────────────────────────────────────

@bp.route('/aval/admin/periods', methods=['GET'])
@jwt_required()
@token_required
@require_permission('aval.edit')  # ts_interface: aval.edit
@set_session
@api_error_handler
def admin_get_periods():
    """
    Admin — Lista Todas as Campanhas
    ---
    tags:
      - Avaliação (Admin)
    security:
      - BearerAuth: []
    responses:
      200:
        description: Lista completa de campanhas.
    """
    current_user = get_jwt_identity()
    return aval_service.admin_get_all_periods(current_user)


@bp.route('/aval/admin/periods', methods=['POST'])
@jwt_required()
@token_required
@require_permission('aval.edit')  # ts_interface: aval.edit
@set_session
@api_error_handler
def admin_create_period():
    """
    Admin — Criar Campanha
    ---
    tags:
      - Avaliação (Admin)
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [year, descr]
          properties:
            year:
              type: integer
            descr:
              type: string
            active:
              type: integer
    responses:
      201:
        description: Campanha criada.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    return aval_service.admin_create_period(data, current_user)


@bp.route('/aval/admin/periods/<int:period_pk>/toggle', methods=['POST'])
@jwt_required()
@token_required
@require_permission('aval.edit')  # ts_interface: aval.edit
@set_session
@api_error_handler
def admin_toggle_period(period_pk):
    """
    Admin — Ativar/Desativar Campanha
    ---
    tags:
      - Avaliação (Admin)
    security:
      - BearerAuth: []
    responses:
      200:
        description: Estado atualizado.
    """
    current_user = get_jwt_identity()
    return aval_service.admin_toggle_period(period_pk, current_user)


@bp.route('/aval/admin/<int:period_pk>/assignments', methods=['GET'])
@jwt_required()
@token_required
@require_permission('aval.edit')  # ts_interface: aval.edit
@set_session
@api_error_handler
def admin_get_assignments(period_pk):
    """
    Admin — Lista Atribuições de um Período
    ---
    tags:
      - Avaliação (Admin)
    security:
      - BearerAuth: []
    responses:
      200:
        description: Lista de atribuições com nomes.
    """
    current_user = get_jwt_identity()
    return aval_service.admin_get_assignments(period_pk, current_user)


@bp.route('/aval/admin/users', methods=['GET'])
@jwt_required()
@token_required
@require_permission('aval.edit')  # ts_interface: aval.edit
@set_session
@api_error_handler
def admin_get_users():
    """
    Admin — Lista Utilizadores para Atribuição
    ---
    tags:
      - Avaliação (Admin)
    security:
      - BearerAuth: []
    responses:
      200:
        description: Lista de utilizadores ativos.
    """
    current_user = get_jwt_identity()
    return aval_service.admin_get_users(current_user)


@bp.route('/aval/admin/<int:period_pk>/generate', methods=['POST'])
@jwt_required()
@token_required
@require_permission('aval.edit')  # ts_interface: aval.edit
@set_session
@api_error_handler
def admin_generate_assignments(period_pk):
    """
    Admin — Gerar Atribuições Todos-contra-Todos
    ---
    tags:
      - Avaliação (Admin)
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [user_ids]
          properties:
            user_ids:
              type: array
              items:
                type: integer
    responses:
      200:
        description: Atribuições geradas.
    """
    current_user = get_jwt_identity()
    data = request.get_json()
    return aval_service.admin_generate_assignments(
        period_pk, data, current_user)


@bp.route('/aval/admin/<int:period_pk>/results', methods=['GET'])
@jwt_required()
@token_required
@require_permission('aval.edit')  # ts_interface: aval.edit
@set_session
@api_error_handler
def admin_get_results(period_pk):
    """
    Admin — Resultados Agregados por Colaborador
    ---
    tags:
      - Avaliação (Admin)
    security:
      - BearerAuth: []
    responses:
      200:
        description: Médias pessoal e profissional por colaborador.
    """
    current_user = get_jwt_identity()
    return aval_service.admin_get_results(period_pk, current_user)
