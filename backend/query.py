import psycopg2
try:
    conn = psycopg2.connect("postgresql://aintar_client_dev:aintar_client_dev@172.16.2.11:5432/postgres")
    cur = conn.cursor()
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vbl_contract_payment'")
    for row in cur.fetchall():
        print(f"{row[0]} | {row[1]}")
except Exception as e:
    print(f"Error: {e}")
