from ..utils.utils import db_session_manager
from .file_service import FileService
from .template_service import TemplateService
from .letter_numbering_service import LetterNumberingService
from .letter_audit_service import LetterAuditService
from sqlalchemy.sql import text
import os
import logging
from datetime import datetime
from flask import current_app, request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.utils.error_handler import api_error_handler, ResourceNotFoundError
from app.utils.logger import get_logger

logger = get_logger(__name__)



# ===================================================================
# MODELOS DE DADOS COM PYDANTIC
# ===================================================================

class LetterModel(BaseModel):
    tt_doctype: int
    name: str
    body: str
    version: float = 1.0
    active: int = 1

class LetterUpdateModel(LetterModel):
    pass

class LetterFilters(BaseModel):
    tt_doctype: Optional[int] = None
    active: Optional[int] = None

class LetterStoreCreate(BaseModel):
    tb_document: Optional[int] = None
    descr: str
    regnumber: str
    filename: str

@api_error_handler
def create_letter(data: dict, current_user: str):
    letter_data = LetterModel.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("""
            INSERT INTO tb_letter (pk, tt_doctype, name, body, version, active)
            VALUES (fs_nextcode(), :tt_doctype, :name, :body, :version, :active)
            RETURNING pk
        """)
        letter_id = session.execute(query, letter_data.model_dump()).scalar()

        # Registar auditoria
        try:
            LetterAuditService.log_action(
                user=current_user,
                action='TEMPLATE_CREATE',
                letter_id=letter_id,
                details={'name': letter_data.name, 'version': letter_data.version},
                ip_address=request.remote_addr if request else None
            )
        except Exception as e:
            logging.warning(f"Erro ao registar auditoria: {str(e)}")

        return {'id': letter_id, 'message': 'Modelo de ofício criado com sucesso'}, 201

@api_error_handler
def get_letter(letter_id: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_letter WHERE pk = :letter_id")
        result = session.execute(query, {'letter_id': letter_id}).fetchone()
        # logging.debug(f"SQL Result: {result}")
        if result:
            letter_dict = dict(result._mapping)
            # logging.debug(f"Letter dict: {letter_dict}")
            return letter_dict, 200
        raise ResourceNotFoundError('Modelo de ofício', letter_id)

@api_error_handler
def update_letter(letter_id: int, data: dict, current_user: str):
    letter_data = LetterUpdateModel.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("""
            UPDATE tb_letter
            SET name = :name, body = :body, version = :version, active = :active
            WHERE pk = :letter_id
        """)
        result = session.execute(query, {**letter_data.model_dump(), 'letter_id': letter_id})
        if result.rowcount == 0:
            raise ResourceNotFoundError('Modelo de ofício', letter_id)
        return {'message': 'Modelo de ofício atualizado com sucesso'}, 200

@api_error_handler
def delete_letter(letter_id: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("DELETE FROM tb_letter WHERE pk = :letter_id")
        result = session.execute(query, {'letter_id': letter_id})
        if result.rowcount == 0:
            raise ResourceNotFoundError('Modelo de ofício', letter_id)
        return {'message': 'Modelo de ofício excluído com sucesso'}, 200

@api_error_handler
def list_letters(filters: dict, current_user: str):
    filter_data = LetterFilters.model_validate(filters)
    with db_session_manager(current_user) as session:
        query = "SELECT * FROM vbl_letter WHERE 1=1"
        params = {}

        if filter_data.tt_doctype is not None:
            query += " AND tt_doctype = :tt_doctype"
            params['tt_doctype'] = filter_data.tt_doctype

        if filter_data.active is not None:
            query += " AND active = :active"
            params['active'] = filter_data.active

        result = session.execute(text(query), params).mappings().all()
        return [dict(row) for row in result]

@api_error_handler
def create_letterstore(data: dict, current_user: str):
    store_data = LetterStoreCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("""
            INSERT INTO tb_letterstore (tb_document, data, descr, regnumber, filename)
            VALUES (:tb_document, :data, :descr, :regnumber, :filename)
            RETURNING pk
        """)
        params = {**store_data.model_dump(), 'data': datetime.now()}
        letterstore_id = session.execute(query, params).scalar()
        return {'id': letterstore_id, 'message': 'Ofício armazenado com sucesso'}, 201

@api_error_handler
def get_letterstore(letterstore_id: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT * FROM vbl_letterstore WHERE pk = :letterstore_id")
        result = session.execute(
            query, {'letterstore_id': letterstore_id}).fetchone()

        if result is None:
            raise ResourceNotFoundError('Registo de ofício', letterstore_id)

        return dict(result._mapping)

@api_error_handler
def list_letterstores(current_user: str):
    with db_session_manager(current_user) as session:
        query = """
            SELECT pk, tb_document, document_regnumber, data, descr, regnumber, filename
            FROM vbl_letterstore
            ORDER BY data DESC
        """
        result = session.execute(text(query)).mappings().all()
        return [dict(row) for row in result]

@api_error_handler
def get_next_document_number(current_user: str):
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

@api_error_handler
def generate_letter_document(letter_id: int, document_data: dict, current_user: str):
    """
    Gera um documento de ofício usando template com Jinja2.
    """
    with db_session_manager(current_user) as session:
        letter, _ = get_letter(letter_id, current_user)
        if not letter:
            raise ResourceNotFoundError('Modelo de ofício', letter_id)

        # Adicionar a versão do modelo ao document_data
        document_data['VS_M'] = f'v{letter.get("version", "1.0")}'

        # Gerar número do ofício usando o novo serviço
        document_number = LetterNumberingService.generate_number(current_user=current_user)
        document_data['NUMERO_OFICIO'] = document_number

        # Obter regnumber do pedido associado
        tb_document = document_data.get('tb_document')
        regnumber = None
        if tb_document:
            query = text(
                "SELECT regnumber FROM vbf_document WHERE pk = :pk"
            )
            regnumber = session.execute(query, {'pk': tb_document}).scalar()

        # Renderizar corpo do ofício com Jinja2
        body_template = letter.get('body', '')
        try:
            body_content = TemplateService.render_template(body_template, document_data)
        except Exception as e:
            logging.error(f"Erro ao renderizar template: {str(e)}")
            # Fallback para substituição simples (compatibilidade)
            body_content = body_template
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

@api_error_handler
def generate_free_letter_document(document_data: dict, current_user: str):
    """
    Gera um ofício livre.
    """
    with db_session_manager(current_user) as session:
        # Gerar número do ofício usando o novo serviço
        document_number = LetterNumberingService.generate_number(current_user=current_user)
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
            logger.error(f"Erro ao gerar ofício: {str(e)}")
            raise
