import eventlet
eventlet.monkey_patch()
from app import create_app, socketio
from config import get_config

# print("Eventlet monkey patching completo")

config = get_config()
# print(f"Usando configuração: {config.__name__}")

app = create_app(config)

if __name__ == '__main__':
    # print("Iniciando a aplicação...")
    try:
        # print("Aplicação iniciada.")
        socketio.run(app, host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        print(f"Erro ao iniciar a aplicação: {e}")
