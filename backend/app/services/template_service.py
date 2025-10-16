"""
Template Service - Gestão de templates de ofícios com Jinja2
Permite uso de variáveis dinâmicas e lógica condicional nos templates
"""

from jinja2 import Template, Environment, meta, TemplateSyntaxError
from typing import Dict, List, Set
from flask import current_app
from app.utils.logger import get_logger


logger = get_logger(__name__)


class TemplateService:
    """Serviço para renderização de templates de ofícios com Jinja2"""

    # Variáveis disponíveis para uso nos templates
    AVAILABLE_VARIABLES = {
        # Destinatário
        'NOME': {'label': 'Nome do Destinatário', 'category': 'Destinatário', 'required': True},
        'MORADA': {'label': 'Morada', 'category': 'Destinatário', 'required': True},
        'PORTA': {'label': 'Porta/Número', 'category': 'Destinatário', 'required': True},
        'CODIGO_POSTAL': {'label': 'Código Postal', 'category': 'Destinatário', 'required': True},
        'LOCALIDADE': {'label': 'Localidade', 'category': 'Destinatário', 'required': True},
        'NIF': {'label': 'NIF', 'category': 'Destinatário', 'required': False},

        # Pedido/Documento
        'NUMERO_PEDIDO': {'label': 'Número do Pedido', 'category': 'Pedido', 'required': False},
        'DATA_PEDIDO': {'label': 'Data do Pedido', 'category': 'Pedido', 'required': False},
        'MORADA_PEDIDO': {'label': 'Morada do Pedido', 'category': 'Pedido', 'required': False},
        'PORTA_PEDIDO': {'label': 'Porta do Pedido', 'category': 'Pedido', 'required': False},
        'FREGUESIA_PEDIDO': {'label': 'Freguesia do Pedido', 'category': 'Pedido', 'required': False},
        'POSTAL_CODE_PEDIDO': {'label': 'Código Postal do Pedido', 'category': 'Pedido', 'required': False},
        'LOCALIDADE_PEDIDO': {'label': 'Localidade do Pedido', 'category': 'Pedido', 'required': False},

        # Sistema/Ofício
        'DATA': {'label': 'Data Atual', 'category': 'Sistema', 'required': True},
        'NUMERO_OFICIO': {'label': 'Número do Ofício', 'category': 'Sistema', 'required': True},
        'ASSUNTO': {'label': 'Assunto do Ofício', 'category': 'Sistema', 'required': False},
        'VS_M': {'label': 'Versão do Modelo', 'category': 'Sistema', 'required': False},

        # Assinatura
        'SIGNATURE_TITLE': {'label': 'Título do Assinante', 'category': 'Assinatura', 'required': False},
        'SIGNATURE_NAME': {'label': 'Nome do Assinante', 'category': 'Assinatura', 'required': False},
    }

    @staticmethod
    def render_template(template_string: str, context: Dict) -> str:
        """
        Renderiza um template Jinja2 com o contexto fornecido

        Args:
            template_string: Template em formato Jinja2
            context: Dicionário com valores das variáveis

        Returns:
            String renderizada

        Raises:
            TemplateSyntaxError: Se o template tiver erros de sintaxe
            KeyError: Se faltar variável obrigatória
        """
        try:
            # Criar template Jinja2
            template = Template(template_string)

            # Validar variáveis obrigatórias
            TemplateService._validate_required_variables(template_string, context)

            # Renderizar
            rendered = template.render(**context)

            logger.debug(f"Template renderizado com sucesso. Contexto: {list(context.keys())}")
            return rendered

        except TemplateSyntaxError as e:
            logger.error(f"Erro de sintaxe no template: {str(e)}")
            raise ValueError(f"Erro de sintaxe no template na linha {e.lineno}: {e.message}")

        except Exception as e:
            logger.error(f"Erro ao renderizar template: {str(e)}")
            raise

    @staticmethod
    def _validate_required_variables(template_string: str, context: Dict) -> None:
        """
        Valida se todas as variáveis obrigatórias estão presentes no contexto

        Args:
            template_string: Template em formato Jinja2
            context: Dicionário com valores

        Raises:
            ValueError: Se faltar variável obrigatória
        """
        # Extrair variáveis usadas no template
        env = Environment()
        ast = env.parse(template_string)
        used_variables = meta.find_undeclared_variables(ast)

        # Verificar variáveis obrigatórias
        missing_required = []
        for var in used_variables:
            if var in TemplateService.AVAILABLE_VARIABLES:
                var_info = TemplateService.AVAILABLE_VARIABLES[var]
                if var_info.get('required') and var not in context:
                    missing_required.append(var_info['label'])

        if missing_required:
            raise ValueError(
                f"Variáveis obrigatórias em falta: {', '.join(missing_required)}"
            )

    @staticmethod
    def get_template_variables(template_string: str) -> Set[str]:
        """
        Extrai todas as variáveis usadas num template

        Args:
            template_string: Template em formato Jinja2

        Returns:
            Set com nomes das variáveis
        """
        try:
            env = Environment()
            ast = env.parse(template_string)
            return meta.find_undeclared_variables(ast)
        except Exception as e:
            logger.error(f"Erro ao extrair variáveis do template: {str(e)}")
            return set()

    @staticmethod
    def validate_template(template_string: str) -> Dict:
        """
        Valida um template e retorna informações sobre ele

        Args:
            template_string: Template em formato Jinja2

        Returns:
            Dict com:
                - is_valid: bool
                - variables_used: list
                - errors: list
        """
        result = {
            'is_valid': True,
            'variables_used': [],
            'unknown_variables': [],
            'errors': []
        }

        try:
            # Tentar fazer parse do template
            env = Environment()
            ast = env.parse(template_string)

            # Extrair variáveis
            variables = meta.find_undeclared_variables(ast)
            result['variables_used'] = list(variables)

            # Verificar variáveis desconhecidas
            for var in variables:
                if var not in TemplateService.AVAILABLE_VARIABLES:
                    result['unknown_variables'].append(var)

            # Se houver variáveis desconhecidas, adicionar warning
            if result['unknown_variables']:
                result['errors'].append({
                    'type': 'warning',
                    'message': f"Variáveis desconhecidas: {', '.join(result['unknown_variables'])}"
                })

        except TemplateSyntaxError as e:
            result['is_valid'] = False
            result['errors'].append({
                'type': 'error',
                'line': e.lineno,
                'message': e.message
            })

        return result

    @staticmethod
    def get_available_variables() -> Dict:
        """
        Retorna todas as variáveis disponíveis organizadas por categoria

        Returns:
            Dict com variáveis agrupadas por categoria
        """
        categorized = {}

        for var_name, var_info in TemplateService.AVAILABLE_VARIABLES.items():
            category = var_info['category']

            if category not in categorized:
                categorized[category] = []

            categorized[category].append({
                'name': var_name,
                'label': var_info['label'],
                'required': var_info.get('required', False),
                'example': f'{{{{ {var_name} }}}}'
            })

        return categorized

    @staticmethod
    def create_sample_template() -> str:
        """
        Cria um template de exemplo para demonstração

        Returns:
            String com template de exemplo
        """
        return """Em resposta ao vosso pedido de autorização para ligação de águas residuais, referente à morada {{ MORADA_PEDIDO }}, {{ PORTA_PEDIDO }}, {{ FREGUESIA_PEDIDO }}, {{ POSTAL_CODE_PEDIDO }} {{ LOCALIDADE_PEDIDO }}, registado nesta Entidade sob o n.º {{ NUMERO_PEDIDO }}, vem esta Entidade, ao abrigo do estipulado no artigo 7.º, n.º 1 do Decreto-Lei 194/2009, de 20 de Agosto, que aprova o Regime Jurídico dos Serviços Municipais de Abastecimento Público de Água, de Saneamento de Águas Residuais e de Gestão de Resíduos Urbanos, comunicar que AUTORIZA essa ligação.

{% if NIF %}
Para o NIF {{ NIF }}, informamos que a ligação está autorizada.
{% endif %}

Esta autorização é válida pelo período de 6 meses a contar da data de emissão."""


# Exemplo de uso
if __name__ == "__main__":
    # Teste básico
    template = "Exmo. Sr. {{ NOME }}, a morada é {{ MORADA }}, {{ PORTA }}."
    context = {
        'NOME': 'João Silva',
        'MORADA': 'Rua Principal',
        'PORTA': '123'
    }

    result = TemplateService.render_template(template, context)
    print(result)
