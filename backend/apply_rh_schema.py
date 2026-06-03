"""
apply_rh_schema.py
Aplica todos os ficheiros SQL do módulo RH na ordem correcta.

Uso:
    cd backend
    python apply_rh_schema.py              # executa tudo (pede confirmação em erros)
    python apply_rh_schema.py -y           # executa tudo sem nenhum prompt
    python apply_rh_schema.py --dry-run    # mostra plano sem executar
    python apply_rh_schema.py --from 08   # começa a partir do ficheiro 08
    python apply_rh_schema.py --only 16   # executa apenas o ficheiro 16
    python apply_rh_schema.py --verify    # executa só o 15_verify.sql
    python apply_rh_schema.py --permissions  # executa só as permissões (16)

Backends disponíveis (auto-detectado):
    1. psql  — mais robusto, lida com toda a sintaxe PL/pgSQL
    2. psycopg2 raw — fallback se psql não estiver no PATH
"""

import sys
import os
import argparse
import subprocess
import urllib.parse
import time
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import get_config
from app import create_app, db

# ─── Plano de execução ────────────────────────────────────────────────────────

SQL_DIR = Path(__file__).parent / 'app' / 'sql' / 'rh'

EXECUTION_PLAN = [
    ('01', '01_lookups.sql',              'Tabelas lookup tt_rh_* + seed'),
    ('02', '02_tables_config.sql',        'ts_rh_config, ts_rh_horario, ts_feriados'),
    ('03', '03_tables_ponto.sql',         'tb_rh_ponto, tb_rh_ponto_mensal'),
    ('04', '04_tables_ferias_faltas.sql', 'tb_rh_ferias, tb_rh_faltas, tb_rh_workflow'),
    ('05', '05_tables_piquete.sql',       'tb_rh_piquete_escala, ocorrencia, regras'),
    ('06', '06_feriados_seed.sql',        'Feriados PT 2025-2027'),
    ('07', '07_fn_dias_uteis.sql',        'fn_rh_dias_uteis'),
    ('08', '08_fbo_ponto.sql',            'fbo_rh_ponto_*'),
    ('09', '09_fbo_workflow.sql',         'fbo_rh_workflow'),
    ('10', '10_fbo_ferias.sql',           'fbo_rh_ferias, fbo_rh_config_upsert'),
    ('11', '11_fbo_faltas.sql',           'fbo_rh_faltas'),
    ('12', '12_fbo_horario.sql',          'fbo_rh_horario'),
    ('13', '13_fbo_piquete.sql',          'fbo_rh_piquete_*'),
    ('14', '14_views.sql',                '9 views vbl_rh_*'),
    ('17', '17_ts_rh_colaborador.sql',    'ts_rh_colaborador + fn_calcular_ferias'),
    ('18', '18_filtro_perfis_rh.sql',     'Filtro ts_profile IN (0,1,6)'),
    ('15', '15_verify.sql',               'Smoke tests (verificação)'),
    ('16', '16_permissions.sql',          'Permissões ts_interface'),
    ('19', '19_vbl_lookups_config.sql',   'vbl_rh_tipo_* com filtro de perfis'),
    ('20', '20_transitados.sql',          'Dados transitados / migrações'),
    ('21', '21_geofencing.sql',           'Geofencing + fbo_rh_ponto_evento'),
    ('22', '22_face_recognition.sql',     'Reconhecimento facial'),
    ('23', '23_participacao_ausencias.sql', 'Participações de ausências'),
    ('24', '24_gestao_central.sql',       'Gestão centralizada: vbl_rh_pendentes + vbl_rh_equipa_hoje'),
]

# ─── Helpers de output ────────────────────────────────────────────────────────

def hline(char='─', w=64):
    print(char * w)

def ok(msg):   print(f'  \033[32m✓\033[0m  {msg}')
def err(msg):  print(f'  \033[31m✗\033[0m  {msg}')
def warn(msg): print(f'  \033[33m⚠\033[0m  {msg}')
def info(msg): print(f'  \033[36m→\033[0m  {msg}')

