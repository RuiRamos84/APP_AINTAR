from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.utils import token_required, set_session
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from ..services.equipamentos_service import (
    get_meta,
    list_equipamentos,
    list_equipamentos_by_instalacao,
    get_equipamento,
    create_equipamento,
    update_equipamento,
    delete_equipamento,
    list_aloc,
    create_aloc,
    update_aloc,
    delete_aloc,
    reallocar_equipamento,
    list_specs,
    create_spec,
    update_spec,
    delete_spec,
    list_repairs,
    create_repair,
    update_repair,
    delete_repair,
)

bp = Blueprint('equipamentos', __name__)

EQUIPAMENTOS_VIEW = 'equipamentos.view'   # ts_interface value
EQUIPAMENTOS_EDIT = 'equipamentos.edit'   # ts_interface value
EQUIPAMENTOS_MANAGE_ALLOC = 'equipamentos.edit'


# ─── Meta ─────────────────────────────────────────────────────────────

@bp.route('/equipamentos/meta', methods=['GET'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_VIEW)
@set_session
@api_error_handler
def get_meta_route():
    current_user = get_jwt_identity()
    return get_meta(current_user)


# ─── Equipamento ──────────────────────────────────────────────────────

@bp.route('/equipamentos', methods=['GET'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_VIEW)
@set_session
@api_error_handler
def get_equipamentos():
    current_user = get_jwt_identity()
    return list_equipamentos(current_user)


@bp.route('/equipamentos/by-instalacao/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_VIEW)
@set_session
@api_error_handler
def get_equipamentos_by_instalacao(pk):
    current_user = get_jwt_identity()
    return list_equipamentos_by_instalacao(pk, current_user)


@bp.route('/equipamentos/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_VIEW)
@set_session
@api_error_handler
def get_equipamento_route(pk):
    current_user = get_jwt_identity()
    return get_equipamento(pk, current_user)


@bp.route('/equipamentos', methods=['POST'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_EDIT)
@set_session
@api_error_handler
def post_equipamento():
    current_user = get_jwt_identity()
    return create_equipamento(request.get_json(), current_user)


@bp.route('/equipamentos/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_EDIT)
@set_session
@api_error_handler
def put_equipamento(pk):
    current_user = get_jwt_identity()
    return update_equipamento(pk, request.get_json(), current_user)


@bp.route('/equipamentos/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_EDIT)
@set_session
@api_error_handler
def delete_equipamento_route(pk):
    current_user = get_jwt_identity()
    return delete_equipamento(pk, current_user)


# ─── Alocações ────────────────────────────────────────────────────────

@bp.route('/equipamentos/<int:pk>/aloc', methods=['GET'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_VIEW)
@set_session
@api_error_handler
def get_aloc(pk):
    current_user = get_jwt_identity()
    return list_aloc(pk, current_user)


@bp.route('/equipamentos/<int:pk>/aloc', methods=['POST'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_MANAGE_ALLOC)
@set_session
@api_error_handler
def post_aloc(pk):
    current_user = get_jwt_identity()
    return create_aloc(pk, request.get_json(), current_user)


@bp.route(
    '/equipamentos/<int:pk>/aloc/<int:aloc_pk>',
    methods=['PUT'],
)
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_MANAGE_ALLOC)
@set_session
@api_error_handler
def put_aloc(pk, aloc_pk):
    current_user = get_jwt_identity()
    return update_aloc(aloc_pk, request.get_json(), current_user)


@bp.route(
    '/equipamentos/<int:pk>/aloc/<int:aloc_pk>',
    methods=['DELETE'],
)
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_MANAGE_ALLOC)
@set_session
@api_error_handler
def delete_aloc_route(pk, aloc_pk):
    current_user = get_jwt_identity()
    return delete_aloc(aloc_pk, current_user)


@bp.route('/equipamentos/<int:pk>/reallocar', methods=['POST'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_MANAGE_ALLOC)
@set_session
@api_error_handler
def post_reallocar(pk):
    current_user = get_jwt_identity()
    return reallocar_equipamento(
        pk, request.get_json(), current_user
    )


# ─── Especificações ───────────────────────────────────────────────────

@bp.route('/equipamentos/<int:pk>/specs', methods=['GET'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_VIEW)
@set_session
@api_error_handler
def get_specs(pk):
    current_user = get_jwt_identity()
    return list_specs(pk, current_user)


@bp.route('/equipamentos/<int:pk>/specs', methods=['POST'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_EDIT)
@set_session
@api_error_handler
def post_spec(pk):
    current_user = get_jwt_identity()
    return create_spec(pk, request.get_json(), current_user)


@bp.route(
    '/equipamentos/<int:pk>/specs/<int:spec_pk>',
    methods=['PUT'],
)
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_EDIT)
@set_session
@api_error_handler
def put_spec(pk, spec_pk):
    current_user = get_jwt_identity()
    return update_spec(spec_pk, request.get_json(), current_user)


@bp.route(
    '/equipamentos/<int:pk>/specs/<int:spec_pk>',
    methods=['DELETE'],
)
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_EDIT)
@set_session
@api_error_handler
def delete_spec_route(pk, spec_pk):
    current_user = get_jwt_identity()
    return delete_spec(spec_pk, current_user)


# ─── Manutenções / Reparações ─────────────────────────────────────────

@bp.route('/equipamentos/<int:pk>/repairs', methods=['GET'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_VIEW)
@set_session
@api_error_handler
def get_repairs(pk):
    current_user = get_jwt_identity()
    return list_repairs(pk, current_user)


@bp.route('/equipamentos/<int:pk>/repairs', methods=['POST'])
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_EDIT)
@set_session
@api_error_handler
def post_repair(pk):
    current_user = get_jwt_identity()
    return create_repair(pk, request.get_json(), current_user)


@bp.route(
    '/equipamentos/<int:pk>/repairs/<int:rep_pk>',
    methods=['PUT'],
)
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_EDIT)
@set_session
@api_error_handler
def put_repair(pk, rep_pk):
    current_user = get_jwt_identity()
    return update_repair(rep_pk, request.get_json(), current_user)


@bp.route(
    '/equipamentos/<int:pk>/repairs/<int:rep_pk>',
    methods=['DELETE'],
)
@jwt_required()
@token_required
@require_permission(EQUIPAMENTOS_EDIT)
@set_session
@api_error_handler
def delete_repair_route(pk, rep_pk):
    current_user = get_jwt_identity()
    return delete_repair(rep_pk, current_user)
