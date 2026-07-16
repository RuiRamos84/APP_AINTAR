"""
Testes unitários — auth_service.py

Cobrem especificamente os bugs identificados na auditoria /perf:
  - Bug #2: fsf_client_notificationclean usa db.session em vez do context manager
  - Bug #3: list_cached_activities shadow variable — expõe dados de todos os utilizadores
  - Bug #4: active_users set global — estado inconsistente entre chamadas
"""
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone, timedelta


# ─── Bug #3: list_cached_activities shadow variable (já corrigido) ────────────

class TestListCachedActivities:
    """
    Após a correção do Bug #3 e #4:
    - 'active_users' foi migrado para Redis via _get_active_users() / _add_active_user()
    - A shadow variable foi eliminada: 'for user_id in _get_active_users()'
    Testamos o comportamento através da API pública.
    """

    def test_users_sem_atividade_em_cache_nao_aparecem_no_resultado(self):
        """
        Cenário: utilizador está na lista mas não tem entrada no Redis (TTL expirou).
        Esperado: não aparece no resultado.
        """
        from app.services.auth_service import list_cached_activities, LAST_ACTIVITY_PREFIX

        with patch("app.services.auth_service._get_active_users", return_value={42}), \
             patch("app.services.auth_service.cache") as mock_cache, \
             patch("app.services.auth_service._remove_active_user") as mock_remove:

            mock_cache.get.return_value = None  # sem atividade no Redis

            result = list_cached_activities()

        assert result == []
        mock_remove.assert_called_once_with(42)

    def test_users_com_atividade_recente_aparecem_no_resultado(self):
        """
        Cenário: dois utilizadores com atividade recente.
        Esperado: ambos no resultado com user_id e last_activity.
        """
        from app.services.auth_service import list_cached_activities, LAST_ACTIVITY_PREFIX

        now = datetime.now(timezone.utc)
        cache_data = {
            f"{LAST_ACTIVITY_PREFIX}42": now,
            f"{LAST_ACTIVITY_PREFIX}99": now,
        }

        with patch("app.services.auth_service._get_active_users", return_value={42, 99}), \
             patch("app.services.auth_service.cache") as mock_cache:

            mock_cache.get.side_effect = lambda key: cache_data.get(key)
            result = list_cached_activities()

        user_ids = {a["user_id"] for a in result}
        assert 42 in user_ids
        assert 99 in user_ids
        assert len(result) == 2


# ─── Bug #2: fsf_client_notificationclean usa db.session diretamente ──────────

class TestNotificationClean:
    """
    Bug original: fsf_client_notificationclean (então em auth_service.py)
    usava 'db.session' em vez do 'session' do context manager, abrindo uma
    segunda sessão não gerida. Essa função foi entretanto removida de
    auth_service.py — a lógica de notificações de documentos vive hoje em
    notification_service.py::NotificationService.mark_notification_as_read,
    que já usa exclusivamente o session do context manager (o módulo nem
    importa 'db'), pelo que o bug deixou de ser estruturalmente possível.
    Este teste segue a função actual e fixa o mesmo contrato.
    """

    def test_mark_notification_as_read_usa_session_do_context_manager(self):
        """
        Cenário: chamada a NotificationService.mark_notification_as_read.
        Esperado: executa via o 'session' do context manager, com o
        document_id certo, e faz commit.
        """
        mock_session = MagicMock()

        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)

        with patch("app.services.notification_service.db_session_manager", return_value=mock_context):
            from app.services.notification_service import NotificationService
            NotificationService().mark_notification_as_read(document_id=42, session_id="session_abc")

        mock_session.execute.assert_called_once()
        assert mock_session.execute.call_args[0][1] == {"doc_id": 42}
        mock_session.commit.assert_called_once()


# ─── Bug #4: active_users → Redis (já corrigido) ─────────────────────────────

