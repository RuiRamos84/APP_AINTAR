# services/emissions/html_generator_service.py
# Gerador de PDFs usando xhtml2pdf - suporta HTML/CSS
from xhtml2pdf import pisa
from datetime import datetime
import os
from typing import Dict, Optional
from flask import current_app
from app.utils.logger import get_logger
from app.services.template_service import TemplateService
from app.models.emission import Emission

logger = get_logger(__name__)


class HTMLPDFGenerator:
    """
    Gerador de PDFs usando WeasyPrint
    Suporta HTML/CSS completo - ideal para templates complexos
    """

    def generate_pdf(
        self,
        emission: Emission,
        output_path: str,
        template_body: str,
        context: Dict,
        header_template: Optional[str] = None,
        footer_template: Optional[str] = None,
        logo_path: Optional[str] = None
    ) -> str:
        """
        Gera PDF a partir de templates HTML

        Args:
            emission: Objeto Emission
            output_path: Caminho do ficheiro PDF
            template_body: Template Jinja2 do corpo (HTML)
            context: Dicionário com variáveis
            header_template: Template opcional para header (HTML)
            footer_template: Template opcional para footer (HTML)
            logo_path: Caminho relativo do logo

        Returns:
            str: Caminho do ficheiro gerado
        """
        # Criar diretório se não existir
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Render templates Jinja2
        rendered_body = TemplateService.render_template(template_body, context)
        rendered_header = TemplateService.render_template(header_template, context) if header_template else ""
        rendered_footer = TemplateService.render_template(footer_template, context) if footer_template else ""

        # Obter caminho completo do logo
        logo_full_path = self._get_logo_path(logo_path)

        # Construir HTML completo
        html_content = self._build_html_document(
            rendered_header,
            rendered_body,
            rendered_footer,
            emission,
            logo_full_path
        )

        # Gerar PDF com xhtml2pdf
        try:
            with open(output_path, "wb") as pdf_file:
                pisa_status = pisa.CreatePDF(
                    html_content,
                    dest=pdf_file
                )

            if pisa_status.err:
                raise Exception(f"Erro ao gerar PDF: {pisa_status.err}")

            logger.info(f"PDF gerado com sucesso: {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Erro ao gerar PDF com xhtml2pdf: {e}", exc_info=True)
            raise

    def _get_logo_path(self, logo_path: Optional[str]) -> Optional[str]:
        """Obtém caminho completo do logo"""
        if not logo_path:
            return None

        logos_dir = current_app.config.get('LOGOS_DIR', '')
        full_path = os.path.join(logos_dir, logo_path)

        if os.path.exists(full_path):
            return full_path

        logger.warning(f"Logo não encontrado: {full_path}")
        return None

    def _build_html_document(
        self,
        header_html: str,
        body_html: str,
        footer_html: str,
        emission: Emission,
        logo_path: Optional[str]
    ) -> str:
        """Constrói documento HTML completo"""

        # Inserir logo no header se existir
        logo_html = ""
        if logo_path:
            # Converter caminho para formato correto para xhtml2pdf
            logo_html = f'<img src="{logo_path}" style="max-width: 6cm; max-height: 4cm;" />'

        # Badge do tipo de documento
        doc_type_name = emission.document_type.name if emission.document_type else "Documento"

        # Incluir CSS inline
        css = self._get_css_styles()

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{doc_type_name} - {emission.emission_number}</title>
    <style>
        {css}
    </style>
</head>
<body>
    <div class="page">
        <!-- HEADER -->
        <div class="header">
            <table class="header-table">
                <tr>
                    <td class="logo-cell">
                        {logo_html}
                    </td>
                    <td class="badge-cell">
                        <div class="document-badge">
                            <strong>{doc_type_name.upper()}</strong>
                        </div>
                    </td>
                </tr>
            </table>

            <div class="header-content">
                {header_html}
            </div>
        </div>

        <!-- BODY -->
        <div class="body-content">
            {body_html}
        </div>

        <!-- FOOTER -->
        <div class="footer-content">
            {footer_html}
        </div>
    </div>
