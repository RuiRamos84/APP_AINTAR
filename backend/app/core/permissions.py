# app/core/permissions.py

from typing import List, Dict, Optional
from sqlalchemy import text
from .. import db  # Importar a instância da BD
from app.utils.logger import get_logger


logger = get_logger(__name__)


class PermissionManager:
    """Gestor centralizado de permissões"""

    def __init__(self):
        self._permission_map: Dict[str, int] = {}   # value → pk
        self._pk_map: Dict[int, str] = {}            # pk → value
        logger.info("🔐 Gestor de Permissões a inicializar...")

    def load_permissions_from_db(self, app):
        """Carrega o mapa de permissões da base de dados."""
        with app.app_context():
            results = db.session.execute(text("SELECT pk, value FROM ts_interface")).fetchall()
            self._permission_map = {row.value: row.pk for row in results}
            self._pk_map = {row.pk: row.value for row in results}
            logger.info(f"🔐 Gestor de Permissões carregou {len(self._permission_map)} permissões da BD.")

    def pks_to_permissions(self, pks: List[int]) -> List[str]:
        """Converte lista de PKs para lista de value strings (ex: 'portal.access')."""
        return [self._pk_map[pk] for pk in (pks or []) if pk in self._pk_map]

    def check_permission(self, permission_id: str, user_profile: str,
                         user_interfaces: List[int]) -> bool:
        """Verifica se o utilizador tem uma permissão, baseando-se no seu array de interfaces."""

        # Super admin (perfil '0') sempre tem acesso
        if user_profile == "0":
            return True

        # Obter o ID da interface correspondente à permissão
        required_interface_id = self._permission_map.get(permission_id)
        if required_interface_id is None:
            logger.warning(f"Permissão '{permission_id}' não encontrada no mapa de permissões.")
            return False

        # Verificar se o ID necessário está na lista de interfaces do utilizador
        has_perm = required_interface_id in (user_interfaces or [])
        logger.debug(f"Verificação para '{permission_id}' (req: {required_interface_id}): {has_perm}")
        return has_perm


# Instância global do gestor
permission_manager = PermissionManager()

# Função para ser chamada no __init__.py da aplicação
def init_permissions(app):
    """Função de inicialização para carregar as permissões."""
    permission_manager.load_permissions_from_db(app)
