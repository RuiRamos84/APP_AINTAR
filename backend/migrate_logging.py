#!/usr/bin/env python3
"""
Script de Migração de Logging
==============================

Este script migra automaticamente todos os ficheiros Python do backend
para usar o novo sistema de logging centralizado.

Operações:
1. Adiciona import do get_logger
2. Cria instância do logger
3. Substitui current_app.logger por logger
4. Substitui print() por logger.info() (comentado para revisão manual)
5. Remove logging.basicConfig e logging.getLogger antigos

Uso:
    python migrate_logging.py
"""

import os
import re
from pathlib import Path

# Diretórios a processar
DIRECTORIES = [
    'app/services',
    'app/routes',
    'app/utils',
    'app/core',
    'app/socketio'
]

# Ficheiros a ignorar
IGNORE_FILES = {
    '__init__.py',
    'logger.py',  # Nosso próprio logger
    'migrate_logging.py'
}

# Estatísticas
stats = {
    'files_processed': 0,
    'files_modified': 0,
    'imports_added': 0,
    'logger_instances_added': 0,
    'current_app_logger_replaced': 0,
    'print_statements_found': 0,
}


def should_process_file(filepath):
    """Verifica se o ficheiro deve ser processado"""
    if filepath.name in IGNORE_FILES:
        return False
    if not filepath.suffix == '.py':
        return False
    if '__pycache__' in str(filepath):
        return False
    return True


def add_logger_import(content, filepath):
    """Adiciona import do logger se não existir"""
    if 'from app.utils.logger import get_logger' in content:
        return content, False

    # Encontrar onde inserir o import
    # Procurar último import antes de código
    lines = content.split('\n')
    insert_position = 0

    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('from ') or stripped.startswith('import '):
            insert_position = i + 1
        elif stripped and not stripped.startswith('#') and insert_position > 0:
            # Primeira linha de código após imports
            break

    # Inserir import
    lines.insert(insert_position, 'from app.utils.logger import get_logger')
    lines.insert(insert_position + 1, '')  # Linha em branco

    stats['imports_added'] += 1
    return '\n'.join(lines), True


def add_logger_instance(content, filepath):
    """Adiciona instância do logger se não existir"""
    if 'logger = get_logger(__name__)' in content:
        return content, False

    # Verificar se já tem logger definido de outra forma
    if re.search(r'^logger\s*=\s*logging\.getLogger', content, re.MULTILINE):
        # Substituir logger antigo
        content = re.sub(
            r'^logger\s*=\s*logging\.getLogger\([^)]*\)',
            'logger = get_logger(__name__)',
            content,
            flags=re.MULTILINE
        )
        stats['logger_instances_added'] += 1
        return content, True

    # Adicionar após imports
    lines = content.split('\n')
    insert_position = 0

    # Procurar onde inserir (após imports e docstrings)
    in_docstring = False
    for i, line in enumerate(lines):
        stripped = line.strip()

        # Detectar docstrings
        if '"""' in line or "'''" in line:
            in_docstring = not in_docstring
            continue

        if in_docstring:
            continue

        # Após imports e antes de código
        if stripped.startswith('from ') or stripped.startswith('import '):
            insert_position = i + 1
        elif stripped and not stripped.startswith('#') and insert_position > 0:
            break

    # Inserir logger
    if insert_position > 0:
        lines.insert(insert_position, '')
        lines.insert(insert_position + 1, 'logger = get_logger(__name__)')
        lines.insert(insert_position + 2, '')
        stats['logger_instances_added'] += 1
        return '\n'.join(lines), True

    return content, False


def replace_current_app_logger(content):
    """Substitui current_app.logger por logger"""
    original_content = content

    # Substituir current_app.logger.error, .warning, .info, .debug
    patterns = [
        (r'current_app\.logger\.error', 'logger.error'),
        (r'current_app\.logger\.warning', 'logger.warning'),
        (r'current_app\.logger\.info', 'logger.info'),
        (r'current_app\.logger\.debug', 'logger.debug'),
    ]

    for old_pattern, new_pattern in patterns:
        content = re.sub(old_pattern, new_pattern, content)

    if content != original_content:
        # Contar quantas substituições
        count = len(re.findall(r'current_app\.logger\.', original_content))
        stats['current_app_logger_replaced'] += count
        return content, True

    return content, False


