from sqlalchemy.sql import func
from ..utils.utils import db_session_manager
from .file_service import FileService
from sqlalchemy.sql import text
from docx import Document
import os
import logging
from datetime import datetime
from docxtpl import DocxTemplate
from docx2pdf import convert
import tempfile
from flask import current_app, send_file
import shutil


def ensure_letters_directory():
    """Garante que a pasta de ofícios livres exista"""
    letters_path = os.path.join(current_app.config['FILES_DIR'], 'letters')
    os.makedirs(letters_path, exist_ok=True)
    return letters_path


def get_letter_path(filename, regnumber=None):
    """
    Obtém o caminho completo de um ofício
    """
    base_path = current_app.config['FILES_DIR']

    if regnumber:
        return os.path.join(base_path, str(regnumber), 'Oficios', filename)
    else:
        return os.path.join(base_path, 'letters', filename)


def create_letter(data, current_user):
    with db_session_manager(current_user) as session:
        query = text("""
            INSERT INTO tb_letter (pk, tt_doctype, name, body, version, active)
            VALUES (fs_nextcode(), :tt_doctype, :name, :body, :version, :active)
            RETURNING pk
        """)
        result = session.execute(query, {
            'tt_doctype': data['tt_doctype'],
            'name': data['name'],
            'body': data['body'],
            'version': data.get('version', 1),
            'active': data.get('active', 1)
        })
        letter_id = result.fetchone()[0]
        session.commit()
        return {'id': letter_id, 'message': 'Modelo de ofício criado com sucesso'}


def get_letter(letter_id, current_user):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_letter WHERE pk = :letter_id")
        result = session.execute(query, {'letter_id': letter_id}).fetchone()
        # logging.debug(f"SQL Result: {result}")
        if result:
            letter_dict = dict(result._mapping)
            # logging.debug(f"Letter dict: {letter_dict}")
            return letter_dict
        return None


def update_letter(letter_id, data, current_user):
    with db_session_manager(current_user) as session:
        query = text("""
            UPDATE tb_letter
            SET name = :name, body = :body, version = :version, active = :active
            WHERE pk = :letter_id
        """)
        session.execute(query, {
            'name': data['name'],
            'body': data['body'],
            'version': data.get('version', 1),
            'active': data.get('active', 1),
            'letter_id': letter_id
        })
        session.commit()
        return {'message': 'Modelo de ofício atualizado com sucesso'}


def delete_letter(letter_id, current_user):
    with db_session_manager(current_user) as session:
        query = text("""
            DELETE FROM tb_letter
            WHERE pk = :letter_id
        """)
        result = session.execute(query, {'letter_id': letter_id})
        affected_rows = result.rowcount
        session.commit()

        if affected_rows > 0:
            return {'message': 'Modelo de ofício excluído com sucesso'}
        else:
            return {'error': 'Modelo de ofício não encontrado'}, 404


def list_letters(filters, current_user):
    with db_session_manager(current_user) as session:
        query = "SELECT * FROM vbl_letter WHERE 1=1"
        params = {}

        if 'tt_doctype' in filters:
            query += " AND tt_doctype = :tt_doctype"
            params['tt_doctype'] = filters['tt_doctype']

        if 'active' in filters:
            query += " AND active = :active"
            params['active'] = filters['active']

        # logging.debug(f"Executing query: {query}")
        # logging.debug(f"With params: {params}")

        result = session.execute(text(query), params).fetchall()

        # logging.debug(f"Query result: {result}")

        if not result:
            # logging.debug("No results found")
            return []

        column_names = result[0]._fields
        dict_results = [dict(zip(column_names, row)) for row in result]

        return dict_results


