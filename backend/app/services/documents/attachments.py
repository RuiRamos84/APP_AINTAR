from flask import current_app, request, jsonify, send_file
from app.utils.error_handler import APIError, ResourceNotFoundError
from app.utils.utils import format_message, db_session_manager
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import os
from functools import wraps
from app import cache
from .utils import ensure_directories, sanitize_input
from app.utils.logger import get_logger

logger = get_logger(__name__)




def cache_result(timeout=120):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            cache_key = f"{f.__name__}_{args}_{kwargs}"
            result = cache.get(cache_key)
            if result:
                return result
            result = f(*args, **kwargs)
            cache.set(cache_key, result, timeout=timeout)
            return result
        return decorated_function
    return decorator


def normalize_filename_extensions(filename):
    """Normalizar extensões equivalentes"""
    if not filename:
        return [filename]

    name, ext = os.path.splitext(filename)
    ext_lower = ext.lower()

    variations = [filename]  # Original primeiro

    # Adicionar variações para jpeg/jpg
    if ext_lower == '.jpeg':
        variations.append(name + '.jpg')
    elif ext_lower == '.jpg':
        variations.append(name + '.jpeg')
    elif ext_lower == '.tiff':
        variations.append(name + '.tif')
    elif ext_lower == '.tif':
        variations.append(name + '.tiff')

    return variations


@cache_result(timeout=30)
def get_document_anex_steps(pk, current_user):
    try:
        with db_session_manager(current_user) as session:
            pk = sanitize_input(pk, 'int')

            doc_query = text("SELECT pk FROM vbl_document WHERE pk = :pk")
            doc = session.execute(doc_query, {'pk': pk}).fetchone()
            if not doc:
                raise ResourceNotFoundError("Documento", pk)

            document_anex_query = text(
                "SELECT * FROM vbl_document_annex WHERE tb_document = :pk ORDER BY data DESC")
            document_anex_result = session.execute(document_anex_query, {'pk': pk})

            document_anex_list = []
            for row in document_anex_result.mappings():
                annex_dict = dict(row)
                if "data" in annex_dict and isinstance(annex_dict["data"], datetime):
                    annex_dict["data"] = annex_dict["data"].isoformat()
                document_anex_list.append(annex_dict)

            return document_anex_list

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except SQLAlchemyError as e:
        logger.error(f"Erro BD anexos {pk}: {str(e)}")
        raise APIError("Erro ao consultar anexos", 500, "ERR_DATABASE")
    except Exception as e:
        logger.error(f"Erro anexos {pk}: {str(e)}")
        raise APIError("Erro interno", 500, "ERR_INTERNAL")


