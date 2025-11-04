"""
Script para testar se as views do dashboard existem no banco de dados
"""
import sys
from sqlalchemy import text
from app import create_app, db

def test_dashboard_views():
    app = create_app()

    with app.app_context():
        # Lista de views para testar
        views_to_test = [
            'vds_pedido_01$001',
            'vds_pedido_01$002',
            'vds_ramal_01$001',
            'vds_fossa_01$001',
            'vds_instalacao_01$001',
        ]

        print("=" * 60)
        print("TESTE DE VIEWS DO DASHBOARD")
        print("=" * 60)

        for view_name in views_to_test:
            try:
                query = text(f"SELECT COUNT(*) as count FROM aintar_server.{view_name}")
                result = db.session.execute(query)
                count = result.scalar()
                print(f"✓ {view_name}: {count} registos")
            except Exception as e:
                print(f"✗ {view_name}: ERRO - {str(e)}")

        print("=" * 60)

        # Testar se o schema existe
        try:
            query = text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'aintar_server'
                AND table_name LIKE 'vds_%'
                ORDER BY table_name
            """)
            result = db.session.execute(query)
            views = [row[0] for row in result]

            print(f"\nViews encontradas no schema aintar_server ({len(views)}):")
            for view in views:
                print(f"  - {view}")
        except Exception as e:
            print(f"Erro ao listar views: {str(e)}")

        print("=" * 60)

if __name__ == '__main__':
    test_dashboard_views()
