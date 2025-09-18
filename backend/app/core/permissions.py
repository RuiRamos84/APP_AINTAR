# app/core/permissions.py

from typing import List, Dict, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class PermissionType(Enum):
    """Tipos de permissão disponíveis"""
    INTERFACE = "interface"  # Baseado em interface ID
    PROFILE = "profile"      # Baseado em perfil
    USER_ID = "user_id"      # Baseado em ID específico
    COMBINED = "combined"    # Combinação de critérios


@dataclass
class PermissionRule:
    """Regra de permissão individual"""
    id: str
    name: str
    description: str
    type: PermissionType
    profiles: Optional[List[str]] = None
    interfaces: Optional[List[int]] = None
    user_ids: Optional[List[int]] = None
    operator: str = "OR"  # "OR" ou "AND"
    active: bool = True


class PermissionManager:
    """Gestor centralizado de permissões"""

    def __init__(self):
        self._rules: Dict[str, PermissionRule] = {}
        self._load_default_rules()

    def _load_default_rules(self):
        """Carregar regras padrão do sistema"""
        default_rules = [
            # === ADMINISTRAÇÃO ===
            PermissionRule(
                id="admin.dashboard",
                name="Dashboard Administrativo",
                description="Acesso ao dashboard de administração",
                type=PermissionType.INTERFACE,
                interfaces=[1]
            ),

            PermissionRule(
                id="admin.users",
                name="Gestão de Utilizadores",
                description="Gerir utilizadores e permissões",
                type=PermissionType.INTERFACE,
                interfaces=[2]
            ),

            PermissionRule(
                id="admin.database",
                name="Gestão de Base de Dados",
                description="Gerir base de dados",
                type=PermissionType.INTERFACE,
                interfaces=[12]
            ),

            PermissionRule(
                id="admin.logs",
                name="Logs e Auditoria",
                description="Visualizar logs do sistema",
                type=PermissionType.INTERFACE,
                interfaces=[13]
            ),

            PermissionRule(
                id="admin.reports",
                name="Relatórios Administrativos",
                description="Gerar relatórios do sistema",
                type=PermissionType.INTERFACE,
                interfaces=[14]
            ),

            PermissionRule(
                id="admin.settings",
                name="Configurações do Sistema",
                description="Configurar parâmetros do sistema",
                type=PermissionType.INTERFACE,
                interfaces=[15]
            ),

            # === PAGAMENTOS ===
            PermissionRule(
                id="payments.validate",
                name="Validar Pagamentos",
                description="Validar e aprovar pagamentos pendentes",
                type=PermissionType.INTERFACE,
                interfaces=[3]
            ),

            PermissionRule(
                id="payments.cash.process",
                name="Processar Numerário",
                description="Processar pagamentos em numerário",
                type=PermissionType.INTERFACE,
                interfaces=[4]
            ),

            PermissionRule(
                id="payments.mbway",
                name="Pagamentos MB WAY",
                description="Processar pagamentos via MB WAY",
                type=PermissionType.PROFILE,
                profiles=["0", "1", "2", "3"]
            ),

            PermissionRule(
                id="payments.multibanco",
                name="Pagamentos Multibanco",
                description="Gerar referências Multibanco",
                type=PermissionType.PROFILE,
                profiles=["0", "1", "2", "3"]
            ),

            PermissionRule(
                id="payments.bank_transfer",
                name="Transferências Bancárias",
                description="Registar transferências bancárias",
                type=PermissionType.PROFILE,
                profiles=["0", "1", "2", "3"]
            ),

            PermissionRule(
                id="payments.cash",
                name="Pagamentos Numerário",
                description="Registar pagamentos em numerário",
                type=PermissionType.COMBINED,
                profiles=["0", "1"],
                # IDs específicos dos utilizadores existentes
                user_ids=[12, 15],
                operator="OR"
            ),

            PermissionRule(
                id="payments.municipality",
                name="Pagamentos Municípios",
                description="Registar pagamentos nos municípios",
                type=PermissionType.PROFILE,
                profiles=["0", "2"]
            ),

            # === DOCUMENTOS ===
            PermissionRule(
                id="docs.view.all",
                name="Ver Todos os Documentos",
                description="Visualizar todos os documentos do sistema",
                type=PermissionType.INTERFACE,
                interfaces=[18]
            ),

            PermissionRule(
                id="docs.assigned.view",
                name="Documentos Atribuídos",
                description="Ver documentos atribuídos para tratamento",
                type=PermissionType.INTERFACE,
                interfaces=[19]
            ),

            PermissionRule(
                id="docs.manage",
                name="Gestão de Documentos",
                description="Gerir estado e propriedades dos documentos",
                type=PermissionType.INTERFACE,
                interfaces=[10]
            ),

            PermissionRule(
                id="docs.reopen",
                name="Reabrir Documentos",
                description="Reabrir documentos fechados",
                type=PermissionType.INTERFACE,
                interfaces=[11]
            ),

            PermissionRule(
                id="docs.modern",
                name="Gestão Moderna de Documentos",
                description="Acesso ao sistema moderno de documentos",
                type=PermissionType.INTERFACE,
                interfaces=[20]
            ),

            # === OUTRAS FUNCIONALIDADES ===
            PermissionRule(
                id="dashboard.view",
                name="Dashboard Principal",
                description="Acesso ao dashboard principal",
                type=PermissionType.INTERFACE,
                interfaces=[17]
            ),

            PermissionRule(
                id="operation.access",
                name="Área Operacional",
                description="Acesso à área operacional",
                type=PermissionType.INTERFACE,
                interfaces=[16]
            ),

            PermissionRule(
                id="letters.manage",
                name="Gestão de Ofícios",
                description="Gerir ofícios e correspondência",
                type=PermissionType.INTERFACE,
                interfaces=[7]
            ),

            PermissionRule(
                id="epi.manage",
                name="Gestão de EPIs",
                description="Gerir equipamentos de proteção individual",
                type=PermissionType.INTERFACE,
                interfaces=[6]
            ),

            PermissionRule(
                id="internal.access",
                name="Área Interna",
                description="Acesso à área interna",
                type=PermissionType.INTERFACE,
                interfaces=[8]
            ),

            PermissionRule(
                id="tasks.view.all",
                name="Ver Todas as Tarefas",
                description="Visualizar todas as tarefas do sistema",
                type=PermissionType.INTERFACE,
                interfaces=[5]
            ),

            PermissionRule(
                id="tasks.manage",
                name="Gerir Tarefas",
                description="Criar e gerir tarefas",
                type=PermissionType.PROFILE,
                profiles=["0", "1"]
            ),

            # === SUPER ADMIN ===
            PermissionRule(
                id="admin.super",
                name="Super Administrador",
                description="Acesso total ao sistema",
                type=PermissionType.PROFILE,
                profiles=["0"]
            )
        ]

        for rule in default_rules:
            self._rules[rule.id] = rule

        logger.info(
            f"🔐 Sistema de permissões inicializado com {len(default_rules)} regras")

    def check_permission(self, permission_id: str, user_profile: str,
                         user_interfaces: List[int], user_id: int) -> bool:
        """Verificar se utilizador tem permissão específica"""

        # Super admin sempre tem acesso
        if user_profile == "0":
            return True

        rule = self._rules.get(permission_id)
        if not rule or not rule.active:
            logger.debug(f"Regra {permission_id} não encontrada ou inativa")
            return False

        try:
            if rule.type == PermissionType.PROFILE:
                result = str(user_profile) in (rule.profiles or [])
                logger.debug(
                    f"Verificação PROFILE para {permission_id}: {result}")
                return result

            elif rule.type == PermissionType.INTERFACE:
                user_interfaces = user_interfaces or []
                result = any(interface in user_interfaces for interface in (
                    rule.interfaces or []))
                logger.debug(
                    f"Verificação INTERFACE para {permission_id}: {result} (user: {user_interfaces}, required: {rule.interfaces})")
                return result

            elif rule.type == PermissionType.USER_ID:
                result = user_id in (rule.user_ids or [])
                logger.debug(
                    f"Verificação USER_ID para {permission_id}: {result}")
                return result

            elif rule.type == PermissionType.COMBINED:
                profile_match = str(user_profile) in (
                    rule.profiles or []) if rule.profiles else False
                interface_match = any(interface in (user_interfaces or []) for interface in (
                    rule.interfaces or [])) if rule.interfaces else False
                user_id_match = user_id in (
                    rule.user_ids or []) if rule.user_ids else False

                if rule.operator == "OR":
                    result = profile_match or interface_match or user_id_match
                else:  # AND
                    conditions = []
                    if rule.profiles:
                        conditions.append(profile_match)
                    if rule.interfaces:
                        conditions.append(interface_match)
                    if rule.user_ids:
                        conditions.append(user_id_match)
                    result = all(conditions)

                logger.debug(
                    f"Verificação COMBINED para {permission_id}: {result} (profile: {profile_match}, interface: {interface_match}, user: {user_id_match}, op: {rule.operator})")
                return result

        except Exception as e:
            logger.error(f"Erro verificação permissão {permission_id}: {e}")
            return False

        return False

    def get_user_permissions(self, user_profile: str, user_interfaces: List[int],
                             user_id: int) -> List[str]:
        """Obter todas as permissões do utilizador"""
        permissions = []

        for permission_id in self._rules.keys():
            if self.check_permission(permission_id, user_profile, user_interfaces, user_id):
                permissions.append(permission_id)

        logger.debug(
            f"Utilizador {user_id} (perfil {user_profile}) tem {len(permissions)} permissões")
        return permissions

    def get_rule(self, permission_id: str) -> Optional[PermissionRule]:
        """Obter regra específica"""
        return self._rules.get(permission_id)

    def add_rule(self, rule: PermissionRule) -> bool:
        """Adicionar nova regra"""
        try:
            self._rules[rule.id] = rule
            logger.info(f"Nova regra adicionada: {rule.id}")
            return True
        except Exception as e:
            logger.error(f"Erro adicionar regra {rule.id}: {e}")
            return False

    def update_rule(self, permission_id: str, **updates) -> bool:
        """Atualizar regra existente"""
        rule = self._rules.get(permission_id)
        if not rule:
            logger.warning(
                f"Regra {permission_id} não encontrada para atualização")
            return False

        try:
            for key, value in updates.items():
                if hasattr(rule, key):
                    setattr(rule, key, value)
            logger.info(f"Regra {permission_id} atualizada")
            return True
        except Exception as e:
            logger.error(f"Erro atualizar regra {permission_id}: {e}")
            return False

    def get_all_rules(self) -> Dict[str, PermissionRule]:
        """Obter todas as regras"""
        return self._rules.copy()

    def disable_rule(self, permission_id: str) -> bool:
        """Desativar regra"""
        return self.update_rule(permission_id, active=False)

    def enable_rule(self, permission_id: str) -> bool:
        """Ativar regra"""
        return self.update_rule(permission_id, active=True)

    def get_rules_by_type(self, rule_type: PermissionType) -> Dict[str, PermissionRule]:
        """Obter regras por tipo"""
        return {id: rule for id, rule in self._rules.items() if rule.type == rule_type}


# Instância global do gestor
permission_manager = PermissionManager()


def debug_user_permissions(user_profile: str, user_interfaces: List[int], user_id: int):
    """Debug das permissões do utilizador (apenas em desenvolvimento)"""
    import os
    if os.getenv('FLASK_ENV') == 'development':
        logger.info(
            f"=== DEBUG PERMISSÕES - User: {user_id}, Perfil: {user_profile}, Interfaces: {user_interfaces} ===")

        permissions = permission_manager.get_user_permissions(
            user_profile, user_interfaces, user_id)

        # Agrupar por categoria
        categories = {}
        for perm in permissions:
            category = perm.split('.')[0]
            if category not in categories:
                categories[category] = []
            categories[category].append(perm)

        for category, perms in categories.items():
            logger.info(f"  {category.upper()}: {', '.join(perms)}")

        logger.info(f"  TOTAL: {len(permissions)} permissões")
        logger.info("=" * 80)