def create_letterstore(data, current_user):
    with db_session_manager() as session:
        query = text("""
            INSERT INTO tb_letterstore (tb_document, data, descr, regnumber, filename)
            VALUES (:tb_document, :data, :descr, :regnumber, :filename)
            RETURNING pk
        """)
        result = session.execute(query, {
            'tb_document': data['tb_document'],
            'data': datetime.now(),
            'descr': data['descr'],
            'regnumber': data['regnumber'],
            'filename': data['filename']
        })
        letterstore_id = result.fetchone()[0]
        session.commit()
        return {'id': letterstore_id, 'message': 'Ofício armazenado com sucesso'}


def get_letterstore(letterstore_id, current_user):
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT * FROM vbl_letterstore WHERE pk = :letterstore_id")
        result = session.execute(
            query, {'letterstore_id': letterstore_id}).fetchone()

        if result is None:
            return None

        # Converter o resultado em um dicionário usando _mapping
        letterstore_dict = dict(result._mapping)
        # logging.info(f"Letterstore recuperado: {letterstore_dict}")
        return letterstore_dict


def list_letterstores(current_user):
    with db_session_manager(current_user) as session:
        query = """
            SELECT pk, tb_document, document_regnumber, data, descr, regnumber, filename
            FROM vbl_letterstore
            ORDER BY data DESC
        """

        # logging.info(f"Executing query: {query}")

        result = session.execute(text(query)).fetchall()
        # logging.info(f"Query result: {result}")

        # Converter o resultado em uma lista de dicionários
        letterstores = []
        for row in result:
            letterstore = {
                'pk': row.pk,
                'tb_document': row.tb_document,
                'document_regnumber': row.document_regnumber,
                'data': row.data,
                'descr': row.descr,
                'regnumber': row.regnumber,
                'filename': row.filename
            }
            letterstores.append(letterstore)

        return letterstores


def get_next_document_number(current_user):
    with db_session_manager(current_user) as session:
        year = datetime.now().year
        query = text("""
            SELECT COALESCE(MAX(CAST(SUBSTRING(regnumber FROM 6) AS INTEGER)), 0) + 1
            FROM tb_letterstore
            WHERE regnumber LIKE :year_prefix
        """)
        result = session.execute(
            query, {'year_prefix': f'OF-{year}-%'}).scalar()
        return f'OF-{year}-{result:04d}'


def generate_letter_document(letter_id, document_data, current_user):
    """
    Gera um documento de ofício.
    """
    try:
        with db_session_manager(current_user) as session:
            # Buscar informações do modelo de ofício
            letter = get_letter(letter_id, current_user)
            if not letter:
                return {'error': 'Modelo de ofício não encontrado'}

            # Adicionar a versão do modelo ao document_data
            document_data['VS_M'] = f'v{letter.get("version", "1.0")}'  # Garante formato 'v1.0'

            # Gerar número do ofício
            document_number = session.execute(
                text("SELECT fs_letternumber()")).scalar()
            document_data['NUMERO_OFICIO'] = document_number

            # Obter regnumber do pedido associado
            tb_document = document_data.get('tb_document')
            regnumber = None
            if tb_document:
                query = text(
                    "SELECT regnumber FROM vbf_document WHERE pk = :pk")
                regnumber = session.execute(
                    query, {'pk': tb_document}).scalar()

            # Adicionar corpo do ofício ao contexto
            body_content = letter.get('body', '')
            for key, value in document_data.items():
                placeholder = f"${{{key}}}"
                body_content = body_content.replace(placeholder, str(value))
            document_data['BODY'] = body_content

            # Gerar o PDF com a versão correta
            file_service = FileService()
            file_path, filename = file_service.generate_letter(
                context=document_data,
                regnumber=regnumber,
                document_number=document_number,
                is_free_letter=False
            )

            # Registrar no banco de dados
            pk_query = text("SELECT fs_nextcode()")
            new_pk = session.execute(pk_query).scalar()

            insert_query = text("""
                INSERT INTO tb_letterstore (pk, tb_document, data, descr, regnumber, filename)
                VALUES (:pk, :tb_document, :data, :descr, :regnumber, :filename)
            """)

            session.execute(insert_query, {
                'pk': new_pk,
                'tb_document': tb_document,
                'data': datetime.now(),
                'descr': f"Ofício gerado para {document_data['NOME']}",
                'regnumber': document_number,
                'filename': filename
            })

            session.commit()

            return {
                'success': True,
                'file_path': file_path,
                'filename': filename,
                'document_number': document_number,
                'letterstore_id': new_pk,
                'data': datetime.now().isoformat(),
                'message': 'Documento do ofício gerado com sucesso'
            }

    except Exception as e:
        logging.error(f"Erro ao gerar ofício: {str(e)}")
        return {'error': f'Erro ao gerar o ofício: {str(e)}'}


