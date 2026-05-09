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


# ─── Bug #1: cleanup_session duplicado ───────────────────────────────────────

class TestCleanupSessionNaoDuplica:
    """
    Bug identificado: cleanup_session registado como @bp.after_request E
    bp.after_request(cleanup_session) na linha 426 — executa 2x por request.
    Após a correção, deve estar registado exactamente 1 vez.
    """

    def test_cleanup_session_registado_apenas_uma_vez_no_blueprint(self, app):
        """
        Verifica que cleanup_session aparece exactamente 1 vez nos after_request
        handlers do blueprint 'auth'. Flask regista as funções em
        app.after_request_funcs[blueprint_name] após processar o blueprint.

        Nota: patch() não intercepta after_request hooks registados no momento
        da importação — por isso inspecionamos a estrutura do app directamente.
        """
        from app.routes.auth_routes import cleanup_session

        auth_handlers = app.after_request_funcs.get("auth", [])
        count = sum(1 for f in auth_handlers if f is cleanup_session)

        assert count == 1, (
            f"BUG: cleanup_session registado {count}x no blueprint 'auth'. "
            "Esperado exactamente 1 registo."
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
        resp = client.post("/api/v1/auth/update_dark_mode", json={"user_id": 1, "dark_mode": True})
        assert resp.status_code == 401

    def test_update_dark_mode_valida_campos_obrigatorios(self, client, auth_headers):
        """user_id ou dark_mode em falta → 400 com mensagem PT."""
        with patch("app.utils.utils.set_session"):
            resp = client.post("/api/v1/auth/update_dark_mode",
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

            client.post("/api/v1/auth/update_dark_mode",
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
        """Corpo vazio → 400 ou 401, não 500."""
        from app.utils.error_handler import InvalidCredentialsError

        # username=None, password=None → credenciais inválidas → 401
        with patch("app.routes.auth_routes.login_user") as mock_login:
            mock_login.side_effect = InvalidCredentialsError("Credenciais inválidas.")
            resp = client.post("/api/v1/auth/login", json={})

        assert resp.status_code in (400, 401, 422)

    def test_login_credenciais_invalidas_retorna_401(self, client):
        """Credenciais erradas → 401 com mensagem genérica."""
        from app.utils.error_handler import InvalidCredentialsError

        with patch("app.routes.auth_routes.login_user") as mock_login:
            mock_login.side_effect = InvalidCredentialsError("Credenciais inválidas.")
            resp = client.post("/api/v1/auth/login",
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

        with patch("app.routes.auth_routes.login_user", return_value=mock_user_data):
            resp = client.post("/api/v1/auth/login",
                               json={"username": "utilizador", "password": "correta"})

        assert resp.status_code == 200
        data = resp.get_json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "permissions" in data

    @pytest.mark.skip(reason="Rate limiting desactivado em TestConfig (RATELIMIT_ENABLED=False). "
                              "Testar em ambiente de staging com Redis real.")
    def test_login_rate_limit_bloqueia_apos_10_tentativas(self, client):
        """Mais de 10 tentativas por minuto → 429 Too Many Requests."""
        with patch("app.routes.auth_routes.login_user") as mock_login:
            from app.utils.error_handler import InvalidCredentialsError
            mock_login.side_effect = InvalidCredentialsError("Inválido")

            responses = []
            for _ in range(12):
                r = client.post("/api/v1/auth/login",
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
        resp = client.get("/api/v1/auth/me")
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
            resp = client.get("/api/v1/auth/me", headers=auth_headers)

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
        resp = client.post("/api/v1/auth/logout")
        assert resp.status_code == 200

    def test_logout_com_token_valido_retorna_200(self, client, auth_headers):
        """JWT válido → 200 e sessão terminada."""
        with patch("app.services.auth_service.logout_user", return_value=True), \
             patch("app.utils.utils.add_token_to_blacklist"):
            resp = client.post("/api/v1/auth/logout", headers=auth_headers)

        assert resp.status_code == 200


# ─── /check_session — inatividade ────────────────────────────────────────────

class TestCheckSession:
    """Testes de verificação de sessão por inatividade."""

    def test_sessao_inativa_retorna_401(self, client, auth_headers):
        """Sessão expirada por inatividade → 401."""
        with patch("app.routes.auth_routes.check_inactivity", return_value=True), \
             patch("app.utils.utils.set_session"):
            resp = client.get("/api/v1/auth/check_session", headers=auth_headers)

        assert resp.status_code == 401
        data = resp.get_json()
        assert "expirada" in str(data).lower()

    def test_sessao_valida_retorna_200(self, client, auth_headers):
        """Sessão ativa → 200."""
        from datetime import datetime, timezone
        with patch("app.routes.auth_routes.check_inactivity", return_value=False), \
             patch("app.routes.auth_routes.get_last_activity",
                   return_value=datetime.now(timezone.utc)), \
             patch("app.utils.utils.set_session"):
            resp = client.get("/api/v1/auth/check_session", headers=auth_headers)

        assert resp.status_code == 200

    def test_sessao_proxima_de_expirar_retorna_warning(self, client, auth_headers):
        """
        Sessão entre WARNING_TIMEOUT (90 min) e INACTIVITY_TIMEOUT (2h)
        → 200 com campo 'warning' e 'time_left' em segundos.
        """
        from datetime import datetime, timezone, timedelta
        old_activity = datetime.now(timezone.utc) - timedelta(minutes=100)

        with patch("app.routes.auth_routes.check_inactivity", return_value=False), \
             patch("app.routes.auth_routes.get_last_activity", return_value=old_activity), \
             patch("app.utils.utils.set_session"):
            resp = client.get("/api/v1/auth/check_session", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.get_json()
        assert "warning" in data
        assert "time_left" in data
        assert data["time_left"] > 0


# ─── /refresh — rotação de tokens ────────────────────────────────────────────

class TestRefreshEndpoint:
    """Testes do endpoint /refresh — rotação de tokens JWT."""

    def test_refresh_sem_body_retorna_400(self, client, jwt_refresh):
        """Body vazio ({}) → 400 — satisfaz 'if not data' no route."""
        resp = client.post(
            "/api/v1/auth/refresh",
            json={},
            headers={"Authorization": f"Bearer {jwt_refresh}"}
        )
        assert resp.status_code == 400

    def test_refresh_sem_current_time_retorna_400(self, client, jwt_refresh):
        """Body sem campo current_time → 400 com mensagem descritiva."""
        resp = client.post(
            "/api/v1/auth/refresh",
            json={"outro_campo": 123},
            headers={"Authorization": f"Bearer {jwt_refresh}"}
        )
        assert resp.status_code == 400
        data = resp.get_json()
        assert "current_time" in str(data).lower()

    def test_refresh_sem_token_retorna_401(self, client):
        """Sem Authorization header → 401 (jwt_required(refresh=True) bloqueia)."""
        resp = client.post(
            "/api/v1/auth/refresh",
            json={"current_time": 1234567890000}
        )
        assert resp.status_code == 401

    def test_refresh_com_access_token_retorna_422(self, client, jwt_user):
        """Access token em vez de refresh token → 422 (tipo errado rejeitado pelo Flask-JWT)."""
        resp = client.post(
            "/api/v1/auth/refresh",
            json={"current_time": 1234567890000},
            headers={"Authorization": f"Bearer {jwt_user}"}
        )
        assert resp.status_code == 422

    def test_refresh_valido_retorna_novos_tokens(self, client, jwt_refresh):
        """Refresh token válido + current_time actual → 200 com novos access e refresh tokens."""
        from datetime import datetime, timezone

        mock_result = {
            "user_id": 42,
            "user_name": "Utilizador Teste",
            "profil": "1",
            "entity": 10,
            "interfaces": [100],
            "permissions": ["docs.view"],
            "session_id": "session_user_test",
            "notification_count": None,
            "dark_mode": False,
            "vacation": False,
            "access_token": "new_access_tok",
            "refresh_token": "new_refresh_tok",
        }

        current_time_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

        with patch("app.routes.auth_routes.refresh_access_token", return_value=mock_result):
            resp = client.post(
                "/api/v1/auth/refresh",
                json={"current_time": current_time_ms},
                headers={"Authorization": f"Bearer {jwt_refresh}"}
            )

        assert resp.status_code == 200
        data = resp.get_json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "permissions" in data

    def test_refresh_expirado_retorna_419(self, client, jwt_refresh):
        """refresh_access_token levanta TokenExpiredError → 419."""
        from app.utils.error_handler import TokenExpiredError
        from datetime import datetime, timezone

        current_time_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

        with patch("app.routes.auth_routes.refresh_access_token",
                   side_effect=TokenExpiredError("Sessão expirada por inatividade")):
            resp = client.post(
                "/api/v1/auth/refresh",
                json={"current_time": current_time_ms},
                headers={"Authorization": f"Bearer {jwt_refresh}"}
            )

        assert resp.status_code == 419


# ─── Logout + blacklist ───────────────────────────────────────────────────────

class TestLogoutBlacklist:
    """Verifica que o logout revoga o token e impede reutilização."""

    def test_logout_adiciona_jti_a_blacklist(self, client, auth_headers, app):
        """
        Após logout com JWT válido, o JTI do token deve constar na blacklist.
        Garante que o token fica inválido para requests futuros.
        """
        from app import blacklist

        with patch("app.routes.auth_routes.logout_user", return_value=True):
            resp = client.post("/api/v1/auth/logout", headers=auth_headers)

        assert resp.status_code == 200
        # Pelo menos um JTI foi adicionado à blacklist durante este request
        assert len(blacklist) >= 1

    def test_token_na_blacklist_retorna_401_em_endpoint_protegido(self, client, app):
        """
        Token cujo JTI está na blacklist → 401 em qualquer endpoint protegido.
        Simula reutilização de token após logout.
        """
        from flask_jwt_extended import create_access_token, decode_token as jwt_decode
        from datetime import datetime, timezone
        from app import blacklist

        token = create_access_token(
            identity="session_blacklist_test",
            additional_claims={
                "user_id": 99,
                "profil": "1",
                "session_id": "session_blacklist_test",
                "interfaces": [],
                "entity": None,
                "token_type": "access",
                "created_at": datetime.now(timezone.utc).timestamp(),
                "last_activity": datetime.now(timezone.utc).timestamp(),
            }
        )

        decoded = jwt_decode(token)
        jti = decoded["jti"]
        blacklist.add(jti)

        try:
            resp = client.get("/api/v1/auth/me",
                              headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 401
        finally:
            blacklist.discard(jti)


# ─── /update_dark_mode — happy path ──────────────────────────────────────────

class TestUpdateDarkModeHappyPath:
    """Verifica o resultado correcto do toggle de dark mode."""

    def test_dark_mode_true_chama_darkmodeadd(self, client, auth_headers):
        """dark_mode=True → fsf_client_darkmodeadd chamado, darkmodeclean não."""
        with patch("app.routes.auth_routes.fsf_client_darkmodeadd") as mock_add, \
             patch("app.routes.auth_routes.fsf_client_darkmodeclean") as mock_clean, \
             patch("app.utils.utils.set_session"):
            resp = client.post("/api/v1/auth/update_dark_mode",
                               json={"user_id": 42, "dark_mode": True},
                               headers=auth_headers)

        assert resp.status_code == 200
        mock_add.assert_called_once()
        mock_clean.assert_not_called()

    def test_dark_mode_false_chama_darkmodeclean(self, client, auth_headers):
        """dark_mode=False → fsf_client_darkmodeclean chamado, darkmodeadd não."""
        with patch("app.routes.auth_routes.fsf_client_darkmodeclean") as mock_clean, \
             patch("app.routes.auth_routes.fsf_client_darkmodeadd") as mock_add, \
             patch("app.utils.utils.set_session"):
            resp = client.post("/api/v1/auth/update_dark_mode",
                               json={"user_id": 42, "dark_mode": False},
                               headers=auth_headers)

        assert resp.status_code == 200
        mock_clean.assert_called_once()
        mock_add.assert_not_called()


# ─── /heartbeat — registo de actividade ──────────────────────────────────────

class TestHeartbeat:
    """Testes do endpoint de heartbeat."""

    def test_heartbeat_requer_autenticacao(self, client):
        """Sem JWT → 401."""
        resp = client.post("/api/v1/auth/heartbeat")
        assert resp.status_code == 401

    def test_heartbeat_retorna_200(self, client, auth_headers):
        """JWT válido → 200."""
        with patch("app.routes.auth_routes.update_last_activity"), \
             patch("app.utils.utils.set_session"):
            resp = client.post("/api/v1/auth/heartbeat", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.get_json()
        assert "message" in data

    def test_heartbeat_chama_update_last_activity_com_session_id(self, client, auth_headers):
        """Heartbeat deve registar atividade com o session_id do JWT (identidade)."""
        with patch("app.routes.auth_routes.update_last_activity") as mock_update, \
             patch("app.utils.utils.set_session"):
            client.post("/api/v1/auth/heartbeat", headers=auth_headers)

        mock_update.assert_called_once_with("session_user_test")


# ─── /preferences — dark_mode e vacation ─────────────────────────────────────

class TestPreferences:
    """Testes do endpoint PATCH /preferences."""

    def test_preferences_requer_autenticacao(self, client):
        """Sem JWT → 401."""
        resp = client.patch("/api/v1/auth/preferences", json={"dark_mode": True})
        assert resp.status_code == 401

    def test_preferences_sem_campos_validos_retorna_400(self, client, auth_headers):
        """Body sem dark_mode nem vacation → 400."""
        with patch("app.utils.utils.set_session"):
            resp = client.patch("/api/v1/auth/preferences",
                                json={"campo_invalido": True},
                                headers=auth_headers)
        assert resp.status_code == 400

    def test_preferences_dark_mode_toggle_retorna_200(self, client, auth_headers):
        """dark_mode=True → 200 e darkmodeadd chamado."""
        with patch("app.routes.auth_routes.fsf_client_darkmodeadd") as mock_add, \
             patch("app.utils.utils.set_session"):
            resp = client.patch("/api/v1/auth/preferences",
                                json={"dark_mode": True},
                                headers=auth_headers)

        assert resp.status_code == 200
        mock_add.assert_called_once()

    def test_preferences_vacation_toggle_retorna_200(self, client, auth_headers):
        """vacation=True → 200 e vacationadd chamado."""
        with patch("app.routes.auth_routes.fsf_client_vacationadd") as mock_vac, \
             patch("app.utils.utils.set_session"):
            resp = client.patch("/api/v1/auth/preferences",
                                json={"vacation": True},
                                headers=auth_headers)

        assert resp.status_code == 200
        mock_vac.assert_called_once()


# ─── /cached-activities ───────────────────────────────────────────────────────

class TestCachedActivities:
    """Testes do endpoint de actividades em cache."""

    def test_cached_activities_requer_autenticacao(self, client):
        """Sem JWT → 401."""
        resp = client.get("/api/v1/auth/cached-activities")
        assert resp.status_code == 401

    def test_cached_activities_retorna_lista(self, client, auth_headers):
        """JWT válido → 200 com lista (pode ser vazia)."""
        mock_activities = [
            {"user_id": 42, "last_activity": "2024-01-01T00:00:00+00:00"}
        ]
        with patch("app.routes.auth_routes.list_cached_activities",
                   return_value=mock_activities), \
             patch("app.utils.utils.set_session"):
            resp = client.get("/api/v1/auth/cached-activities", headers=auth_headers)

        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, list)
        assert len(data) == 1
