from flask import current_app, send_file
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image,
    KeepTogether, PageBreak, Frame, NextPageTemplate, BaseDocTemplate,
    PageTemplate  # Adicionado PageTemplate aqui
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
# Adicionado importação específica do Frame
from reportlab.platypus.frames import Frame
# Importações específicas
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
import os
from pydantic import BaseModel, Field, field_validator
from abc import ABC, abstractmethod
from typing import Dict, List, Tuple, Optional, Any


class BaseLetterTemplate(BaseDocTemplate):
    """Template base para ofícios com elementos comuns"""

    def __init__(self, filename: str, **kwargs):
        super().__init__(filename, pagesize=A4)
        self.allowSplitting = 0
        self.page_width, self.page_height = A4
        self.has_custom_font = False
        self._setup_fonts()
        self.data = {}
        self.version = '1.0'
        self._setup_document()

    def _setup_document(self):
        """Configura o documento com frame principal"""
        # Frame principal começa abaixo do espaço reservado para o logo
        content_frame = Frame(
            x1=2*cm,                    # Margem esquerda
            y1=2*cm,                    # Margem inferior
            width=self.page_width-4*cm,   # Largura útil
            height=self.page_height-5*cm,  # Altura útil
            id='normal'
        )

        template = PageTemplate(
            id='main_template',
            frames=[content_frame],
            onPage=self._draw_fixed_elements
        )

        self.addPageTemplates([template])
    
    def build_letter(self, story: List, data: Dict, version: str = "1.0") -> None:
        """Constrói o documento com todos os elementos."""
        self.data = data
        # Remove o 'v' da versão se existir
        self.version = data.get('VS_M', version).replace('v', '') if data.get(
            'VS_M', version).startswith('v') else data.get('VS_M', version)
        self.build(story)

    def _draw_header(self, canvas, doc):
        """Desenha o logo no cabeçalho de todas as páginas preservando a transparência"""
        canvas.saveState()

        # # Configurar transparência
        # canvas.setFillAlpha(0.4)  # 60% de opacidade
        # canvas.setStrokeAlpha(0.4)  # 60% de opacidade

        # Logo à esquerda no topo
        logo_path = os.path.join(os.path.dirname(
            os.path.dirname(__file__)), 'utils', 'logo_aintar.png')
        if os.path.exists(logo_path):
            # Posição Y fixada no topo da página
            y_position = doc.pagesize[1] - 6*cm
            # Usando mask='auto' para preservar a transparência
            canvas.drawImage(
                logo_path,
                2.5*cm,         # x - margem esquerda
                y_position,     # y - topo menos margem
                width=6*cm,     # largura do logo
                height=4.5*cm,    # altura do logo
                mask='auto',     # Preserva a transparência
                preserveAspectRatio=True
            )

        canvas.restoreState()

    def _draw_fixed_elements(self, canvas, doc):
        """Desenha elementos fixos em cada página (header e footer)"""
        self._draw_header(canvas, doc)
        self._draw_footer(canvas, doc)

    def _get_font_name(self, is_bold=False):
        """Retorna o nome da fonte apropriada"""
        if self.has_custom_font:
            return 'Calibri-Bold' if is_bold else 'Calibri'
        return 'Helvetica-Bold' if is_bold else 'Helvetica'

    def _setup_fonts(self):
        """Configura as fontes do documento"""
        # Define fonte base (Calibri ou Helvetica)
        windows_fonts_path = os.path.join(os.environ['WINDIR'], 'Fonts')
        calibri_path = os.path.join(windows_fonts_path, 'calibri.ttf')
        calibri_bold_path = os.path.join(windows_fonts_path, 'calibrib.ttf')

        try:
            if os.path.exists(calibri_path) and os.path.exists(calibri_bold_path):
                pdfmetrics.registerFont(TTFont('Calibri', calibri_path))
                pdfmetrics.registerFont(
                    TTFont('Calibri-Bold', calibri_bold_path))
                self.has_custom_font = True
            else:
                self.has_custom_font = False
        except:
            self.has_custom_font = False

    def _draw_footer(self, canvas, doc):
        """Desenha o rodapé com informações fixas e paginação em linha separada"""
        canvas.saveState()

        # # Configurar transparência
        # canvas.setFillAlpha(0.4)  # 60% de opacidade
        # canvas.setStrokeAlpha(0.4)  # 60% de opacidade

        # Linha separadora
        canvas.setStrokeColor(colors.HexColor('#004A8F'))
        canvas.setLineWidth(0.5)
        canvas.line(2*cm, 2.1*cm, doc.pagesize[0]-2*cm, 2.1*cm)

        # Ajustes de fonte e cor
        font_name = self._get_font_name()
        canvas.setFont(font_name, 8)
        canvas.setFillColor(colors.HexColor('#007CA8'))

        # Dados da esquerda
        left_text = [
            "Associação de Municípios para o",
            "Sistema Intermunicipal de Águas Residuais",
            "NIPC 516.132.822"
        ]
        y = 1.8*cm  # Ajustado para cima para dar espaço à linha de página/versão
        for line in left_text:
            canvas.drawString(2*cm, y, line)
            y -= 3.5*mm

        # Dados da direita
        right_text = [
            "Praça do Município",
            "3430-167 Carregal do Sal",
            "geral@aintar.pt"
        ]
        y = 1.8*cm  # Ajustado para cima para dar espaço à linha de página/versão
        for line in right_text:
            canvas.drawRightString(doc.pagesize[0]-2*cm, y, line)
            y -= 3.5*mm

        # Versão e página em linha separada, alinhada à direita
        version = self.version.replace(
            'v', '') if self.version.startswith('v') else self.version
        page_info = f"Página {doc.page} de {self._pageCount}  |  {version}"
        canvas.drawRightString(doc.pagesize[0]-2*cm, 0.7*cm, page_info)

        canvas.restoreState()


