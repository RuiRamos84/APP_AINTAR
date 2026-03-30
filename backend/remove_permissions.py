import sys
import os
from sqlalchemy import text

# Add the backend dir to the path if needed
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import get_config
from app import create_app, db

def main():
    config = get_config()
    app = create_app(config)
    
    keys_to_remove = [
        'admin.payments',
        'admin.docs.manage',
        'admin.docs.reopen',
        'internal.access',
        'global.access',
        'admin.cash',
        'admin.dashboard',
        'admin.reports.view'
    ]
    
    with app.app_context():
        keys_str = ', '.join(f"'{k}'" for k in keys_to_remove)
        
        query = text(f"SELECT pk, value FROM ts_interface WHERE value IN ({keys_str})")
        interfaces = db.session.execute(query).fetchall()
        
        if not interfaces:
            print("Nenhuma das permissões foi encontrada na base de dados (já limpo).")
            return

        pks = [i[0] for i in interfaces]  # i.pk or i[0]
        pks_str = ', '.join(str(pk) for pk in pks)
        print(f"Apagando IDs: {pks_str}")
        
        try:
            # 1. Apagar da tabela de ligação ts_client_interface (se existir utilizadores com elas)
            # Vamos tentar apagar e ignorar erro se a tabela não se chamar assim
            try:
                db.session.execute(text(f"DELETE FROM ts_client_interface WHERE interface_id IN ({pks_str})"))
                print("Limpos vínculos em ts_client_interface (utilizadores/perfis).")
            except Exception as e:
                db.session.rollback()
                print(f"Aviso ts_client_interface: {e}")

            # 1.1 Em alternativa, se a tabela se chamar ts_profile_interface ou user_interface
            try:
                db.session.execute(text(f"DELETE FROM ts_user_interface WHERE interface_id IN ({pks_str})"))
            except Exception:
                db.session.rollback()

            # 2. Apagar as dependencias onde estas chaves são o parent_id se houver
            try:
                db.session.execute(text(f"DELETE FROM ts_interface_requires WHERE required_id IN ({pks_str})"))
            except Exception:
                db.session.rollback()

            # 3. Finalmente apagar do catálogo principal
            res = db.session.execute(text(f"DELETE FROM ts_interface WHERE pk IN ({pks_str})"))
            db.session.commit()
            
            print(f"Sucesso! {res.rowcount} permissões apagadas da tabela mestra ts_interface.")
            
        except Exception as e:
            db.session.rollback()
            print(f"Erro fatal ao apagar da ts_interface: {e}")

if __name__ == '__main__':
    main()
