"""
Alertas proativos de RH: contrato a terminar, férias transitadas a expirar,
documentos com validade a vencer (ex: exame de medicina no trabalho). Mesmo
padrão de app/services/vehicle_alert_service.py — só in-app, sem email, para
não gerar N mensagens/dia enquanto vários casos cruzam o mesmo limiar. Sem
repetição pós-prazo (ao contrário da manutenção de viaturas, que é perpétua/
renovável, um contrato terminado ou um prazo de férias perdido não beneficia
de lembretes semanais infinitos — alerta uma vez em cada limiar e pronto).
"""
from datetime import date
from sqlalchemy.sql import text
from ..utils.utils import db_system_session
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Mesmos limiares de vehicle_alert_service.py — evita notificar todos os dias
# enquanto o prazo está "em atenção"; só nestas marcas, sem repetição depois.
LIMIARES_ALERTA = {90, 60, 30, 15, 7, 1, 0}


def _get_rh_admins(session) -> list:
    """PKs dos utilizadores com rh.admin (ou admin de sistema) — mesmo padrão
    de _get_fleet_managers (my_vehicle_service.py)."""
    rows = session.execute(text("""
        SELECT DISTINCT c.pk
        FROM ts_client c
        WHERE c.ts_profile = 0
           OR EXISTS (
               SELECT 1 FROM ts_interface i
               WHERE i.value = 'rh.admin' AND c.interface @> ARRAY[i.pk]
           )
    """)).fetchall()
    return [r.pk for r in rows]


def _dias_restantes(data_limite):
    if not data_limite:
        return None
    return (data_limite - date.today()).days


def check_rh_contratos_expirando(app):
    """Job diário: contratos 'Prestação de Serviços' cujo data_fim_contrato
    cruza hoje um limiar de alerta. Notifica Admin RH."""
    with app.app_context():
        socketio_events = app.extensions.get('socketio_events')

        with db_system_session() as session:
            rows = session.execute(text("""
                SELECT col.pk AS tb_user_fk, c.name, col.data_fim_contrato
                FROM ts_rh_colaborador col
                JOIN ts_client c ON c.pk = col.pk
                WHERE col.tipo_contrato = 'Prestação de Serviços'
                  AND col.data_fim_contrato IS NOT NULL
                  AND COALESCE(c.active, 1) = 1
            """)).mappings().all()

            a_alertar = []
            for r in rows:
                dias = _dias_restantes(r['data_fim_contrato'])
                if dias in LIMIARES_ALERTA:
                    a_alertar.append({**r, 'dias_restantes': dias})

            if not a_alertar:
                logger.info("[RH] Nenhum contrato cruza um limiar de alerta hoje.")
                return

            destinatarios = _get_rh_admins(session)

        if not destinatarios:
            logger.warning("[RH] Nenhum utilizador com rh.admin — alertas de contrato não enviados.")
            return
        if not socketio_events:
            logger.warning("[RH] socketio_events não disponível — alertas de contrato não enviados.")
            return

        for item in a_alertar:
            dias = item['dias_restantes']
            expirado = dias < 0
            titulo = f"Contrato {'terminado' if expirado else 'a terminar'} — {item['name']}"
            corpo = (
                f"O contrato de prestação de serviços de {item['name']} "
                f"{'terminou há' if expirado else 'termina em'} {abs(dias)} dia(s) "
                f"({item['data_fim_contrato'].strftime('%d/%m/%Y')})."
            )
            socketio_events.emit_rh_notification(
                user_ids=destinatarios,
                notification_type=f"contrato_{'terminado' if expirado else 'a_terminar'}",
                title=titulo, message=corpo,
                route='/rh/gestao/colaboradores',
            )
            logger.info(f"[RH] {titulo} — {len(destinatarios)} utilizador(es).")


