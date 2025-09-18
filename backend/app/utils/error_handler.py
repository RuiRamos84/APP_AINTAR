# app/utils/error_handler.py
from functools import wraps
from flask import jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, DataError
import re

# Categorização específica de erros


class APIError(Exception):
    def __init__(self, message, status_code=500, error_code=None, payload=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or f"ERR{status_code}"
        self.payload = payload or {}

    def to_dict(self):
        result = self.payload.copy()
        result.update({
            'erro': self.message,
            'codigo': self.error_code
        })
        return result

# Erros específicos para casos comuns


class ResourceNotFoundError(APIError):
    def __init__(self, resource_type, resource_id, payload=None):
        message = f"{resource_type} com ID {resource_id} não encontrado"
        super().__init__(message, 404, "ERR_NOT_FOUND", payload)


class DuplicateResourceError(APIError):
    def __init__(self, resource_type, field, value, payload=None):
        message = f"{resource_type} com {field}={value} já existe"
        super().__init__(message, 409, "ERR_DUPLICATE", payload)


class InvalidSessionError(APIError):
    """Exceção para sessões inválidas no banco de dados."""
    def __init__(self, message="Sessão inválida ou expirada.", status_code=419, error_code="INVALID_SESSION"):
        super().__init__(message, status_code, error_code)


class InvalidCredentialsError(APIError):
    """Exceção para credenciais de login inválidas."""
    def __init__(self, message="Credenciais inválidas"):
        super().__init__(message, status_code=401)


class TokenExpiredError(APIError):
    """Exceção para tokens expirados (login ou refresh)."""
    def __init__(self, message="Token expirado"):
        # Usamos 419 Authentication Timeout, um status não oficial mas comum para este caso
        super().__init__(message, status_code=419)

# Mapeamento de erros SQL para erros de API


def map_sql_error(error):
    error_str = str(error)

    # Violação de unicidade (ex: chave duplicada)
    if isinstance(error, IntegrityError) and "unique constraint" in error_str.lower():
        match = re.search(r'unique constraint "([^"]+)"', error_str.lower())
        constraint = match.group(1) if match else "campo único"
        return DuplicateResourceError("Registo", constraint, "", {"original_error": error_str})

    # Violação de chave estrangeira
    if isinstance(error, IntegrityError) and "foreign key constraint" in error_str.lower():
        return APIError("Referência inválida ou recurso não existente", 400, "ERR_INVALID_REF")

    # Erro de tipo de dados
    if isinstance(error, DataError):
        return APIError("Dados inválidos para a operação", 400, "ERR_INVALID_DATA")

    # Erro em função armazenada (normalmente com tags XML)
    if "<error>" in error_str:
        # Extrair mensagem entre tags <error></error>
        match = re.search(r'<error>(.*?)</error>', error_str)
        if match:
            return APIError(match.group(1), 400, "ERR_DB_FUNCTION")

    # Erro genérico de BD
    return APIError("Erro interno na base de dados", 500, "ERR_DATABASE")

# Decorador melhorado


def api_error_handler(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ResourceNotFoundError as e:
            current_app.logger.warning(f"Recurso não encontrado: {str(e)}")
            return jsonify(e.to_dict()), e.status_code
        except DuplicateResourceError as e:
            current_app.logger.warning(f"Recurso duplicado: {str(e)}")
            return jsonify(e.to_dict()), e.status_code
        except APIError as e:
            current_app.logger.error(f"Erro de API: {str(e)}")
            return jsonify(e.to_dict()), e.status_code
        except SQLAlchemyError as e:
            mapped_error = map_sql_error(e)
            current_app.logger.error(f"Erro de BD: {str(e)}", exc_info=True)
            return jsonify(mapped_error.to_dict()), mapped_error.status_code
        except Exception as e:
            current_app.logger.error(
                f"Erro não tratado: {str(e)}", exc_info=True)
            api_error = APIError(str(e), 500, "ERR_INTERNAL")
            return jsonify(api_error.to_dict()), 500
    return decorated_function

# Função auxiliar para lançar erros de recursos não encontrados


def ensure_resource_exists(resource, resource_type, resource_id):
    if not resource:
        raise ResourceNotFoundError(resource_type, resource_id)
    return resource
