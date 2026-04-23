import os
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..services.website_service import (
    # Públicas
    get_orgaos_sociais,
    list_alertas_active,
    list_noticias_public,
    get_noticia_public,
    list_documentos_public,
    list_publicacoes_public,
    list_procedimentos_public,
    get_procedimento_public,
    list_processos_financeiros_public,
    send_contacto,
    list_concursal_procedimentos_public,
    get_concursal_referencias,
    submit_concursal_candidatura,
    get_concursal_proc_for_site,
    # CMS
    get_metadados,
    cms_list_noticias, cms_get_noticia, cms_save_noticia, cms_delete_noticia, cms_upload_noticia_imagem,
    cms_get_noticia_imagens, cms_upload_noticia_imagens, cms_reorder_noticia_imagens,
    cms_update_noticia_imagem_legenda, cms_delete_noticia_imagem,
    cms_list_alertas, cms_save_alerta, cms_delete_alerta,
    cms_list_documentos, cms_save_documento, cms_delete_documento, cms_upload_documento_file,
    cms_list_publicacoes, cms_save_publicacao, cms_delete_publicacao, cms_upload_publicacao_file,
    cms_list_procedimentos, cms_get_procedimento, cms_save_procedimento,
    cms_upload_procedimento_imagem,
    cms_list_procedimento_docs, cms_upload_procedimento_doc, cms_delete_procedimento_doc,
    cms_save_procedimento_fase, cms_delete_procedimento_fase, cms_upload_fase_file,
    cms_list_processos_financeiros, cms_get_processo_financeiro,
    cms_save_processo_financeiro, cms_save_processo_financeiro_doc,
    cms_delete_processo_financeiro_doc, cms_upload_processo_doc_file,
)
from ..utils.utils import set_session, token_required
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ─── Blueprints ───────────────────────────────────────────────────────────────

website_public_bp = Blueprint('website_public', __name__)
website_cms_bp    = Blueprint('website_cms', __name__)


# ═══════════════════════════════════════════════════════════════════════════════
# PÚBLICO — sem autenticação
# ═══════════════════════════════════════════════════════════════════════════════

@website_public_bp.route('/orgaos-sociais', methods=['GET'])
@api_error_handler
def route_orgaos_sociais():
    return get_orgaos_sociais()


@website_public_bp.route('/alertas', methods=['GET'])
@api_error_handler
def get_alertas():
    return list_alertas_active()


@website_public_bp.route('/noticias', methods=['GET'])
@api_error_handler
def get_noticias():
    page       = int(request.args.get('page', 1))
    per_page   = int(request.args.get('per_page', 9))
    destaque   = request.args.get('destaque', '').lower() == 'true'
    return list_noticias_public(page, per_page, destaque)


@website_public_bp.route('/noticias/<int:pk>', methods=['GET'])
@api_error_handler
def get_noticia(pk):
    return get_noticia_public(pk)


@website_public_bp.route('/documentos', methods=['GET'])
@api_error_handler
def get_documentos():
    categoria = request.args.get('categoria', type=int)
    return list_documentos_public(categoria)


@website_public_bp.route('/publicacoes', methods=['GET'])
@api_error_handler
def get_publicacoes():
    tipo = request.args.get('tipo', type=int)
    return list_publicacoes_public(tipo)


@website_public_bp.route('/procedimentos', methods=['GET'])
@api_error_handler
def get_procedimentos():
    return list_procedimentos_public()


@website_public_bp.route('/procedimentos/<int:pk>', methods=['GET'])
@api_error_handler
def get_procedimento(pk):
    return get_procedimento_public(pk)


@website_public_bp.route('/processos-financeiros', methods=['GET'])
@api_error_handler
def get_processos_financeiros():
    return list_processos_financeiros_public()


@website_public_bp.route('/files/<tipo>/<path:filepath>', methods=['GET'])
def serve_website_file(tipo, filepath):
    folder = os.path.join(current_app.config['FILES_DIR'], 'website', tipo)
    return send_from_directory(folder, filepath)


@website_public_bp.route('/procedimento-imagem/<path:filepath>', methods=['GET'])
def serve_procedimento_imagem(filepath):
    folder = os.path.join(current_app.config['FILES_DIR'], 'procedimento')
    return send_from_directory(folder, filepath)


