# services/emissions/generator_service.py
# Gerador de PDFs para todos os tipos de emissões
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
import os
from typing import Dict, Optional
from app.utils.logger import get_logger
from app.services.template_service import TemplateService
from app.models.emission import DocumentType, EmissionTemplate, Emission

logger = get_logger(__name__)


class EmissionPDFGenerator:
    """
    Gerador de PDFs unificado para todos os tipos de emissões
    Suporta headers/footers personalizados por tipo
    """

    def __init__(self):
        self.page_width, self.page_height = A4
        self.has_custom_font = False
        self._setup_fonts()

    def _setup_fonts(self):
        """Registra fontes customizadas"""
        try:
            font_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'utils', 'fonts')

            calibri_path = os.path.join(font_dir, 'calibri.ttf')
            calibri_bold_path = os.path.join(font_dir, 'calibrib.ttf')

            if os.path.exists(calibri_path):
                pdfmetrics.registerFont(TTFont('Calibri', calibri_path))
                self.has_custom_font = True
                logger.info("Fonte Calibri carregada")

            if os.path.exists(calibri_bold_path):
                pdfmetrics.registerFont(TTFont('Calibri-Bold', calibri_bold_path))
                logger.info("Fonte Calibri-Bold carregada")

        except Exception as e:
            logger.warning(f"Erro ao carregar fontes custom: {e}. Usando Helvetica.")
            self.has_custom_font = False

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
        Gera PDF para uma emissão

        Args:
            emission: Objeto Emission
            output_path: Caminho do ficheiro PDF
            template_body: Template Jinja2 do corpo
            context: Dicionário com variáveis para render
            header_template: Template opcional para header
            footer_template: Template opcional para footer

        Returns:
            str: Caminho do ficheiro gerado
        """
        # Criar diretório se não existir
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # Render templates
        rendered_body = TemplateService.render_template(template_body, context)

        rendered_header = None
        if header_template:
            rendered_header = TemplateService.render_template(header_template, context)

        rendered_footer = None
        if footer_template:
            rendered_footer = TemplateService.render_template(footer_template, context)

        # Guardar logo_path e rendered_footer para usar em _draw_fixed_elements
        self.current_logo_path = logo_path
        self.current_rendered_footer = rendered_footer

        # Criar PDF com margem bottom maior se tiver footer fixo
        bottom_margin = 4*cm if rendered_footer else 2*cm

        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=5*cm,
            bottomMargin=bottom_margin
        )

        # Build story
        story = []
        styles = self._get_styles()

        # Header (se existe)
        if rendered_header:
            story.extend(self._build_header(rendered_header, styles, emission.document_type))

        # Número e data
        story.extend(self._build_metadata_section(emission, styles))

        # Corpo principal
        story.extend(self._build_body(rendered_body, styles))

        # Footer será desenhado como fixo em todas as páginas
        # Não adicionar ao story

        # Build PDF com elementos fixos (logo, footer)
        doc.build(
            story,
            onFirstPage=lambda canvas, doc: self._draw_fixed_elements(canvas, doc, emission),
            onLaterPages=lambda canvas, doc: self._draw_fixed_elements(canvas, doc, emission)
        )

        logger.info(f"PDF gerado: {output_path}")
        return output_path

    def _get_styles(self) -> Dict:
        """Retorna estilos de parágrafo"""
        base_font = 'Calibri' if self.has_custom_font else 'Helvetica'
        base_font_bold = 'Calibri-Bold' if self.has_custom_font else 'Helvetica-Bold'

        styles = getSampleStyleSheet()

        # Título
        styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=styles['Heading1'],
            fontName=base_font_bold,
            fontSize=16,
            textColor=colors.HexColor('#1976d2'),
            alignment=TA_CENTER,
            spaceAfter=12
        ))

        # Subtítulo
        styles.add(ParagraphStyle(
            name='CustomSubtitle',
            parent=styles['Heading2'],
            fontName=base_font_bold,
            fontSize=12,
            textColor=colors.HexColor('#424242'),
            spaceAfter=6
        ))

        # Corpo
        styles.add(ParagraphStyle(
            name='CustomBody',
            parent=styles['BodyText'],
            fontName=base_font,
            fontSize=11,
            leading=16,
            alignment=TA_JUSTIFY,
            spaceAfter=6
        ))

        # Metadados (número, data)
        styles.add(ParagraphStyle(
            name='Metadata',
            parent=styles['Normal'],
            fontName=base_font,
            fontSize=10,
            textColor=colors.HexColor('#757575'),
            alignment=TA_RIGHT
        ))

        return styles

    def _build_header(self, header_html: str, styles: Dict, doc_type: DocumentType) -> list:
        """Constrói header customizado: logo à esquerda, dados do destinatário à direita"""
        elements = []
        import re

        from flask import current_app

        # Logo (coluna esquerda)
        logo_path = self._get_logo_path()
        if logo_path and os.path.exists(logo_path):
            try:
                logo_img = Image(logo_path, width=5*cm, height=3.5*cm)
                logo_cell = logo_img
            except Exception as e:
                logger.warning(f"Erro ao carregar logo: {e}")
                logo_cell = Paragraph("", styles['CustomBody'])
        else:
            logo_cell = Paragraph("", styles['CustomBody'])

        # Dados do destinatário (coluna direita)
        recipient_elements = []
        if header_html and header_html.strip():
            # Se o template contém uma tabela com 2 colunas (50%-50%),
            # extrair apenas o conteúdo da segunda coluna
            td_pattern = r'<td[^>]*>(.*?)</td>'
            td_matches = re.findall(td_pattern, header_html, flags=re.IGNORECASE | re.DOTALL)

            # Se encontrou 2 <td>, pegar o segundo (coluna direita)
            if len(td_matches) >= 2:
                content_html = td_matches[1]  # Segunda coluna
            elif len(td_matches) == 1:
                content_html = td_matches[0]  # Só tem uma coluna
            else:
                # Não tem tabela, usar todo o conteúdo
                content_html = header_html

            # Processar o conteúdo extraído
            # Extrair tags <p> individuais para manter a formatação
            p_pattern = r'<p[^>]*>(.*?)</p>'
            p_matches = re.findall(p_pattern, content_html, flags=re.IGNORECASE | re.DOTALL)

            if p_matches:
                # Processar cada parágrafo
                for p_content in p_matches:
                    p_content = p_content.strip()
                    if p_content:
                        # ReportLab's Paragraph pode lidar com tags HTML básicas como <b>, <i>, <sup>, etc.
                        recipient_para = Paragraph(p_content, styles['CustomBody'])
                        recipient_elements.append(recipient_para)
                        recipient_elements.append(Spacer(1, 0.1*cm))
            else:
                # Fallback: split por <br/> se não houver tags <p>
                lines = content_html.split('<br/>')
                for line in lines:
                    line = line.strip()
                    if line:
                        recipient_para = Paragraph(line, styles['CustomBody'])
                        recipient_elements.append(recipient_para)
                        recipient_elements.append(Spacer(1, 0.1*cm))

        # Se não houver dados do destinatário, criar célula vazia
        if not recipient_elements:
            recipient_cell = Paragraph("", styles['CustomBody'])
        else:
            # Criar tabela interna para os dados do destinatário
            recipient_table_data = [[elem] for elem in recipient_elements]
            recipient_cell = Table(recipient_table_data, colWidths=[11*cm])
            recipient_cell.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ]))

        # Criar tabela principal: logo à esquerda, dados à direita
        header_data = [[logo_cell, recipient_cell]]
        header_table = Table(header_data, colWidths=[6*cm, 11*cm])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),      # Logo alinhada à esquerda
            ('ALIGN', (1, 0), (1, 0), 'LEFT'),      # Dados alinhados à esquerda
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),    # Tudo alinhado ao topo
            ('LEFTPADDING', (0, 0), (-1, -1), 0),   # Sem padding
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            # SEM BORDAS
        ]))

        elements.append(header_table)
        elements.append(Spacer(1, 0.5*cm))

        return elements

    def _get_logo_path(self) -> Optional[str]:
        """Obtém caminho do logo configurado"""
        from flask import current_app

        # Usar logo_path específico se definido
        if hasattr(self, 'current_logo_path') and self.current_logo_path:
            logos_dir = current_app.config.get('LOGOS_DIR', os.path.dirname(os.path.dirname(__file__)))
            logo_path = os.path.join(logos_dir, self.current_logo_path)
            if os.path.exists(logo_path):
                return logo_path

        # Fallback para logo padrão
        # __file__ = backend/app/services/emissions/generator_service.py
        # Precisamos ir até backend/app/ (3 níveis acima) e depois utils/
        default_logo = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),  # backend/app/
            'utils',
            'logo_aintar.png'
        )

        if os.path.exists(default_logo):
            return default_logo

        return None

    def _build_metadata_section(self, emission: Emission, styles: Dict) -> list:
        """Constrói seção de metadados (número, data)"""
        elements = []

        # Número da emissão
        number_para = Paragraph(
            f'<b>Nº:</b> {emission.emission_number}',
            styles['Metadata']
        )
        elements.append(number_para)

        # Data
        date_str = emission.emission_date.strftime('%d de %B de %Y')
        date_para = Paragraph(
            f'<b>Data:</b> {date_str}',
            styles['Metadata']
        )
        elements.append(date_para)

        elements.append(Spacer(1, 0.8*cm))

        return elements

    def _build_body(self, body_html: str, styles: Dict) -> list:
        """Constrói corpo do documento"""
        elements = []

        # Criar estilo justificado para o corpo
        justified_style = ParagraphStyle(
            'Justified',
            parent=styles['CustomBody'],
            alignment=TA_JUSTIFY,
            firstLineIndent=0,
            spaceBefore=6,
            spaceAfter=6
        )

        # Split por <br/> para respeitar quebras de linha
        paragraphs = body_html.split('<br/>')

        for para_text in paragraphs:
            para_text = para_text.strip()
            if para_text:
                # Se o parágrafo tiver apenas uma linha (como saudações), não justificar
                if len(para_text) < 30:
                    para = Paragraph(para_text, styles['CustomBody'])
                else:
                    para = Paragraph(para_text, justified_style)

                elements.append(para)
                elements.append(Spacer(1, 0.15*cm))

        return elements

    def _build_footer(self, footer_html: str, styles: Dict) -> list:
        """Constrói footer customizado"""
        elements = []

        elements.append(Spacer(1, 1*cm))

        # Footer content - processar por linhas
        if footer_html and footer_html.strip():
            # Criar estilo para rodapé
            footer_style = ParagraphStyle(
                'Footer',
                parent=styles['CustomBody'],
                alignment=TA_CENTER,
                fontSize=9
            )

            lines = footer_html.split('<br/>')
            for line in lines:
                line = line.strip()
                if line:
                    footer_para = Paragraph(line, footer_style)
                    elements.append(footer_para)

        return elements

    def _draw_fixed_elements(self, canvas_obj, doc, emission: Emission):
        """Desenha elementos fixos em todas as páginas (footer apenas - logo está no header do story)"""
        canvas_obj.saveState()

        # NOTA: Logo é adicionado via _build_header no story, não aqui
        # Isso permite que o logo seja parte do fluxo de conteúdo e alinhado com os dados do destinatário

        # Footer fixo (se existe template)
        if hasattr(self, 'current_rendered_footer') and self.current_rendered_footer:
            # Linha separadora do footer
            canvas_obj.setStrokeColor(colors.black)
            canvas_obj.setLineWidth(0.5)
            canvas_obj.line(2*cm, 3.5*cm, self.page_width - 2*cm, 3.5*cm)

            # Footer em duas colunas
            canvas_obj.setFont('Helvetica', 9)
            canvas_obj.setFillColor(colors.HexColor('#666666'))

            # Coluna esquerda - Dados da entidade
            y_position = 3*cm
            canvas_obj.drawString(2*cm, y_position, 'Associação de Municípios para o')
            y_position -= 0.4*cm
            canvas_obj.drawString(2*cm, y_position, 'Sistema Intermunicipal de Águas Residuais')
            y_position -= 0.4*cm
            canvas_obj.drawString(2*cm, y_position, 'NIPC 516.132.822')

            # Coluna direita - Morada (alinhado à esquerda)
            y_position = 3*cm
            x_right_column = self.page_width / 2 + 0.5*cm
            canvas_obj.drawString(x_right_column, y_position, 'Praça do Município')
            y_position -= 0.4*cm
            canvas_obj.drawString(x_right_column, y_position, '3430-167 Carregal do Sal')
            y_position -= 0.4*cm
            canvas_obj.drawString(x_right_column, y_position, 'geral@aintar.pt')

            # Paginação e versão (alinhado à direita)
            y_position -= 0.6*cm
            page_info = f'Página {doc.page}'
            canvas_obj.drawRightString(self.page_width - 2*cm, y_position, page_info)
            y_position -= 0.4*cm
            canvas_obj.drawRightString(self.page_width - 2*cm, y_position, 'AINTAR_MIN_04a_v2')
        else:
            # Footer simples sem template
            canvas_obj.setFont('Helvetica', 9)
            canvas_obj.setFillColor(colors.grey)

            footer_text = f'{emission.document_type.name} - Página {doc.page}'
            canvas_obj.drawRightString(
                self.page_width - 2*cm,
                1.5*cm,
                footer_text
            )

            # Linha no rodapé
            canvas_obj.setStrokeColor(colors.lightgrey)
            canvas_obj.setLineWidth(0.5)
            canvas_obj.line(2*cm, 2*cm, self.page_width - 2*cm, 2*cm)

        canvas_obj.restoreState()

    def _get_type_color(self, type_code: str) -> colors.Color:
        """Retorna cor por tipo de documento"""
        color_map = {
            'OFI': colors.HexColor('#1976d2'),  # Azul
            'NOT': colors.HexColor('#ed6c02'),  # Laranja
            'DEC': colors.HexColor('#2e7d32'),  # Verde
            'INF': colors.HexColor('#0288d1'),  # Ciano
            'DEL': colors.HexColor('#9c27b0')   # Roxo
        }
        return color_map.get(type_code, colors.grey)


# Instância singleton
pdf_generator = EmissionPDFGenerator()


def generate_emission_pdf(
    emission: Emission,
    template: EmissionTemplate,
    context: Dict,
    output_dir: str = 'temp'
) -> str:
    """
    Função helper para gerar PDF de emissão

    Args:
        emission: Objeto Emission
        template: Template usado
        context: Variáveis para render
        output_dir: Diretório de output

    Returns:
        str: Caminho do PDF gerado
    """
    # Criar nome de ficheiro
    safe_number = emission.emission_number.replace('/', '_').replace('-', '_')
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    filename = f'{safe_number}_{timestamp}.pdf'

    # Caminho completo
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    output_path = os.path.join(base_dir, output_dir, filename)

    # Gerar PDF
    return pdf_generator.generate_pdf(
        emission=emission,
        output_path=output_path,
        template_body=template.body,
        context=context,
        header_template=template.header_template,
        footer_template=template.footer_template
    )
