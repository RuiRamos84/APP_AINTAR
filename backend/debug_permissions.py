#!/usr/bin/env python3
# debug_permissions.py - Script para debugar permissões
# Uso: python debug_permissions.py <user_id>

import sys
import os

# Adicionar o diretório do projeto ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from config import get_config
from sqlalchemy import text
 
def debug_permissions():
    """Debug das permissões na base de dados"""

    config = get_config()
    app = create_app(config)

    with app.app_context():
        if len(sys.argv) < 2:
            print("\n❌ Erro: ID do utilizador não fornecido.")
            print("   Uso: python debug_permissions.py <user_id>\n")
            sys.exit(1)
        user_id = sys.argv[1]

        print(f"🕵️  A verificar permissões para o utilizador ID: {user_id}")
        print()

        # Buscar todas as interfaces
        result = db.session.execute(text("SELECT pk, value FROM ts_interface ORDER BY pk")).fetchall()

        print("Interfaces encontradas:")
        print("-" * 50)

        # Mostrar mapeamento
        permission_map = {}
        for row in result:
            permission_map[row.value] = int(row.pk) # <-- CORREÇÃO: Converter para int
            print(f"ID: {row.pk:3d} -> '{row.value}'")

        # Buscar permissões do utilizador diretamente da BD
        print()
        print(f"👤 A buscar as permissões atribuídas ao utilizador ID: {user_id}...")
        print("-" * 50)

        # Query para buscar as interfaces associadas ao perfil do utilizador
        # NOTA: Adapta esta query à tua estrutura de tabelas (user -> profile -> permissions)
        query = text("""
            SELECT DISTINCT ti.pk
            FROM ts_user tu
            JOIN ts_profile_interface tpi ON tu.fk_profile = tpi.fk_profile
            JOIN ts_interface ti ON tpi.fk_interface = ti.pk
            WHERE tu.pk = :user_id
        """)
        
        user_result = db.session.execute(query, {'user_id': user_id}).fetchall()
        user_interfaces = [int(row.pk) for row in user_result]

        if not user_interfaces:
            print(f"🚨 AVISO: Nenhuma permissão encontrada para o utilizador {user_id} na base de dados.")
        else:
            print(f"✅ O utilizador tem os seguintes IDs de permissão: {user_interfaces}")
        print()

        # Verificar quais permissões o utilizador tem
        print("📜 Detalhe das permissões do utilizador:")
        print("-" * 60)
        reverse_map = {v: k for k, v in permission_map.items()}
        for interface_id in user_interfaces:
            perm_name = reverse_map.get(interface_id, f"ID_DESCONHECIDO_{interface_id}")
            print(f"ID {interface_id:3d} -> '{perm_name}'")

        print()
        print("🚦 Verificação final para o módulo de pagamentos:")
        print("-" * 60)
        failing_permissions = ["tasks.all", "operation.access"] # Permissões que queres testar
        for perm in failing_permissions:
            interface_id = permission_map.get(perm)
            if interface_id:
                has_permission = interface_id in user_interfaces
                status_icon = "✔️  TEM" if has_permission else "❌ NAO TEM"
                print(f"'{perm}' (requer ID {interface_id}) -> {status_icon}")
            else:
                print(f"'{perm}' -> ❓ ERRO: Esta permissão não existe na tabela 'ts_interface'.")

if __name__ == "__main__":
    debug_permissions()