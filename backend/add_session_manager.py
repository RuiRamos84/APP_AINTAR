#!/usr/bin/env python3
"""
Script para adicionar db_session_manager em todas as rotas de emission_routes.py
"""
import re

def add_db_session_manager():
    file_path = 'app/routes/emission_routes.py'

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Funções que NÃO precisam de db_session_manager (rotas de sistema/debug)
    skip_functions = ['health_check', 'debug_test', 'test_minimal_generate']

    # Funções que JÁ TÊM db_session_manager
    already_has = ['get_document_types', 'create_template']

    # Padrão para encontrar funções que já têm current_user mas não têm db_session_manager
    # Procura por: current_user = get_jwt_identity() seguido de código SEM with db_session_manager

    funcs_to_update = [
        'list_templates',
        'get_template',
        'update_template',
        'delete_template',
        'create_emission',
        'list_emissions',
        'get_emission',
        'update_emission',
        'delete_emission',
        'preview_next_number',
        'get_year_statistics',
        'get_variables_for_type',
        'generate_document',
        'download_document',
        'view_document'
    ]

    for func_name in funcs_to_update:
        print(f"Processando {func_name}...")

        # Encontrar a função
        pattern = rf'(def {func_name}\([^)]*\):.*?try:\s*current_user = get_jwt_identity\(\)\s*)(.*?)((?:except|$))'

        def replacer(match):
            func_def = match.group(1)
            func_body = match.group(2)
            except_part = match.group(3)

            # Verificar se já tem db_session_manager
            if 'with db_session_manager(' in func_body:
                print(f"  -> {func_name} já tem db_session_manager, ignorando")
                return match.group(0)

            # Indentar o corpo da função
            lines = func_body.split('\n')
            indented_lines = []
            for line in lines:
                if line.strip():  # Se não for linha vazia
                    indented_lines.append('    ' + line)
                else:
                    indented_lines.append(line)
            indented_body = '\n'.join(indented_lines)

            # Construir nova função com db_session_manager
            new_func = f"{func_def}with db_session_manager(current_user):\n{indented_body}\n\n    {except_part}"

            print(f"  -> {func_name} atualizado!")
            return new_func

        content = re.sub(pattern, replacer, content, flags=re.DOTALL)

    # Salvar
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("\n✅ Todas as funções foram atualizadas!")

if __name__ == '__main__':
    add_db_session_manager()
