from flask import Blueprint, jsonify, current_app
from ..services.dashboard_service import get_dashboard_data
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..utils.utils import token_required, set_session, db_session_manager
from sqlalchemy.exc import SQLAlchemyError

bp = Blueprint('dashboard', __name__)


@bp.route('/dashboard', methods=['GET'])
@jwt_required()
@token_required
# @set_session
def get_dashboard():
    current_user = get_jwt_identity()
    try:
        with db_session_manager(current_user):
            data = get_dashboard_data(current_user)
            # Filtre apenas as views que têm dados
            data = {k: v for k, v in data.items() if v.get('data')}

            # Log dos dados antes da serialização
            # current_app.logger.debug(f"Dados do dashboard antes da serialização: {data}")

            return jsonify(data), 200
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error when fetching dashboard data: {str(e)}", exc_info=True)
        return jsonify({"error": "Database error", "message": "Unable to retrieve dashboard data due to a database error"}), 500
    except Exception as e:
        if "SESSÃO INVÁLIDA" in str(e):
            current_app.logger.error(
                f"Invalid session: {str(e)}", exc_info=True)
            return jsonify({"error": "Invalid session", "message": "Your session has expired. Please log in again."}), 419
        else:
            current_app.logger.error(f"Error fetching dashboard data: {str(e)}", exc_info=True)
            return jsonify({"error": "Internal server error", "message": "An unexpected error occurred while fetching dashboard data"}), 419
