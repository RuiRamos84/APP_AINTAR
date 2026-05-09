"""
Testes unitários — auth_service.py

Cobrem especificamente os bugs identificados na auditoria /perf:
  - Bug #2: fsf_client_notificationclean usa db.session em vez do context manager
  - Bug #3: list_cached_activities shadow variable — expõe dados de todos os utilizadores
  - Bug #4: active_users set global — estado inconsistente entre chamadas
"""
import pytest
from unittest.mock import MagicMock, patch, call
from datetime import datetime, timezone, timedelta


# ─── Bug #3: list_cached_activities shadow variable ───────────────────────────

class TestListCachedActivities:
    """
    Bug identificado: o parâmetro 'current_user' é sobrescrito pelo 'for current_user in active_users'.
    A função devia retornar dados apenas do utilizador solicitado — não de todos.
    """

    def test_quando_chamada_com_user_especifico_nao_deve_retornar_outros_users(self):
        """
        Cenário: utilizador 42 pede as suas atividades.
        Esperado: apenas dados do utilizador 42.
        Bug atual: retorna dados de TODOS os utilizadores no set.
        """
        from app.services.auth_service import list_cached_activities, active_users, LAST_ACTIVITY_PREFIX

        # Simular dois utilizadores ativos
        active_users.clear()
        active_users.add(42)
        active_users.add(99)  # utilizador diferente

        now = datetime.now(timezone.utc)
        cache_data = {
            f"{LAST_ACTIVITY_PREFIX}42": now,
            f"{LAST_ACTIVITY_PREFIX}99": now,
        }

        with patch("app.services.auth_service.cache") as mock_cache:
            mock_cache.get.side_effect = lambda key: cache_data.get(key)

            result = list_cached_activities(42)

        # O utilizador 42 NUNCA deve ver dados do utilizador 99
        user_ids = [a["user_id"] for a in result]
        assert 99 not in user_ids, (
            "BUG: list_cached_activities expõe dados de outros utilizadores. "
            "Shadow variable 'for current_user in active_users' sobrescreve o parâmetro."
        )

    def test_quando_user_sem_atividade_em_cache_nao_aparece_no_resultado(self):
        """
        Cenário: utilizador está no set mas não tem entrada no Redis (expirou).
        Esperado: não aparece no resultado e é removido do set.
        """
        from app.services.auth_service import list_cached_activities, active_users

        active_users.clear()
        active_users.add(42)

        with patch("app.services.auth_service.cache") as mock_cache:
            mock_cache.get.return_value = None  # Não está em cache

            result = list_cached_activities(42)

        assert result == []
        assert 42 not in active_users  # Deve ter sido removido do set


# ─── Bug #2: fsf_client_notificationclean usa db.session diretamente ──────────

class TestNotificationClean:
    """
    Bug identificado: dentro de 'with db_session_manager() as session:', a função
    usa 'db.session' em vez de 'session', abrindo uma segunda sessão não gerida.
    """

    def test_notificationclean_usa_session_do_context_manager(self):
        """
        Cenário: chamada a fsf_client_notificationclean.
        Esperado: usa o objeto 'session' do context manager, não db.session.
        Bug atual: usa db.session — pool leak potencial.
        """
        mock_session = MagicMock()
        mock_session.execute.return_value.fetchone.return_value = [1]

        mock_context = MagicMock()
        mock_context.__enter__ = MagicMock(return_value=mock_session)
        mock_context.__exit__ = MagicMock(return_value=False)

        with patch("app.services.auth_service.db_session_manager", return_value=mock_context), \
             patch("app.services.auth_service.db") as mock_db:

            from app.services.auth_service import fsf_client_notificationclean
            fsf_client_notificationclean(user_id=42)

        # db.session.execute NÃO deve ter sido chamado — apenas session.execute
        mock_db.session.execute.assert_not_called()
        mock_session.execute.assert_called_once()


# ─── Bug #4: active_users set global ─────────────────────────────────────────

class TestActiveUsersGlobalState:
    """
    Bug identificado: active_users é um set() em memória global.
    Entre testes (e entre workers em produção) o estado persiste.
    """

    def test_update_last_activity_adiciona_user_ao_set(self):
        """Cenário: update_last_activity deve registar o utilizador."""
        from app.services.auth_service import update_last_activity, active_users

        active_users.clear()

        with patch("app.services.auth_service.cache") as mock_cache:
            update_last_activity(99)

        assert 99 in active_users
        mock_cache.set.assert_called_once()

    def test_clear_inactive_users_remove_users_sem_atividade_recente(self):
        """Cenário: utilizadores sem atividade há mais de INACTIVITY_TIMEOUT são removidos."""
        from app.services.auth_service import clear_inactive_users, active_users

        active_users.clear()
        active_users.add(1)
        active_users.add(2)

        now = datetime.now(timezone.utc)
        expired_time = now - timedelta(hours=3)  # expirado

        def mock_get(key):
            if "1" in key:
                return expired_time  # expirado
            return now  # ativo

        with patch("app.services.auth_service.cache") as mock_cache, \
             patch("app.services.auth_service.current_app") as mock_app:

            mock_cache.get.side_effect = mock_get
            mock_app.config = {"INACTIVITY_TIMEOUT": timedelta(hours=2)}

            clear_inactive_users()

        assert 1 not in active_users  # foi removido
        assert 2 in active_users       # ainda ativo


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

    def test_login_nunca_expoe_detalhes_internos_de_sql(self):
        """
        Cenário: erro interno na BD durante login.
        Esperado: mensagem genérica ao utilizador — NUNCA stack trace ou SQL.
        Segurança: previne information disclosure.
        """
        from app.utils.error_handler import APIError

        with patch("app.services.auth_service.fs_login") as mock_fs_login:
            mock_fs_login.side_effect = Exception(
                "FATAL: password authentication failed for user 'aintar_app'"
            )

            from app.services.auth_service import login_user
            with pytest.raises(APIError) as exc_info:
                login_user("utilizador", "pass_errada")

        error_msg = str(exc_info.value).lower()
        assert "password" not in error_msg, "Detalhes de SQL expostos ao utilizador!"
        assert "fatal" not in error_msg, "Mensagem interna do PostgreSQL exposta!"

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
        import xml.etree.ElementTree as ET

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