# ─── Detecção de psql ─────────────────────────────────────────────────────────

def find_psql():
    """Devolve o caminho para psql ou None se não encontrado."""
    import shutil
    path = shutil.which('psql')
    if path:
        return path
    # Localizações comuns no Windows
    windows_candidates = [
        r'C:\Program Files\PostgreSQL\17\bin\psql.exe',
        r'C:\Program Files\PostgreSQL\16\bin\psql.exe',
        r'C:\Program Files\PostgreSQL\15\bin\psql.exe',
        r'C:\Program Files\PostgreSQL\14\bin\psql.exe',
    ]
    for c in windows_candidates:
        if Path(c).exists():
            return c
    return None

# ─── Backend: psql ────────────────────────────────────────────────────────────

def run_psql(psql_path, db_url, filepath: Path, stop_on_error: bool) -> tuple[bool, str]:
    """Executa ficheiro via psql. Devolve (sucesso, output)."""
    parsed = urllib.parse.urlparse(db_url)
    env = os.environ.copy()
    if parsed.password:
        env['PGPASSWORD'] = parsed.password

    cmd = [
        psql_path,
        '-h', parsed.hostname or 'localhost',
        '-p', str(parsed.port or 5432),
        '-U', parsed.username or 'postgres',
        '-d', (parsed.path or '/postgres').lstrip('/'),
        '-f', str(filepath),
        '-X',                    # não carregar .psqlrc
        '--no-password',
        '-P', 'pager=off',
        '-q',                    # quiet: suprime mensagens de "CREATE TABLE" etc.
    ]
    if stop_on_error:
        cmd += ['-v', 'ON_ERROR_STOP=1']

    result = subprocess.run(cmd, env=env, capture_output=True, text=True, encoding='utf-8', errors='replace')
    output = (result.stdout + result.stderr).strip()
    return result.returncode == 0, output

# ─── Backend: psycopg2 raw (fallback) ────────────────────────────────────────

def run_psycopg2(db_url, filepath: Path) -> tuple[bool, str]:
    """Executa ficheiro via psycopg2 raw (sem interpretação de $ pelo SQLAlchemy)."""
    try:
        import psycopg2
    except ImportError:
        return False, 'psycopg2 não encontrado'

    sql = filepath.read_text(encoding='utf-8')
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = False
        cur = conn.cursor()
        cur.execute(sql)
        conn.commit()
        cur.close()
        conn.close()
        return True, ''
    except Exception as e:
        try:
            conn.rollback()
            conn.close()
        except Exception:
            pass
        return False, str(e)

# ─── Execução principal ───────────────────────────────────────────────────────

