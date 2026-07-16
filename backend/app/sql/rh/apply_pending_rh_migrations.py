"""
Aplica as migrações RH pendentes (33, 34, 35 — sessão de 2026-07-15) aos dois
schemas que partilham a mesma base de dados/host: aintar_server_dev (dev) e
aintar_server (produção). Lê as credenciais de backend/.env.development e
backend/.env.production — nunca hardcoded, nunca commitadas.

Cada schema corre dentro da sua própria transacção: se algum ficheiro falhar,
faz ROLLBACK de tudo o que já tinha corrido nesse schema (nada fica a meio).
O schema seguinte só arranca depois do anterior terminar com sucesso.

Uso (a partir da pasta backend/):
    venv\\Scripts\\python.exe app\\sql\\rh\\apply_pending_rh_migrations.py
"""
import os
import sys
import psycopg2
from dotenv import dotenv_values

SQL_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SQL_DIR, '..', '..', '..'))

MIGRATIONS = [
    '33_fbo_piquete_escala.sql',
    '34_fix_pendentes_segundo_nivel.sql',
    '35_fbo_ponto_corrigir_fonte.sql',
]

ENV_FILES = ['.env.development', '.env.production']


def _clean(value: str) -> str:
    return value.strip().strip('"').strip("'")


def connection_from_env(env_path: str):
    cfg = dotenv_values(env_path)
    required = ('DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SEARCH_PATH')
    missing = [k for k in required if not cfg.get(k)]
    if missing:
        raise RuntimeError(f'{env_path}: faltam variáveis {missing}')

    schema = _clean(cfg['SEARCH_PATH'].split(',')[0])
    conn = psycopg2.connect(
        host=_clean(cfg['DB_HOST']),
        port=_clean(cfg['DB_PORT']),
        dbname=_clean(cfg['DB_NAME']),
        user=_clean(cfg['DB_USER']),
        password=_clean(cfg['DB_PASSWORD']),
        options=f'-c search_path={schema},public',
    )
    return conn, schema


def apply_migration(cur, filename: str):
    path = os.path.join(SQL_DIR, filename)
    with open(path, 'r', encoding='utf-8') as f:
        sql = f.read()
    cur.execute(sql)
    try:
        return cur.fetchone()
    except psycopg2.ProgrammingError:
        return None


def main():
    for env_file in ENV_FILES:
        env_path = os.path.join(BACKEND_DIR, env_file)
        if not os.path.isfile(env_path):
            print(f'AVISO: {env_path} não encontrado — a saltar.')
            continue

        conn, schema = connection_from_env(env_path)
        conn.autocommit = False
        cur = conn.cursor()
        print(f'\n=== {env_file} -> schema "{schema}" ===')
        try:
            for filename in MIGRATIONS:
                print(f'  -> {filename} ...', end=' ', flush=True)
                row = apply_migration(cur, filename)
                print(f'OK — {row}' if row else 'OK')
            conn.commit()
            print(f'  Commit feito em "{schema}".')
        except Exception as e:
            conn.rollback()
            print(f'\n  ERRO em "{schema}": {e}')
            print('  Rollback efectuado — nada foi alterado neste schema.')
            sys.exit(1)
        finally:
            cur.close()
            conn.close()

    print('\nConcluído — migrações 33, 34, 35 aplicadas com sucesso em ambos os schemas.')


if __name__ == '__main__':
    main()
