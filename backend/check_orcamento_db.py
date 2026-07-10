import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def check_db():
    # Carregar variáveis de ambiente
    load_dotenv('.env.development')
    db_uri = os.getenv('DATABASE_URI')
    
    if not db_uri:
        print("DATABASE_URI não encontrada.")
        return

    print(f"Conectando à base de dados: {db_uri}")
    engine = create_engine(db_uri)
    
    try:
        with engine.connect() as conn:
            # 1. Procurar tabelas que contenham 'orcamento'
            print("\n--- TABELAS DE ORÇAMENTO ---")
            query_tables = text("""
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_name LIKE '%orcamento%'
                ORDER BY table_name;
            """)
            tables = conn.execute(query_tables).fetchall()
            
            if not tables:
                print("Nenhuma tabela encontrada com 'orcamento' no nome.")
            else:
                for schema, name in tables:
                    print(f"- {schema}.{name}")
                    
                    # 2. Para cada tabela, listar as colunas
                    query_columns = text("""
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_schema = :schema AND table_name = :name
                        ORDER BY ordinal_position;
                    """)
                    columns = conn.execute(query_columns, {"schema": schema, "name": name}).fetchall()
                    for col_name, col_type in columns:
                        print(f"    * {col_name} ({col_type})")
                    print()
                    
    except Exception as e:
        print(f"Erro ao conectar à base de dados: {e}")

if __name__ == '__main__':
    check_db()
