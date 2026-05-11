"""
Fixtures globais para todos os testes do backend AINTAR.
"""
import pytest
from datetime import datetime, timezone, timedelta



class TestConfig:
    """Configuração de teste — sobrepõe settings críticos após create_app."""
    TESTING = True
    SECRET_KEY = "test-secret-nao-usar-em-producao"
    JWT_SECRET_KEY = "test-jwt-secret-nao-usar-em-producao"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    INACTIVITY_TIMEOUT = timedelta(hours=2)
    WARNING_TIMEOUT = timedelta(minutes=90)
    CACHE_TYPE = "SimpleCache"
    CACHE_DEFAULT_TIMEOUT = 300
    RATELIMIT_ENABLED = False
    WTF_CSRF_ENABLED = False


@pytest.fixture(scope="session")
def app():
    """
    App Flask em modo de teste.
    Usa a BD de desenvolvimento real mas com TESTING=True.
    Todos os testes de integração mockam as chamadas à BD — não há escritas reais.
    """
    import os
    os.environ["FLASK_ENV"] = "development"

    from app import create_app
    flask_app = create_app(TestConfig)

    # Garantir que os overrides de teste ficam activos mesmo após os dois from_object
    flask_app.config.update({
        "TESTING": True,
        "JWT_SECRET_KEY": TestConfig.JWT_SECRET_KEY,
        "ACCESS_TOKEN_EXPIRES": TestConfig.ACCESS_TOKEN_EXPIRES,
        "REFRESH_TOKEN_EXPIRES": TestConfig.REFRESH_TOKEN_EXPIRES,
        "INACTIVITY_TIMEOUT": TestConfig.INACTIVITY_TIMEOUT,
        "WARNING_TIMEOUT": TestConfig.WARNING_TIMEOUT,
        "CACHE_TYPE": "SimpleCache",
        "RATELIMIT_ENABLED": False,
    })

    with flask_app.app_context():
        yield flask_app


@pytest.fixture
def client(app):
    """Cliente HTTP de teste."""
    return app.test_client()


@pytest.fixture
def jwt_user(app):
    """Token JWT de utilizador normal."""
    from flask_jwt_extended import create_access_token
    with app.app_context():
        token = create_access_token(
            identity="session_user_test",
            additional_claims={
                "user_id": 42,
                "user_name": "Utilizador Teste",
                "profil": "1",
                "session_id": "session_user_test",
                "interfaces": [100],
                "entity": 10,
                "token_type": "access",
                "created_at": datetime.now(timezone.utc).timestamp(),
                "last_activity": datetime.now(timezone.utc).timestamp(),
            }
        )
    return token


@pytest.fixture
def jwt_admin(app):
    """Token JWT de administrador (perfil '0')."""
    from flask_jwt_extended import create_access_token
    with app.app_context():
        token = create_access_token(
            identity="session_admin_test",
            additional_claims={
                "user_id": 1,
                "user_name": "Admin Teste",
                "profil": "0",
                "session_id": "session_admin_test",
                "interfaces": [1, 2, 3, 100, 200, 300],
                "entity": None,
                "token_type": "access",
                "created_at": datetime.now(timezone.utc).timestamp(),
                "last_activity": datetime.now(timezone.utc).timestamp(),
            }
        )
    return token


@pytest.fixture
def jwt_refresh(app):
    """Refresh token válido."""
    from flask_jwt_extended import create_refresh_token
    with app.app_context():
        token = create_refresh_token(
            identity="session_user_test",
            additional_claims={
                "user_id": 42,
                "user_name": "Utilizador Teste",
                "profil": "1",
                "session_id": "session_user_test",
                "interfaces": [100],
                "entity": 10,
                "token_type": "refresh",
                "refresh_count": 0,
                "created_at": datetime.now(timezone.utc).timestamp(),
                "last_activity": datetime.now(timezone.utc).timestamp(),
            }
        )
    return token


@pytest.fixture
def auth_headers(jwt_user):
    return {"Authorization": f"Bearer {jwt_user}"}


@pytest.fixture
def admin_headers(jwt_admin):
    return {"Authorization": f"Bearer {jwt_admin}"}
