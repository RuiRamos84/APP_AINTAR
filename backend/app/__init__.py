# app/create_app.py

from config import get_config
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import (
    JWTManager,
    get_jwt_identity,
    verify_jwt_in_request,
)
from flask_cors import CORS
from flask_mail import Mail
from flask_socketio import SocketIO
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
import os
from flask_jwt_extended.exceptions import NoAuthorizationError
from .services.payment_service import payment_service
from app.utils.error_handler import APIError

# Sistema de logging centralizado
from app.utils.logger import get_logger
logger = get_logger(__name__)

# Inicialização das extensões
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()
socket_io = SocketIO()
cache = Cache()

# Importações opcionais com tratamento de erros
try:
    from flask_compress import Compress
    compress = Compress()
except ImportError:
    compress = None

from flasgger import Swagger
swagger = Swagger()


def limiter_key_func():
    # logger.debug(f"Request method: {request.method}")
    # logger.debug(f"Request endpoint: {request.endpoint}")

    if request.method == 'OPTIONS':
        # logger.debug("Returning remote address for OPTIONS request")
        return get_remote_address()

    if request.endpoint and request.endpoint.split('.')[-1] in ['login', 'refresh']:
        # logger.debug("Returning remote address for login/refresh")
        return get_remote_address()

    try:
        verify_jwt_in_request(optional=True)
        current_user = get_jwt_identity()
        if current_user:
            # logger.debug(f"Returning user identity: {current_user}")
            return str(current_user)
    except NoAuthorizationError:
        # logger.debug("No authorization token found")
        pass

    # logger.debug("Falling back to remote address")
    return get_remote_address()


# Configuração da blacklist
blacklist = set()

limiter = Limiter(key_func=limiter_key_func, default_limits=["500 per day", "100 per hour"])


def create_app(config_class):
    app = Flask(__name__)
    app.config.from_object(config_class)
    config = get_config()
    app.config.from_object(config)

    # Adicione estas linhas
    app.config['ROOT_PATH'] = os.path.dirname(os.path.abspath(__file__))
    app.config['UPLOAD_FOLDER'] = os.path.join(app.config['ROOT_PATH'], 'uploads')
    app.config['UTILS_FOLDER'] = os.path.join(app.config['ROOT_PATH'], 'utils')

    # Definir o ambiente explicitamente
    app.config['ENV'] = os.environ.get('FLASK_ENV', 'production')

    # Inicialização das extensões com a app
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
    socket_io.init_app(app,
                       logger=True,
                       engineio_logger=False,
                       cors_allowed_origins="*",
                       async_mode='eventlet',
                       ping_timeout=60,
                       ping_interval=25)

    # Inicializar o serviço de pagamento
    payment_service.init_app(app)

    # Configuração da blacklist no JWT
    @jwt.token_in_blocklist_loader
    def check_if_token_in_blacklist(jwt_header, jwt_payload):
        jti = jwt_payload['jti']
        return jti in blacklist

    if compress:
        compress.init_app(app)
        # logger.info("Compression initialized.")

    # Configuração do Swagger
    app.config['SWAGGER'] = {
        "headers": [],
        "specs": [
            {
                "endpoint": 'apispec_1',
                "route": '/apispec_1.json',
                "rule_filter": lambda rule: True,  # all in
                "model_filter": lambda tag: True,  # all in
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/apidocs/"
    }
    
    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "AINTAR API",
            "description": "API documentation for AINTAR System",
            "contact": {
                "responsible": "Rui Ramos",
                "email": "rui.ramos@aintar.pt",
            },
            "version": "1.0.0"
        },
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\""
            }
        },
        "security": [
            {
                "Bearer": []
            }
        ]
    }

    swagger.template = swagger_template
    swagger.init_app(app)

    # Inicialização do Cache e Limiter
    if app.config['ENV'] == 'production':
        cache_config = {'CACHE_TYPE': 'simple'}
    else:
        # Mudado para 'simple' em vez de 'redis'
        cache_config = {'CACHE_TYPE': 'simple'}

    cache.init_app(app, config=cache_config)

    # Configuração do Limiter para usar armazenamento em memória em ambos os ambientes
    app.config['RATELIMIT_STORAGE_URI'] = 'memory://'
    limiter.init_app(app)

    # Rate limiting configurado

    @app.errorhandler(APIError)
    def handle_api_error(error):
        response = jsonify(error.to_dict())
        response.status_code = error.status_code
        return response

    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = app.make_default_options_response()
            return response

    with app.app_context():
        # Registro dos blueprints
        from .routes import auth_bp, user_bp, entity_bp, document_bp, meta_data_bp, dashboard_bp, etar_ee_bp, epi_bp, webhook_bp, payment_bp, tasks_bp, operations_bp, permissions_bp, operation_control_bp, analysis_bp, operation_metadata_bp, telemetry_bp
        from .routes.emission_routes import emission_bp

        app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
        app.register_blueprint(user_bp, url_prefix='/api/v1/user')
        app.register_blueprint(entity_bp, url_prefix='/api/v1')
        app.register_blueprint(document_bp, url_prefix='/api/v1')
        app.register_blueprint(meta_data_bp, url_prefix='/api/v1')
        app.register_blueprint(dashboard_bp, url_prefix='/api/v1')
        app.register_blueprint(emission_bp)
        app.register_blueprint(etar_ee_bp, url_prefix='/api/v1')
        app.register_blueprint(epi_bp, url_prefix='/api/v1')
        app.register_blueprint(webhook_bp, url_prefix='/api/v1')
        app.register_blueprint(payment_bp, url_prefix='/api/v1')
        app.register_blueprint(tasks_bp, url_prefix='/api/v1')
        app.register_blueprint(operations_bp, url_prefix='/api/v1')
        app.register_blueprint(operation_control_bp)
        app.register_blueprint(analysis_bp)
        app.register_blueprint(operation_metadata_bp)
        app.register_blueprint(permissions_bp, url_prefix='/api/v1')
        app.register_blueprint(telemetry_bp, url_prefix='/api/v1/telemetry')

        # Configuração do search_path para o PostgreSQL
        @db.event.listens_for(db.engine, "connect")
        def set_search_path(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute(f"SET search_path TO {app.config['SEARCH_PATH']}")
            cursor.close()

        # Registro dos eventos do Socket.IO
        from .socketio.socketio_events import register_socket_events
        register_socket_events(socket_io)

        # Armazenar a instância do Socket.IO no app.extensions para acesso global
        # A instância é criada dentro de register_socket_events
        if not hasattr(app, 'extensions') or 'socketio_events' not in app.extensions:
            app.logger.error("ERRO: SocketIOEvents não foi registrada - notificações não funcionarão!")

    # Configuração da limpeza de sessão após cada requisição
    from .utils.utils import cleanup_session
    app.after_request(cleanup_session)

    # Handlers de erro globais
    @app.errorhandler(404)
    def not_found(error):
        return {"error": "Not found"}, 404

    @app.errorhandler(500)
    def internal_error(error):
        return {"error": "Internal server error"}, 500

    # Aplicação iniciada

    # Sistema de permissões agora usa apenas IDs numéricos (não precisa de inicialização)

    return app