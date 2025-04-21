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


def cache_result(timeout=120):
    """Decorador para cache de resultados de consultas frequentes"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            cache_key = f"{f.__name__}_{args}_{kwargs}"
            result = cache.get(cache_key)
            if result:
                current_app.logger.debug(
                    f"Resultado encontrado em cache para {f.__name__}")
                return result

            result = f(*args, **kwargs)
            cache.set(cache_key, result, timeout=timeout)
            return result
        return decorated_function
    return decorator


@cache_result(timeout=30)
def get_document_anex_steps(pk, current_user):
    """Obter anexos do documento"""
    try:
        with db_session_manager(current_user) as session:
            pk = sanitize_input(pk, 'int')

            # Verificar se o documento existe
            doc_query = text("SELECT pk FROM vbl_document WHERE pk = :pk")
            doc = session.execute(doc_query, {'pk': pk}).fetchone()
            if not doc:
                raise ResourceNotFoundError("Documento", pk)

            # Buscar anexos
            document_anex_query = text(
                "SELECT * FROM vbl_document_annex WHERE tb_document = :pk ORDER BY data DESC")
            document_anex_result = session.execute(
                document_anex_query, {'pk': pk})

            document_anex_list = []
            for row in document_anex_result.mappings():
                annex_dict = dict(row)
                # Formatação de datas
                if "data" in annex_dict and isinstance(annex_dict["data"], datetime):
                    annex_dict["data"] = annex_dict["data"].isoformat()
                document_anex_list.append(annex_dict)

            return document_anex_list

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Erro de BD ao buscar anexos do documento {pk}: {str(e)}")
        raise APIError("Erro ao consultar anexos do documento",
                       500, "ERR_DATABASE")
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao buscar anexos do documento {pk}: {str(e)}")
        raise APIError("Erro interno do servidor", 500, "ERR_INTERNAL")


def add_document_annex(data, current_user):
    """Adicionar anexos a um documento"""
    try:
        with db_session_manager(current_user) as session:
            tb_document = sanitize_input(data.get('tb_document'), 'int')
            files = request.files.getlist('files')
            file_descriptions = request.form.getlist('descr')

            if not tb_document:
                raise APIError('O campo tb_document é obrigatório',
                               400, "ERR_MISSING_DOCUMENT")

            if not files:
                raise APIError('Nenhum arquivo enviado', 400, "ERR_NO_FILES")

            # Verificar se o documento existe
            doc_query = text(
                "SELECT regnumber FROM vbl_document WHERE pk = :pk")
            doc_result = session.execute(
                doc_query, {'pk': tb_document}).fetchone()
            if not doc_result:
                raise ResourceNotFoundError("Documento", tb_document)

            reg_result = doc_result.regnumber

            # Garantir que as pastas existem
            try:
                request_path, anexos_path, oficios_path = ensure_directories(
                    reg_result)
            except Exception as de:
                raise APIError(
                    f"Erro ao criar diretórios: {str(de)}", 500, "ERR_DIRECTORY")

            success_count = 0
            error_files = []

            # Limitar a 5 arquivos por vez
            for i, file in enumerate(files[:5]):
                try:
                    description = file_descriptions[i] if i < len(
                        file_descriptions) else f'Anexo {i+1}'

                    # Gerar nome único para o arquivo
                    pk_query = text("SELECT fs_nextcode()")
                    pk_result = session.execute(pk_query).scalar()
                    extension = os.path.splitext(file.filename)[1]
                    filename = f"{pk_result}{extension}"

                    # Salvar o arquivo
                    file_path = os.path.join(anexos_path, filename)
                    file.save(file_path)

                    # Registrar no banco de dados usando função armazenada
                    annex_query = text(
                        "SELECT fbf_document_annex(0, :pk, :tb_document, :data, :descr, :filename)"
                    )
                    annex_result = session.execute(
                        annex_query,
                        {
                            'pk': pk_result,
                            'tb_document': tb_document,
                            'data': datetime.now(),
                            'descr': description,
                            'filename': filename
                        }
                    )

                    # Verificar resposta da função
                    if annex_result and format_message(annex_result.scalar()):
                        success_count += 1
                    else:
                        error_files.append(file.filename)
                        # Tentar remover o arquivo se falhar no BD
                        try:
                            os.remove(file_path)
                        except:
                            pass

                except Exception as fe:
                    current_app.logger.error(
                        f"Erro ao processar anexo {file.filename}: {str(fe)}")
                    error_files.append(file.filename)

            session.commit()

            # Limpar cache de anexos
            cache.delete_memoized(get_document_anex_steps)

            if success_count == 0:
                raise APIError("Falha ao salvar todos os anexos",
                               500, "ERR_ALL_FILES_FAILED")

            if error_files:
                return {
                    'aviso': 'Alguns anexos não puderam ser salvos',
                    'sucesso_parcial': True,
                    'anexos_salvos': success_count,
                    'anexos_com_erro': error_files
                }, 207  # Multi-Status

            return {'sucesso': 'Anexos adicionados com sucesso', 'total': success_count}, 201

    except ResourceNotFoundError as e:
        return {'error': str(e)}, e.status_code
    except APIError as e:
        return {'error': str(e), 'code': e.error_code}, e.status_code
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao adicionar anexos: {str(e)}")
        return {'error': "Erro interno do servidor", 'code': "ERR_INTERNAL"}, 500


def download_file(regnumber, filename, current_user):
    """Download de arquivo anexo ou ofício"""
    try:
        # Sanitizar entradas
        regnumber = sanitize_input(regnumber)
        filename = sanitize_input(filename)

        # Validação contra path traversal
        if '..' in filename or '/' in filename or '\\' in filename:
            raise APIError("Nome de arquivo inválido",
                           400, "ERR_INVALID_FILENAME")

        if '..' in regnumber or '/' in regnumber or '\\' in regnumber:
            raise APIError("Número de registro inválido",
                           400, "ERR_INVALID_REGNUMBER")

        # Verificar se o documento existe
        with db_session_manager(current_user) as session:
            doc_query = text(
                "SELECT pk FROM vbl_document WHERE regnumber = :regnumber")
            doc = session.execute(
                doc_query, {'regnumber': regnumber}).fetchone()
            if not doc:
                raise ResourceNotFoundError("Documento", regnumber)

        # Construir caminhos
        base_path = current_app.config['FILES_DIR']
        request_path = os.path.join(base_path, regnumber)

        # Tentar buscar o arquivo em diferentes locais
        file_path = os.path.join(request_path, 'anexos', filename)
        if not os.path.exists(file_path):
            file_path = os.path.join(request_path, 'Oficios', filename)

        if not os.path.exists(file_path):
            file_path = os.path.join(request_path, filename)

        if os.path.exists(file_path):
            # Configurar headers para melhor cache e segurança
            response = send_file(file_path, as_attachment=True)
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            return response
        else:
            current_app.logger.error(f"Arquivo não encontrado: {file_path}")
            raise ResourceNotFoundError("Arquivo", filename)

    except ResourceNotFoundError as e:
        return jsonify({'error': str(e)}), e.status_code
    except APIError as e:
        return jsonify({'error': str(e), 'code': e.error_code}), e.status_code
    except Exception as e:
        current_app.logger.error(f"Erro ao baixar arquivo: {str(e)}")
        return jsonify({'error': 'Erro interno ao baixar arquivo', 'code': 'ERR_INTERNAL'}), 500
