from flask import Blueprint, jsonify, current_app, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.sql import text
from sqlalchemy.exc import SQLAlchemyError
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler


bp = Blueprint('dashboard_routes', __name__)


@bp.route('/dashboard/<view_name>', methods=['GET'])
@jwt_required()
@api_error_handler
def get_dashboard_data(view_name):
    """Obtém dados para o dashboard a partir de uma view específica"""
    try:
        current_user = get_jwt_identity()

        # Validar nome da view para evitar SQL injection
        valid_views = [
            'vbr_document_001', 'vbr_document_002', 'vbr_document_003',
            'vbr_document_004', 'vbr_document_005', 'vbr_document_006',
            'vbr_document_007', 'vbr_document_008', 'vbr_document_009',
        ]

        if view_name not in valid_views:
            return jsonify({"error": "Nome de view inválido"}), 400

        # Obter ano da consulta (opcional)
        year = request.args.get('year')

        with db_session_manager(current_user) as session:
            query = f"SELECT * FROM aintar_server.{view_name}"

            # Adicionar filtro de ano se fornecido
            if year:
                query += f" WHERE year = {year}"

            result = session.execute(text(query))
            columns = result.keys()

            data = [
                {column: value for column, value in zip(columns, row)}
                for row in result
            ]

            return jsonify(data), 200

    except SQLAlchemyError as e:
        current_app.logger.error(
            f"Erro de banco de dados ao buscar dados do dashboard: {str(e)}")
        return jsonify({"error": "Erro de banco de dados ao buscar dados do dashboard"}), 500
    except Exception as e:
        current_app.logger.error(
            f"Erro inesperado em get_dashboard_data: {str(e)}")
        return jsonify({"error": "Erro interno do servidor ao buscar dados do dashboard"}), 500