class TestActiveUsersRedis:
    """
    Após a correção do Bug #4:
    - active_users set() global foi substituído por _get_active_users() via Redis cache
    - Funciona entre workers/processos (estado partilhado)
    Testamos o comportamento público de update_last_activity e clear_inactive_users.
    """

    def test_update_last_activity_regista_timestamp_e_adiciona_ao_redis(self):
        """Cenário: update_last_activity deve persistir timestamp e ID no Redis."""
        from app.services.auth_service import (
            update_last_activity, LAST_ACTIVITY_PREFIX, ACTIVE_USERS_CACHE_KEY
        )

        with patch("app.services.auth_service.cache") as mock_cache:
            mock_cache.get.return_value = []  # lista vazia no Redis
            update_last_activity(99)

        # Deve ter feito pelo menos 2 set: timestamp + lista de users
        assert mock_cache.set.call_count >= 2

        # Verifica que o timestamp do user 99 foi guardado
        calls_keys = [str(c) for c in mock_cache.set.call_args_list]
        assert any(LAST_ACTIVITY_PREFIX in k for k in calls_keys)

    def test_clear_inactive_users_remove_users_expirados_do_redis(self):
        """Cenário: utilizadores sem atividade há mais de INACTIVITY_TIMEOUT são removidos."""
        from app.services.auth_service import clear_inactive_users, LAST_ACTIVITY_PREFIX

        now = datetime.now(timezone.utc)
        expired = now - timedelta(hours=3)

        def mock_get(key):
            if key == "aintar:active_users":
                return [1, 2]
            if LAST_ACTIVITY_PREFIX + "1" == key:
                return expired   # user 1 expirou
            if LAST_ACTIVITY_PREFIX + "2" == key:
                return now       # user 2 ainda ativo
            return None

        mock_current_app = MagicMock()
        mock_current_app.config = {"INACTIVITY_TIMEOUT": timedelta(hours=2)}

        with patch("app.services.auth_service.cache") as mock_cache, \
             patch("app.services.auth_service.current_app", new=mock_current_app), \
             patch("app.services.auth_service._remove_active_user") as mock_remove:

            mock_cache.get.side_effect = mock_get
            clear_inactive_users()

        # User 1 deve ter sido removido, user 2 mantido
        removed_ids = [c.args[0] for c in mock_remove.call_args_list]
        assert 1 in removed_ids
        assert 2 not in removed_ids


# ─── login_user — happy path e segurança ─────────────────────────────────────