</body>
</html>
"""
        return html

    def _get_css_styles(self) -> str:
        """Retorna CSS para formatação do PDF"""
        return """
            @page {
                size: A4;
                margin: 2.5cm 2cm 2cm 2cm;
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Calibri', 'Arial', sans-serif;
                font-size: 11pt;
                line-height: 1.5;
                color: #000;
            }

            .page {
                width: 100%;
            }

            /* HEADER */
            .header {
                margin-bottom: 25px;
            }

            .header-table {
                width: 100%;
                margin-bottom: 15px;
                border-collapse: collapse;
            }

            .logo-cell {
                width: 40%;
                vertical-align: middle;
                padding-right: 10px;
            }

            .logo-cell img {
                max-width: 5cm;
                max-height: 3cm;
                height: auto;
            }

            .badge-cell {
                width: 60%;
                text-align: right;
                vertical-align: middle;
            }

            .document-badge {
                display: inline-block;
                background-color: #0066cc;
                color: white;
                padding: 6px 16px;
                font-size: 9pt;
                font-weight: bold;
                text-align: center;
                border-radius: 3px;
            }

            .header-content {
                margin-top: 15px;
            }

            .header-content table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 10px;
            }

            .header-content table td {
                padding: 5px 8px;
                border: 1px solid #000;
                font-size: 10pt;
                vertical-align: top;
            }

            .header-content table th {
                padding: 5px 8px;
                border: 1px solid #000;
                background-color: #f0f0f0;
                font-weight: bold;
                font-size: 10pt;
                text-align: left;
            }

            .header-content .label {
                font-weight: bold;
                width: 30%;
            }

            /* BODY */
            .body-content {
                margin-top: 25px;
                margin-bottom: 25px;
            }

            .body-content p {
                text-align: justify;
                margin-bottom: 10pt;
                line-height: 1.6;
                hyphens: auto;
                -webkit-hyphens: auto;
                -moz-hyphens: auto;
                -ms-hyphens: auto;
            }

            .body-content p:first-of-type {
                text-indent: 0;
            }

            .body-content b,
            .body-content strong {
                font-weight: bold;
            }

            .body-content i,
            .body-content em {
                font-style: italic;
            }

            .body-content ul,
            .body-content ol {
                margin-left: 20px;
                margin-bottom: 10pt;
            }

            .body-content li {
                margin-bottom: 5pt;
            }

            /* FOOTER */
            .footer-content {
                margin-top: 40px;
                page-break-inside: avoid;
            }

            .footer-content table {
                width: 100%;
                border-collapse: collapse;
            }

            .footer-content td {
                text-align: center;
                vertical-align: top;
                padding: 5px 15px;
            }

            .footer-content .signature-block {
                padding-top: 30px;
            }

            .footer-content .signature-line {
                margin-top: 50px;
                margin-bottom: 5px;
                border-top: 1px solid #000;
                width: 180px;
                display: inline-block;
            }

            .footer-content .signature-name {
                font-size: 10pt;
                font-weight: bold;
            }

            .footer-content .signature-title {
                font-size: 9pt;
                color: #333;
            }

            .footer-content .footer-info {
                margin-top: 35px;
                padding-top: 10px;
                border-top: 1px solid #999;
                font-size: 8pt;
                color: #666;
                text-align: center;
                line-height: 1.3;
            }

            /* REFERÊNCIAS */
            .references {
                margin-bottom: 20px;
            }

            .references table {
                width: 100%;
                border-collapse: collapse;
            }

            .references td {
                padding: 4px 8px;
                border: 1px solid #000;
                font-size: 10pt;
            }

            .references .ref-label {
                font-weight: bold;
                width: 25%;
                background-color: #f5f5f5;
            }
        """


# Criar instância global
html_pdf_generator = HTMLPDFGenerator()