class LetterDocument:
    """Classe para construção do conteúdo do ofício"""

    def __init__(self, template: BaseLetterTemplate):
        self.template = template
        self.styles = self._create_styles()

    def create_content(self, data: Dict) -> List:
        """Cria o conteúdo do ofício baseado nos dados fornecidos"""
        story = []
        story.extend(self._create_recipient_section(data))
        story.extend(self._create_reference_section(data))
        story.extend(self._create_subject_section(data))
        story.extend(self._create_body_section(data))
        story.extend(self._create_signature_section(data))
        return story

    def _create_recipient_section(self, data: Dict) -> List:
        """Cria seção do destinatário"""
        return [
            Paragraph("Ex.mo(a) Senhor(a)", self.styles['RecipientHeader']),
            Paragraph(data.get('NOME', ''), self.styles['RecipientHeader']),
            Paragraph(f"{data.get('MORADA', '')}, {data.get('PORTA', '')}",
                      self.styles['RecipientHeader']),
            Paragraph(f"{data.get('CODIGO_POSTAL', '')} {data.get('LOCALIDADE', '')}",
                      self.styles['RecipientHeader']),
        ]

    def _create_reference_section(self, data: Dict) -> List:
        """Cria seção de referências com espaçamento adequado"""
        elements = []
        
        # Espaço após o destinatário
        elements.append(Spacer(1, 2*cm))
        
        # Criar e adicionar a tabela de referências
        table = self._create_reference_table(data)
        elements.append(table)
        
        # Espaço após a tabela
        elements.append(Spacer(1, 1*cm))
        
        return elements

    def _create_subject_section(self, data: Dict) -> List:
        """Cria seção do assunto"""
        return [
            Paragraph(data.get('SUBJECT', 'Assunto: Autorização de Ligação'), self.styles['Subject']),
            Spacer(1, 0.5*cm)
        ]

    def _create_body_section(self, data: Dict) -> List:
        """Cria seção do corpo do ofício"""
        elements = [
            Paragraph("Ex.mo(a). Senhor(a),", self.styles['BodyLeft']),
            Spacer(1, 0.5*cm),
            Paragraph(data.get('BODY', ''), self.styles['Body'])
        ]

        # Texto padrão se não for ofício livre
        if not data.get('is_free_letter'):
            elements.extend(self._create_standard_text())

        return elements

    def _create_signature_section(self, data: Dict) -> List:
        """Cria seção da assinatura"""
        return [
            Spacer(1, 0.5*cm),
            Paragraph("Com os melhores cumprimentos,", self.styles['BodyLeft']),
            Spacer(1, 1.5*cm),
            Paragraph(data.get('SIGNATURE_TITLE', 'O Presidente da Direção,'), self.styles['BodyCenter']),
            Spacer(1, 1*cm),
            Paragraph("_" * 35, self.styles['BodyCenter']),
            Paragraph(data.get('SIGNATURE_NAME', 'Paulo Jorge Catalino de Almeida Ferraz'), self.styles['BodyCenter'])
        ]

    def _create_styles(self) -> Dict[str, ParagraphStyle]:
        styles = getSampleStyleSheet()
        base_font = self.template._get_font_name()
        bold_font = self.template._get_font_name(is_bold=True)

        custom_styles = {
            'RecipientHeader': ParagraphStyle(  # Novo estilo específico para o destinatário
                'RecipientHeader',
                parent=styles['Normal'],
                fontName=base_font,
                fontSize=11,
                leading=16,
                leftIndent=9*cm,  # Indentação para alinhar à direita do logo
                rightIndent=0,  # Margem direita
                spaceAfter=1*mm,  # Espaçamento menor entre linhas
                spaceBefore=0,
                wordWrap='LTR',
                alignment=TA_LEFT  # Alinhamento à esquerda para usar todo espaço
            ),
            'HeaderBold': ParagraphStyle(
                'HeaderBold',
                parent=styles['Normal'],
                fontName=bold_font,
                fontSize=11,
                leading=14,
                spaceAfter=4*mm
            ),
            'Body': ParagraphStyle(
                'Body',
                parent=styles['Normal'],
                fontName=base_font,
                fontSize=11,
                leading=14,
                alignment=TA_JUSTIFY,
                firstLineIndent=1*cm,  # Indentação da primeira linha (tab)
                spaceAfter=4*mm
            ),
            'BodyLeft': ParagraphStyle(
                'BodyLeft',
                parent=styles['Normal'],
                fontName=base_font,
                fontSize=11,
                leading=14,
                alignment=TA_LEFT,
                firstLineIndent=1*cm,  # Indentação da primeira linha (tab)
                spaceAfter=2*mm
            ),
            'BodyCenter': ParagraphStyle(  # Adicionado o estilo que estava faltando
                'BodyCenter',
                parent=styles['Normal'],
                fontName=base_font,
                fontSize=11,
                leading=14,
                alignment=TA_CENTER,
                firstLineIndent=1*cm,  # Indentação da primeira linha (tab)
                spaceAfter=2*mm
            ),
            'Subject': ParagraphStyle(  # Adicionado estilo específico para o assunto
                'Subject',
                parent=styles['Normal'],
                fontName=bold_font,
                fontSize=11,
                leading=14,
                alignment=TA_LEFT,
                spaceAfter=4*mm
            )
        }
        return custom_styles

    def _create_reference_table(self, data: Dict) -> Table:
        """Cria a tabela de referências sem bordas"""
        table_data = [
            ['Sua referência:', 'Sua comunicação:', 'Nossa Referência:', f"Data: {data.get('DATA', '')}"],
            ['', '', data.get('NUMERO_PEDIDO', ''), f"Ofício nº {data.get('NUMERO_OFICIO', '')}"], ['', '', f"Datado de:\n{data.get('DATA_PEDIDO', '')}", '']
        ]

        table = Table(table_data, colWidths=[4*cm, 4*cm, 4*cm, 4*cm])

        # Estilo sem bordas
        table.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), self.styles['Body'].fontName),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 1*mm),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1*mm),
            ('LEFTPADDING', (0, 0), (-1, -1), 1*mm),
            ('RIGHTPADDING', (0, 0), (-1, -1), 1*mm)
        ]))
        return table

    def _create_standard_text(self) -> List:
        """Cria o texto padrão para ofícios não-livres"""
        return [
            Paragraph(
                "\tPor conseguinte, uma vez que se encontra autorizada por esta Entidade, "
                "deverá V. Exa. diligenciar a ligação à caixa de ramal domiciliário.",
                self.styles['Body']
            ),
            Paragraph(
                "\tMais se informa, que face ao exposto acima, esta Entidade solicitará à "
                "concessionária de abastecimento de água pública que a morada identificada "
                "passe a integrar a tarifa de saneamento, pelo que será cobrada a devida "
                "taxa na fatura da água.",
                self.styles['Body']
            )
        ]