def add_document_annex(data, current_user):
    try:
        with db_session_manager(current_user) as session:
            tb_document = sanitize_input(data.get('tb_document'), 'int')
            files = request.files.getlist('files')
            file_descriptions = request.form.getlist('descr')

            if not tb_document:
                raise APIError('Campo tb_document obrigatório', 400, "ERR_MISSING_DOCUMENT")
            if not files:
                raise APIError('Nenhum ficheiro enviado', 400, "ERR_NO_FILES")

            doc_query = text("SELECT regnumber FROM vbl_document WHERE pk = :pk")
            doc_result = session.execute(doc_query, {'pk': tb_document}).fetchone()
            if not doc_result:
                raise ResourceNotFoundError("Documento", tb_document)

            reg_result = doc_result.regnumber

            try:
                request_path, anexos_path, oficios_path = ensure_directories(reg_result)
            except Exception as de:
                raise APIError(f"Erro criar directorias: {str(de)}", 500, "ERR_DIRECTORY")

            success_count = 0
            error_files = []

            for i, file in enumerate(files[:5]):
                try:
                    description = file_descriptions[i] if i < len(file_descriptions) else f'Anexo {i+1}'

                    pk_query = text("SELECT fs_nextcode()")
                    pk_result = session.execute(pk_query).scalar()

                    # ✅ USAR A FUNÇÃO DE NORMALIZAÇÃO
                    original_filename = file.filename
                    variations = normalize_filename_extensions(original_filename)

                    # Escolher a primeira variação (original ou normalizada)
                    filename = variations[0] if variations else original_filename

                    # Garantir que tem extensão
                    if not os.path.splitext(filename)[1]:
                        filename = f"{pk_result}.bin"
                    else:
                        name, ext = os.path.splitext(filename)
                        filename = f"{pk_result}{ext.lower()}"

                    file_path = os.path.join(anexos_path, filename)
                    file.save(file_path)
                    
                    if not os.path.exists(file_path):
                        raise Exception(f"Falha guardar: {file_path}")
                    
                    os.chmod(file_path, 0o644)
                    logger.info(f"Ficheiro guardado: {file_path}")

                    annex_query = text(
                        "SELECT fbf_document_annex(0, :pk, :tb_document, :data, :descr, :filename)")
                    annex_result = session.execute(annex_query, {
                        'pk': pk_result,
                        'tb_document': tb_document,
                        'data': datetime.now(),
                        'descr': description,
                        'filename': filename
                    })

                    if annex_result and format_message(annex_result.scalar()):
                        success_count += 1
                    else:
                        error_files.append(file.filename)
                        try:
                            os.remove(file_path)
                        except:
                            pass

                except Exception as fe:
                    logger.error(f"Erro processar {file.filename}: {str(fe)}")
                    error_files.append(file.filename)

            session.commit()
            cache.delete_memoized(get_document_anex_steps)

            if success_count == 0:
                raise APIError("Falha guardar anexos", 500, "ERR_ALL_FILES_FAILED")

            if error_files:
                return {
                    'aviso': 'Alguns anexos falharam',
                    'sucesso_parcial': True,
                    'anexos_salvos': success_count,
                    'anexos_erro': error_files
                }, 207

            return {'sucesso': 'Anexos adicionados', 'total': success_count}, 201

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except APIError as e:
        return {'error': str(e), 'code': e.error_code}, e.status_code
    except Exception as e:
        logger.error(f"Erro anexos: {str(e)}")
        return {'error': "Erro interno", 'code': "ERR_INTERNAL"}, 500


def download_file(regnumber, filename, current_user):
    """Download com normalização robusta"""
    try:
        # print(f"📁 Download: {regnumber}/{filename}")

        # Validações
        if '..' in filename or '/' in filename or '\\' in filename:
            return jsonify({'error': 'Nome inválido'}), 400
        if '..' in regnumber or '/' in regnumber or '\\' in regnumber:
            return jsonify({'error': 'Registo inválido'}), 400

        base_path = current_app.config.get('FILES_DIR', '/var/www/html/files')
        request_path = os.path.join(base_path, regnumber)

        # ✅ USAR NORMALIZAÇÃO ROBUSTA
        filename_variations = normalize_filename_extensions(filename)

        # Adicionar variações de case (para Windows/Linux)
        all_variations = []
        for var in filename_variations:
            all_variations.extend([
                var,                    # Original
                var.lower(),           # Minúsculas
                var.upper(),           # Maiúsculas
            ])

        # Remover duplicados mantendo ordem
        unique_variations = []
        for var in all_variations:
            if var not in unique_variations:
                unique_variations.append(var)

        # print(f"🔍 Variações: {unique_variations}")

        # Procurar ficheiro
        search_paths = [
            request_path,
            os.path.join(request_path, 'Anexos'),
            os.path.join(request_path, 'Oficios'),
        ]

        file_path = None
        actual_filename = None

        for search_dir in search_paths:
            if not os.path.exists(search_dir):
                continue

            for filename_var in unique_variations:
                potential_path = os.path.join(search_dir, filename_var)

                if os.path.exists(potential_path) and os.path.isfile(potential_path):
                    file_path = potential_path
                    actual_filename = filename_var
                    # print(f"✅ Encontrado: {file_path}")
                    break

            if file_path:
                break

        if not file_path:
            print(f"❌ Não encontrado: {unique_variations}")
            return jsonify({'error': 'Ficheiro não encontrado'}), 404

        # Verificar permissões
        if not os.access(file_path, os.R_OK):
            return jsonify({'error': 'Sem permissões'}), 403

        response = send_file(file_path, as_attachment=True)
        response.headers["Cache-Control"] = "no-cache"

        if actual_filename != filename:
            response.headers["X-Normalized"] = actual_filename

        return response

    except Exception as e:
        logger.error(f"Erro download: {str(e)}")
        return jsonify({'error': 'Erro interno'}), 500
