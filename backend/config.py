import os
from dotenv import load_dotenv
from datetime import timedelta

ENVIRONMENT = os.environ.get('FLASK_ENV', 'development').lower()

if ENVIRONMENT == 'production':
    load_dotenv('.env.production')
    print("Variáveis de ambiente de produção carregadas.")
else:
    load_dotenv('.env.development')
    print("Variáveis de ambiente de desenvolvimento carregadas.")


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'default_secret_key')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URI')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')

    # Configurações centralizadas de tempo
    ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    REFRESH_TOKEN_EXPIRES = timedelta(hours=2)
    INACTIVITY_TIMEOUT = timedelta(hours=1)
    WARNING_TIMEOUT = timedelta(minutes=45)
    TOKEN_REFRESH_INTERVAL = timedelta(minutes=14)

    # Configurações JWT
    JWT_ACCESS_TOKEN_EXPIRES = ACCESS_TOKEN_EXPIRES
    JWT_REFRESH_TOKEN_EXPIRES = REFRESH_TOKEN_EXPIRES
    JWT_BLACKLIST_ENABLED = True
    JWT_BLACKLIST_TOKEN_CHECKS = ['access', 'refresh']

    SEARCH_PATH = os.getenv('SEARCH_PATH', 'public')

    # Configurações de e-mail
    MAIL_SERVER = os.getenv('MAIL_SERVER')
    MAIL_PORT = os.getenv('MAIL_PORT')
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS') == 'True'
    MAIL_USE_SSL = os.getenv('MAIL_USE_SSL') == 'True'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER')

    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER')

    # Configurações do Limiter
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
    RATELIMIT_STORAGE_URL = REDIS_URL
    RATELIMIT_STORAGE_OPTIONS = {}
    RATELIMIT_STRATEGY = 'fixed-window'
    RATELIMIT_DEFAULT = "200 per day, 50 per hour"

    # Configurações do Cache
    CACHE_TYPE = os.getenv('CACHE_TYPE', 'simple')
    CACHE_DEFAULT_TIMEOUT = 300


class DevelopmentConfig(Config):
    DEBUG = True
    FILES_DIR = 'C:/Users/rui.ramos/Desktop/APP/files'
    CACHE_TYPE = 'simple'


class ProductionConfig(Config):
    DEBUG = False
    FILES_DIR = 'D:\APP\FilesApp'
    CACHE_TYPE = 'redis'
    CACHE_REDIS_URL = Config.REDIS_URL


def get_config():
    env = os.environ.get('FLASK_ENV', 'development')
    return ProductionConfig if env == 'production' else DevelopmentConfig
