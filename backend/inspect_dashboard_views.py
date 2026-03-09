"""
Diagnostico completo das views do dashboard.
Mostra: colunas, tipos, contagem e linha de exemplo para cada view.

Uso: python inspect_dashboard_views.py
     python inspect_dashboard_views.py pedidos
     python inspect_dashboard_views.py instalacoes
"""
import sys
from sqlalchemy import text
from app import create_app, db
from app.services.dashboard_service import DASHBOARD_VIEWS


def inspect_view(session, view_name):
    """Retorna (cols, types, count, sample, error) para uma view."""
    try:
        meta_q = text(f"SELECT * FROM aintar_server.{view_name} LIMIT 1")
        meta_r = session.execute(meta_q)
        cols = list(meta_r.keys())
        row = meta_r.fetchone()
        sample = dict(zip(cols, row)) if row else {}
        types = {k: type(v).__name__ for k, v in sample.items()} if sample else {}

        count_q = text(f"SELECT COUNT(*) FROM aintar_server.{view_name}")
        count = session.execute(count_q).scalar()

        return cols, types, count, sample, None
    except Exception as e:
        return [], {}, 0, {}, str(e)


def main():
    filter_cat = sys.argv[1].lower() if len(sys.argv) > 1 else None

    from config import get_config
    app = create_app(get_config())
    with app.app_context():
        print("\n" + "=" * 70)
        print("  DIAGNOSTICO DAS VIEWS DO DASHBOARD")
        print("=" * 70)

        for category, views in DASHBOARD_VIEWS.items():
            if filter_cat and category != filter_cat:
                continue

            print("\n" + "-" * 70)
            print("  CATEGORIA: " + category.upper())
            print("-" * 70)

            for view_name, description in views.items():
                cols, types, count, sample, error = inspect_view(
                    db.session, view_name
                )

                if error:
                    print(f"\n  X {view_name}")
                    print(f"    Descricao : {description}")
                    print(f"    ERRO      : {error}")
                    continue

                status = "OK" if count > 0 else "!!"
                print(f"\n  [{status}] {view_name}  [{count} linhas]")
                print(f"    Descricao : {description}")
                print(f"    Colunas   : {cols}" if cols else "    Colunas   : (vazia)")
                print(f"    Tipos     : {types}" if types else "    Tipos     : -")
                print(f"    Exemplo   : {sample}" if sample else "    Exemplo   : (sem dados)")

        print("\n" + "=" * 70 + "\n")


if __name__ == '__main__':
    main()
