from flask import current_app, request, jsonify, send_file
from sqlalchemy.sql import text
import os
import xml.etree.ElementTree as ET
from datetime import datetime
import logging
from app.utils.error_handler import APIError


def ensure_directories(regnumber):
    """
    Garante que as pastas necessárias existam para um pedido
    """
    try:
        base_path = current_app.config['FILES_DIR']
        request_path = os.path.join(base_path, str(regnumber))
        anexos_path = os.path.join(request_path, 'Anexos')
        oficios_path = os.path.join(request_path, 'Oficios')

        os.makedirs(request_path, exist_ok=True)
        os.makedirs(anexos_path, exist_ok=True)
        os.makedirs(oficios_path, exist_ok=True)

        return request_path, anexos_path, oficios_path
    except Exception as e:
        current_app.logger.error(
            f"Erro ao criar diretórios para {regnumber}: {str(e)}")
        raise APIError(f"Erro ao criar diretórios: {str(e)}", 500)


def debug_pdf_fields(pdf_path):
    """
    Analisa e regista os campos num ficheiro PDF
    """
    from pdfrw import PdfReader
    try:
        reader = PdfReader(pdf_path)
        fields = []
        for i, page in enumerate(reader.pages):
            if '/Annots' in page:
                for j, annotation in enumerate(page['/Annots']):
                    if annotation.get('/Subtype') == '/Widget':
                        if '/T' in annotation:
                            field_name = annotation['/T'][1:-1]
                            field_type = annotation['/FT'] if '/FT' in annotation else 'Unknown'
                            fields.append((field_name, field_type))
                            current_app.logger.debug(
                                f"Campo encontrado no PDF - Página {i+1}, Campo {j+1}: Nome: {field_name}, Tipo: {field_type}")
        return fields
    except Exception as e:
        current_app.logger.error(
            f"Erro ao analisar campos do PDF {pdf_path}: {str(e)}")
        raise APIError(f"Erro ao analisar campos do PDF: {str(e)}", 500)


def emit_socket_notification(notification_data, room=None):
    """
    Emite uma notificação via Socket.IO com tratamento de erro melhorado
    """
    try:
        socketio = current_app.extensions.get('socketio')
        if socketio:
            debug_msg = f"🔥 BACKEND DEBUG: Emitindo notificação para {room} - {notification_data}"
            print(debug_msg)
            current_app.logger.info(debug_msg)

            socketio.emit('new_notification', notification_data, room=room)

            success_msg = f"🔥 BACKEND DEBUG: Notificação emitida com sucesso!"
            print(success_msg)
            current_app.logger.info(success_msg)
            current_app.logger.info(
                f"Notificação enviada para {room}: {notification_data['message']}")
            return True
        else:
            current_app.logger.warning(
                "Socket.IO não está disponível para enviar notificação")
            return False
    except Exception as e:
        current_app.logger.error(
            f"Erro ao enviar notificação via socket: {str(e)}")
        return False


def validate_document_data(data):
    """
    Valida os dados de um documento com verificações detalhadas
    """
    # Verificar campos sempre obrigatórios
    basic_fields = ['tt_type', 'ts_associate']
    missing = [
        field for field in basic_fields if field not in data or not data.get(field)]

    # Verificar se há anexos ou memo
    has_files = 'files' in request.files and len(
        request.files.getlist('files')) > 0
    if not has_files and (not 'memo' in data or not data.get('memo')):
        missing.append('memo')

    if missing:
        return False, f"Campos obrigatórios em falta: {', '.join(missing)}"

    # Validações adicionais
    if data.get('tt_type') and not str(data.get('tt_type')).isdigit():
        return False, "Tipo de documento inválido"

    if data.get('ts_associate') and not str(data.get('ts_associate')).isdigit():
        return False, "Associado inválido"

    return True, None


def format_xml_response(xml_response):
    """
    Extrai mensagem significativa de resposta XML
    """
    try:
        if not xml_response:
            return None

        root = ET.fromstring(xml_response)

        # Verificar tags de sucesso
        for tag in ['success', 'sucess']:
            elem = root.find(tag)
            if elem is not None and elem.text:
                return elem.text.strip()

        # Verificar tag de erro
        error = root.find('error')
        if error is not None and error.text:
            raise APIError(error.text.strip(), 400, "ERR_DB_FUNCTION")

        return None
    except APIError:
        raise
    except Exception as e:
        current_app.logger.error(f"Erro ao analisar resposta XML: {str(e)}")
        raise APIError(
            f"Erro ao processar resposta do servidor: {str(e)}", 500)


def sanitize_input(value, data_type='string'):
    """
    Sanitiza valores de entrada para proteger contra injeção
    """
    if value is None:
        return None

    if data_type == 'int':
        try:
            return int(value)
        except (ValueError, TypeError):
            raise APIError("Valor inteiro inválido", 400, "ERR_INVALID_INPUT")

    if data_type == 'float':
        try:
            return float(value)
        except (ValueError, TypeError):
            raise APIError("Valor decimal inválido", 400, "ERR_INVALID_INPUT")

    if data_type == 'date':
        try:
            if isinstance(value, str):
                return datetime.strptime(value.split('T')[0], '%Y-%m-%d').date()
            return value
        except (ValueError, TypeError):
            raise APIError("Data inválida", 400, "ERR_INVALID_INPUT")

    # String por padrão
    return str(value)
