#!/usr/bin/env python3
# debug_permissions.py - Script para debugar permissões

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
        print("A verificar permissoes na base de dados...")
        print()

        # Buscar todas as interfaces
        result = db.session.execute(text("SELECT pk, value FROM ts_interface ORDER BY pk")).fetchall()

        print("Interfaces encontradas:")
        print("-" * 50)

        # Mostrar mapeamento
        permission_map = {}
        for row in result:
            permission_map[row.value] = row.pk
            print(f"ID: {row.pk:3d} -> '{row.value}'")

        print()
        print("Permissoes especificas que estao a falhar:")
        print("-" * 50)

        # Verificar permissões específicas que estão a falhar
        failing_permissions = ["tasks.all", "operation.access"]

        for perm in failing_permissions:
            interface_id = permission_map.get(perm)
            if interface_id:
                print(f"OK '{perm}' -> Interface ID {interface_id}")
            else:
                print(f"ERRO '{perm}' -> NAO ENCONTRADA")

        print()
        print("Interfaces do utilizador atual (do log):")
        user_interfaces = [110, 40, 10, 70, 50, 60, 80, 30, 90, 100, 20, 400, 560, 540, 530, 500, 520, 510, 810, 820, 800, 210, 320, 300, 220, 310, 600, 720, 730, 700, 710, 740, 200, 750]

        print(f"Interfaces: {user_interfaces}")
        print()

        # Verificar quais permissões o utilizador tem
        print("Permissoes que o utilizador TEM:")
        print("-" * 50)

        reverse_map = {v: k for k, v in permission_map.items()}

        for interface_id in user_interfaces:
            perm_name = reverse_map.get(interface_id, f"DESCONHECIDA_{interface_id}")
            print(f"Interface {interface_id:3d} -> '{perm_name}'")

        print()
        print("Verificacao das permissoes que falham:")
        print("-" * 50)

        for perm in failing_permissions:
            interface_id = permission_map.get(perm)
            if interface_id:
                has_permission = interface_id in user_interfaces
                status = "TEM" if has_permission else "NAO TEM"
                print(f"'{perm}' (ID {interface_id}) -> {status}")
            else:
                print(f"'{perm}' -> PERMISSAO NAO EXISTE NA BD")

if __name__ == "__main__":
    debug_permissions()