from flask import current_app
from app.utils.error_handler import APIError, ResourceNotFoundError
from app.utils.utils import db_session_manager
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from pdfrw import PdfReader, PdfWriter, PdfDict, PdfName
import os
from .utils import debug_pdf_fields, sanitize_input

# Caminho do formulário PDF com tratamento de exceção


def get_formulario_path():
    try:
        # Usar caminho absoluto via config
        formulario_path = os.path.join(
            current_app.config['ROOT_PATH'], 'utils', 'FORMULARIO_AINTAR_V05.pdf')
        if not os.path.exists(formulario_path):
            raise APIError(
                f"Formulário não encontrado: {formulario_path}", 500, "ERR_TEMPLATE_MISSING")
        return formulario_path
    except Exception as e:
        current_app.logger.error(f"Erro ao localizar formulário: {str(e)}")
        raise APIError("Erro ao localizar template de PDF",
                       500, "ERR_TEMPLATE_ACCESS")


# Mapeamento de campos do PDF
campo_mapping = {
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


def gerar_comprovativo_pdf(dados_pedido):
    """Gera um PDF com os dados do pedido"""
    try:
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)

        # Cabeçalho do documento
        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, 800, "Comprovativo de Pedido")

        # Adiciona os dados principais do pedido
        c.setFont("Helvetica", 12)
        c.drawString(
            100, 770, f"Pedido Nº: {dados_pedido.get('regnumber', 'N/A')}")
        c.drawString(
            100, 750, f"Data de Submissão: {dados_pedido.get('submission', 'N/A')}")
        c.drawString(
            100, 730, f"Tipo de Pedido: {dados_pedido.get('tt_type', 'N/A')}")

        # Dados do Requerente
        c.drawString(
            100, 700, f"Nome da Entidade: {dados_pedido.get('ts_entity', 'N/A')}")
        c.drawString(100, 680, f"NIPC: {dados_pedido.get('nipc', 'N/A')}")

        # Dados do Endereço
        c.drawString(100, 650, "Endereço:")
        c.drawString(
            100, 630, f"{dados_pedido.get('address', 'N/A')}, {dados_pedido.get('postal', 'N/A')}")
        c.drawString(100, 610, f"Freguesia: {dados_pedido.get('nut3', 'N/A')}")
        c.drawString(100, 590, f"Concelho: {dados_pedido.get('nut4', 'N/A')}")

        # Outras Informações
        c.drawString(100, 560, f"Memorando: {dados_pedido.get('memo', 'N/A')}")
        c.drawString(100, 540, f"Telefone: {dados_pedido.get('phone', 'N/A')}")

        # Observações adicionais (se aplicável)
        if dados_pedido.get('tb_representative'):
            c.drawString(
                100, 510, f"Representante: {dados_pedido.get('tb_representative', 'N/A')}")

        # Rodapé com data e hora de geração
        c.setFont("Helvetica-Oblique", 8)
        from datetime import datetime
        c.drawString(
            100, 50, f"Documento gerado em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
        c.drawString(
            100, 35, "Este documento é meramente informativo e não dispensa a consulta dos documentos originais.")

        # Finalizar o PDF
        c.showPage()
        c.save()

        buffer.seek(0)
        return buffer
    except Exception as e:
        current_app.logger.error(f"Erro ao gerar PDF: {str(e)}")
        raise APIError(
            f"Erro ao gerar PDF: {str(e)}", 500, "ERR_PDF_GENERATION")


def preencher_pdf(dados_estruturados):
    """Preenche um formulário PDF com os dados do pedido"""
    try:
        formulario_path = get_formulario_path()
        current_app.logger.debug("Iniciando preenchimento do PDF")

        # Ler template
        template_pdf = PdfReader(formulario_path)
        output_pdf = PdfWriter()

        # Adicionar páginas
        for page in template_pdf.pages:
            output_pdf.addpage(page)

        # Processar campos
        for i, page in enumerate(template_pdf.pages):
            current_app.logger.debug(f"Processando página {i+1}")
            if '/Annots' in page:
                for annotation in page['/Annots']:
                    if annotation.get('/Subtype') == '/Widget':
                        if '/T' in annotation:
                            pdf_field_name = annotation['/T'][1:-1]

                            # Procurar o campo no mapeamento
                            if pdf_field_name in campo_mapping:
                                campo_estruturado = campo_mapping[pdf_field_name].split(
                                    '.')

                                # Verificar se os dados contêm o campo
                                if (campo_estruturado[0] in dados_estruturados and
                                        campo_estruturado[1] in dados_estruturados[campo_estruturado[0]]):

                                    # Obter o valor
                                    valor = dados_estruturados[campo_estruturado[0]
                                                               ][campo_estruturado[1]]

                                    if valor is not None:
                                        valor = str(valor)
                                        field_type = annotation.get('/FT')

                                        # Tratar diferentes tipos de campo
                                        if field_type == '/Tx':  # Campo de texto
                                            annotation.update(
                                                PdfDict(V=valor, AP=''))
                                        elif field_type == '/Btn':  # Botão/Checkbox
                                            if valor.lower() in ['true', '1', 'yes', 'on']:
                                                annotation.update(
                                                    PdfDict(AS=PdfName('Yes'), V=PdfName('Yes')))
                                            else:
                                                annotation.update(
                                                    PdfDict(AS=PdfName('Off'), V=PdfName('Off')))
                                    else:
                                        current_app.logger.debug(
                                            f"Campo {pdf_field_name}: valor nulo")
                                else:
                                    current_app.logger.debug(
                                        f"Campo {campo_mapping[pdf_field_name]} não encontrado nos dados")
                            else:
                                current_app.logger.debug(
                                    f"Campo {pdf_field_name} não encontrado no mapeamento")

        # Escrever para buffer
        buffer = BytesIO()
        output_pdf.write(buffer)
        buffer.seek(0)

        current_app.logger.info("PDF preenchido com sucesso")
        return buffer

    except APIError:
        raise
    except Exception as e:
        current_app.logger.error(
            f"Erro ao preencher o PDF: {str(e)}", exc_info=True)
        raise APIError(
            f"Erro ao preencher o PDF: {str(e)}", 500, "ERR_PDF_FILLING")


def buscar_dados_pedido(pk, current_user):
    """Busca os dados do pedido para preencher o PDF"""
    try:
        with db_session_manager(current_user) as session:
            pk = sanitize_input(pk, 'int')

            current_app.logger.debug(
                f"Iniciando busca de dados para o pedido {pk}")

            # Buscar dados do pedido
            query_pedido = text("SELECT * FROM vbl_document WHERE pk = :pk")
            result_pedido = session.execute(
                query_pedido, {'pk': pk}).fetchone()

            if not result_pedido:
                raise ResourceNotFoundError("Pedido", pk)

            # Buscar a entidade
            query_entidade = text(
                "SELECT * FROM vbf_entity WHERE nipc = :nipc")
            result_entidade = session.execute(
                query_entidade, {'nipc': result_pedido.nipc}).fetchone()

            if not result_entidade:
                current_app.logger.warning(
                    f"Entidade com NIPC {result_pedido.nipc} não encontrada")
                raise APIError(
                    f"Entidade com NIPC {result_pedido.nipc} não encontrada", 404, "ERR_ENTITY_NOT_FOUND")

            # Buscar o representante (se existir)
            result_requerente = None
            if result_pedido.tb_representative:
                query_requerente = text(
                    "SELECT * FROM vbf_entity WHERE pk = :pk")
                result_requerente = session.execute(
                    query_requerente, {'pk': result_pedido.tb_representative}).fetchone()
                current_app.logger.debug(
                    f"Representante encontrado: {result_requerente.name if result_requerente else 'Não encontrado'}")

            # Converter resultado SQL para dicionário
            def result_to_dict(result):
                if not result:
                    return {}
                return {key: getattr(result, key) for key in result._fields}

            dados_estruturados = {
                'pedido': result_to_dict(result_pedido),
                'entidade': result_to_dict(result_entidade),
                'requerente': result_to_dict(result_requerente) if result_requerente else {}
            }

            return dados_estruturados

    except ResourceNotFoundError as e:
        current_app.logger.warning(f"Recurso não encontrado: {str(e)}")
        raise
    except APIError:
        raise
    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Erro de BD ao buscar dados do pedido {pk}: {str(e)}")
        raise APIError(
            f"Erro ao consultar dados do pedido: {str(e)}", 500, "ERR_DATABASE")
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado ao buscar dados do pedido {pk}: {str(e)}")
        raise APIError(f"Erro interno: {str(e)}", 500, "ERR_INTERNAL")
