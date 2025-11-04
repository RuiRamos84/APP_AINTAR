# services/emissions/numbering_service.py
# Serviço de numeração multi-tipo para sistema unificado
from sqlalchemy.sql import text
from datetime import datetime
from typing import Tuple
import re
from app.utils.utils import db_session_manager
from app.utils.logger import get_logger
from app.models.emission import DocumentType

logger = get_logger(__name__)


class EmissionNumberingService:
    """
    Serviço centralizado de numeração para TODOS os tipos de emissões
    Suporta: Ofícios, Notificações, Declarações, Informações, Deliberações
    """

    # Configurações globais
    DEFAULT_DEPARTMENT = "S"  # Saneamento

    # Padrão de validação genérico - Formato: {ACRON}-{year}.{sequence}
    # Exemplo: S.OFI-2025.000001
    NUMBER_PATTERN = r'^[A-Z]+(\.[A-Z]+)*-\d{4}\.\d{6}$'

    @staticmethod
    def generate_number(
        document_type_code: str,
        year: int = None,
        department_code: str = None,
        current_user: str = None
    ) -> str:
        """
        Gera número sequencial único para qualquer tipo de emissão

        Formato: {PREFIX}-{year}.{dept}.{type}.{sequence:06d}

        Exemplos:
            OF-2025.S.OFI.000001   (Ofício)
            NT-2025.S.NOT.000001   (Notificação)
            DC-2025.S.DEC.000001   (Declaração)
            INF-2025.S.INF.000001  (Informação)
            DL-2025.S.DEL.000001   (Deliberação)

        Args:
            document_type_code: Código do tipo (OFI, NOT, DEC, INF, DEL)
            year: Ano (default: ano atual)
            department_code: Departamento (default: 'S')
            current_user: Username para logs

        Returns:
            str: Número gerado

        Raises:
            ValueError: Se tipo inválido ou parâmetros incorretos
        """
        # Obter tipo de documento
        with db_session_manager(current_user) as session:
            doc_type = session.query(DocumentType).filter_by(
                acron=document_type_code
            ).first()

            if not doc_type:
                raise ValueError(f"Tipo de documento inválido: {document_type_code}")

            # Defaults
            if year is None:
                year = datetime.now().year

            if department_code is None:
                department_code = EmissionNumberingService.DEFAULT_DEPARTMENT

            # Validações
            if not (2000 <= year <= 2100):
                raise ValueError(f"Ano inválido: {year}")

            if not re.match(r'^[A-Z]$', department_code):
                raise ValueError(
                    f"Código de departamento inválido: {department_code}. "
                    "Deve ser uma letra maiúscula."
                )

            # Obter próximo número sequencial
            # Formato simplificado: {ACRON}-{year}.{sequence:06d}
            # Exemplo: S.OFI-2025.000001
            pattern_base = f"{doc_type.acron}-{year}"

            # Query para obter o maior número da sequência atual
            query = text("""
                SELECT COALESCE(MAX(
                    CAST(
                        SPLIT_PART(emission_number, '.', 2) AS INTEGER
                    )
                ), 0) + 1 AS next_number
                FROM tb_letter
                WHERE emission_number LIKE :pattern
            """)

            result = session.execute(
                query,
                {'pattern': f"{pattern_base}.%"}
            ).fetchone()

            next_sequence = result[0] if result else 1

            # Gerar número final
            emission_number = f"{pattern_base}.{next_sequence:06d}"

            logger.info(
                f"Número gerado: {emission_number} "
                f"[Tipo: {document_type_code}, Ano: {year}, Sequência: {next_sequence}]"
            )

            return emission_number

    @staticmethod
    def parse_number(emission_number: str) -> dict:
        """
        Extrai componentes de um número de emissão

        Args:
            emission_number: Número completo (ex: S.OFI-2025.000001)

        Returns:
            dict com {acron, year, sequence, full_number}

        Raises:
            ValueError: Se formato inválido
        """
        if not EmissionNumberingService.validate_number(emission_number):
            raise ValueError(f"Formato de número inválido: {emission_number}")

        # Split nos separadores
        # Formato: {ACRON}-{year}.{sequence}
        parts = emission_number.split('-')
        acron = parts[0]

        rest = parts[1].split('.')
        year = int(rest[0])
        sequence = int(rest[1])

        return {
            'acron': acron,
            'year': year,
            'sequence': sequence,
            'full_number': emission_number,
            # Manter compatibilidade com código antigo
            'next_number': emission_number
        }

    @staticmethod
    def validate_number(emission_number: str) -> bool:
        """
        Valida formato de número de emissão

        Args:
            emission_number: Número a validar

        Returns:
            bool: True se válido
        """
        if not emission_number:
            return False

        return bool(re.match(EmissionNumberingService.NUMBER_PATTERN, emission_number))

    @staticmethod
    def check_number_exists(emission_number: str, current_user: str = None) -> bool:
        """
        Verifica se número já existe na base de dados

        Args:
            emission_number: Número a verificar
            current_user: Username

        Returns:
            bool: True se existe
        """
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT COUNT(*) as count
                FROM tb_emission
                WHERE emission_number = :number
            """)

            result = session.execute(
                query,
                {'number': emission_number}
            ).fetchone()

            return result[0] > 0 if result else False

    @staticmethod
    def get_year_statistics(year: int, document_type_code: str = None, current_user: str = None) -> dict:
        """
        Obtém estatísticas de emissões por ano

        Args:
            year: Ano a consultar
            document_type_code: Filtro por tipo (opcional)
            current_user: Username

        Returns:
            dict com estatísticas
        """
        with db_session_manager(current_user) as session:
            # Query base
            base_query = """
                SELECT
                    dt.acron,
                    dt.name,
                    dt.acron as prefix,
                    COUNT(e.pk) as total,
                    COUNT(CASE WHEN e.status = 'issued' THEN 1 END) as issued,
                    COUNT(CASE WHEN e.status = 'signed' THEN 1 END) as signed,
                    MAX(
                        CAST(
                            SPLIT_PART(e.emission_number, '.', 2) AS INTEGER
                        )
                    ) as last_sequence
                FROM ts_lettertype dt
                LEFT JOIN tb_letter e ON (
                    e.tb_letter_template IN (
                        SELECT pk FROM tb_letter_template WHERE ts_lettertype = dt.pk
                    )
                    AND e.emission_number LIKE dt.acron || '-' || :year || '.%'
                )
            """

            # Adicionar filtro por tipo se especificado
            if document_type_code:
                base_query += " WHERE dt.acron = :type_code"

            base_query += """
                GROUP BY dt.acron, dt.name
                ORDER BY dt.name
            """

            params = {'year': year}
            if document_type_code:
                params['type_code'] = document_type_code

            result = session.execute(text(base_query), params).fetchall()

            # Formatar resultado
            statistics = {
                'year': year,
                'types': []
            }

            total_all = 0
            for row in result:
                type_stats = {
                    'code': row[0],
                    'name': row[1],
                    'prefix': row[2],
                    'total': row[3],
                    'issued': row[4],
                    'signed': row[5],
                    'last_sequence': row[6] or 0
                }
                statistics['types'].append(type_stats)
                total_all += row[3]

            statistics['total_all_types'] = total_all

            return statistics

    @staticmethod
    def get_next_sequence_preview(
        document_type_code: str,
        year: int = None,
        department_code: str = None,
        current_user: str = None
    ) -> dict:
        """
        Preview do próximo número sem gerá-lo

        Returns:
            dict com {next_number, sequence, exists}
        """
        try:
            next_number = EmissionNumberingService.generate_number(
                document_type_code=document_type_code,
                year=year,
                department_code=department_code,
                current_user=current_user
            )

            parsed = EmissionNumberingService.parse_number(next_number)

            return {
                'next_number': next_number,
                'emission_number': next_number,  # Compatibilidade
                'sequence': parsed['sequence'],
                'year': parsed['year'],
                'acron': parsed['acron'],
                'exists': False  # Sempre False no preview
            }

        except Exception as e:
            logger.error(f"Erro no preview: {str(e)}")
            return {
                'error': str(e),
                'next_number': None
            }

    @staticmethod
    def format_display_number(emission_number: str) -> str:
        """
        Formata número para exibição amigável

        Args:
            emission_number: S.OFI-2025.000001

        Returns:
            "Ofício nº 1/2025"
        """
        try:
            parsed = EmissionNumberingService.parse_number(emission_number)

            # Extrair tipo do acron (última parte após o ponto)
            acron_parts = parsed['acron'].split('.')
            type_code = acron_parts[-1] if len(acron_parts) > 1 else parsed['acron']

            # Mapeamento de nomes amigáveis
            type_names = {
                'OFI': 'Ofício',
                'NOT': 'Notificação',
                'DEC': 'Declaração',
                'INF': 'Informação',
                'DEL': 'Deliberação'
            }

            type_name = type_names.get(type_code, type_code)

            return f"{type_name} nº {parsed['sequence']}/{parsed['year']}"

        except ValueError:
            return emission_number
