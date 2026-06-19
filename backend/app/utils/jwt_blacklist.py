"""Blacklist de tokens JWT revogados (logout), persistida em Redis.

Substitui o set() em memória anterior — sobrevive a restarts e é partilhada
entre todos os workers/processos (necessário em produção com eventlet).
"""
import time
import redis
from flask import current_app
from app.utils.logger import get_logger

logger = get_logger(__name__)

_redis_client = None

# Circuit breaker: se o Redis estiver indisponível (ex.: não corre em dev),
# evita repetir a tentativa de ligação (lenta) em todos os requests.
_redis_unavailable_until = 0
_REDIS_RETRY_INTERVAL = 30  # segundos


def _get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            current_app.config.get('REDIS_URL', 'redis://localhost:6379'),
            socket_connect_timeout=0.5,
            socket_timeout=0.5,
        )
    return _redis_client


def _key(jti):
    return f"jwt_blacklist:{jti}"


def _mark_unavailable(action, e):
    global _redis_unavailable_until
    _redis_unavailable_until = time.time() + _REDIS_RETRY_INTERVAL
    logger.error(f"Erro ao {action} (Redis indisponível, a ignorar por {_REDIS_RETRY_INTERVAL}s): {e}")


def add_token_to_blacklist(jti, exp=None):
    """Marca o token (jti) como revogado, com TTL até à expiração do próprio token."""
    if time.time() < _redis_unavailable_until:
        return
    try:
        if exp:
            ttl = max(int(exp - time.time()), 1)
        else:
            ttl = int(current_app.config['REFRESH_TOKEN_EXPIRES'].total_seconds())
        _get_redis().setex(_key(jti), ttl, "revoked")
    except Exception as e:
        _mark_unavailable("adicionar token à blacklist", e)


def is_token_revoked(jti):
    if time.time() < _redis_unavailable_until:
        return False
    try:
        return _get_redis().exists(_key(jti)) == 1
    except Exception as e:
        _mark_unavailable("verificar blacklist de tokens", e)
        return False
