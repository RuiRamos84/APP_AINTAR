from .. import db
from sqlalchemy.sql import text
from sqlalchemy.exc import ProgrammingError, OperationalError
from flask import current_app
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler
from pydantic import BaseModel
from typing import Optional

# ===================================================================
# MODELOS DE DADOS COM PYDANTIC
# ===================================================================

class InternalDocumentCreate(BaseModel):
    pntype: int
    pnts_associate: Optional[int] = None
    pnmemo: str
    pnpk_etar: Optional[int] = None
    pnpk_ee: Optional[int] = None
    pnaddress: Optional[str] = None
    pnpostal: Optional[str] = None
    pndoor: Optional[str] = None
    pnfloor: Optional[str] = None
    pnnut4: Optional[str] = None # Localidade
    pnglat: Optional[float] = None
    pnglong: Optional[float] = None

@api_error_handler
def get_operations_data(current_user):
    """
    Obtém dados de operações a partir de views específicas
    """
    views = {
        'vbr_document_fossa01': 'Limpezas de fossa global',
        'vbr_document_fossa02': 'Limpeza de fossa Carregal do Sal',
        'vbr_document_fossa03': 'Limpeza de fossa Santa Comba Dão',
        'vbr_document_fossa04': 'Limpeza de fossa Tábua',
        'vbr_document_fossa05': 'Limpeza de fossa Tondela',
        'vbr_document_ramais01': 'Ramais',
        'vbr_document_caixas01': 'Caixas',
        'vbr_document_desobstrucao01': 'Desobstrução',
        'vbr_document_pavimentacao01': 'Pavimentações',
        'vbr_document_ramais02': 'Repavimentações',
        'vbr_document_rede01': 'Rede',
        'vbr_document_reparacao': 'Reparações',
    }

    operations_data = {}

    with db_session_manager(current_user) as session:
        for view_name, friendly_name in views.items():
            try:
                query = text(f"SELECT * FROM {view_name}")
                result = session.execute(query)
                data = [dict(row) for row in result.mappings().all()]
                operations_data[view_name] = {
                    'name': friendly_name,
                    'total': len(data),
                    'data': data,
                    'columns': list(result.keys()) if result.returns_rows else []
                }
            except (ProgrammingError, OperationalError) as e:
                current_app.logger.warning(f"A view {friendly_name} ({view_name}) não foi encontrada ou gerou um erro: {str(e)}")
                # Não adiciona a view ao resultado se ela falhar
    return operations_data


@api_error_handler
def create_internal_document(data: dict, current_user: str):
    """
    Cria um documento interno genérico utilizando a função fbo_document_createintern.
    Valida os dados de entrada com Pydantic.
    """
    doc_data = InternalDocumentCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_document_createintern(
                :pntype, :pnts_associate, :pnmemo, 
                :pnpk_etar, :pnpk_ee,
                :pnaddress, :pnpostal, :pndoor, :pnfloor,
                NULL, NULL, NULL, :pnnut4, -- nut1, nut2, nut3 não são usados aqui
                :pnglat, :pnglong
            )
        """)
        result = session.execute(query, doc_data.model_dump()).scalar()
        return {'message': f'Documento interno criado com sucesso.', 'document_id': result}, 201