# ===================================================================
# MODELOS DE DADOS COM PYDANTIC
# ===================================================================

class LetterContext(BaseModel):
    """Modelo Pydantic para validar o contexto de um ofício."""
    NOME: str
    MORADA: str
    PORTA: str
    CODIGO_POSTAL: str
    LOCALIDADE: str
    DATA: str
    NUMERO_PEDIDO: str
    NUMERO_OFICIO: str
    DATA_PEDIDO: str
    BODY: str
    VS_M: str = Field("v1.0", alias='version')
    is_free_letter: bool = False
    SUBJECT: str = "Assunto: Autorização de Ligação"
    SIGNATURE_TITLE: str = "O Presidente da Direção"
    SIGNATURE_NAME: str = "Paulo Jorge Catalino de Almeida Ferraz"

    @field_validator('DATA', 'DATA_PEDIDO', mode='before')
    def format_date(cls, v):
        if isinstance(v, datetime):
            return v.strftime('%Y-%m-%d')
        return v

class FileService:
    """Serviço para gerenciamento de arquivos e geração de documentos"""

    def __init__(self):
        self.base_path = current_app.config['FILES_DIR']

    def ensure_directories(self, regnumber=None):
        """Garante que as pastas necessárias existam"""
        letters_path = os.path.join(self.base_path, 'letters')
        os.makedirs(letters_path, exist_ok=True)

        if regnumber:
            request_path = os.path.join(self.base_path, str(regnumber))
            anexos_path = os.path.join(request_path, 'anexos')
            oficios_path = os.path.join(request_path, 'Oficios')

            os.makedirs(request_path, exist_ok=True)
            os.makedirs(anexos_path, exist_ok=True)
            os.makedirs(oficios_path, exist_ok=True)

            return {
                'request_path': request_path,
                'anexos_path': anexos_path,
                'oficios_path': oficios_path,
                'letters_path': letters_path
            }
        return {'letters_path': letters_path}

    def generate_letter(self, context: Dict, regnumber: str = None, document_number: str = None, is_free_letter: bool = False) -> Tuple[str, str]:
        """Gera um ofício usando o template base"""
        try:
            # 1. Validar e preparar o contexto com Pydantic
            # Adiciona o número do ofício ao contexto antes de validar
            context['NUMERO_OFICIO'] = document_number
            context['is_free_letter'] = is_free_letter
            
            validated_context = LetterContext.model_validate(context)
            # Converte o modelo Pydantic de volta para um dicionário para uso no template
            full_context = validated_context.model_dump(by_alias=True)

            # Definir nome e caminho do arquivo
            output_filename = f"OF-{document_number}.pdf"
            output_path = self._get_output_path(
                regnumber, output_filename, is_free_letter)

            # 2. Criar documento e conteúdo
            template = BaseLetterTemplate(output_path)
            letter = LetterDocument(template)
            elements = letter.create_content(full_context)

            # 3. Gerar PDF
            template.build_letter(
                elements, data=full_context, version=full_context.get('VS_M', 'v1.0'))

            return output_path, output_filename

        except Exception as e:
            current_app.logger.error(f"Erro ao gerar ofício: {str(e)}")
            raise

    def save_attachment(self, file, regnumber: str, filename: str, current_user) -> bool:
        """
        Salva um arquivo anexo
        
        Args:
            file: Arquivo a ser salvo
            regnumber: Número do registro
            filename: Nome do arquivo
            current_user: Usuário atual
            
        Returns:
            Boolean indicando sucesso da operação
        """
        paths = self.ensure_directories(regnumber)
        file_path = os.path.join(paths['anexos_path'], filename)

        try:
            file.save(file_path)
            return True
        except Exception as e:
            current_app.logger.error(f"Erro ao salvar anexo: {str(e)}")
            raise

    def download_file(self, regnumber: Optional[str], filename: str, current_user) -> Any:
        """
        Faz download de um arquivo
        
        Args:
            regnumber: Número do registro (opcional para ofícios livres)
            filename: Nome do arquivo
            current_user: Usuário atual
            
        Returns:
            Arquivo para download ou mensagem de erro
        """
        # 1. Tentar como ofício livre (sem regnumber)
        if not regnumber:
            file_path = os.path.join(self.base_path, 'letters', filename)
            if os.path.exists(file_path):
                return send_file(file_path, as_attachment=True)
            else:
                raise ResourceNotFoundError("Arquivo não encontrado.")

        # 2. Tentar como ficheiro de um pedido (com regnumber)
        paths = self.ensure_directories(regnumber)

        # Lista de pastas a verificar, por ordem de prioridade
        possible_locations = [
            os.path.join(paths['oficios_path'], filename),
            os.path.join(paths['anexos_path'], filename),
            os.path.join(paths['request_path'], filename) # Fallback para a raiz do pedido
        ]

        for file_path in possible_locations:
            if os.path.exists(file_path):
                return send_file(file_path, as_attachment=True)

        # 3. Se não for encontrado em lado nenhum
        current_app.logger.error(f"Arquivo não encontrado: reg: {regnumber}, file: {filename}")
        raise ResourceNotFoundError("Arquivo não encontrado.")

    def _get_output_path(self, regnumber: str, filename: str, is_free_letter: bool) -> str:
        """Determina o caminho de saída para o arquivo"""
        paths = self.ensure_directories(regnumber if not is_free_letter else None)
        return os.path.join(paths['oficios_path'] if not is_free_letter else paths['letters_path'], filename)
