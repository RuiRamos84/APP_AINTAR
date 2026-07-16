import os
from typing import Optional
from flask import jsonify, request, current_app, send_file
from sqlalchemy import text
from werkzeug.utils import secure_filename
from flask_jwt_extended import get_jwt
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler, APIError
from app.utils.file_processing import process_uploaded_file
from app.utils.logger import get_logger
from app.utils.serializers import serialize_rows
from .rh_gestao_service import _is_full_rh_admin

ALLOWED_EXTS = {'.pdf', '.jpg', '.jpeg', '.png', '.docx', '.doc'}
MAX_FILES    = 10

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _caller_pk() -> int:
    return get_jwt().get('user_id')



def _colaboradores_base_dir() -> str:
    base = current_app.config.get('FILES_DIR', '')
    return os.path.join(base, 'rh', 'colaboradores')


def _pasta_colaborador(nome: str, user_fk: int) -> str:
    # Nome legível na pasta (ex: "Rui_Ramos__100111") — o pk fica como
    # sufixo para garantir unicidade (nomes repetidos não colidem/misturam
    # documentos de pessoas diferentes) e para a pasta continuar a
    # encontrar-se mesmo que o nome do colaborador seja corrigido depois
    # (o caminho gravado em tb_rh_documento.filename fica congelado no
    # momento do upload, nunca é recalculado a partir do nome actual).
    base_nome = secure_filename(nome or '') or 'colaborador'
    return f'{base_nome}__{user_fk}'


def _resolver_path_seguro(rel_path: str) -> str:
    """Resolve um caminho relativo gravado em tb_rh_documento.filename para
    absoluto, garantindo que fica contido dentro de _colaboradores_base_dir()
    — protege contra traversal mesmo que o valor gravado seja inesperado."""
    base = os.path.abspath(_colaboradores_base_dir())
    full = os.path.abspath(os.path.join(base, rel_path))
    if not (full == base or full.startswith(base + os.sep)):
        raise APIError('Caminho de ficheiro inválido', 400)
    return full


# ---------------------------------------------------------------------------
# Tipos (lookup)
# ---------------------------------------------------------------------------

