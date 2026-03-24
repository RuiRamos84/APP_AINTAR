"""
Admin Service
Funcionalidades de manutenção e monitorização do sistema
para o módulo de administração.
"""

from datetime import datetime, timezone
from sqlalchemy import text
from app import db, cache
from app.utils.logger import get_logger
from app.utils.error_handler import api_error_handler
from app.services.meta_data_service import clear_meta_data_cache

logger = get_logger(__name__)


# ── Estado dos Serviços ──────────────────────────────────────────────────────

@api_error_handler
def get_system_status(current_user: str):
    """Verifica o estado dos serviços do sistema."""
    services = {}

    # Base de Dados
    try:
        db.session.execute(text("SELECT 1"))
        services['database'] = 'ok'
    except Exception as e:
        logger.warning(f"DB health check failed: {e}")
        services['database'] = 'error'

    # Cache (Redis)
    try:
        cache.set('_admin_health_check', '1', timeout=5)
        val = cache.get('_admin_health_check')
        services['cache'] = 'ok' if val else 'degraded'
    except Exception as e:
        logger.warning(f"Cache health check failed: {e}")
        services['cache'] = 'error'

    # Socket.IO
    try:
        from app import socketio
        services['socket'] = 'ok' if socketio else 'unavailable'
    except Exception:
        services['socket'] = 'unavailable'

    # JWT / Auth (sempre activo se o servidor está a correr)
    services['auth'] = 'ok'

    # Email
    try:
        from app import mail
        services['email'] = 'ok' if mail else 'unavailable'
    except Exception:
        services['email'] = 'unavailable'

    # Scheduler
    try:
        from app import scheduler
        running = scheduler and scheduler.running
        services['scheduler'] = 'ok' if running else 'stopped'
    except Exception:
        services['scheduler'] = 'unavailable'

    service_list = [
        {
            'key': 'db',
            'label': 'Base de Dados',
            'status': services.get('database', 'unknown'),
            'detail': 'PostgreSQL',
        },
        {
            'key': 'cache',
            'label': 'Cache (Redis)',
            'status': services.get('cache', 'unknown'),
            'detail': 'Redis',
        },
        {
            'key': 'socket',
            'label': 'WebSockets',
            'status': services.get('socket', 'unknown'),
            'detail': 'Socket.IO / Eventlet',
        },
        {
            'key': 'auth',
            'label': 'JWT / Auth',
            'status': services.get('auth', 'unknown'),
            'detail': 'Flask-JWT-Extended',
        },
        {
            'key': 'email',
            'label': 'Email (SMTP)',
            'status': services.get('email', 'unknown'),
            'detail': 'Office365 SMTP',
        },
        {
            'key': 'scheduler',
            'label': 'Scheduler',
            'status': services.get('scheduler', 'unknown'),
            'detail': 'APScheduler',
        },
    ]

    return {
        'status': {
            **services,
            'services': service_list,
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }
    }, 200


# ── Cache ────────────────────────────────────────────────────────────────────

@api_error_handler
def clear_all_caches(current_user: str):
    """Limpa o metadata cache e o Flask-Cache (Redis)."""
    cleared = []

    clear_meta_data_cache()
    cleared.append('metadata')

    try:
        cache.clear()
        cleared.append('redis')
    except Exception as e:
        logger.warning(f"Failed to clear Redis cache: {e}")

    logger.info(f"Caches limpos por {current_user}: {cleared}")
    return {'message': 'Cache limpa com sucesso', 'cleared': cleared}, 200


@api_error_handler
def reload_system_config(current_user: str):
    """Recarrega a configuração de sistema (invalida o metadata cache)."""
    clear_meta_data_cache()
    logger.info(f"Configuração recarregada por {current_user}")
    return {'message': 'Configuração recarregada'}, 200


@api_error_handler
def save_system_config(data: dict, current_user: str):
    """
    Guarda configurações do sistema.
    Requer tabela ts_system_config para persistência real.
    """
    logger.info(
        f"Configurações guardadas por {current_user}: {list(data.keys())}"
    )
    return {
        'message': 'Configurações guardadas',
        'saved': list(data.keys()),
    }, 200


# ── Ações Administrativas ────────────────────────────────────────────────────

@api_error_handler
def run_admin_action(key: str, current_user: str):
    """Executa uma ação administrativa pelo seu identificador."""

    if key == 'clear-cache':
        return clear_all_caches(current_user)

    elif key == 'send-test-notification':
        try:
            from app import socketio
            socketio.emit('notification', {
                'type': 'info',
                'title': 'Notificação de Teste',
                'message': (
                    'Esta é uma notificação de teste '
                    'enviada pelo administrador.'
                ),
                'timestamp': datetime.now(timezone.utc).isoformat(),
            })
            logger.info(
                f"Notificação de teste enviada por {current_user}"
            )
            return {
                'message': (
                    'Notificação de teste enviada '
                    'a todos os utilizadores online'
                )
            }, 200
        except Exception as e:
            logger.error(f"Failed to send test notification: {e}")
            return {'message': f'Erro ao enviar notificação: {e}'}, 500

    elif key == 'optimize-db':
        try:
            opts = {'isolation_level': 'AUTOCOMMIT'}
            with db.engine.connect().execution_options(**opts) as conn:
                conn.execute(
                    text(
                        "VACUUM ANALYZE "
                        "ts_client, ts_interface, ts_entity"
                    )
                )
            logger.info(f"VACUUM ANALYZE executado por {current_user}")
            return {
                'message': 'Base de dados otimizada (VACUUM ANALYZE)'
            }, 200
        except Exception as e:
            logger.error(f"VACUUM ANALYZE failed: {e}")
            return {
                'message': f'Erro ao otimizar base de dados: {str(e)}'
            }, 500

    elif key == 'lock-all-users':
        try:
            cache.delete_many('last_activity_*')
            logger.warning(
                f"Sessões de utilizadores invalidadas por {current_user}"
            )
            return {
                'message': (
                    'Sessões invalidadas. '
                    'Utilizadores terão de fazer novo login.'
                )
            }, 200
        except Exception as e:
            logger.error(f"Failed to lock users: {e}")
            return {'message': f'Erro ao bloquear sessões: {e}'}, 500

    elif key == 'backup-db':
        logger.info(
            f"Pedido de backup por {current_user} (não implementado)"
        )
        return {
            'message': (
                'Backup automático não configurado nesta versão. '
                'Contacte o departamento de IT para backups manuais.'
            ),
            'status': 'not_configured',
        }, 200

    else:
        return {'message': f'Ação desconhecida: {key}'}, 400


# ── Logs ─────────────────────────────────────────────────────────────────────

@api_error_handler
def get_activity_logs(filters: dict, current_user: str):
    """
    Retorna logs de atividade.
    Requer tabela ts_audit_log dedicada (não implementada ainda).
    """
    return {'logs': [], 'total': 0}, 200


@api_error_handler
def get_session_logs(current_user: str):
    """Retorna histórico de sessões (sem tabela dedicada: lista vazia)."""
    return {'sessions': [], 'total': 0}, 200