@website_public_bp.route('/procedimento-doc/<path:filepath>', methods=['GET'])
def serve_procedimento_doc(filepath):
    folder = os.path.join(current_app.config['FILES_DIR'], 'procedimento')
    return send_from_directory(folder, filepath)


@website_public_bp.route('/contacto', methods=['POST'])
@api_error_handler
def post_contacto():
    data = request.get_json() or {}
    return send_contacto(
        name    = data.get('name', ''),
        email   = data.get('email', ''),
        subject = data.get('subject', ''),
        message = data.get('message', ''),
    )


# ─── Procedimentos Concursais (RH) ────────────────────────────────────────────

@website_public_bp.route('/concursal/procedimentos', methods=['GET'])
@api_error_handler
def get_concursal_procedimentos():
    return list_concursal_procedimentos_public()


@website_public_bp.route('/concursal/referencias', methods=['GET'])
@api_error_handler
def get_concursal_refs():
    return get_concursal_referencias()


@website_public_bp.route('/concursal/candidatura', methods=['POST'])
@api_error_handler
def post_concursal_candidatura():
    data = request.get_json() or {}
    return submit_concursal_candidatura(data)


@website_public_bp.route('/concursal/for-site-proc/<int:pk>', methods=['GET'])
@api_error_handler
def get_concursal_for_site_proc(pk):
    return get_concursal_proc_for_site(pk)


# ═══════════════════════════════════════════════════════════════════════════════
# CMS — requer autenticação + permissão website.edit
# ═══════════════════════════════════════════════════════════════════════════════

@website_cms_bp.route('/metadados', methods=['GET'])
@jwt_required()
@token_required
@require_permission('website.view')
@set_session
@api_error_handler
def cms_get_metadados():
    current_user = get_jwt_identity()
    return get_metadados(current_user)


# ─── Notícias ─────────────────────────────────────────────────────────────────

@website_cms_bp.route('/noticias', methods=['GET'])
@jwt_required()
@token_required
@require_permission('website.view')
@set_session
@api_error_handler
def cms_noticias_list():
    current_user = get_jwt_identity()
    return cms_list_noticias(current_user)


