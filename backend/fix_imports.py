#!/usr/bin/env python3
"""
Script para corrigir imports mal posicionados
"""

import re
from pathlib import Path

FILES_TO_FIX = [
    'app/routes/documents_routes.py',
    'app/routes/entity_routes.py',
    'app/routes/epi_routes.py',
    'app/routes/etar_ee_routes.py',
    'app/routes/letter_routes.py',
    'app/routes/operations_routes.py',
    'app/routes/tasks_routes.py',
    'app/routes/user_routes.py',
    'app/services/file_service.py',
]

def fix_file(filepath):
    """Corrige imports mal posicionados"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Remover logger import e instância mal posicionados
        content = re.sub(r'^from app\.utils\.logger import get_logger\s*\n', '', content, flags=re.MULTILINE)
        content = re.sub(r'^logger = get_logger\(__name__\)\s*\n', '', content, flags=re.MULTILINE)

        # Encontrar último import
        lines = content.split('\n')
        last_import_idx = 0

        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith('from ') or stripped.startswith('import '):
                last_import_idx = i

        # Inserir logger import após último import
        if last_import_idx > 0:
            lines.insert(last_import_idx + 1, 'from app.utils.logger import get_logger')
            lines.insert(last_import_idx + 2, '')
            lines.insert(last_import_idx + 3, 'logger = get_logger(__name__)')
            lines.insert(last_import_idx + 4, '')

        content = '\n'.join(lines)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f'[OK] Corrigido: {filepath}')
        return True

    except Exception as e:
        print(f'[X] Erro ao corrigir {filepath}: {e}')
        return False

def main():
    print('Corrigindo imports mal posicionados...')
    print('=' * 60)

    for filepath in FILES_TO_FIX:
        fix_file(filepath)

    print('=' * 60)
    print('[OK] Correção concluída!')

if __name__ == '__main__':
    main()
