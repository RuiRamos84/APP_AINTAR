import eventlet
eventlet.monkey_patch()

import os
from app import create_app, socket_io as socketio
from config import get_config
import logging
from datetime import datetime
import signal
import sys
import threading


def setup_logger():
    logger = logging.getLogger('flask-socketio')
    logger.setLevel(logging.INFO)
    handler = logging.FileHandler('flask-socketio.log')
    formatter = logging.Formatter('%(levelname)s - %(message)s')
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
            self.logger.info(f'{start_time.strftime("%Y-%m-%d %H:%M:%S")} - {environ["REMOTE_ADDR"]} - {status} - {environ["REQUEST_METHOD"]} {environ["PATH_INFO"]} - {duration.total_seconds():.3f}s')
            return start_response(status, headers, exc_info)

        return self.app(environ, custom_start_response)


def graceful_shutdown(signum, frame):
    # print("Recebido sinal de shutdown. Encerrando servidor...")
    socketio.stop()
    os._exit(0)  # Força o encerramento imediato


def watchdog_thread():
    import time
    while True:
        time.sleep(1)
        if threading.main_thread().is_alive() is False:
            os._exit(1)


threading.Thread(target=watchdog_thread, daemon=True).start()


def run_server():
    env = os.environ.get('FLASK_ENV', 'development')
    # print(f"Ambiente atual: {env}")

    config = get_config()
    app = create_app(config)

    # Definir o ambiente explicitamente
    app.config['ENV'] = env

    logger = setup_logger()
    app.wsgi_app = CustomLogger(app.wsgi_app, logger)

    signal.signal(signal.SIGINT, graceful_shutdown)
    signal.signal(signal.SIGTERM, graceful_shutdown)

    socketio.run(app, host='0.0.0.0', port=5000, debug=False, use_reloader=False, log_output=False)


if __name__ == '__main__':
    run_server()