def find_print_statements(content):
    """Encontra print statements (não modifica, apenas reporta)"""
    # Procurar print( mas ignorar dentro de strings
    prints = re.findall(r'^\s*print\s*\(', content, re.MULTILINE)
    count = len(prints)
    if count > 0:
        stats['print_statements_found'] += count
    return count


def remove_old_logging_config(content):
    """Remove configurações antigas de logging"""
    original_content = content

    # Remover logging.basicConfig
    content = re.sub(r'logging\.basicConfig\([^)]*\)\s*\n?', '', content)

    # Remover import logging se não for mais usado
    if 'logging.' not in content.replace('from app.utils.logger', ''):
        content = re.sub(r'^import logging\s*\n?', '', content, flags=re.MULTILINE)

    return content, (content != original_content)


def process_file(filepath):
    """Processa um ficheiro Python"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        modified = False

        # 1. Adicionar import do logger
        content, changed = add_logger_import(content, filepath)
        modified = modified or changed

        # 2. Adicionar instância do logger
        content, changed = add_logger_instance(content, filepath)
        modified = modified or changed

        # 3. Substituir current_app.logger
        content, changed = replace_current_app_logger(content)
        modified = modified or changed

        # 4. Remover configurações antigas
        content, changed = remove_old_logging_config(content)
        modified = modified or changed

        # 5. Detectar prints (apenas reportar)
        print_count = find_print_statements(content)

        # Escrever se modificado
        if modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            stats['files_modified'] += 1
            print(f"[OK] Modificado: {filepath}")
            if print_count > 0:
                print(f"  [!] {print_count} print() encontrado(s) - revisar manualmente")
        else:
            print(f"  Já atualizado: {filepath}")

        stats['files_processed'] += 1

    except Exception as e:
        print(f"[X] Erro ao processar {filepath}: {e}")


def main():
    """Função principal"""
    print("=" * 60)
    print(">>> Migracao de Sistema de Logging")
    print("=" * 60)
    print()

    base_path = Path(__file__).parent

    # Processar cada diretório
    for directory in DIRECTORIES:
        dir_path = base_path / directory

        if not dir_path.exists():
            print(f"[!] Diretorio nao encontrado: {directory}")
            continue

        print(f"\n[+] Processando: {directory}")
        print("-" * 60)

        # Processar ficheiros Python recursivamente
        for filepath in dir_path.rglob('*.py'):
            if should_process_file(filepath):
                process_file(filepath)

    # Estatísticas finais
    print()
    print("=" * 60)
    print(">>> Estatisticas da Migracao")
    print("=" * 60)
    print(f"Ficheiros processados:            {stats['files_processed']}")
    print(f"Ficheiros modificados:            {stats['files_modified']}")
    print(f"Imports adicionados:              {stats['imports_added']}")
    print(f"Instancias logger criadas:        {stats['logger_instances_added']}")
    print(f"current_app.logger substituidos:  {stats['current_app_logger_replaced']}")
    print(f"print() encontrados (revisar):    {stats['print_statements_found']}")
    print()

    if stats['print_statements_found'] > 0:
        print("[!] ATENCAO: Foram encontrados print() statements.")
        print("   Recomenda-se revisar manualmente e substituir por:")
        print("   - logger.info() para informacoes")
        print("   - logger.debug() para debug detalhado")

    print()
    print("[OK] Migracao concluida!")
    print()
    print(">>> Proximos passos:")
    print("1. Revisar ficheiros modificados")
    print("2. Substituir print() por logger.info/debug manualmente")
    print("3. Testar aplicacao")
    print("4. Definir DEBUG_MODE=False em .env.production")
    print()


if __name__ == '__main__':
    main()