@website_cms_bp.route('/noticias/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission('website.view')
@set_session
@api_error_handler
def cms_noticia_get(pk):
    current_user = get_jwt_identity()
    return cms_get_noticia(pk, current_user)


@website_cms_bp.route('/noticias', methods=['POST'])
@website_cms_bp.route('/noticias/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_noticia_save(pk=None):
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    if pk:
        data['pk'] = pk
    return cms_save_noticia(data, current_user)


@website_cms_bp.route('/noticias/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_noticia_delete(pk):
    current_user = get_jwt_identity()
    return cms_delete_noticia(pk, current_user)


@website_cms_bp.route('/noticias/<int:pk>/imagem', methods=['POST'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_noticia_upload(pk):
    current_user = get_jwt_identity()
    file = request.files.get('file')
    if not file:
        return jsonify({'erro': 'Ficheiro não fornecido'}), 400
    return cms_upload_noticia_imagem(pk, file, current_user)


@website_cms_bp.route('/noticias/<int:pk>/imagens', methods=['GET'])
@jwt_required()
@token_required
@require_permission('website.view')
@set_session
@api_error_handler
def cms_noticia_imagens_list(pk):
    current_user = get_jwt_identity()
    return cms_get_noticia_imagens(pk, current_user)


@website_cms_bp.route('/noticias/<int:pk>/imagens', methods=['POST'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_noticia_imagens_upload(pk):
    current_user = get_jwt_identity()
    files = request.files.getlist('files[]')
    if not files or all(f.filename == '' for f in files):
        return jsonify({'erro': 'Nenhum ficheiro fornecido'}), 400
    allowed = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
    for f in files:
        if f.mimetype not in allowed:
            return jsonify({'erro': f'Tipo de ficheiro não permitido: {f.mimetype}'}), 400
    return cms_upload_noticia_imagens(pk, files, current_user)


@website_cms_bp.route('/noticias/<int:pk>/imagens/ordem', methods=['PATCH'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_noticia_imagens_reorder(pk):
    current_user = get_jwt_identity()
    data = request.get_json() or []
    return cms_reorder_noticia_imagens(pk, data, current_user)


@website_cms_bp.route('/noticias/<int:pk>/imagens/<int:img_pk>', methods=['PATCH'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_noticia_imagem_legenda(pk, img_pk):
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    return cms_update_noticia_imagem_legenda(pk, img_pk, data.get('legenda'), current_user)


@website_cms_bp.route('/noticias/<int:pk>/imagens/<int:img_pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_noticia_imagem_delete(pk, img_pk):
    current_user = get_jwt_identity()
    return cms_delete_noticia_imagem(pk, img_pk, current_user)


# ─── Alertas ──────────────────────────────────────────────────────────────────

@website_cms_bp.route('/alertas', methods=['GET'])
@jwt_required()
@token_required
@require_permission('website.view')
@set_session
@api_error_handler
def cms_alertas_list():
    current_user = get_jwt_identity()
    return cms_list_alertas(current_user)


@website_cms_bp.route('/alertas', methods=['POST'])
@website_cms_bp.route('/alertas/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_alerta_save(pk=None):
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    if pk:
        data['pk'] = pk
    return cms_save_alerta(data, current_user)


@website_cms_bp.route('/alertas/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_alerta_delete(pk):
    current_user = get_jwt_identity()
    return cms_delete_alerta(pk, current_user)


# ─── Documentos ───────────────────────────────────────────────────────────────

@website_cms_bp.route('/documentos', methods=['GET'])
@jwt_required()
@token_required
@require_permission('website.view')
@set_session
@api_error_handler
def cms_documentos_list():
    current_user = get_jwt_identity()
    return cms_list_documentos(current_user)


@website_cms_bp.route('/documentos', methods=['POST'])
@website_cms_bp.route('/documentos/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_documento_save(pk=None):
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    if pk:
        data['pk'] = pk
    return cms_save_documento(data, current_user)


@website_cms_bp.route('/documentos/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_documento_delete(pk):
    current_user = get_jwt_identity()
    return cms_delete_documento(pk, current_user)


@website_cms_bp.route('/documentos/<int:pk>/ficheiro', methods=['POST'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_documento_upload(pk):
    current_user = get_jwt_identity()
    file = request.files.get('file')
    if not file:
        return jsonify({'erro': 'Ficheiro não fornecido'}), 400
    return cms_upload_documento_file(pk, file, current_user)


# ─── Publicações ──────────────────────────────────────────────────────────────

@website_cms_bp.route('/publicacoes', methods=['GET'])
@jwt_required()
@token_required
@require_permission('website.view')
@set_session
@api_error_handler
def cms_publicacoes_list():
    current_user = get_jwt_identity()
    return cms_list_publicacoes(current_user)


@website_cms_bp.route('/publicacoes', methods=['POST'])
@website_cms_bp.route('/publicacoes/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_publicacao_save(pk=None):
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    if pk:
        data['pk'] = pk
    return cms_save_publicacao(data, current_user)


@website_cms_bp.route('/publicacoes/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_publicacao_delete(pk):
    current_user = get_jwt_identity()
    return cms_delete_publicacao(pk, current_user)


@website_cms_bp.route('/publicacoes/<int:pk>/ficheiro', methods=['POST'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_publicacao_upload(pk):
    current_user = get_jwt_identity()
    file = request.files.get('file')
    if not file:
        return jsonify({'erro': 'Ficheiro não fornecido'}), 400
    return cms_upload_publicacao_file(pk, file, current_user)


# ─── Procedimentos RH ─────────────────────────────────────────────────────────

@website_cms_bp.route('/procedimentos', methods=['GET'])
@jwt_required()
@token_required
@require_permission('website.view')
@set_session
@api_error_handler
def cms_procedimentos_list():
    current_user = get_jwt_identity()
    return cms_list_procedimentos(current_user)


@website_cms_bp.route('/procedimentos/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission('website.view')
@set_session
@api_error_handler
def cms_procedimento_get(pk):
    current_user = get_jwt_identity()
    return cms_get_procedimento(pk, current_user)


@website_cms_bp.route('/procedimentos', methods=['POST'])
@website_cms_bp.route('/procedimentos/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_procedimento_save(pk=None):
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    if pk:
        data['pk'] = pk
    return cms_save_procedimento(data, current_user)


@website_cms_bp.route('/procedimentos/fases', methods=['POST'])
@website_cms_bp.route('/procedimentos/fases/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_procedimento_fase_save(pk=None):
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    if pk:
        data['pk'] = pk
    return cms_save_procedimento_fase(data, current_user)


@website_cms_bp.route('/procedimentos/fases/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_procedimento_fase_delete(pk):
    current_user = get_jwt_identity()
    return cms_delete_procedimento_fase(pk, current_user)


@website_cms_bp.route('/procedimentos/fases/<int:pk>/ficheiro', methods=['POST'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_procedimento_fase_upload(pk):
    current_user = get_jwt_identity()
    file = request.files.get('file')
    if not file:
        return jsonify({'erro': 'Ficheiro não fornecido'}), 400
    return cms_upload_fase_file(pk, file, current_user)


@website_cms_bp.route('/procedimentos/<int:pk>/imagem', methods=['POST'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_procedimento_imagem_upload(pk):
    current_user = get_jwt_identity()
    file = request.files.get('file')
    if not file:
        return jsonify({'erro': 'Ficheiro não fornecido'}), 400
    return cms_upload_procedimento_imagem(pk, file, current_user)


@website_cms_bp.route('/procedimentos/<int:pk>/documentos', methods=['GET'])
@jwt_required()
@token_required
@require_permission('website.view')
@set_session
@api_error_handler
def cms_procedimento_docs_list(pk):
    current_user = get_jwt_identity()
    return cms_list_procedimento_docs(pk, current_user)


@website_cms_bp.route('/procedimentos/<int:pk>/documentos', methods=['POST'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_procedimento_doc_upload(pk):
    current_user = get_jwt_identity()
    file      = request.files.get('file')
    categoria = request.form.get('categoria')
    titulo    = request.form.get('titulo', '')
    if not file:
        return jsonify({'erro': 'Ficheiro não fornecido'}), 400
    if not categoria:
        return jsonify({'erro': 'Categoria não fornecida'}), 400
    return cms_upload_procedimento_doc(pk, categoria, titulo, file, current_user)


@website_cms_bp.route('/procedimentos/documentos/<int:doc_pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_procedimento_doc_delete(doc_pk):
    current_user = get_jwt_identity()
    return cms_delete_procedimento_doc(doc_pk, current_user)


# ─── Processos Financeiros ────────────────────────────────────────────────────

@website_cms_bp.route('/processos-financeiros', methods=['GET'])
@jwt_required()
@token_required
@require_permission('website.view')
@set_session
@api_error_handler
def cms_processos_list():
    current_user = get_jwt_identity()
    return cms_list_processos_financeiros(current_user)


@website_cms_bp.route('/processos-financeiros/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@require_permission('website.view')
@set_session
@api_error_handler
def cms_processo_get(pk):
    current_user = get_jwt_identity()
    return cms_get_processo_financeiro(pk, current_user)


@website_cms_bp.route('/processos-financeiros', methods=['POST'])
@website_cms_bp.route('/processos-financeiros/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_processo_save(pk=None):
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    if pk:
        data['pk'] = pk
    return cms_save_processo_financeiro(data, current_user)


@website_cms_bp.route('/processos-financeiros/documentos', methods=['POST'])
@website_cms_bp.route('/processos-financeiros/documentos/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_processo_doc_save(pk=None):
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    if pk:
        data['pk'] = pk
    return cms_save_processo_financeiro_doc(data, current_user)


@website_cms_bp.route('/processos-financeiros/documentos/<int:pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_processo_doc_delete(pk):
    current_user = get_jwt_identity()
    return cms_delete_processo_financeiro_doc(pk, current_user)


@website_cms_bp.route('/processos-financeiros/documentos/<int:pk>/ficheiro', methods=['POST'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_processo_doc_upload(pk):
    current_user = get_jwt_identity()
    file = request.files.get('file')
    if not file:
        return jsonify({'erro': 'Ficheiro não fornecido'}), 400
    return cms_upload_processo_doc_file(pk, file, current_user)
