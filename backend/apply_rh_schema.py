"""
apply_rh_schema.py
Aplica todos os ficheiros SQL do módulo RH na ordem correcta.

Uso:
    cd backend
    python apply_rh_schema.py              # executa tudo
    python apply_rh_schema.py --dry-run    # apenas mostra o plano
    python apply_rh_schema.py --from 08   # começa a partir do ficheiro 08
    python apply_rh_schema.py --only 16   # executa apenas o ficheiro 16
    python apply_rh_schema.py --verify    # executa só o 15_verify.sql
"""

import sys
import os
import argparse
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import get_config
from app import create_app, db
from sqlalchemy import text

# ─── Ordem de execução ────────────────────────────────────────────────────────
SQL_DIR = Path(__file__).parent / 'app' / 'sql' / 'rh'

EXECUTION_PLAN = [
    # (número, ficheiro, descrição)
    ('01', '01_lookups.sql',               'Tabelas lookup tt_rh_* + seed'),
    ('02', '02_tables_config.sql',         'ts_rh_config, ts_rh_horario, ts_feriados'),
    ('03', '03_tables_ponto.sql',          'tb_rh_ponto, tb_rh_ponto_mensal'),
    ('04', '04_tables_ferias_faltas.sql',  'tb_rh_ferias, tb_rh_faltas, tb_rh_workflow'),
    ('05', '05_tables_piquete.sql',        'tb_rh_piquete_escala, ocorrencia, regras'),
    ('06', '06_feriados_seed.sql',         'Feriados PT 2025-2027 (39 registos)'),
    ('07', '07_fn_dias_uteis.sql',         'fn_rh_dias_uteis (exclui FDS + feriados)'),
    ('08', '08_fbo_ponto.sql',             'fbo_rh_ponto_evento, submeter, corrigir'),
    ('09', '09_fbo_workflow.sql',          'fbo_rh_workflow (débito saldo automático)'),
    ('10', '10_fbo_ferias.sql',            'fbo_rh_ferias, fbo_rh_config_upsert'),
    ('11', '11_fbo_faltas.sql',            'fbo_rh_faltas'),
    ('12', '12_fbo_horario.sql',           'fbo_rh_horario'),
    ('13', '13_fbo_piquete.sql',           'fbo_rh_piquete_generate, confirmar, ocorrencia'),
    ('14', '14_views.sql',                 '9 views vbl_rh_*'),
    ('17', '17_ts_rh_colaborador.sql',     'ts_rh_colaborador + fn_calcular_ferias + fbo'),
    ('18', '18_filtro_perfis_rh.sql',      'Filtro ts_profile IN (0,1,6) em views/funções'),
    ('15', '15_verify.sql',               'Smoke tests — verificar integridade do schema'),
    ('16', '16_permissions.sql',           'Permissões ts_interface (rh.view/edit/admin...)'),
]

VERIFY_ONLY = [('15', '15_verify.sql', 'Smoke tests')]


def run_sql_file(session, filepath: Path, label: str, dry_run: bool) -> bool:
    """Executa um ficheiro SQL. Devolve True se OK."""
    if not filepath.exists():
        print(f'  ⚠  Ficheiro não encontrado: {filepath}')
        return False

    if dry_run:
        print(f'  [DRY-RUN] Executaria: {filepath.name}')
        return True

    sql = filepath.read_text(encoding='utf-8')

    # Dividir em statements (separa por ';' mas ignora dentro de $$ ... $$)
    # Para ficheiros PL/pgSQL usamos execução do bloco inteiro
    try:
        session.execute(text(sql))
        session.commit()
        print(f'  ✓  {label}')
        return True
    except Exception as e:
        session.rollback()
        print(f'  ✗  ERRO em {filepath.name}:')
        print(f'     {str(e)[:200]}')
        return False


def main():
    parser = argparse.ArgumentParser(description='Aplica schema RH na BD')
    parser.add_argument('--dry-run',  action='store_true', help='Mostra plano sem executar')
    parser.add_argument('--from',     dest='from_num', metavar='NN', help='Começa a partir do ficheiro NN')
    parser.add_argument('--only',     metavar='NN', help='Executa apenas o ficheiro NN')
    parser.add_argument('--verify',   action='store_true', help='Executa apenas 15_verify.sql')
    args = parser.parse_args()

    config = get_config()
    app = create_app(config)

    # Seleccionar plano
    if args.verify:
        plan = VERIFY_ONLY
    elif args.only:
        plan = [s for s in EXECUTION_PLAN if s[0] == args.only]
        if not plan:
            print(f'Ficheiro {args.only} não encontrado no plano.')
            sys.exit(1)
    elif args.from_num:
        plan = [s for s in EXECUTION_PLAN if s[0] >= args.from_num]
    else:
        plan = EXECUTION_PLAN

    print()
    print('═' * 60)
    print('  RH Schema — Plano de execução')
    print('═' * 60)
    for num, filename, desc in plan:
        exists = '✓' if (SQL_DIR / filename).exists() else '✗'
        print(f'  {exists} [{num}] {filename:<35} {desc}')
    print('═' * 60)
    print()

    if args.dry_run:
        print('  [DRY-RUN] Nenhum SQL executado.')
        return

    ok_count  = 0
    err_count = 0

    with app.app_context():
        with db.engine.connect() as conn:
            # Usar a sessão SQLAlchemy directamente para suportar PL/pgSQL
            for num, filename, desc in plan:
                filepath = SQL_DIR / filename
                label = f'[{num}] {desc}'
                print(f'→ {label}')

                if not filepath.exists():
                    print(f'  ⚠  Ficheiro não encontrado: {filename}')
                    err_count += 1
                    continue

                sql = filepath.read_text(encoding='utf-8')
                try:
                    conn.execute(text(sql))
                    conn.commit()
                    print(f'  ✓  OK')
                    ok_count += 1
                except Exception as e:
                    conn.rollback()
                    print(f'  ✗  ERRO: {str(e)[:300]}')
                    err_count += 1
                    resp = input('  Continuar mesmo assim? [s/N] ').strip().lower()
                    if resp != 's':
                        print('  Execução interrompida.')
                        break
                print()

    print('═' * 60)
    print(f'  Resultado: {ok_count} OK  |  {err_count} com erros')
    print('═' * 60)


if __name__ == '__main__':
    main()
