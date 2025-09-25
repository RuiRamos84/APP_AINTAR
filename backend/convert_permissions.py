#!/usr/bin/env python3
# convert_permissions.py - Script para converter permissões string para IDs numéricos

import os
import re

# Mapeamento baseado no debug anterior
PERMISSION_MAP = {
    "admin.cache.manage": 110,
    "admin.cash": 40,
    "admin.dashboard": 10,
    "admin.db.manage": 70,
    "admin.docs.manage": 50,
    "admin.docs.reopen": 60,
    "admin.logs.view": 80,
    "admin.payments": 30,
    "admin.reports.view": 90,
    "admin.system.settings": 100,
    "admin.users": 20,
    "dashboard.view": 400,
    "docs.create": 560,
    "docs.modern": 540,
    "docs.view": 530,
    "docs.view.all": 500,
    "docs.view.assigned": 520,
    "docs.view.owner": 510,
    "entities.create": 810,
    "entities.manage": 820,
    "entities.view": 800,
    "epi.manage": 210,
    "global.access": 320,
    "internal.access": 300,
    "letters.manage": 220,
    "operation.access": 310,
    "pav.view": 600,
    "payments.bank_transfer": 720,
    "payments.cash.action": 730,
    "payments.mbway": 700,
    "payments.multibanco": 710,
    "payments.municipality": 740,
    "tasks.all": 200,
    "tasks.manage": 750
}

def convert_file(file_path):
    """Converter um arquivo"""
    print(f"Convertendo: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    replacements = 0

    # Padrão para @require_permission("string")
    pattern = r'@require_permission\("([^"]+)"\)'

    def replace_permission(match):
        nonlocal replacements
        permission_string = match.group(1)
        permission_id = PERMISSION_MAP.get(permission_string)

        if permission_id:
            replacements += 1
            return f'@require_permission({permission_id})  # {permission_string}'
        else:
            print(f"  AVISO: Permissão '{permission_string}' não encontrada no mapa!")
            return match.group(0)  # Manter original

    content = re.sub(pattern, replace_permission, content)

    # Salvar se houve mudanças
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  OK {replacements} permissoes convertidas")
        return replacements
    else:
        print("  - Nenhuma conversao necessaria")
        return 0

def convert_all_routes():
    """Converter todos os arquivos de rotas"""
    routes_dir = "app/routes"
    total_conversions = 0

    print("Convertendo permissões string para IDs numéricos...")
    print("=" * 50)

    # Listar todos os arquivos .py na pasta routes
    for filename in os.listdir(routes_dir):
        if filename.endswith(".py") and filename != "__init__.py":
            file_path = os.path.join(routes_dir, filename)
            conversions = convert_file(file_path)
            total_conversions += conversions

    print("=" * 50)
    print(f"Total de conversoes realizadas: {total_conversions}")
    print("\nConversao concluida!")

    # Mostrar mapeamento para referência
    print("\nMapeamento de permissoes usado:")
    print("-" * 30)
    for perm, id_num in sorted(PERMISSION_MAP.items()):
        print(f"{id_num:3d} -> {perm}")

if __name__ == "__main__":
    convert_all_routes()