class TestLoginUser:
    """Testes de comportamento do processo de login."""

    def test_login_com_conta_desativada_levanta_erro_especifico(self):
        """
        Cenário: utilizador tenta fazer login mas a conta está desativada (active=0).
        Esperado: InvalidCredentialsError com mensagem PT, não erro genérico 503.
        """
        from app.utils.error_handler import InvalidCredentialsError

        with patch("app.services.auth_service.fs_login") as mock_fs_login:
            mock_fs_login.side_effect = InvalidCredentialsError(
                "Conta desativada. Contacte o administrador."
            )

            from app.services.auth_service import login_user
            with pytest.raises(InvalidCredentialsError) as exc_info:
                login_user("user_inativo", "qualquer_pass")

        assert "desativada" in str(exc_info.value).lower()

    def test_fs_login_nunca_expoe_detalhes_internos_de_sql(self):
        """
        Cenário: BD lança erro interno durante fs_login.
        Esperado: fs_login converte para APIError com mensagem genérica — NUNCA
        expõe stack trace, credenciais de BD ou mensagens internas do PostgreSQL.
        Segurança: previne information disclosure (OWASP A05).
        Testamos fs_login diretamente, pois é aí que acontece a conversão.
        """
        from app.utils.error_handler import APIError

        db_error = Exception(
            "FATAL: password authentication failed for user 'aintar_app'"
        )

        # Mock do pre-check (conta ativa) e do db.session.execute (falha na query principal)
        mock_pre_session = MagicMock()
        mock_pre_session.execute.return_value.fetchone.return_value = None

        mock_pre_ctx = MagicMock()
        mock_pre_ctx.__enter__ = MagicMock(return_value=mock_pre_session)
        mock_pre_ctx.__exit__ = MagicMock(return_value=False)

        with patch("app.services.auth_service.db_session_manager", return_value=mock_pre_ctx), \
             patch("app.services.auth_service.db") as mock_db:

            mock_db.session.execute.side_effect = db_error
            mock_db.session.rollback = MagicMock()

            from app.services.auth_service import fs_login
            with pytest.raises(APIError) as exc_info:
                fs_login("utilizador", "pass_errada")

        error_msg = str(exc_info.value).lower()
        assert "aintar_app" not in error_msg, "Credencial de BD exposta!"
        assert "fatal" not in error_msg, "Mensagem interna do PostgreSQL exposta!"
        assert "password authentication" not in error_msg, "Detalhe SQL exposto!"

    def test_login_bem_sucedido_retorna_tokens_e_dados_usuario(self):
        """
        Cenário: credenciais corretas.
        Esperado: access_token, refresh_token, user_id, permissions presentes.
        """
        mock_user_row = MagicMock()
        mock_user_row.pk = 42
        mock_user_row.client_name = "Utilizador Teste"
        mock_user_row.darkmode = False
        mock_user_row.vacation = False
        mock_user_row.ts_entity = 10

        mock_interfaces_row = MagicMock()
        mock_interfaces_row.interfaces = [100, 200]

        mock_session = MagicMock()
        mock_session.execute.return_value.fetchone.side_effect = [
            mock_user_row,
            mock_interfaces_row,
        ]

        mock_ctx = MagicMock()
        mock_ctx.__enter__ = MagicMock(return_value=mock_session)
        mock_ctx.__exit__ = MagicMock(return_value=False)

        with patch("app.services.auth_service.fs_login", return_value=("session_abc", "1")), \
             patch("app.services.auth_service.db_session_manager", return_value=mock_ctx), \
             patch("app.services.auth_service.update_last_activity"), \
             patch("app.services.auth_service.create_tokens", return_value=("tok_acc", "tok_ref")), \
             patch("app.services.auth_service.permission_manager") as mock_pm:

            mock_pm.pks_to_permissions.return_value = ["docs.view"]

            from app.services.auth_service import login_user
            result = login_user("utilizador", "password")

        assert "access_token" in result
        assert "refresh_token" in result
        assert result["user_id"] == 42
        assert "permissions" in result


# ─── fs_logout — comportamento correto ───────────────────────────────────────

class TestFsLogout:
    """Testes do processo de logout."""

    def test_logout_bem_sucedido_retorna_success_true(self):
        """Cenário: logout normal retorna {'success': True}."""
        xml_ok = "<root><sucess>LOGOUT COM SUCESSO</sucess></root>"
        mock_session = MagicMock()
        mock_session.execute.return_value.fetchone.return_value = [xml_ok]

        mock_ctx = MagicMock()
        mock_ctx.__enter__ = MagicMock(return_value=mock_session)
        mock_ctx.__exit__ = MagicMock(return_value=False)

        with patch("app.services.auth_service.db_session_manager", return_value=mock_ctx):
            from app.services.auth_service import fs_logout
            result = fs_logout("session_abc")

        assert result["success"] is True

    def test_logout_com_erro_retorna_success_false_com_mensagem(self):
        """Cenário: BD retorna erro no logout — não deve levantar exceção, retorna dict."""
        xml_err = "<root><error>SESSÃO NÃO ENCONTRADA</error></root>"
        mock_session = MagicMock()
        mock_session.execute.return_value.fetchone.return_value = [xml_err]

        mock_ctx = MagicMock()
        mock_ctx.__enter__ = MagicMock(return_value=mock_session)
        mock_ctx.__exit__ = MagicMock(return_value=False)

        with patch("app.services.auth_service.db_session_manager", return_value=mock_ctx):
            from app.services.auth_service import fs_logout
            result = fs_logout("session_invalida")

        assert result["success"] is False
        assert "message" in result


# ─── refresh_access_token — rotação e validações ─────────────────────────────