def run_plan(plan, db_url, psql_path, yes: bool, dry_run: bool):
    ok_count  = 0
    err_count = 0
    t_total   = time.time()

    for num, filename, desc in plan:
        filepath = SQL_DIR / filename
        label    = f'[{num}] {desc}'

        if not filepath.exists():
            warn(f'{label} — ficheiro não encontrado ({filename}), a saltar')
            err_count += 1
            continue

        if dry_run:
            info(f'{label}')
            continue

        print(f'\n{label}')
        t0 = time.time()

        if psql_path:
            success, output = run_psql(psql_path, db_url, filepath, stop_on_error=not yes)
        else:
            success, output = run_psycopg2(db_url, filepath)

        elapsed = time.time() - t0

        if success:
            ok(f'OK  ({elapsed:.1f}s)')
            if output:
                # Mostrar output relevante (resultados de SELECT dos verify/smoke tests)
                for line in output.splitlines():
                    if line.strip() and not line.startswith('psql:'):
                        print(f'     {line}')
            ok_count += 1
        else:
            err(f'FALHOU  ({elapsed:.1f}s)')
            if output:
                for line in output.splitlines()[:15]:
                    print(f'     \033[31m{line}\033[0m')
            err_count += 1

            if not yes:
                try:
                    resp = input('\n  Continuar mesmo assim? [s/N] ').strip().lower()
                except (EOFError, KeyboardInterrupt):
                    resp = 'n'
                if resp != 's':
                    print('  Execução interrompida.')
                    break

    return ok_count, err_count, time.time() - t_total

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Aplica schema RH na BD PostgreSQL',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument('-y', '--yes',         action='store_true', help='Não pede confirmação em erros')
    parser.add_argument('--dry-run',           action='store_true', help='Mostra plano sem executar')
    parser.add_argument('--from',    dest='from_num', metavar='NN', help='Começa a partir do ficheiro NN')
    parser.add_argument('--only',              metavar='NN',         help='Executa apenas o ficheiro NN')
    parser.add_argument('--verify',            action='store_true',  help='Só executa 15_verify.sql')
    parser.add_argument('--permissions',       action='store_true',  help='Só executa 16_permissions.sql')
    parser.add_argument('--skip-verify',       action='store_true',  help='Salta o 15_verify.sql')
    args = parser.parse_args()

    # ── Carregar config ────────────────────────────────────────────────────────
    config = get_config()
    app    = create_app(config)

    with app.app_context():
        db_url = app.config.get('SQLALCHEMY_DATABASE_URI', '')

    if not db_url:
        print('ERRO: DATABASE_URI não configurado no .env')
        sys.exit(1)

    # ── Seleccionar plano ──────────────────────────────────────────────────────
    if args.verify:
        plan = [s for s in EXECUTION_PLAN if s[0] == '15']
    elif args.permissions:
        plan = [s for s in EXECUTION_PLAN if s[0] == '16']
    elif args.only:
        plan = [s for s in EXECUTION_PLAN if s[0] == args.only]
        if not plan:
            print(f'ERRO: ficheiro {args.only} não existe no plano.')
            sys.exit(1)
    elif args.from_num:
        plan = [s for s in EXECUTION_PLAN if s[0] >= args.from_num]
    else:
        plan = list(EXECUTION_PLAN)

    if args.skip_verify:
        plan = [s for s in plan if s[0] != '15']

    # ── Detectar backend ───────────────────────────────────────────────────────
    psql_path = find_psql()

    print()
    hline('═')
    print('  RH Schema — Plano de execução')
    hline('═')
    print(f'  BD  : {db_url.split("@")[-1] if "@" in db_url else db_url}')
    print(f'  Dir : {SQL_DIR}')
    print(f'  Backend: {"psql  → " + psql_path if psql_path else "psycopg2 (fallback)"}')
    print(f'  Modo: {"DRY-RUN" if args.dry_run else ("AUTO (-y)" if args.yes else "interactivo")}')
    hline()
    for num, filename, desc in plan:
        exists = '\033[32m✓\033[0m' if (SQL_DIR / filename).exists() else '\033[31m✗\033[0m'
        print(f'  {exists} [{num}] {filename:<36} {desc}')
    hline('═')
    print()

    if args.dry_run:
        print('  DRY-RUN: nenhum SQL executado.')
        return

    if not args.yes:
        try:
            resp = input('  Executar? [S/n] ').strip().lower()
        except (EOFError, KeyboardInterrupt):
            resp = 's'
        if resp == 'n':
            print('  Cancelado.')
            return

    print()

    # ── Executar ───────────────────────────────────────────────────────────────
    ok_count, err_count, elapsed = run_plan(plan, db_url, psql_path, args.yes, args.dry_run)

    # ── Relatório final ────────────────────────────────────────────────────────
    print()
    hline('═')
    status = '\033[32mSUCESSO\033[0m' if err_count == 0 else '\033[31mCOM ERROS\033[0m'
    print(f'  {status}  —  {ok_count} OK  |  {err_count} erro(s)  |  {elapsed:.1f}s total')
    hline('═')

    if err_count == 0 and not args.permissions and not args.verify:
        print()
        print('  Próximo passo: correr as permissões se ainda não foram aplicadas.')
        print('    python apply_rh_schema.py --permissions')
        print()
        print('  Ou para verificar o schema:')
        print('    python apply_rh_schema.py --verify')

    sys.exit(1 if err_count > 0 else 0)


if __name__ == '__main__':
    main()
