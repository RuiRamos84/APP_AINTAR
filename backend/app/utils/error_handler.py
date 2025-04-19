# app/utils/error_handler.py
from functools import wraps
from flask import jsonify, current_app
from sqlalchemy.exc import SQLAlchemyError
from .utils import format_message


class APIError(Exception):
    def __init__(self, message, status_code=500, payload=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        result = dict(self.payload or {})
        result['error'] = self.message
        return result

# Funções separadas (não como métodos da classe)


def handle_api_error(error, code=500):
    error_message = format_message(str(error))
    return jsonify({"error": error_message}), code


def api_error_handler(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except SQLAlchemyError as e:
            current_app.logger.error(f"Erro de base de dados: {str(e)}")
            return handle_api_error(e, 500)
        except ValueError as e:
            return handle_api_error(e, 400)
        except Exception as e:
            current_app.logger.error(f"Erro não tratado: {str(e)}")
            return handle_api_error(e, 500)
    return decorated_function
