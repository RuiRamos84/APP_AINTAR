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
        self._setup_document()
        self.page_count = 1
        self.current_page = 1
        self.data = {}
        self.version = '1.0'

    def afterPage(self):
        """Chamado após cada página ser gerada"""
        self.current_page += 1
        self.page_count = max(self.page_count, self.current_page)

    def beforeDocument(self):
        """Chamado antes de começar a construir o documento"""
        self.current_page = 1
        self.page_count = 1

    def beforePage(self):
        """Chamado antes de cada página ser gerada"""
        self.current_page += 1

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
        self.current_page = 1
        self.page_count = 1
        self.build(story)

    def afterFlowable(self, flowable):
        """
        Chamado após cada flowable ser adicionado.
        Atualiza a contagem de páginas.
        """
        page_count = getattr(flowable, 'pageCount', None)
        if page_count is not None:
            self.page_count = max(self.page_count, page_count)

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
        page_info = f"Página {self.current_page} de {self.page_count}  |  {version}"
        canvas.drawRightString(doc.pagesize[0]-2*cm, 0.7*cm, page_info)

        canvas.restoreState()


class LetterDocument:
    """Classe para construção do conteúdo do ofício"""

    def __init__(self, template: BaseLetterTemplate):
        self.template = template
        self.styles = self._create_styles()

    def create_content(self, data: Dict) -> List:
        """Cria o conteúdo do ofício baseado nos dados fornecidos"""
        elements = []

        # Destinatário alinhado à direita no nível do logo
        elements.extend([
            Paragraph("Ex.mo(a) Senhor(a)", self.styles['RecipientHeader']),
            Paragraph(data.get('NOME', ''), self.styles['RecipientHeader']),
            Paragraph(f"{data.get('MORADA', '')}, {data.get('PORTA', '')}", self.styles['RecipientHeader']),
            Paragraph(f"{data.get('CODIGO_POSTAL', '')} {data.get('LOCALIDADE', '')}", self.styles['RecipientHeader']),
        ])

        # Espaço após o cabeçalho
        elements.append(Spacer(1, 2*cm))

        # Tabela de referências sem bordas
        table = self._create_reference_table(data)
        elements.append(table)
        elements.append(Spacer(1, 1*cm))

        # Assunto em negrito
        elements.append(Paragraph("Assunto: Autorização de Ligação", self.styles['Subject']))
        elements.append(Spacer(1, 0.5*cm))

        # Corpo do ofício
        elements.extend([
            Paragraph("Ex.mo(a). Senhor(a),", self.styles['BodyLeft']),
            Spacer(1, 0.5*cm),
            Paragraph(data.get('BODY', ''), self.styles['Body'])
        ])

        # Texto padrão se não for ofício livre
        if not data.get('is_free_letter'):
            elements.extend(self._create_standard_text())

        # Assinatura
        elements.extend([
            Spacer(1, 0.5*cm),
            Paragraph("Com os melhores cumprimentos,",
                    self.styles['BodyLeft']),
            Spacer(1, 1.5*cm),
            Paragraph("O Presidente da Direção,", self.styles['BodyCenter']),
            Spacer(1, 1*cm),
            Paragraph("_" * 35, self.styles['BodyCenter']),
            Paragraph("Paulo Jorge Catalino de Almeida Ferraz", self.styles['BodyCenter'])
        ])

        return elements

    def _create_recipient_section(self, data: Dict) -> List:
        """Cria seção do destinatário"""
        return [
            Paragraph("Ex.mo(a) Senhor(a)", self.styles['Recipient']),
            Paragraph(data.get('NOME', ''), self.styles['Recipient']),
            Paragraph(f"{data.get('MORADA', '')}, {data.get('PORTA', '')}", self.styles['Recipient']),
            Paragraph(f"{data.get('CODIGO_POSTAL', '')} {data.get('LOCALIDADE', '')}", self.styles['Recipient']),
            Spacer(1, 20*mm)
        ]

    def _create_reference_section(self, data: Dict) -> List:
        """Cria seção de referências com espaçamento adequado"""
        elements = []
        
        # Adicionar espaço após o cabeçalho
        elements.append(Spacer(1, 4*cm))
        
        # Criar e adicionar a tabela de referências
        table = self._create_reference_table(data)
        elements.append(table)
        
        # Espaço após a tabela
        elements.append(Spacer(1, 1*cm))
        
        return elements

    def _create_subject_section(self, data: Dict) -> List:
        """Cria seção do assunto"""
        return [
            Paragraph(data.get('SUBJECT', 'Assunto: Autorização de Ligação'), self.styles['HeaderBold']),
            Spacer(1, 5*mm)
        ]

    def _create_body_section(self, data: Dict) -> List:
        """Cria seção do corpo do ofício"""
        elements = [
            Paragraph("Ex.mo(a). Senhor(a),", self.styles['BodyLeft']),
            Spacer(1, 5*mm),
            Paragraph(data.get('BODY', ''), self.styles['Body'])
        ]

        # Texto padrão se não for ofício livre
        if not data.get('is_free_letter'):
            elements.extend(self._create_standard_text())

        return elements

    def _create_signature_section(self, data: Dict) -> List:
        """Cria seção da assinatura"""
        return [
            Spacer(1, 15*mm),
            Paragraph("Com os melhores cumprimentos,", self.styles['BodyLeft']),
            Paragraph(data.get('SIGNATURE_TITLE', 'O Presidente da Direção'), self.styles['BodyLeft']),
            Spacer(1, 25*mm),
            Paragraph("_" * 35, self.styles['BodyCenter']),
            Paragraph(data.get('SIGNATURE_NAME', 'Paulo Jorge Catalino de Almeida Ferraz'), self.styles['BodyLeft'])
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
            # Definir nome e caminho do arquivo
            output_filename = f"OF-{document_number}.pdf"
            output_path = self._get_output_path(
                regnumber, output_filename, is_free_letter)

            # Criar documento
            template = BaseLetterTemplate(output_path)
            letter = LetterDocument(template)

            # Preparar contexto completo
            full_context = self._prepare_context(context, document_number)

            # Criar conteúdo
            elements = letter.create_content(full_context)

            # Gerar PDF (inclua o argumento `data=full_context`)
            template.build_letter(
                elements, data=full_context, version=context.get('VS_M', 'v1.0'))

            return output_path, output_filename

        except Exception as e:
            current_app.logger.error(f"Erro ao gerar ofício: {str(e)}")
            raise

    def _prepare_context(self, context: Dict, document_number: str) -> Dict:
        """
        Prepara o contexto completo para geração do documento
        
        Args:
            context: Contexto original
            document_number: Número do documento
            
        Returns:
            Contexto enriquecido com dados adicionais
        """
        # Criar uma cópia do contexto para não modificar o original
        full_context = context.copy()

        # Adicionar dados padrão se não existirem
        defaults = {
            'SUBJECT': 'Assunto: Autorização de Ligação',
            'SIGNATURE_NAME': 'Paulo Jorge Catalino de Almeida Ferraz',
            'NUMERO_OFICIO': document_number,
            # Adicionar outros dados padrão conforme necessário
        }

        for key, value in defaults.items():
            if key not in full_context:
                full_context[key] = value

        return full_context

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
            return False

    def download_file(self, regnumber: str, filename: str, current_user) -> Any:
        """
        Faz download de um arquivo
        
        Args:
            regnumber: Número do registro
            filename: Nome do arquivo
            current_user: Usuário atual
            
        Returns:
            Arquivo para download ou mensagem de erro
        """
        try:
            # Verificar ofício livre
            if not regnumber and (filename.startswith('OF-') or filename.startswith('oficio_')):
                file_path = os.path.join(self.base_path, 'letters', filename)
                if os.path.exists(file_path):
                    return send_file(file_path, as_attachment=True)

            # Verificar nas pastas do pedido
            if regnumber:
                paths = self.ensure_directories(regnumber)

                # Tentar na pasta de ofícios
                oficio_path = os.path.join(paths['oficios_path'], filename)
                if os.path.exists(oficio_path):
                    return send_file(oficio_path, as_attachment=True)

                # Tentar na pasta de anexos
                anexo_path = os.path.join(paths['anexos_path'], filename)
                if os.path.exists(anexo_path):
                    return send_file(anexo_path, as_attachment=True)

            return {'error': 'Arquivo não encontrado'}, 404

        except Exception as e:
            current_app.logger.error(f"Erro ao baixar arquivo: {str(e)}")
            return {'error': 'Erro interno ao baixar arquivo'}, 500

    def _get_output_path(self, regnumber: str, filename: str, is_free_letter: bool) -> str:
        """Determina o caminho de saída para o arquivo"""
        paths = self.ensure_directories(regnumber if not is_free_letter else None)
        return os.path.join(paths['oficios_path'] if not is_free_letter else paths['letters_path'], filename)
