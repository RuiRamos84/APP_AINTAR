"""
Sistema de Logging Centralizado
================================

Este módulo fornece um sistema de logging consistente para toda a aplicação.

Princípios:
- ERROR/CRITICAL: Sempre registado (erros que precisam atenção)
- WARNING: Sempre registado (situações que podem causar problemas)
- INFO: Apenas se DEBUG_MODE=True (informações úteis para desenvolvimento)
- DEBUG: Apenas se DEBUG_MODE=True (detalhes técnicos)

Uso:
    from app.utils.logger import get_logger

    logger = get_logger(__name__)

    # Sempre mostrado
    logger.error("Erro crítico!")
    logger.warning("Atenção!")

    # Apenas se DEBUG_MODE=True
    logger.info("Operação concluída")
    logger.debug("Valor da variável X: %s", x)
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from flask import has_app_context, current_app

# Verificar se DEBUG_MODE está ativo
DEBUG_MODE = os.environ.get('DEBUG_MODE', 'False').lower() in ('true', '1', 'yes')

# Cores para console (opcional)
class LogColors:
    RESET = '\033[0m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    GREEN = '\033[92m'
    BLUE = '\033[94m'
    GRAY = '\033[90m'


class ProductionFilter(logging.Filter):
    """Filtro que bloqueia INFO e DEBUG em produção (quando DEBUG_MODE=False)"""

    def filter(self, record):
        # Sempre permitir ERROR, CRITICAL e WARNING
        if record.levelno >= logging.WARNING:
            return True

        # INFO e DEBUG apenas se DEBUG_MODE estiver ativo
        return DEBUG_MODE


class ColoredFormatter(logging.Formatter):
    """Formatter com cores para facilitar leitura no console"""

    COLORS = {
        'DEBUG': LogColors.GRAY,
        'INFO': LogColors.BLUE,
        'WARNING': LogColors.YELLOW,
        'ERROR': LogColors.RED,
        'CRITICAL': LogColors.RED,
    }

    def format(self, record):
        # Adicionar cor ao nível de log
        levelname = record.levelname
        if levelname in self.COLORS:
            record.levelname = f"{self.COLORS[levelname]}{levelname}{LogColors.RESET}"

        return super().format(record)


def get_logger(name):
    """
    Obtém um logger configurado para o módulo.

    Args:
        name: Nome do módulo (use __name__)

    Returns:
        logging.Logger: Logger configurado

    Exemplo:
        logger = get_logger(__name__)
        logger.error("Erro ao processar documento")
    """
    logger = logging.getLogger(name)

    # Se já foi configurado, retornar
    if logger.handlers:
        return logger

    # Definir nível base
    if DEBUG_MODE:
        logger.setLevel(logging.DEBUG)
    else:
        logger.setLevel(logging.INFO)  # Base INFO, mas filtro bloqueia INFO/DEBUG

    # Handler para console
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG)

    # Aplicar filtro de produção
    console_handler.addFilter(ProductionFilter())

    # Formato: [LEVEL] module - message
    if DEBUG_MODE:
        # Em debug, mostrar mais detalhes
        formatter = ColoredFormatter(
            '[%(levelname)s] %(name)s:%(lineno)d - %(message)s'
        )
    else:
        # Em produção, formato simples
        formatter = logging.Formatter(
            '[%(levelname)s] %(name)s - %(message)s'
        )

    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Handler para ficheiro (opcional - apenas ERRORS)
    try:
        if has_app_context():
            log_dir = os.path.join(current_app.root_path, '..', 'logs')
            os.makedirs(log_dir, exist_ok=True)

            error_log_file = os.path.join(log_dir, 'errors.log')
            file_handler = RotatingFileHandler(
                error_log_file,
                maxBytes=10485760,  # 10MB
                backupCount=5
            )
            file_handler.setLevel(logging.ERROR)
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s'
            ))
            logger.addHandler(file_handler)
    except Exception:
        # Se falhar a criação do ficheiro, continuar sem ele
        pass

    # Evitar propagação para o logger root
    logger.propagate = False

    return logger


def log_function_call(func):
    """
    Decorator para logar chamadas de função (apenas em DEBUG_MODE)

    Exemplo:
        @log_function_call
        def process_document(doc_id):
            ...
    """
    from functools import wraps

    @wraps(func)
    def wrapper(*args, **kwargs):
        if DEBUG_MODE:
            logger = get_logger(func.__module__)
            logger.debug(f"Chamando {func.__name__} com args={args}, kwargs={kwargs}")

        result = func(*args, **kwargs)

        if DEBUG_MODE:
            logger.debug(f"{func.__name__} retornou: {result}")

        return result

    return wrapper


# Logger global para uso rápido
app_logger = get_logger('app')


# Informar no startup se DEBUG_MODE está ativo
if DEBUG_MODE:
    app_logger.warning("⚠️  DEBUG_MODE ATIVO - Logs verbosos habilitados")
else:
    # Apenas mostrar em stderr que está em modo produção (sem log)
    print("✓ Logging em modo PRODUÇÃO - Apenas erros/warnings serão registados")
