from flask import current_app, request, jsonify, send_file
from app.utils.error_handler import APIError, ResourceNotFoundError
from app.utils.utils import format_message, db_session_manager
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime
import os
from functools import wraps
from app import cache
from app.utils.logger import get_logger

logger = get_logger(__name__)




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


def sanitize_input(value, data_type='string'):
    """Sanitiza valores de entrada"""
    if value is None:
        return None

    if data_type == 'int':
        try:
            return int(value)
        except (ValueError, TypeError):
            raise APIError("Valor inteiro inválido", 400, "ERR_INVALID_INPUT")

    return str(value)


def ensure_operation_directories(instalacao_nome, ano=None, mes=None):
    """
    Garante que as pastas necessárias existam para tarefas de operação

    Estrutura:
    - Dev: files/TarefasOperação/<instalação>/<ano>/<mes>
    - Prod: D:/APP/FilesApp/TarefasOperação/<instalação>/<ano>/<mes>

    Args:
        instalacao_nome: Nome da instalação (ex: "Albergaria (ETAR)")
        ano: Ano (YYYY) - default: ano atual
        mes: Mês (MM) - default: mês atual

    Returns:
        tuple: (base_path, full_path)
    """
    try:
        # Determinar base path
        base_path = current_app.config.get('FILES_DIR', '/var/www/html/files')

        # Criar path para tarefas de operação
        operations_base = os.path.join(base_path, 'TarefasOperação')

        # Sanitizar nome da instalação (remover caracteres inválidos)
        safe_instalacao = "".join(c for c in instalacao_nome if c.isalnum() or c in (' ', '-', '_', '(', ')')).strip()

        # Usar data atual se não especificado
        if ano is None:
            ano = datetime.now().strftime('%Y')
        if mes is None:
            mes = datetime.now().strftime('%m')

        # Construir caminho completo
        full_path = os.path.join(operations_base, safe_instalacao, str(ano), str(mes))

        # Criar diretórios
        os.makedirs(full_path, exist_ok=True)

        logger.info(f"Diretórios criados/verificados: {full_path}")

        return operations_base, full_path

    except Exception as e:
        logger.error(f"Erro ao criar diretórios para {instalacao_nome}: {str(e)}")
        raise APIError(f"Erro ao criar diretórios: {str(e)}", 500, "ERR_DIRECTORY")


def save_operation_photo(photo_file, operation_pk, instalacao_nome, current_user):
    """
    Guarda a foto de uma operação

    Args:
        photo_file: Ficheiro da foto (Flask FileStorage)
        operation_pk: PK da operação
        instalacao_nome: Nome da instalação
        current_user: Utilizador atual

    Returns:
        str: Caminho relativo do ficheiro guardado
    """
    try:
        if not photo_file:
            raise APIError('Nenhum ficheiro enviado', 400, "ERR_NO_FILE")

        # Obter ano e mês atual
        now = datetime.now()
        ano = now.strftime('%Y')
        mes = now.strftime('%m')

        # Criar diretórios
        operations_base, full_path = ensure_operation_directories(instalacao_nome, ano, mes)

        # Normalizar nome do ficheiro
        original_filename = photo_file.filename
        variations = normalize_filename_extensions(original_filename)
        filename = variations[0] if variations else original_filename

        # Garantir que tem extensão
        if not os.path.splitext(filename)[1]:
            filename = f"{operation_pk}.jpg"
        else:
            name, ext = os.path.splitext(filename)
            # Usar PK da operação como nome base
            filename = f"operacao_{operation_pk}_{now.strftime('%Y%m%d_%H%M%S')}{ext.lower()}"

        # Caminho completo do ficheiro
        file_path = os.path.join(full_path, filename)

        # Guardar ficheiro
        photo_file.save(file_path)

        # Verificar se foi guardado
        if not os.path.exists(file_path):
            raise Exception(f"Falha ao guardar ficheiro: {file_path}")

        # Definir permissões
        os.chmod(file_path, 0o644)

        logger.info(f"Foto guardada: {file_path}")

        # Retornar caminho relativo com barras NORMAIS (/) para URL
        # Sanitizar nome da instalação para o path
        safe_instalacao = "".join(c for c in instalacao_nome if c.isalnum() or c in (' ', '-', '_', '(', ')')).strip()

        # IMPORTANTE: Usar / em vez de \ para URLs (mesmo no Windows)
        relative_path = f"TarefasOperação/{safe_instalacao}/{ano}/{mes}/{filename}"

        logger.info(f"📍 Caminho relativo gerado: {relative_path}")

        return relative_path

    except APIError:
        raise
    except Exception as e:
        logger.error(f"Erro ao guardar foto da operação {operation_pk}: {str(e)}")
        raise APIError(f"Erro ao guardar foto: {str(e)}", 500, "ERR_SAVE_FILE")


