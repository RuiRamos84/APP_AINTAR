# DEVE SER A PRIMEIRA LINHA DO ARQUIVO
import eventlet
eventlet.monkey_patch()
import logging
from logging.handlers import RotatingFileHandler

# Configuração de logging - mostra todos os requests
logging.basicConfig(level=logging.INFO)
logging.getLogger('socketio').setLevel(logging.INFO)
logging.getLogger('engineio').setLevel(logging.WARNING)

# Agora importe os outros módulos
from config import get_config
from app import create_app, socket_io as socketio
import threading
import sys
import signal
import os
from datetime import datetime


def setup_logger():
    logger = logging.getLogger('socketio')  # Mudei para um nome único
    logger.setLevel(logging.INFO)
    handler = RotatingFileHandler(
        'flask-socketio.log',
        maxBytes=10*1024*1024,  # 10MB por ficheiro
        backupCount=1           # Mantém apenas 1 ficheiro rotativo (+ ficheiro actual = 2 max)
    )
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger


class CustomLogger(object):
    def __init__(self, app, logger):
        self.app = app
        self.logger = logger

    def __call__(self, environ, start_response):
        environ['REMOTE_ADDR'] = environ.get(
            'HTTP_X_FORWARDED_FOR', environ['REMOTE_ADDR'])
        start_time = datetime.now()

        def custom_start_response(status, headers, exc_info=None):
            duration = datetime.now() - start_time
            self.logger.info(
                f'{environ["REMOTE_ADDR"]} - {status} - {environ["REQUEST_METHOD"]} {environ["PATH_INFO"]} - {duration.total_seconds():.3f}s')
            return start_response(status, headers, exc_info)

        return self.app(environ, custom_start_response)


def graceful_shutdown(signum, frame):
    socketio.stop()
    os._exit(0)


def watchdog_thread():
    import time
    while True:
        time.sleep(1)
        if threading.main_thread().is_alive() is False:
            os._exit(1)


def start_whatsapp_service():
    """Arranca o microserviço Node.js WhatsApp apenas se não estiver já a correr."""
    import subprocess, urllib.request, urllib.error
    wa_port = os.getenv('WA_PORT', '3010')
    wa_key  = os.getenv('WA_API_KEY', 'aintar-wa-2025')

    # Verifica se já está a correr
    try:
        req = urllib.request.Request(
            f'http://localhost:{wa_port}/status',
            headers={'x-api-key': wa_key},
        )
        urllib.request.urlopen(req, timeout=2)
        print(f"[WA] Microserviço já está a correr na porta {wa_port} — não reinicia")
        return
    except Exception:
        pass  # Não está a correr, arranca

    wa_dir = os.path.join(os.path.dirname(__file__), '..', 'whatsapp-service')
    wa_dir = os.path.normpath(wa_dir)
    if not os.path.isdir(wa_dir):
        print(f"[WA] Pasta não encontrada: {wa_dir}")
        return
    try:
        proc = subprocess.Popen(
            ['node', 'index.js'],
            cwd=wa_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        )
        print(f"[WA] Microserviço WhatsApp iniciado (PID {proc.pid})")
    except Exception as e:
        print(f"[WA] Erro ao iniciar microserviço WhatsApp: {e}")


def run_server():
    env = os.environ.get('FLASK_ENV', 'development')
    config = get_config()
    app = create_app(config)
    app.config['ENV'] = env

    logger = setup_logger()
    app.wsgi_app = CustomLogger(app.wsgi_app, logger)

    signal.signal(signal.SIGINT, graceful_shutdown)
    signal.signal(signal.SIGTERM, graceful_shutdown)

    threading.Thread(target=watchdog_thread, daemon=True).start()

    start_whatsapp_service()

    # Socket.IO JÁ foi inicializado em app/__init__.py - NÃO inicializar novamente!
    print("Iniciando servidor Socket.IO...")
    print(f"URL: http://0.0.0.0:5000")
    print(f"Socket.IO ativo: {socketio is not None}")

    socketio.run(app,
                 host='0.0.0.0',
                 port=5000,
                 debug=False,  # Debug desabilitado para produção
                 use_reloader=False,
                 log_output=False)  # Logs reduzidos


if __name__ == '__main__':
    run_server()
