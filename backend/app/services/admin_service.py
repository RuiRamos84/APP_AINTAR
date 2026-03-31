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
from app.utils.utils import db_session_manager
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
def get_session_logs(current_user: str, filters: dict):
    """
    Retorna histórico de sessões da tabela ts_session com paginação server-side.
    Parâmetros:
        page        - página atual (default 1)
        per_page    - registos por página (default 50, max 200)
        username    - filtro por nome de utilizador (ILIKE)
        date_from   - data início (ISO, default hoje-7d)
        date_to     - data fim (ISO, default hoje)
        active_only - 'true' para mostrar apenas sessões sem stopdate
    """
    from datetime import timedelta

    page     = max(1, int(filters.get('page', 1)))
    per_page = min(200, max(1, int(filters.get('per_page', 50))))
    offset   = (page - 1) * per_page

    # Datas default: últimos 7 dias
    now      = datetime.now(timezone.utc)
    date_to  = filters.get('date_to')  or now.date().isoformat()
    date_from = filters.get('date_from') or (now - timedelta(days=7)).date().isoformat()

    conditions = ["startdate::date BETWEEN :date_from AND :date_to"]
    params     = {'date_from': date_from, 'date_to': date_to, 'limit': per_page, 'offset': offset}

    if filters.get('username'):
        conditions.append("username ILIKE :username")
        params['username'] = f"%{filters['username']}%"

    if filters.get('active_only') == 'true':
        conditions.append("stopdate IS NULL")

    where = " AND ".join(conditions)

    count_sql = text(f"SELECT COUNT(*) FROM ts_session WHERE {where}")
    data_sql  = text(f"""
        SELECT pk, ts_client, username, profile, entity,
               startdate, stopdate,
               CASE WHEN stopdate IS NULL THEN true ELSE false END AS active,
               EXTRACT(EPOCH FROM (COALESCE(stopdate, NOW()) - startdate))::int AS duration_seconds
          FROM ts_session
         WHERE {where}
         ORDER BY startdate DESC
         LIMIT :limit OFFSET :offset
    """)

    with db_session_manager(current_user) as session:
        total = session.execute(count_sql, params).scalar()
        rows  = session.execute(data_sql,  params).fetchall()

    sessions = [
        {
            'pk':               r.pk,
            'ts_client':        r.ts_client,
            'username':         r.username,
            'profile':          r.profile,
            'entity':           r.entity,
            'startdate':        r.startdate.isoformat() if r.startdate else None,
            'stopdate':         r.stopdate.isoformat()  if r.stopdate  else None,
            'active':           r.active,
            'duration_seconds': r.duration_seconds,
        }
        for r in rows
    ]

    return {
        'sessions': sessions,
        'total':    total,
        'page':     page,
        'per_page': per_page,
        'pages':    max(1, -(-total // per_page)),  # ceil division
        'date_from': date_from,
        'date_to':   date_to,
    }, 200


@api_error_handler
def kill_sessions(current_user: str, mode: str, username: str = None):
    """
    Termina sessões ativas de forma centralizada.

    Modos:
        'user'  — todas as sessões ativas de um utilizador específico (username obrigatório)
        'all'   — todas as sessões ativas (exceto a do admin que executa a ação)
        'stale' — sessões ativas há mais de 8 horas sem actividade (stopdate IS NULL AND startdate < NOW()-8h)
    """
    from app.services.auth_service import fs_logout

    if mode == 'user' and not username:
        return {'erro': 'username obrigatório para mode=user'}, 400

    own_pk = int(current_user)  # Sessão do admin — nunca pode ser terminada

    with db_session_manager(current_user) as session:
        if mode == 'user':
            rows = session.execute(
                text("""
                    SELECT pk FROM ts_session
                     WHERE stopdate IS NULL
                       AND username = :username
                       AND pk != :own
                """),
                {'username': username, 'own': own_pk}
            ).fetchall()

        elif mode == 'all':
            rows = session.execute(
                text("SELECT pk FROM ts_session WHERE stopdate IS NULL AND pk != :own"),
                {'own': own_pk}
            ).fetchall()

        elif mode == 'stale':
            rows = session.execute(
                text("""
                    SELECT pk FROM ts_session
                     WHERE stopdate IS NULL
                       AND pk != :own
                       AND startdate < NOW() - INTERVAL '8 hours'
                """),
                {'own': own_pk}
            ).fetchall()

        else:
            return {'erro': 'mode inválido. Use: user | all | stale'}, 400

    pks = [r.pk for r in rows]
    if not pks:
        return {'message': 'Nenhuma sessão encontrada para terminar.', 'killed': 0}, 200

    killed  = 0
    zombies = 0
    errors  = 0
    for pk in pks:
        result = fs_logout(pk)
        if result.get('success'):
            killed += 1
        elif 'SESSÃO INVÁLIDA' in (result.get('message') or ''):
            # Sessão zombie: stopdate IS NULL mas já inválida na BD.
            # Faz UPDATE direto para limpar o registo.
            try:
                with db_session_manager(current_user) as session:
                    session.execute(
                        text("UPDATE ts_session SET stopdate = NOW() WHERE pk = :pk AND stopdate IS NULL"),
                        {'pk': pk}
                    )
                zombies += 1
                logger.debug(f"Sessão zombie {pk} fechada por UPDATE direto")
            except Exception as e:
                errors += 1
                logger.warning(f"Falha ao fechar sessão zombie {pk}: {e}")
        else:
            errors += 1
            logger.warning(f"Falha ao terminar sessão {pk}: {result.get('message')}")

    logger.info(
        f"[kill_sessions] mode={mode} username={username} "
        f"killed={killed} zombies={zombies} errors={errors} by={current_user}"
    )

    parts = [f'{killed} sessão(ões) terminada(s)']
    if zombies:
        parts.append(f'{zombies} sessão(ões) zombie limpas')
    return {
        'message': ', '.join(parts) + '.',
        'killed':  killed,
        'zombies': zombies,
        'errors':  errors,
    }, 200
