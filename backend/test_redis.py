import redis

r = redis.Redis(host='localhost', port=6379, db=0)
try:
    r.ping()
    print("Conexão com Redis bem-sucedida!")
except redis.ConnectionError:
    print("Não foi possível conectar ao Redis")
