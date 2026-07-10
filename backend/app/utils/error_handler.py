# app/utils/error_handler.py
from functools import wraps
from flask import jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, DataError
from pydantic import ValidationError
import re
from app.utils.logger import get_logger

logger = get_logger(__name__)


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
            'error': self.message,
            'code': self.error_code
        })
        return result


class ResourceNotFoundError(APIError):
    def __init__(self, resource_type, resource_id, payload=None):
        super().__init__(f"{resource_type} não encontrado", 404, "ERR_NOT_FOUND", payload)


class DuplicateResourceError(APIError):
    def __init__(self, message_or_type="Este registo já existe.", field=None, value=None, payload=None):
        # Suporta tanto DuplicateResourceError('msg') como DuplicateResourceError('Tipo', 'campo', 'valor')
        # Na forma antiga (3 args), nunca expor campo/valor internos ao cliente
        message = message_or_type if field is None else "Este registo já existe."
        super().__init__(message, 409, "ERR_DUPLICATE", payload)


class InvalidSessionError(APIError):
    def __init__(self, message="Sessão inválida ou expirada.", status_code=419, error_code="INVALID_SESSION"):
        super().__init__(message, status_code, error_code)


class InvalidCredentialsError(APIError):
    def __init__(self, message="Credenciais inválidas"):
        super().__init__(message, status_code=401)


class TokenExpiredError(APIError):
    def __init__(self, message="Token expirado"):
        super().__init__(message, status_code=419)


def map_sql_error(error):
    error_str = str(error)

    # Violação de unicidade — nunca expor o nome da constraint
    if isinstance(error, IntegrityError) and "unique constraint" in error_str.lower():
        return APIError("Este registo já existe.", 409, "ERR_DUPLICATE")

    # Violação de chave estrangeira — nunca expor tabelas referenciadas
    if isinstance(error, IntegrityError) and "foreign key constraint" in error_str.lower():
        return APIError("Referência inválida.", 400, "ERR_INVALID_REF")

    # Sobreposição de reservas de viaturas (RAISE EXCEPTION com ERRCODE 23P01 no trigger
    # fbf_vehicle_reservation_check_overlap — ver backend/sql/vehicle_reservation.sql)
    if isinstance(error, IntegrityError) and "vehicle_reservation_no_overlap" in error_str:
        return APIError(
            "A viatura já está reservada nesse período. Escolha outro horário ou viatura.",
            409, "ERR_RESERVATION_CONFLICT"
        )

    # Violação de exclusão genérica (ex.: EXCLUDE USING gist noutra tabela)
    if isinstance(error, IntegrityError) and "exclusion constraint" in error_str.lower():
        return APIError("Este registo entra em conflito com outro já existente.", 409, "ERR_CONFLICT")

    # Erro de tipo/formato de dados
    if isinstance(error, DataError):
        return APIError("Formato de dados inválido.", 400, "ERR_INVALID_DATA")

    # Erros de lógica de negócio devolvidos por funções armazenadas via tags XML
    if "<error>" in error_str:
        match = re.search(r'<error>(.*?)</error>', error_str)
        if match:
            return APIError(match.group(1), 400, "ERR_BUSINESS")

    # Qualquer outro erro de BD — nunca expor detalhes internos
    return APIError("Ocorreu um erro ao processar o pedido. Tente novamente.", 500, "ERR_DATABASE")


def api_error_handler(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ResourceNotFoundError as e:
            logger.warning(f"Recurso não encontrado: {e.message}")
            return jsonify(e.to_dict()), e.status_code
        except DuplicateResourceError as e:
            logger.warning(f"Recurso duplicado: {e.message}")
            return jsonify(e.to_dict()), e.status_code
        except APIError as e:
            logger.error(f"Erro de API [{e.error_code}]: {e.message}")
            return jsonify(e.to_dict()), e.status_code
        except ValidationError as e:
            # Pydantic: nunca expor nomes de campos internos do modelo
            logger.warning(f"Validação falhou: {e}")
            err = APIError("Dados inválidos no pedido.", 400, "ERR_VALIDATION")
            return jsonify(err.to_dict()), 400
        except SQLAlchemyError as e:
            mapped = map_sql_error(e)
            logger.error(f"Erro de BD [{mapped.error_code}]: {e}", exc_info=True)
            return jsonify(mapped.to_dict()), mapped.status_code
        except Exception as e:
            # Nunca expor detalhes internos ao cliente
            logger.error(f"Erro não tratado: {e}", exc_info=True)
            err = APIError("Ocorreu um erro interno. Tente novamente.", 500, "ERR_INTERNAL")
            return jsonify(err.to_dict()), 500
    return decorated_function


def ensure_resource_exists(resource, resource_type, resource_id):
    if not resource:
        raise ResourceNotFoundError(resource_type, resource_id)
    return resource
