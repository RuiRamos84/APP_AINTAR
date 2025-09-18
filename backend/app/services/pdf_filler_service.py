import os
from io import BytesIO
from flask import current_app
from pdfrw import PdfReader, PdfWriter, PdfDict, PdfName
from sqlalchemy.sql import text
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler, ResourceNotFoundError

# Caminho para o template do formulário PDF
FORMULARIO_PATH = os.path.join(os.path.dirname(
    __file__), '..', 'utils', 'FORMULARIO_AINTAR_V05.pdf')

# Mapeamento dos campos do PDF para os campos dos dados estruturados
CAMPO_MAPPING = {
    'Registo': 'pedido.regnumber',
    'Data_Registo': 'pedido.submission',
    'Rua/praça_pedido': 'pedido.address',
    'Observações': 'pedido.memo',
    'Tipo de Pedido': 'pedido.tt_type',
    'Nº Porta': 'pedido.door',
    'Andar/Lote_pedido': 'pedido.floor',
    'Codigo Postal_pedido': 'pedido.postal',
    'Freguesia_pedido': 'pedido.nut3',
    'Concelho_pedido': 'pedido.nut2',
    'Funcionario': 'pedido.creator',
    'Nome/Denominação': 'entidade.name',
    'Domicílio/Sede': 'entidade.address',
    'Código Postal': 'entidade.postal',
    'Localidade': 'entidade.nut4',
    'NIF/NIPC': 'entidade.nipc',
    'Contacto': 'entidade.phone',
    'Email': 'entidade.email',
    'Nome/Denominação_representante': 'requerente.name',
    'Domicílio/Sede_representante': 'requerente.address',
    'Código Postal_representante': 'requerente.postal',
    'Localidade_representante': 'requerente.nut4',
    'NIF/NIPC_representante': 'requerente.nipc',
    'Contacto_representante': 'requerente.phone',
}


@api_error_handler
def generate_filled_pdf(document_pk: int, current_user: str) -> BytesIO:
    """
    Orquestra a geração de um PDF preenchido para um determinado documento.
    Busca os dados, preenche o template e retorna o buffer do PDF.
    """
    dados_estruturados = _fetch_document_data(document_pk, current_user)
    pdf_buffer = _fill_pdf_template(dados_estruturados)
    return pdf_buffer


def _fetch_document_data(pk: int, current_user: str) -> dict:
    """
    Busca todos os dados necessários (pedido, entidade, requerente) para preencher o PDF.
    (Função anteriormente chamada 'buscar_dados_pedido')
    """
    with db_session_manager(current_user) as session:
        query_pedido = text("SELECT * FROM vbl_document WHERE pk = :pk")
        result_pedido = session.execute(query_pedido, {'pk': pk}).fetchone()
        if not result_pedido:
            raise ResourceNotFoundError("Pedido", pk)

        query_entidade = text("SELECT * FROM vbf_entity WHERE nipc = :nipc")
        result_entidade = session.execute(
            query_entidade, {'nipc': result_pedido.nipc}).fetchone()
        if not result_entidade:
            raise ResourceNotFoundError("Entidade", result_pedido.nipc)

        result_requerente = None
        if result_pedido.tb_representative:
            query_requerente = text("SELECT * FROM vbf_entity WHERE pk = :pk")
            result_requerente = session.execute(
                query_requerente, {'pk': result_pedido.tb_representative}).fetchone()

        def result_to_dict(result):
            return {key: getattr(result, key) for key in result._fields} if result else {}

        return {
            'pedido': result_to_dict(result_pedido),
            'entidade': result_to_dict(result_entidade),
            'requerente': result_to_dict(result_requerente)
        }


def _fill_pdf_template(dados_estruturados: dict) -> BytesIO:
    """
    Preenche o template PDF com os dados fornecidos.
    (Função anteriormente chamada 'preencher_pdf')
    """
    if not os.path.exists(FORMULARIO_PATH):
        current_app.logger.error(f"Ficheiro de template PDF não encontrado: {FORMULARIO_PATH}")
        raise FileNotFoundError(f"Ficheiro de template PDF não encontrado: {FORMULARIO_PATH}")

    template_pdf = PdfReader(FORMULARIO_PATH)
    
    # Preencher os campos
    for page in template_pdf.pages:
        if page.get('/Annots'):
            for annotation in page['/Annots']:
                field = annotation.get('/T')
                if field:
                    pdf_field_name = field[1:-1] # Remover parênteses
                    
                    if pdf_field_name in CAMPO_MAPPING:
                        map_key = CAMPO_MAPPING[pdf_field_name]
                        main_key, sub_key = map_key.split('.')
                        
                        valor = dados_estruturados.get(main_key, {}).get(sub_key)

                        if valor is not None:
                            # Atualiza o valor do campo no PDF
                            annotation.update(PdfDict(V=str(valor)))
                            # Força a aparência a ser regenerada pelo leitor de PDF
                            annotation.update(PdfDict(AP=''))

    # Gerar o PDF de saída
    buffer = BytesIO()
    PdfWriter().write(buffer, template_pdf)
    buffer.seek(0)
    
    current_app.logger.info("PDF preenchido com sucesso e retornado como buffer.")
    return buffer


def debug_pdf_fields(pdf_path: str):
    """
    Função de utilidade para depurar os nomes dos campos de um formulário PDF.
    """
    reader = PdfReader(pdf_path)
    for i, page in enumerate(reader.pages):
        if page.get('/Annots'):
            for j, annotation in enumerate(page['/Annots']):
                field = annotation.get('/T')
                if field:
                    field_name = field[1:-1]
                    field_type = annotation.get('/FT')
                    current_app.logger.debug(
                        f"Campo encontrado no PDF - Página {i+1}, Campo {j+1}: Nome: {field_name}, Tipo: {field_type}")