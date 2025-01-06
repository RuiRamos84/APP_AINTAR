# No prompt de comando, execute:
python

# No shell Python interativo, digite:
import redis

r = redis.Redis(host='83.240.148.114', port=6379, db=0)
try:
    print(r.ping())
except Exception as e:
    print(f"Erro ao conectar: {e}")

# Se a conexão for bem-sucedida, você verá "True" impresso.
# Se houver um erro, você verá a mensagem de erro.