def check_rh_ferias_transitadas_expirando(app):
    """Job diário: dias de férias transitados por gozar cujo prazo legal
    (data_limite_transitados, CT art. 237º) cruza hoje um limiar. Notifica o
    próprio colaborador (é quem decide marcar férias) + Admin RH."""
    with app.app_context():
        socketio_events = app.extensions.get('socketio_events')

        with db_system_session() as session:
            rows = session.execute(text("""
                SELECT tb_user_fk, colaborador_nome, data_limite_transitados,
                       dias_transitados_disponiveis
                FROM vbl_rh_saldo_ferias
                WHERE data_limite_transitados IS NOT NULL
                  AND dias_transitados_disponiveis > 0
            """)).mappings().all()

            a_alertar = []
            for r in rows:
                dias = _dias_restantes(r['data_limite_transitados'])
                if dias in LIMIARES_ALERTA:
                    a_alertar.append({**r, 'dias_restantes': dias})

            if not a_alertar:
                logger.info("[RH] Nenhuma férias transitada cruza um limiar de alerta hoje.")
                return

            admins = _get_rh_admins(session)

        if not socketio_events:
            logger.warning("[RH] socketio_events não disponível — alertas de férias transitadas não enviados.")
            return

        for item in a_alertar:
            dias = item['dias_restantes']
            expirado = dias < 0
            titulo = f"Férias transitadas {'perdidas' if expirado else 'a expirar'} — {item['colaborador_nome']}"
            corpo = (
                f"{item['dias_transitados_disponiveis']} dia(s) de férias transitados "
                f"{'expiraram há' if expirado else 'expiram em'} {abs(dias)} dia(s) "
                f"({item['data_limite_transitados'].strftime('%d/%m/%Y')})."
            )
            destinatarios = list({item['tb_user_fk'], *admins})
            socketio_events.emit_rh_notification(
                user_ids=destinatarios,
                notification_type=f"ferias_transitadas_{'perdidas' if expirado else 'a_expirar'}",
                title=titulo, message=corpo,
                route='/rh/pessoal/ferias',
            )
            logger.info(f"[RH] {titulo} — {len(destinatarios)} utilizador(es).")


def check_rh_documentos_expirando(app):
    """Job diário: documentos com data_validade preenchida (ex: exame de
    medicina no trabalho) cujo prazo cruza hoje um limiar. Notifica Admin RH
    — é obrigação da entidade empregadora agendar a renovação, não do
    colaborador."""
    with app.app_context():
        socketio_events = app.extensions.get('socketio_events')

        with db_system_session() as session:
            rows = session.execute(text("""
                SELECT pk, tb_user_fk, colaborador_nome, tipo_descr, data_validade
                FROM vbl_rh_documento
                WHERE data_validade IS NOT NULL
            """)).mappings().all()

            a_alertar = []
            for r in rows:
                dias = _dias_restantes(r['data_validade'])
                if dias in LIMIARES_ALERTA:
                    a_alertar.append({**r, 'dias_restantes': dias})

            if not a_alertar:
                logger.info("[RH] Nenhum documento cruza um limiar de validade hoje.")
                return

            destinatarios = _get_rh_admins(session)

        if not destinatarios:
            logger.warning("[RH] Nenhum utilizador com rh.admin — alertas de documento não enviados.")
            return
        if not socketio_events:
            logger.warning("[RH] socketio_events não disponível — alertas de documento não enviados.")
            return

        for item in a_alertar:
            dias = item['dias_restantes']
            expirado = dias < 0
            titulo = f"{item['tipo_descr']} {'vencido' if expirado else 'a vencer'} — {item['colaborador_nome']}"
            corpo = (
                f"O documento \"{item['tipo_descr']}\" de {item['colaborador_nome']} "
                f"{'venceu há' if expirado else 'vence em'} {abs(dias)} dia(s) "
                f"({item['data_validade'].strftime('%d/%m/%Y')})."
            )
            socketio_events.emit_rh_notification(
                user_ids=destinatarios,
                notification_type=f"documento_{'vencido' if expirado else 'a_vencer'}",
                title=titulo, message=corpo,
                route='/rh/gestao/colaboradores',
            )
            logger.info(f"[RH] {titulo} — {len(destinatarios)} utilizador(es).")
