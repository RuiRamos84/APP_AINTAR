from .auth_routes import bp as auth_bp
from .user_routes import bp as user_bp
from .entity_routes import bp as entity_bp
from .documents_routes import bp as document_bp
from .meta_data_routes import bp as meta_data_bp
from .notification_routes import bp as notification_bp
from .dashboard_routes import bp as dashboard_bp
from .letter_routes import bp as letters_bp
from .etar_ee_routes import bp as etar_ee_bp
from .epi_routes import bp as epi_bp
from .webhook_routes import webhook_bp
from .payment_routes import bp as payment_bp
from .tasks_routes import bp as tasks_bp


__all__ = ['auth_bp', 'user_bp', 'entity_bp', 'document_bp', 'meta_data_bp', 'notification_bp', 'dashboard_bp', 'letters_bp', 'etar_ee_bp', 'epi_bp', 'webhook_bp', 'payment_bp', 'tasks_bp']