class TestRefreshAccessToken:
    """
    Testes unitários de refresh_access_token.
    Cobre: tipo de token errado, token expirado por age, inatividade total,
    inatividade por client_time, e rotação correcta com incremento de refresh_count.
    """

    def _make_decoded(self, age_hours=1, inactivity_hours=0, refresh_count=0):
        """Helper: decoded token com timestamps controlados."""
        now = datetime.now(timezone.utc)
        return {
            "token_type": "refresh",
            "user_id": 42,
            "user_name": "Utilizador Teste",
            "session_id": "sess_test",
            "profil": "1",
            "entity": 10,
            "interfaces": [100],
            "refresh_count": refresh_count,
            "notification_count": None,
            "dark_mode": False,
            "vacation": False,
            "created_at": (now - timedelta(hours=age_hours)).timestamp(),
            "last_activity": (now - timedelta(hours=inactivity_hours)).timestamp(),
        }

    def test_token_com_tipo_errado_levanta_InvalidTokenError(self):
        """Token do tipo 'access' passado no endpoint de refresh → InvalidTokenError."""
        from jwt.exceptions import InvalidTokenError

        decoded = self._make_decoded()
        decoded["token_type"] = "access"

        now = datetime.now(timezone.utc)
        with patch("app.services.auth_service.jwt_decode_token", return_value=decoded):
            from app.services.auth_service import refresh_access_token
            with pytest.raises(InvalidTokenError):
                refresh_access_token("any_token", now, now)

    def test_token_expirado_por_age_levanta_TokenExpiredError(self, app):
        """Token com mais de 30 dias de idade → TokenExpiredError."""
        from app.utils.error_handler import TokenExpiredError

        decoded = self._make_decoded(age_hours=31 * 24)
        now = datetime.now(timezone.utc)

        with patch("app.services.auth_service.jwt_decode_token", return_value=decoded):
            from app.services.auth_service import refresh_access_token
            with pytest.raises(TokenExpiredError):
                refresh_access_token("any_token", now, now)

    def test_inatividade_total_ha_mais_de_2h_levanta_TokenExpiredError(self, app):
        """Última atividade há mais de 2h → TokenExpiredError (sessão expirada)."""
        from app.utils.error_handler import TokenExpiredError

        decoded = self._make_decoded(age_hours=1, inactivity_hours=3)
        now = datetime.now(timezone.utc)

        with patch("app.services.auth_service.jwt_decode_token", return_value=decoded):
            from app.services.auth_service import refresh_access_token
            with pytest.raises(TokenExpiredError):
                refresh_access_token("any_token", now, now)

    def test_client_time_desatualizado_levanta_TokenExpiredError(self, app):
        """client_time desatualizado há mais de INACTIVITY_TIMEOUT → TokenExpiredError."""
        from app.utils.error_handler import TokenExpiredError

        decoded = self._make_decoded(age_hours=1, inactivity_hours=0)
        server_time = datetime.now(timezone.utc)
        client_time = server_time - timedelta(hours=3)  # desfasado 3h

        with patch("app.services.auth_service.jwt_decode_token", return_value=decoded):
            from app.services.auth_service import refresh_access_token
            with pytest.raises(TokenExpiredError):
                refresh_access_token("any_token", client_time, server_time)

    def test_refresh_valido_incrementa_refresh_count_e_retorna_tokens(self, app):
        """
        Refresh válido → refresh_count passa de 0 para 1, retorna novos tokens.
        Garante que cada rotação de token fica registada no payload.
        """
        decoded = self._make_decoded(age_hours=1, inactivity_hours=0, refresh_count=0)
        now = datetime.now(timezone.utc)

        captured = {}

        def capture_create_tokens(user_data, rc):
            captured["refresh_count"] = rc
            return ("new_access", "new_refresh")

        with patch("app.services.auth_service.jwt_decode_token", return_value=decoded), \
             patch("app.services.auth_service.create_tokens",
                   side_effect=capture_create_tokens), \
             patch("app.services.auth_service.update_last_activity"), \
             patch("app.services.auth_service.permission_manager") as mock_pm:

            mock_pm.pks_to_permissions.return_value = ["docs.view"]
            from app.services.auth_service import refresh_access_token
            result = refresh_access_token("any_token", now, now)

        assert captured["refresh_count"] == 1
        assert result["access_token"] == "new_access"
        assert result["refresh_token"] == "new_refresh"
        assert "permissions" in result
