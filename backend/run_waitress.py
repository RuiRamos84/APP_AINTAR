# DEVE SER A PRIMEIRA LINHA DO ARQUIVO
import eventlet
eventlet.monkey_patch()
import logging
# Configuração AGGRESSIVA de logging - DEVE VIR ANTES DE QUALQUER OUTRA IMPORTAÇÃO
logging.basicConfig(level=logging.CRITICAL)  # Nível mais alto possível
logging.getLogger('socketio').setLevel(logging.CRITICAL)
logging.getLogger('engineio').setLevel(logging.CRITICAL)
logging.getLogger('werkzeug').setLevel(logging.CRITICAL)
logging.getLogger('flask-socketio').setLevel(logging.CRITICAL)
# Seu logger personalizado
logging.getLogger('custom-socketio').setLevel(logging.INFO)

# Desativar completamente logs específicos
logging.getLogger('socketio.server').disabled = True
logging.getLogger('engineio.server').disabled = False

# Agora importe os outros módulos
from config import get_config
from app import create_app, socket_io as socketio
import threading
import sys
import signal
from datetime import datetime
import os


def setup_logger():
    logger = logging.getLogger('socketio')  # Mudei para um nome único
    logger.setLevel(logging.INFO)
    handler = logging.FileHandler('flask-socketio.log')
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
                f'{start_time.strftime("%Y-%m-%d %H:%M:%S")} - {environ["REMOTE_ADDR"]} - {status} - {environ["REQUEST_METHOD"]} {environ["PATH_INFO"]} - {duration.total_seconds():.3f}s')
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

    # Configuração final do Socket.IO
    socketio.init_app(app, logger=False, engineio_logger=False)
    socketio.run(app,
                 host='0.0.0.0',
                 port=5000,
                 debug=False,
                 use_reloader=False,
                 log_output=False)


if __name__ == '__main__':
    run_server()
