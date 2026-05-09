"""
Testes de integração — auth_routes.py

Cobrem especificamente os bugs identificados na auditoria /perf:
  - Bug #1: cleanup_session registado 2x (after_request duplicado)
  - Bug #5: update_dark_mode abre sessão dupla (nested context managers)

E os contratos de segurança obrigatórios:
  - Login sem credenciais → 400/401
  - Endpoints protegidos sem JWT → 401
  - Rate limiting em endpoints sensíveis
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone


# ─── Bug #1: cleanup_session duplicado ───────────────────────────────────────

class TestCleanupSessionNaoDuplica:
    """
    Bug identificado: cleanup_session registado como @bp.after_request E
    bp.after_request(cleanup_session) na linha 426 — executa 2x por request.
    """

    def test_cleanup_session_executa_apenas_uma_vez_por_request(self, client, auth_headers):
        """
        Cenário: qualquer request autenticado.
        Esperado: cleanup_session chamado exatamente 1 vez.
        Bug atual: chamado 2 vezes — pode causar erros se g já foi limpo.
        """
        cleanup_call_count = {"count": 0}
        original_cleanup = None

        from app.routes.auth_routes import cleanup_session as original_fn

        def counting_cleanup(response):
            cleanup_call_count["count"] += 1
            return original_fn(response)

        with patch("app.routes.auth_routes.cleanup_session", side_effect=counting_cleanup):
            with patch("app.services.auth_service.check_inactivity", return_value=False), \
                 patch("app.services.auth_service.get_last_activity",
                       return_value=datetime.now(timezone.utc)), \
                 patch("app.utils.utils.set_session"):
                client.get("/api/v1/check_session", headers=auth_headers)

        assert cleanup_call_count["count"] == 1, (
            f"BUG: cleanup_session foi chamado {cleanup_call_count['count']}x. "
            "Verificar duplicação em auth_routes.py linha 426."
        )


# ─── Bug #5: update_dark_mode — sessão dupla ─────────────────────────────────

class TestUpdateDarkMode:
    """
    Bug identificado: update_dark_mode abre 'with db_session_manager()' na route
    e depois chama fsf_client_darkmodeadd que abre outra sessão internamente.
    2 checkouts do pool por request.
    """

    def test_update_dark_mode_requer_autenticacao(self, client):
        """Sem JWT → 401."""
        resp = client.post("/api/v1/update_dark_mode", json={"user_id": 1, "dark_mode": True})
        assert resp.status_code == 401

    def test_update_dark_mode_valida_campos_obrigatorios(self, client, auth_headers):
        """user_id ou dark_mode em falta → 400 com mensagem PT."""
        with patch("app.utils.utils.set_session"):
            resp = client.post("/api/v1/update_dark_mode",
                               json={"user_id": 1},
                               headers=auth_headers)
        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data or "erro" in data

    def test_update_dark_mode_nao_abre_sessao_dupla(self, client, auth_headers):
        """
        Cenário: toggle dark mode.
        Esperado: db_session_manager chamado 1 vez (pelo service), não 2.
        Bug atual: route abre sessão + service abre outra = 2 checkouts do pool.
        """
        call_count = {"count": 0}

        original_dsm = None

        def counting_dsm(*args, **kwargs):
            call_count["count"] += 1
            mock_ctx = MagicMock()
            mock_ctx.__enter__ = MagicMock(return_value=MagicMock())
            mock_ctx.__exit__ = MagicMock(return_value=False)
            return mock_ctx

        with patch("app.routes.auth_routes.db_session_manager", side_effect=counting_dsm), \
             patch("app.services.auth_service.db_session_manager", side_effect=counting_dsm), \
             patch("app.services.auth_service.fsf_client_darkmodeadd"), \
             patch("app.utils.utils.set_session"):

            resp = client.post("/api/v1/update_dark_mode",
                               json={"user_id": 42, "dark_mode": True},
                               headers=auth_headers)

        assert call_count["count"] <= 1, (
            f"BUG: db_session_manager foi aberto {call_count['count']}x numa única request. "
            "A route não deve abrir sessão — o service já gere isso."
        )


# ─── /login — contratos de segurança ─────────────────────────────────────────

class TestLoginEndpoint:
    """Contratos de segurança do endpoint de login."""

    def test_login_sem_body_retorna_400(self, client):
        """Corpo vazio → 400, não 500."""
        resp = client.post("/api/v1/login", json={})
        assert resp.status_code in (400, 422)

    def test_login_credenciais_invalidas_retorna_401(self, client):
        """Credenciais erradas → 401 com mensagem genérica."""
        from app.utils.error_handler import InvalidCredentialsError

        with patch("app.services.auth_service.login_user") as mock_login:
            mock_login.side_effect = InvalidCredentialsError("Credenciais inválidas.")
            resp = client.post("/api/v1/login",
                               json={"username": "ninguem", "password": "errada"})

        assert resp.status_code == 401
        data = resp.get_json()
        # Nunca expor detalhes internos
        response_text = str(data).lower()
        assert "sql" not in response_text
        assert "postgresql" not in response_text
        assert "traceback" not in response_text

    def test_login_bem_sucedido_retorna_tokens(self, client):
        """Credenciais válidas → 200 com access_token e refresh_token."""
        mock_user_data = {
            "user_id": 42,
            "user_name": "Teste",
            "profil": "1",
            "session_id": "sess_abc",
            "interfaces": [100],
            "permissions": ["docs.view"],
            "dark_mode": False,
            "vacation": False,
            "entity": 10,
            "access_token": "tok_acc",
            "refresh_token": "tok_ref",
        }

        with patch("app.services.auth_service.login_user", return_value=mock_user_data):
            resp = client.post("/api/v1/login",
                               json={"username": "utilizador", "password": "correta"})

        assert resp.status_code == 200
        data = resp.get_json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "permissions" in data

    def test_login_rate_limit_bloqueia_apos_10_tentativas(self, client):
        """Mais de 10 tentativas por minuto → 429 Too Many Requests."""
        with patch("app.services.auth_service.login_user") as mock_login:
            from app.utils.error_handler import InvalidCredentialsError
            mock_login.side_effect = InvalidCredentialsError("Inválido")

            responses = []
            for _ in range(12):
                r = client.post("/api/v1/login",
                                json={"username": "brute", "password": "force"},
                                environ_base={"REMOTE_ADDR": "10.0.0.1"})
                responses.append(r.status_code)

        # Pelo menos uma deve ser 429
        assert 429 in responses, "Rate limiting não está a funcionar no /login"


# ─── /me — dados do utilizador ───────────────────────────────────────────────

class TestMeEndpoint:
    """Testes do endpoint /me."""

    def test_me_sem_jwt_retorna_401(self, client):
        """Sem token → 401."""
        resp = client.get("/api/v1/me")
        assert resp.status_code == 401

    def test_me_retorna_interfaces_e_permissions(self, client, auth_headers):
        """JWT válido → 200 com interfaces e permissions."""
        mock_result = MagicMock()
        mock_result.interfaces = [100, 200]

        mock_session = MagicMock()
        mock_session.execute.return_value.fetchone.return_value = mock_result

        mock_ctx = MagicMock()
        mock_ctx.__enter__ = MagicMock(return_value=mock_session)
        mock_ctx.__exit__ = MagicMock(return_value=False)

        with patch("app.routes.auth_routes.db_session_manager", return_value=mock_ctx), \
             patch("app.routes.auth_routes.permission_manager") as mock_pm, \
             patch("app.utils.utils.set_session"):

            mock_pm.pks_to_permissions.return_value = ["docs.view", "portal.access"]
            resp = client.get("/api/v1/me", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.get_json()
        assert "interfaces" in data
        assert "permissions" in data
        assert isinstance(data["permissions"], list)


# ─── /logout — comportamento correto ─────────────────────────────────────────

class TestLogoutEndpoint:
    """Testes do endpoint de logout."""

    def test_logout_sem_token_retorna_200(self, client):
        """
        Logout sem token (jwt optional) → 200.
        Garante que o frontend pode sempre limpar estado local.
        """
        resp = client.post("/api/v1/logout")
        assert resp.status_code == 200

    def test_logout_com_token_valido_retorna_200(self, client, auth_headers):
        """JWT válido → 200 e sessão terminada."""
        with patch("app.services.auth_service.logout_user", return_value=True), \
             patch("app.utils.utils.add_token_to_blacklist"):
            resp = client.post("/api/v1/logout", headers=auth_headers)

        assert resp.status_code == 200


# ─── /check_session — inatividade ────────────────────────────────────────────

class TestCheckSession:
    """Testes de verificação de sessão por inatividade."""

    def test_sessao_inativa_retorna_401(self, client, auth_headers):
        """Sessão expirada por inatividade → 401."""
        with patch("app.services.auth_service.check_inactivity", return_value=True), \
             patch("app.utils.utils.set_session"):
            resp = client.get("/api/v1/check_session", headers=auth_headers)

        assert resp.status_code == 401
        data = resp.get_json()
        assert "expirada" in str(data).lower()

    def test_sessao_valida_retorna_200(self, client, auth_headers):
        """Sessão ativa → 200."""
        from datetime import datetime, timezone
        with patch("app.services.auth_service.check_inactivity", return_value=False), \
             patch("app.services.auth_service.get_last_activity",
                   return_value=datetime.now(timezone.utc)), \
             patch("app.utils.utils.set_session"):
            resp = client.get("/api/v1/check_session", headers=auth_headers)

        assert resp.status_code == 200