@api_error_handler
def get_tipos_documento(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, descr FROM tt_rh_tipo_documento WHERE ativo = TRUE ORDER BY pk
        """)).mappings().all()
        return jsonify(serialize_rows(rows)), 200


# ---------------------------------------------------------------------------
# Listagem
# ---------------------------------------------------------------------------

@api_error_handler
def get_documentos(current_user: str, user_fk: Optional[int], ano: Optional[int] = None):
    with db_session_manager(current_user) as session:
        # Só RH admin vê documentos de outros — colaborador vê só os seus
        # (o superior hierárquico não tem acesso — dados sensíveis: contrato,
        # exames médicos, avaliação).
        if not _is_full_rh_admin(session):
            user_fk = _caller_pk()

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
            text(f'SELECT * FROM vbl_rh_documento WHERE {where} ORDER BY ano DESC NULLS LAST, created_at DESC'),
            params,
        ).mappings().all()
        return jsonify(serialize_rows(rows)), 200


# ---------------------------------------------------------------------------
# Upload (só rh.admin)
# ---------------------------------------------------------------------------

@api_error_handler
def upload_documento(user_fk: int, current_user: str):
    files = request.files.getlist('files')
    if not files or all(f.filename == '' for f in files):
        raise APIError('Nenhum ficheiro enviado', 400)

    ano_raw       = request.form.get('ano')
    ano           = int(ano_raw) if ano_raw else None
    tt_tipo_fk    = request.form.get('tt_tipo_fk', type=int)
    notas         = request.form.get('notas') or None
    data_validade = request.form.get('data_validade') or None

    if not tt_tipo_fk:
        raise APIError('Categoria de documento em falta', 400)

    with db_session_manager(current_user) as session:
        colaborador_nome = session.execute(
            text('SELECT name FROM ts_client WHERE pk = :pk'), {'pk': user_fk}
        ).scalar()
        if colaborador_nome is None:
            raise APIError('Colaborador não encontrado', 404)

        pasta_ano  = str(ano) if ano else 'geral'
        pasta_rel  = os.path.join(_pasta_colaborador(colaborador_nome, user_fk), pasta_ano)
        upload_dir = os.path.join(_colaboradores_base_dir(), pasta_rel)
        os.makedirs(upload_dir, exist_ok=True)

        adicionados, erros = [], []

        for f in files[:MAX_FILES]:
            if not f.filename:
                continue
            ext = os.path.splitext(f.filename)[1].lower()
            if ext not in ALLOWED_EXTS:
                erros.append(f'{f.filename}: tipo não permitido (PDF, JPEG, PNG, DOCX)')
                continue

            file_pk    = session.execute(text('SELECT fs_nextcode()')).scalar()
            nome_seguro = secure_filename(f.filename)
            base_nome   = os.path.splitext(nome_seguro)[0] or 'documento'
            # Nome legível na pasta (ex: "contrato__164941.pdf") — o pk fica
            # como sufixo discreto só para garantir unicidade, nunca colide
            # nem arrisca substituir um ficheiro existente com o mesmo nome.
            safe_name = f'{base_nome}__{file_pk}{ext}'
            file_path = os.path.join(upload_dir, safe_name)
            f.save(file_path)

            final_path, _, _ = process_uploaded_file(file_path, safe_name)
            final_name = os.path.basename(final_path)
            tamanho    = os.path.getsize(final_path)
            # Caminho relativo completo (a partir de _colaboradores_base_dir),
            # gravado tal qual — nunca recalculado a partir do nome actual do
            # colaborador, por isso sobrevive a uma correcção de nome futura.
            rel_path = os.path.join(pasta_rel, final_name).replace(os.sep, '/')

            session.execute(text("""
                INSERT INTO tb_rh_documento (
                    pk, tb_user_fk, ano, tt_tipo_fk, nome_original, filename,
                    tamanho, notas, uploaded_by, data_validade
                ) VALUES (
                    :pk, :user_fk, :ano, :tt_tipo_fk, :nome_original, :filename,
                    :tamanho, :notas, :uploaded_by, :data_validade
                )
            """), {
                'pk': file_pk, 'user_fk': user_fk, 'ano': ano, 'tt_tipo_fk': tt_tipo_fk,
                'nome_original': nome_seguro, 'filename': rel_path,
                'tamanho': tamanho, 'notas': notas, 'uploaded_by': _caller_pk(),
                'data_validade': data_validade,
            })
            adicionados.append({'pk': file_pk, 'nome_original': f.filename, 'filename': rel_path})

    logger.info(f'Documentos RH: {len(adicionados)} adicionado(s) para colaborador {user_fk}')
    return jsonify({'adicionados': adicionados, 'erros': erros, 'total': len(adicionados)}), 201


# ---------------------------------------------------------------------------
# Download (dono ou rh.admin)
# ---------------------------------------------------------------------------

@api_error_handler
def download_documento(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(
            text('SELECT tb_user_fk, filename FROM tb_rh_documento WHERE pk = :pk'), {'pk': pk}
        ).fetchone()
        if not row:
            raise APIError('Documento não encontrado', 404)

        if not _is_full_rh_admin(session) and row.tb_user_fk != _caller_pk():
            raise APIError('Sem permissão para aceder a este documento', 403)

    file_path = _resolver_path_seguro(row.filename)
    if not os.path.isfile(file_path):
        raise APIError('Ficheiro não encontrado', 404)

    return send_file(file_path, as_attachment=False)


# ---------------------------------------------------------------------------
# Remover (só rh.admin)
# ---------------------------------------------------------------------------

@api_error_handler
def delete_documento(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(
            text('SELECT filename FROM tb_rh_documento WHERE pk = :pk'), {'pk': pk}
        ).fetchone()
        if not row:
            raise APIError('Documento não encontrado', 404)

        file_path = _resolver_path_seguro(row.filename)
        if os.path.isfile(file_path):
            os.remove(file_path)

        session.execute(text('DELETE FROM tb_rh_documento WHERE pk = :pk'), {'pk': pk})

    logger.info(f'Documento RH removido: pk={pk}')
    return jsonify({'message': 'Documento removido'}), 200
