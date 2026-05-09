"""
Fixtures globais para todos os testes do backend AINTAR.
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta
from flask_jwt_extended import create_access_token, create_refresh_token


@pytest.fixture
def app():
    """App Flask em modo de teste com BD em memória."""
    from app import create_app
    test_config = {
        "TESTING": True,
        "JWT_SECRET_KEY": "test-secret-key-nao-usar-em-producao",
        "ACCESS_TOKEN_EXPIRES": timedelta(minutes=15),
        "REFRESH_TOKEN_EXPIRES": timedelta(days=30),
        "INACTIVITY_TIMEOUT": timedelta(hours=2),
        "WARNING_TIMEOUT": timedelta(minutes=90),
        "RATELIMIT_ENABLED": False,
        "CACHE_TYPE": "SimpleCache",
    }
    app = create_app(test_config)
    with app.app_context():
        yield app


@pytest.fixture
def client(app):
    """Cliente HTTP de teste."""
    return app.test_client()


@pytest.fixture
def jwt_admin(app):
    """Token JWT de administrador (perfil '0' — acesso total)."""
    with app.app_context():
        token = create_access_token(
            identity="session_admin_test",
            additional_claims={
                "user_id": 1,
                "user_name": "Administrador Teste",
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
def jwt_user(app):
    """Token JWT de utilizador normal com permissões básicas."""
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
def jwt_refresh(app):
    """Refresh token válido."""
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
