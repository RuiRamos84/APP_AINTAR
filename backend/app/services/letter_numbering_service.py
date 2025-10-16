"""
Letter Numbering Service - Gestão centralizada de numeração de ofícios
Garante numeração sequencial única e validação de formatos
"""

from sqlalchemy.sql import text
from datetime import datetime
from typing import Tuple
import re
from app.utils.error_handler import api_error_handler
from ..utils.utils import db_session_manager
from app.utils.logger import get_logger


logger = get_logger(__name__)


class LetterNumberingService:
    """Serviço centralizado para numeração de ofícios"""

    # Configurações de numeração
    DEFAULT_PREFIX = "OF"
    DEFAULT_DEPARTMENT = "S"  # Saneamento
    DEFAULT_TYPE = "OFI"  # Ofício

    # Regex para validação
    NUMBER_PATTERN = r'^OF-\d{4}\.[A-Z]\.[A-Z]{3}\.\d{6}$'

    @staticmethod
    @api_error_handler
    def generate_number(
        year: int = None,
        department_code: str = None,
        doc_type: str = None,
        current_user: str = None
    ) -> str:
        """
        Gera número sequencial de ofício no formato:
        OF-{year}.{dept}.{type}.{sequence:06d}

        Exemplos:
            OF-2025.S.OFI.000001
            OF-2025.S.OFI.000002
            OF-2025.A.COM.000001  # Outro departamento/tipo

        Args:
            year: Ano (default: ano atual)
            department_code: Código do departamento (default: 'S')
            doc_type: Tipo de documento (default: 'OFI')
            current_user: Utilizador atual (para logs)

        Returns:
            str: Número do ofício gerado

        Raises:
            ValueError: Se parâmetros inválidos
        """
        # Defaults
        if year is None:
            year = datetime.now().year

        if department_code is None:
            department_code = LetterNumberingService.DEFAULT_DEPARTMENT

        if doc_type is None:
            doc_type = LetterNumberingService.DEFAULT_TYPE

        # Validações
        if not (2000 <= year <= 2100):
            raise ValueError(f"Ano inválido: {year}")

        if not re.match(r'^[A-Z]$', department_code):
            raise ValueError(
                f"Código de departamento inválido: {department_code}. "
                "Deve ser uma letra maiúscula."
            )

        if not re.match(r'^[A-Z]{3}$', doc_type):
            raise ValueError(
                f"Tipo de documento inválido: {doc_type}. "
                "Deve ter 3 letras maiúsculas."
            )

        # Obter próximo número sequencial
        with db_session_manager(current_user) as session:
            pattern = f"OF-{year}.{department_code}.{doc_type}.%"

            # Query para obter o maior número da sequência
            query = text("""
                SELECT COALESCE(
                    MAX(
                        CAST(
                            SUBSTRING(
                                regnumber
                                FROM POSITION('.' IN SUBSTRING(regnumber FROM 18)) + 18
                            ) AS INTEGER
                        )
                    ),
                    0
                ) + 1 AS next_number
                FROM tb_letterstore
                WHERE regnumber LIKE :pattern
            """)

            result = session.execute(query, {'pattern': pattern}).scalar()
            sequence = result if result else 1

            # Formatar número final
            number = f"OF-{year}.{department_code}.{doc_type}.{sequence:06d}"

            logger.info(
                f"Número de ofício gerado: {number} "
                f"(usuário: {current_user or 'system'})"
            )

            return number

    @staticmethod
    def parse_number(number: str) -> dict:
        """
        Faz parse de um número de ofício e extrai seus componentes

        Args:
            number: Número do ofício (ex: OF-2025.S.OFI.000001)

        Returns:
            dict com: {
                'prefix': 'OF',
                'year': 2025,
                'department': 'S',
                'type': 'OFI',
                'sequence': 1,
                'is_valid': True
            }

        Raises:
            ValueError: Se formato inválido
        """
        if not LetterNumberingService.validate_number(number):
            raise ValueError(f"Formato de número inválido: {number}")

        # Parse usando regex
        match = re.match(
            r'^(OF)-(\d{4})\.([A-Z])\.([A-Z]{3})\.(\d{6})$',
            number
        )

        if not match:
            raise ValueError(f"Erro ao fazer parse do número: {number}")

        return {
            'prefix': match.group(1),
            'year': int(match.group(2)),
            'department': match.group(3),
            'type': match.group(4),
            'sequence': int(match.group(5)),
            'is_valid': True,
            'full_number': number
        }

    @staticmethod
    def validate_number(number: str) -> bool:
        """
        Valida formato do número do ofício

        Args:
            number: Número a validar

        Returns:
            bool: True se válido, False caso contrário
        """
        if not number or not isinstance(number, str):
            return False

        return bool(re.match(LetterNumberingService.NUMBER_PATTERN, number))

    @staticmethod
    @api_error_handler
    def get_next_sequence(
        year: int = None,
        department_code: str = None,
        doc_type: str = None,
        current_user: str = None
    ) -> int:
        """
        Obtém o próximo número da sequência sem gerar o número completo

        Args:
            year: Ano (default: ano atual)
            department_code: Código do departamento (default: 'S')
            doc_type: Tipo de documento (default: 'OFI')
            current_user: Utilizador atual

        Returns:
            int: Próximo número da sequência
        """
        # Defaults
        if year is None:
            year = datetime.now().year

        if department_code is None:
            department_code = LetterNumberingService.DEFAULT_DEPARTMENT

        if doc_type is None:
            doc_type = LetterNumberingService.DEFAULT_TYPE

        with db_session_manager(current_user) as session:
            pattern = f"OF-{year}.{department_code}.{doc_type}.%"

            query = text("""
                SELECT COALESCE(
                    MAX(
                        CAST(
                            SUBSTRING(
                                regnumber
                                FROM POSITION('.' IN SUBSTRING(regnumber FROM 18)) + 18
                            ) AS INTEGER
                        )
                    ),
                    0
                ) + 1 AS next_number
                FROM tb_letterstore
                WHERE regnumber LIKE :pattern
            """)

            result = session.execute(query, {'pattern': pattern}).scalar()
            return result if result else 1

    @staticmethod
    @api_error_handler
    def check_number_exists(number: str, current_user: str = None) -> bool:
        """
        Verifica se um número de ofício já existe na base de dados

        Args:
            number: Número do ofício
            current_user: Utilizador atual

        Returns:
            bool: True se existe, False caso contrário
        """
        if not LetterNumberingService.validate_number(number):
            raise ValueError(f"Formato de número inválido: {number}")

        with db_session_manager(current_user) as session:
            query = text("""
                SELECT COUNT(*)
                FROM tb_letterstore
                WHERE regnumber = :number
            """)

            count = session.execute(query, {'number': number}).scalar()
            return count > 0

    @staticmethod
    def get_year_statistics(year: int = None, current_user: str = None) -> dict:
        """
        Obtém estatísticas de ofícios emitidos num ano

        Args:
            year: Ano (default: ano atual)
            current_user: Utilizador atual

        Returns:
            dict com estatísticas:
            {
                'year': 2025,
                'total': 150,
                'by_department': {'S': 100, 'A': 50},
                'by_type': {'OFI': 120, 'COM': 30}
            }
        """
        if year is None:
            year = datetime.now().year

        with db_session_manager(current_user) as session:
            # Total do ano
            total_query = text("""
                SELECT COUNT(*)
                FROM tb_letterstore
                WHERE regnumber LIKE :pattern
            """)

            total = session.execute(
                total_query,
                {'pattern': f"OF-{year}.%"}
            ).scalar()

            # Por departamento
            dept_query = text("""
                SELECT
                    SUBSTRING(regnumber FROM 9 FOR 1) as department,
                    COUNT(*) as count
                FROM tb_letterstore
                WHERE regnumber LIKE :pattern
                GROUP BY department
                ORDER BY count DESC
            """)

            by_dept = session.execute(
                dept_query,
                {'pattern': f"OF-{year}.%"}
            ).fetchall()

            # Por tipo
            type_query = text("""
                SELECT
                    SUBSTRING(regnumber FROM 11 FOR 3) as doc_type,
                    COUNT(*) as count
                FROM tb_letterstore
                WHERE regnumber LIKE :pattern
                GROUP BY doc_type
                ORDER BY count DESC
            """)

            by_type = session.execute(
                type_query,
                {'pattern': f"OF-{year}.%"}
            ).fetchall()

            return {
                'year': year,
                'total': total,
                'by_department': {row[0]: row[1] for row in by_dept},
                'by_type': {row[0]: row[1] for row in by_type}
            }


# Exemplo de uso
if __name__ == "__main__":
    # Testar geração
    number = LetterNumberingService.generate_number()
    print(f"Número gerado: {number}")

    # Testar parse
    parsed = LetterNumberingService.parse_number(number)
    print(f"Parse: {parsed}")

    # Testar validação
    is_valid = LetterNumberingService.validate_number(number)
    print(f"Válido: {is_valid}")