def generate_free_letter_document(document_data, current_user):
    """
    Gera um ofício livre.
    """
    try:
        with db_session_manager(current_user) as session:
            # Gerar número do ofício
            document_number = session.execute(
                text("SELECT fs_letternumber()")).scalar()
            document_data['NUMERO_OFICIO'] = document_number

            # Garantir que existe uma versão definida
            if 'VS_M' not in document_data:
                document_data['VS_M'] = 'v1.0'

            # Instanciar FileService
            file_service = FileService()

            try:
                # Gerar o PDF
                file_path, filename = file_service.generate_letter(
                    context=document_data,
                    regnumber=None,
                    document_number=document_number,
                    is_free_letter=True
                )

                # Registrar no banco de dados
                pk_query = text("SELECT fs_nextcode()")
                new_pk = session.execute(pk_query).scalar()

                insert_query = text("""
                    INSERT INTO tb_letterstore (pk, tb_document, data, descr, regnumber, filename)
                    VALUES (:pk, :tb_document, :data, :descr, :regnumber, :filename)
                """)

                session.execute(insert_query, {
                    'pk': new_pk,
                    'tb_document': None,
                    'data': datetime.now(),
                    'descr': f"Ofício livre gerado para {document_data.get('NOME', 'Destinatário')}",
                    'regnumber': document_number,
                    'filename': filename
                })

                session.commit()

                return {
                    'success': True,
                    'file_path': file_path,
                    'filename': filename,
                    'document_number': document_number,
                    'letterstore_id': new_pk,
                    'data': datetime.now().isoformat(),
                    'message': 'Ofício livre gerado com sucesso'
                }

            except Exception as e:
                current_app.logger.error(f"Erro ao gerar ofício: {str(e)}")
                raise

    except Exception as e:
        current_app.logger.error(f"Erro ao gerar ofício livre: {str(e)}")
        return {'error': f'Erro ao gerar o ofício livre: {str(e)}'}


def download_file(regnumber, filename, current_user):
    """
    Função para download de arquivos (ofícios ou anexos) de um pedido
    
    Args:
        regnumber (str): Número do registro do pedido
        filename (str): Nome do arquivo
        current_user: Usuário atual
    """
    try:
        with db_session_manager(current_user) as session:
            # Verificar se é um anexo ou um ofício baseado no prefixo do filename ou outra lógica
            base_path = current_app.config['FILES_DIR']
            request_path = os.path.join(base_path, str(regnumber))

            # Primeiro tenta na pasta de ofícios
            file_path = os.path.join(request_path, 'Oficios', filename)
            if not os.path.exists(file_path):
                # Se não encontrar, tenta na pasta de anexos
                file_path = os.path.join(request_path, 'anexos', filename)

            if os.path.exists(file_path):
                return send_file(file_path, as_attachment=True)
            else:
                current_app.logger.error(f"Arquivo não encontrado: {file_path}")
                return {'error': 'Arquivo não encontrado'}, 404
    except Exception as e:
        current_app.logger.error(f"Erro ao baixar arquivo: {str(e)}")
        return {'error': 'Erro interno ao baixar arquivo'}, 500
