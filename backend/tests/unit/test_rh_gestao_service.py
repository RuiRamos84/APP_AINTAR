"""
Testes unitários — rh_gestao_service.py::_assert_pode_validar

Esta é a guarda de autorização partilhada por todo o workflow de RH
(férias, faltas, ponto mensal, participações). O modelo tem três papéis
distintos, cada um só válido na sua própria condição:
  - Admin de sistema (profile=0): valida qualquer passo, sem restrição.
  - Nível 1 (supervisor): exige ser de facto o superior directo do
    colaborador — mesmo rh.admin NÃO bypassa este nível só por ser RH.
  - Níveis seguintes (RH): exigem rh.admin; ser superior directo não chega.

Corrigido na sessão de 2026-07-15 (antes, qualquer rh.validate validava
qualquer step de qualquer registo) — estes testes fixam esse comportamento.
"""
import pytest
from unittest.mock import MagicMock, patch

from app.utils.error_handler import APIError

MODULE = 'app.services.rh_gestao_service'


def _call(step, tipo_ref='ferias', ref_pk=100, caller_pk=5):
    from app.services.rh_gestao_service import _assert_pode_validar
    session = MagicMock()
    _assert_pode_validar(session, tipo_ref, ref_pk, step, caller_pk)


class TestSystemAdminBypassa:

    def test_admin_de_sistema_valida_step1_mesmo_sem_ser_superior(self):
        """profile=0 bypassa tudo — não chega a consultar dono nem hierarquia."""
        with patch(f'{MODULE}._is_system_admin', return_value=True), \
             patch(f'{MODULE}._get_owner_fk') as mock_owner, \
             patch(f'{MODULE}._is_direct_superior') as mock_superior:
            _call(step=1)

        mock_owner.assert_not_called()
        mock_superior.assert_not_called()

    def test_admin_de_sistema_valida_step_avancado(self):
        with patch(f'{MODULE}._is_system_admin', return_value=True), \
             patch(f'{MODULE}._is_full_rh_admin') as mock_rh_admin:
            _call(step=2)

        mock_rh_admin.assert_not_called()


class TestStep1Supervisor:

    def test_superior_directo_pode_validar_step1(self):
        with patch(f'{MODULE}._is_system_admin', return_value=False), \
             patch(f'{MODULE}._get_owner_fk', return_value=42), \
             patch(f'{MODULE}._is_direct_superior', return_value=True):
            _call(step=1, caller_pk=5)  # não levanta excepção

    def test_nao_superior_directo_levanta_403(self):
        with patch(f'{MODULE}._is_system_admin', return_value=False), \
             patch(f'{MODULE}._get_owner_fk', return_value=42), \
             patch(f'{MODULE}._is_direct_superior', return_value=False):
            with pytest.raises(APIError) as exc_info:
                _call(step=1, caller_pk=5)

        assert exc_info.value.status_code == 403
        assert 'superior' in exc_info.value.message.lower()

    def test_rh_admin_sem_ser_superior_directo_nao_valida_step1(self):
        """
        Regressão do bug corrigido em 2026-07-15: rh.admin NÃO deve bypassar
        o nível de supervisor só por ser RH — quem valida como supervisor
        tem de o ser de facto. _is_full_rh_admin nem chega a ser chamado
        no ramo do step 1.
        """
        with patch(f'{MODULE}._is_system_admin', return_value=False), \
             patch(f'{MODULE}._get_owner_fk', return_value=42), \
             patch(f'{MODULE}._is_direct_superior', return_value=False), \
             patch(f'{MODULE}._is_full_rh_admin') as mock_rh_admin:
            with pytest.raises(APIError) as exc_info:
                _call(step=1, caller_pk=5)

        assert exc_info.value.status_code == 403
        mock_rh_admin.assert_not_called()

    def test_registo_nao_encontrado_levanta_404(self):
        with patch(f'{MODULE}._is_system_admin', return_value=False), \
             patch(f'{MODULE}._get_owner_fk', return_value=None):
            with pytest.raises(APIError) as exc_info:
                _call(step=1, ref_pk=999)

        assert exc_info.value.status_code == 404


class TestStepAvancadoRh:

    def test_rh_admin_valida_step2(self):
        with patch(f'{MODULE}._is_system_admin', return_value=False), \
             patch(f'{MODULE}._is_full_rh_admin', return_value=True):
            _call(step=2)  # não levanta excepção

    def test_sem_rh_admin_levanta_403_no_step2(self):
        with patch(f'{MODULE}._is_system_admin', return_value=False), \
             patch(f'{MODULE}._is_full_rh_admin', return_value=False):
            with pytest.raises(APIError) as exc_info:
                _call(step=2)

        assert exc_info.value.status_code == 403
        assert 'rh' in exc_info.value.message.lower()

    def test_ser_superior_directo_nao_chega_para_step2(self):
        """
        Simétrico ao teste do step 1: ser superior directo do colaborador
        não dá autoridade para validar o nível de RH — _is_direct_superior
        nem chega a ser consultado no ramo de step >= 2.
        """
        with patch(f'{MODULE}._is_system_admin', return_value=False), \
             patch(f'{MODULE}._is_full_rh_admin', return_value=False), \
             patch(f'{MODULE}._is_direct_superior') as mock_superior:
            with pytest.raises(APIError):
                _call(step=2)

        mock_superior.assert_not_called()