def download_operation_photo(instalacao_nome, ano, mes, filename):
    """
    Download da foto de uma operação com normalização robusta

    Args:
        instalacao_nome: Nome da instalação
        ano: Ano (YYYY)
        mes: Mês (MM)
        filename: Nome do ficheiro

    Returns:
        Flask Response com o ficheiro
    """
    try:
        logger.info(f"📷 Download solicitado - Instalação: {instalacao_nome}, Ano: {ano}, Mês: {mes}, Ficheiro: {filename}")

        # Validações
        if '..' in filename or '/' in filename or '\\' in filename:
            logger.error(f"Nome de ficheiro inválido: {filename}")
            return jsonify({'error': 'Nome de ficheiro inválido'}), 400

        # Construir caminho base
        base_path = current_app.config.get('FILES_DIR', '/var/www/html/files')
        logger.info(f"📁 Base path: {base_path}")

        # Sanitizar nome da instalação
        safe_instalacao = "".join(c for c in instalacao_nome if c.isalnum() or c in (' ', '-', '_', '(', ')')).strip()
        logger.info(f"🔧 Instalação sanitizada: '{instalacao_nome}' -> '{safe_instalacao}'")

        # Caminho da operação
        operation_path = os.path.join(base_path, 'TarefasOperação', safe_instalacao, str(ano), str(mes))
        logger.info(f"📂 Caminho da operação: {operation_path}")
        logger.info(f"📂 Diretório existe? {os.path.exists(operation_path)}")

        # Normalizar nome do ficheiro
        filename_variations = normalize_filename_extensions(filename)
        logger.info(f"🔄 Variações de nome: {filename_variations}")

        # Adicionar variações de case
        all_variations = []
        for var in filename_variations:
            all_variations.extend([
                var,
                var.lower(),
                var.upper(),
            ])

        # Remover duplicados mantendo ordem
        unique_variations = []
        for var in all_variations:
            if var not in unique_variations:
                unique_variations.append(var)

        logger.info(f"🔍 Variações únicas a procurar: {unique_variations}")

        # Procurar ficheiro
        file_path = None
        actual_filename = None

        if os.path.exists(operation_path):
            # Listar ficheiros no diretório
            try:
                files_in_dir = os.listdir(operation_path)
                logger.info(f"📋 Ficheiros no diretório: {files_in_dir}")
            except Exception as list_error:
                logger.error(f"Erro ao listar diretório: {list_error}")

            for filename_var in unique_variations:
                potential_path = os.path.join(operation_path, filename_var)
                logger.info(f"🔎 Tentando: {potential_path}")

                if os.path.exists(potential_path) and os.path.isfile(potential_path):
                    file_path = potential_path
                    actual_filename = filename_var
                    logger.info(f"✅ Ficheiro encontrado: {file_path}")
                    break
        else:
            logger.error(f"❌ Diretório não existe: {operation_path}")

        if not file_path:
            logger.error(f"❌ Ficheiro não encontrado após todas as tentativas")
            return jsonify({'error': 'Ficheiro não encontrado', 'path': operation_path}), 404

        # Verificar permissões
        if not os.access(file_path, os.R_OK):
            logger.error(f"❌ Sem permissões de leitura: {file_path}")
            return jsonify({'error': 'Sem permissões de leitura'}), 403

        # Enviar ficheiro
        logger.info(f"📤 Enviando ficheiro: {file_path}")
        response = send_file(file_path, as_attachment=True)
        response.headers["Cache-Control"] = "no-cache"

        if actual_filename != filename:
            response.headers["X-Normalized"] = actual_filename

        return response

    except Exception as e:
        logger.error(f"💥 Erro ao fazer download da foto: {str(e)}", exc_info=True)
        return jsonify({'error': 'Erro interno', 'details': str(e)}), 500
