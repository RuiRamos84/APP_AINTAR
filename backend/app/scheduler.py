"""
scheduler.py — Geração automática de tarefas operacionais mensais

Corre no dia 25 de cada mês às 10:00 (Europe/Lisbon):
  1. Obtém todos os modos de operação com templates em tb_operacaometa
  2. Para cada modo, chama fbf_operacao$init para o mês seguinte
  3. Notifica todos os operadores afetados via Socket.IO
"""

import os
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import text
from datetime import date
from app.utils.logger import get_logger

logger = get_logger(__name__)

_scheduler = BackgroundScheduler(timezone='Europe/Lisbon')

_MONTH_PT = {
    1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
    5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
    9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
}


def _next_month(today=None):
    """Devolve (month, year) do mês seguinte ao fornecido (ou ao dia de hoje)."""
    today = today or date.today()
    if today.month == 12:
        return 1, today.year + 1
    return today.month + 1, today.year


def _job_init_operacao_month(app):
    """
    Job principal: gera tarefas para o mês seguinte e notifica operadores.
    Executa dentro do contexto Flask para ter acesso à BD e ao Socket.IO.
    """
    with app.app_context():
        from app import db

        next_month, next_year = _next_month()
        month_label = f"{_MONTH_PT[next_month]} {next_year}"
        logger.info(f"[Scheduler] ▶ Iniciando geração automática de tarefas para {month_label}")

        try:
            with db.engine.connect() as conn:
                # 1. Obter todos os modos com templates definidos
                modes = [
                    row[0] for row in conn.execute(
                        text("SELECT DISTINCT tt_operacaomodo FROM tb_operacaometa")
                    ).fetchall()
                ]

                if not modes:
                    logger.warning("[Scheduler] Nenhum modo de operação encontrado em tb_operacaometa — abortando")
                    return

                total_tasks = 0
                operator_ids = set()

                for mode in modes:
                    try:
                        # 2a. Gerar tarefas para este modo
                        conn.execute(
                            text('CALL "fbf_operacao$init"(:mode, :month, :year)'),
                            {'mode': mode, 'month': next_month, 'year': next_year},
                        )

                        # 2b. Contar tarefas geradas
                        count = conn.execute(
                            text("""
                                SELECT COUNT(*) FROM tb_operacao
                                WHERE EXTRACT(MONTH FROM data) = :month
                                  AND EXTRACT(YEAR  FROM data) = :year
                                  AND tt_operacaomodo = :mode
                            """),
                            {'month': next_month, 'year': next_year, 'mode': mode},
                        ).scalar() or 0

                        total_tasks += count
                        logger.info(f"[Scheduler] Modo {mode}: {count} tarefas geradas para {month_label}")

                        # 2c. Recolher operadores para notificação
                        for op in conn.execute(
                            text("""
                                SELECT DISTINCT ts_operador1, ts_operador2
                                FROM tb_operacaometa
                                WHERE tt_operacaomodo = :mode
                            """),
                            {'mode': mode},
                        ).fetchall():
                            if op[0]:
                                operator_ids.add(op[0])
                            if op[1]:
                                operator_ids.add(op[1])

                    except Exception as mode_err:
                        logger.error(f"[Scheduler] Erro no modo {mode}: {mode_err}")

                conn.commit()
                logger.info(f"[Scheduler] ✅ Concluído: {total_tasks} tarefas geradas para {month_label}")

            # 3. Notificar operadores (fora do with conn para não bloquear a ligação)
            if operator_ids:
                _notify_operators(app, list(operator_ids), next_month, next_year)

        except Exception as e:
            logger.error(f"[Scheduler] ❌ Erro crítico na geração mensal: {e}", exc_info=True)


def _notify_operators(app, operator_ids, month, year):
    """Emite notificação Socket.IO a todos os operadores informando o mês correto."""
    try:
        socketio_events = app.extensions.get('socketio_events')
        if not socketio_events:
            logger.warning("[Scheduler] socketio_events não disponível — notificações não enviadas")
            return

        month_name = _MONTH_PT[month]
        clean_ids = [uid for uid in operator_ids if uid]

        socketio_events.emit_operacao_notification(
            user_ids=clean_ids,
            notification_type='nova_tarefa',
            title=f'Tarefas de {month_name} {year} disponíveis',
            message=(
                f'As suas tarefas operacionais de {month_name} {year} '
                f'foram geradas e estão disponíveis na aplicação.'
            ),
            meta_pk=None,
            operacao_pk=None,
        )
        logger.info(f"[Scheduler] Notificações enviadas para {len(clean_ids)} operadores")

    except Exception as e:
        logger.warning(f"[Scheduler] Falha ao enviar notificações: {e}")


def init_scheduler(app):
    """
    Regista o job mensal e arranca o APScheduler.
    Deve ser chamado no final de create_app(), depois de registar os blueprints e Socket.IO.

    Guarda contra dupla inicialização: não corre se WERKZEUG_RUN_MAIN não estiver
    definido (processo pai do reloader) — em produção (waitress) corre sempre.
    """
    # Em desenvolvimento com reloader do Flask o processo pai não deve iniciar o scheduler
    if app.debug and os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        logger.info("[Scheduler] Modo debug — scheduler não iniciado no processo pai")
        return

    _scheduler.add_job(
        func=_job_init_operacao_month,
        args=[app],
        trigger=CronTrigger(day=25, hour=10, minute=0, timezone='Europe/Lisbon'),
        id='init_operacao_month_auto',
        name='Geração automática de tarefas operacionais mensais',
        replace_existing=True,
        misfire_grace_time=3600,  # Se o servidor estiver em baixo às 10:00, recupera até às 11:00
    )

    _scheduler.start()
    logger.info("[Scheduler] ✅ Iniciado — job agendado para o dia 25 de cada mês às 10:00 (Europe/Lisbon)")

    import atexit
    atexit.register(lambda: _scheduler.shutdown(wait=False))
