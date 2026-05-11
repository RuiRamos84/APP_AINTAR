"""
add_rh_permissions.py
Insere as permissões do módulo RH Pessoal na ts_interface.
Equivalente ao ficheiro 16_permissions.sql mas via Python/SQLAlchemy.

Uso:
    cd backend
    python add_rh_permissions.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import get_config
from app import create_app, db
from sqlalchemy import text

PERMISSIONS = [
    {
        'value':       'rh.view',
        'category':    'Recursos Humanos',
        'label':       'Ver RH',
        'description': 'Aceder ao módulo Recursos Humanos e consultar dados.',
        'icon':        'Badge',
        'is_critical': False,
        'is_sensitive': False,
        'sort_order':  1500,
        'requires_values': [],
    },
    {
        'value':       'rh.pessoal.view',
        'category':    'Recursos Humanos',
        'label':       'Ver Gestão Pessoal',
        'description': 'Consultar ponto, férias, faltas, horários e piquete.',
        'icon':        'ManageAccounts',
        'is_critical': False,
        'is_sensitive': False,
        'sort_order':  1510,
        'requires_values': ['rh.view'],
    },
    {
        'value':       'rh.edit',
        'category':    'Recursos Humanos',
        'label':       'Editar Gestão Pessoal',
        'description': 'Registar ponto diário, submeter pedidos de férias e registar faltas.',
        'icon':        'EditCalendar',
        'is_critical': False,
        'is_sensitive': False,
        'sort_order':  1520,
        'requires_values': ['rh.pessoal.view'],
    },
    {
        'value':       'rh.validate',
        'category':    'Recursos Humanos',
        'label':       'Validar RH (Superior)',
        'description': 'Validar pedidos de ponto, férias e faltas como superior hierárquico.',
        'icon':        'HowToReg',
        'is_critical': False,
        'is_sensitive': True,
        'sort_order':  1530,
        'requires_values': ['rh.view'],
    },
    {
        'value':       'rh.admin',
        'category':    'Recursos Humanos',
        'label':       'Admin RH',
        'description': 'Aprovação final, correcção de ponto, geração de escalas de piquete e configuração de saldos.',
        'icon':        'AdminPanelSettings',
        'is_critical': False,
        'is_sensitive': True,
        'sort_order':  1540,
        'requires_values': ['rh.validate'],
    },
]


def main():
    config = get_config()
    app = create_app(config)

    with app.app_context():
        inserted = 0
        skipped  = 0

        # ── Passo 1: inserir permissões ──────────────────────────────────────
        for perm in PERMISSIONS:
            exists = db.session.execute(
                text("SELECT pk FROM ts_interface WHERE value = :v"),
                {'v': perm['value']}
            ).scalar()

            if exists:
                print(f"  SKIP  {perm['value']} (pk={exists})")
                skipped += 1
                continue

            pk = db.session.execute(text("SELECT fs_nextcode()")).scalar()
            db.session.execute(text("""
                INSERT INTO ts_interface
                    (pk, value, category, label, description, icon,
                     is_critical, is_sensitive, sort_order)
                VALUES
                    (:pk, :value, :category, :label, :description, :icon,
                     :is_critical, :is_sensitive, :sort_order)
            """), {
                'pk':           pk,
                'value':        perm['value'],
                'category':     perm['category'],
                'label':        perm['label'],
                'description':  perm['description'],
                'icon':         perm['icon'],
                'is_critical':  perm['is_critical'],
                'is_sensitive': perm['is_sensitive'],
                'sort_order':   perm['sort_order'],
            })
            print(f"  INSERT {perm['value']} (pk={pk})")
            inserted += 1

        db.session.commit()

        # ── Passo 2: definir requires ────────────────────────────────────────
        for perm in PERMISSIONS:
            if not perm['requires_values']:
                continue

            required_pks = []
            for rv in perm['requires_values']:
                rpk = db.session.execute(
                    text("SELECT pk FROM ts_interface WHERE value = :v"), {'v': rv}
                ).scalar()
                if rpk:
                    required_pks.append(rpk)
                else:
                    print(f"  WARN  requires '{rv}' não encontrado para '{perm['value']}'")

            if required_pks:
                db.session.execute(text("""
                    UPDATE ts_interface
                    SET requires = :arr
                    WHERE value = :v
                """), {'arr': required_pks, 'v': perm['value']})
                print(f"  REQ   {perm['value']} → {perm['requires_values']}")

        db.session.commit()

        # ── Passo 3: verificar ───────────────────────────────────────────────
        print()
        print("═" * 60)
        print("Permissões RH na ts_interface:")
        print("═" * 60)
        rows = db.session.execute(text("""
            SELECT pk, value, label, sort_order,
                   requires
            FROM ts_interface
            WHERE value LIKE 'rh.%'
            ORDER BY sort_order
        """)).fetchall()

        for r in rows:
            req_labels = []
            if r.requires:
                for rpk in r.requires:
                    rl = db.session.execute(
                        text("SELECT value FROM ts_interface WHERE pk = :p"), {'p': rpk}
                    ).scalar()
                    if rl:
                        req_labels.append(rl)
            print(f"  pk={r.pk:<6} {r.value:<22} → requer: {req_labels or '—'}")

        print()
        print(f"Resultado: {inserted} inseridas, {skipped} já existiam.")


if __name__ == '__main__':
    main()
