"""
Alertas proativos de Frota: documentos de viatura (seguro, inspeção, IUC) e
revisão/manutenção por km/meses. Mesmo padrão de app/services/licenca_service.py
(licenças APA de ETAR), mas notifica quem tem fleet.edit (ou admin) em vez de
operation.access, e só in-app — sem email, para não gerar N mensagens/dia
quando várias viaturas cruzam o mesmo limiar.
"""
from datetime import date
from sqlalchemy.sql import text
from ..utils.utils import db_system_session
from app.utils.logger import get_logger
from .my_vehicle_service import _get_fleet_managers

logger = get_logger(__name__)

# Repetir o alerta de manutenção (mesmo estado, mesma viatura+tipo) só depois
# deste número de dias — evita spam diário enquanto a viatura continua em
# atraso/atenção sem ninguém agir.
REPETICAO_DIAS_MANUTENCAO = 7

# Mesmos limiares de check_licencas_expirando — evita notificar todos os dias
# enquanto o documento está "em atenção"; só nestas marcas + a cada 7 dias
# depois de expirado.
LIMIARES_ALERTA = {90, 60, 30, 15, 7, 1, 0}

# (coluna em tb_vehicle, notification_type, rótulo em português)
DOCUMENTOS = [
    ('insurance_date', 'seguro', 'Seguro'),
    ('inspection_date', 'inspecao', 'Inspeção'),
    ('iuc_date', 'iuc', 'IUC'),
]


def _dias_restantes(data_doc):
    if not data_doc:
        return None
    return (data_doc - date.today()).days


def check_vehicle_documents_expirando(app):
    """Job diário: identifica documentos de viatura (seguro/inspeção/IUC) que
    cruzam hoje um limiar de alerta e notifica quem tem fleet.edit/admin —
    notificação in-app (sino, tempo real), sem email."""
    with app.app_context():
        socketio_events = app.extensions.get('socketio_events')

        with db_system_session() as session:
            rows = session.execute(text("""
                SELECT pk, brand, model, licence, insurance_date, inspection_date, iuc_date
                FROM tb_vehicle
                WHERE insurance_date IS NOT NULL
                   OR inspection_date IS NOT NULL
                   OR iuc_date IS NOT NULL
            """)).mappings().all()

            a_alertar = []
            for r in rows:
                for campo, doc_type, label in DOCUMENTOS:
                    data_doc = r[campo]
                    if not data_doc:
                        continue
                    dias = _dias_restantes(data_doc)
                    if dias in LIMIARES_ALERTA or (dias < 0 and dias % 7 == 0):
                        a_alertar.append({
                            'tb_vehicle': r['pk'],
                            'licence': r['licence'], 'brand': r['brand'], 'model': r['model'],
                            'doc_type': doc_type, 'label': label,
                            'data_doc': data_doc, 'dias_restantes': dias,
                        })

            if not a_alertar:
                logger.info("[Frota] Nenhum documento de viatura cruza um limiar de alerta hoje.")
                return

            destinatarios = _get_fleet_managers(session)

        if not destinatarios:
            logger.warning("[Frota] Nenhum utilizador com fleet.edit/admin — alertas de documentos não enviados.")
            return

        for doc in a_alertar:
            dias = doc['dias_restantes']
            expirado = dias < 0
            viatura_label = (
                f"{doc['brand']} {doc['model']} ({doc['licence']})" if doc['licence']
                else f"{doc['brand']} {doc['model']}"
            )
            titulo = f"{doc['label']} {'expirado' if expirado else 'a expirar'} — {viatura_label}"
            corpo = (
                f"O {doc['label'].lower()} da viatura {viatura_label} "
                f"{'expirou há' if expirado else 'expira em'} {abs(dias)} dia(s) "
                f"({doc['data_doc'].strftime('%d/%m/%Y')})."
            )
            notification_type = f"{doc['doc_type']}_{'expirado' if expirado else 'a_expirar'}"

            if socketio_events:
                socketio_events.emit_fleet_notification(
                    user_ids=destinatarios,
                    notification_type=notification_type,
                    title=titulo, message=corpo,
                    tb_vehicle=doc['tb_vehicle'],
                )
            else:
                logger.warning("[Frota] socketio_events não disponível — alerta de documento não enviado.")

            logger.info(f"[Frota] {titulo} — {len(destinatarios)} utilizador(es).")


def _months_between(from_date, to_date):
    """Port de monthsBetween() em maintenanceRules.js — meses completos entre
    duas datas, nunca negativo."""
    months = (to_date.year - from_date.year) * 12 + (to_date.month - from_date.month)
    if to_date.day < from_date.day:
        months -= 1
    return max(months, 0)


def _last_maintenance_alert(session, tb_vehicle, tt_maintenancetype):
    """Notificação de manutenção mais recente já enviada para esta viatura+tipo
    (qualquer estado), para decidir se este cruzamento de limiar já foi
    avisado ou se é uma escalada/repetição semanal."""
    row = session.execute(text("""
        SELECT notification_type, hist_time
        FROM tb_notification
        WHERE type = 'fleet'
          AND notification_type IN ('manutencao_atencao', 'manutencao_atraso')
          AND metadata->>'tb_vehicle' = :tb_vehicle
          AND metadata->>'tt_maintenancetype' = :tt_maintenancetype
        ORDER BY hist_time DESC
        LIMIT 1
    """), {
        'tb_vehicle': str(tb_vehicle),
        'tt_maintenancetype': str(tt_maintenancetype),
    }).mappings().first()
    return dict(row) if row else None


def check_vehicle_maintenance_expirando(app):
    """
    Job diário: alerta sobre revisão/manutenção por km ou meses em atenção
    (ratio >= 0.9) ou atraso (ratio >= 1) — mesma regra de
    maintenanceRules.js::getNextMaintenanceStatus(), portada para o backend.

    Ratio-based, não data-fixa: sem um "dia de expiração" natural para
    cruzar limiares como nos documentos, o dedup usa o histórico de
    notificações já enviadas (tb_notification) em vez de dias-até-expirar —
    alerta a primeira vez que entra em atenção/atraso, alerta de novo se
    escalar (atenção → atraso), e repete no máximo a cada
    REPETICAO_DIAS_MANUTENCAO dias enquanto ninguém regista uma manutenção
    nova (o que resetaria o ratio e pararia os alertas naturalmente).
    """
    with app.app_context():
        socketio_events = app.extensions.get('socketio_events')

        with db_system_session() as session:
            candidatos = session.execute(text("""
                WITH last_maint AS (
                    SELECT tb_vehicle, tt_maintenancetype,
                           MAX(km) AS last_km,
                           MAX(data) AS last_data
                    FROM tb_vehicle_maintenance
                    GROUP BY tb_vehicle, tt_maintenancetype
                )
                SELECT
                    v.pk AS tb_vehicle, v.brand, v.model, v.licence,
                    v.current_km, v.delivery_km, v.delivery,
                    t.pk AS tt_maintenancetype, t.value AS type_name,
                    t.interval_km, t.interval_months,
                    lm.last_km, lm.last_data
                FROM tb_vehicle v
                CROSS JOIN tt_maintenancetype t
                LEFT JOIN last_maint lm
                    ON lm.tb_vehicle = v.pk AND lm.tt_maintenancetype = t.pk
                WHERE t.interval_km IS NOT NULL OR t.interval_months IS NOT NULL
            """)).mappings().all()

            a_alertar = []
            for c in candidatos:
                last_km = c['last_km'] if c['last_km'] is not None else (c['delivery_km'] or 0)
                last_data = c['last_data'] or c['delivery']

                km_since = (c['current_km'] - last_km) if c['current_km'] is not None else None
                months_since = _months_between(last_data, date.today()) if last_data else None

                ratios = []
                if c['interval_km'] and km_since is not None:
                    ratios.append(km_since / c['interval_km'])
                if c['interval_months'] and months_since is not None:
                    ratios.append(months_since / c['interval_months'])
                if not ratios:
                    continue

                ratio = max(ratios)
                if ratio >= 1:
                    status = 'overdue'
                elif ratio >= 0.9:
                    status = 'warning'
                else:
                    continue

                notification_type = 'manutencao_atraso' if status == 'overdue' else 'manutencao_atencao'
                ultimo_alerta = _last_maintenance_alert(session, c['tb_vehicle'], c['tt_maintenancetype'])

                if ultimo_alerta is None:
                    deve_alertar = True
                elif ultimo_alerta['notification_type'] != notification_type:
                    deve_alertar = True  # escalou (atenção → atraso)
                else:
                    dias_desde_ultimo = (date.today() - ultimo_alerta['hist_time'].date()).days
                    deve_alertar = dias_desde_ultimo >= REPETICAO_DIAS_MANUTENCAO

                if not deve_alertar:
                    continue

                a_alertar.append({
                    **dict(c), 'status': status, 'notification_type': notification_type,
                    'km_since': km_since, 'months_since': months_since,
                })

            if not a_alertar:
                logger.info("[Frota] Nenhuma manutenção em atenção/atraso por notificar hoje.")
                return

            destinatarios = _get_fleet_managers(session)

        if not destinatarios:
            logger.warning("[Frota] Nenhum utilizador com fleet.edit/admin — alertas de manutenção não enviados.")
            return

        for m in a_alertar:
            viatura_label = (
                f"{m['brand']} {m['model']} ({m['licence']})" if m['licence']
                else f"{m['brand']} {m['model']}"
            )
            atraso = m['status'] == 'overdue'
            titulo = f"{m['type_name']} {'em atraso' if atraso else 'próxima'} — {viatura_label}"

            partes = []
            if m['km_since'] is not None and m['interval_km']:
                partes.append(f"{m['km_since']} km (limite {m['interval_km']} km)")
            if m['months_since'] is not None and m['interval_months']:
                partes.append(f"{m['months_since']} mês(es) (limite {m['interval_months']} meses)")
            detalhe = " e ".join(partes) if partes else "limite atingido"

            corpo = (
                f"A viatura {viatura_label} {'ultrapassou' if atraso else 'está perto de atingir'} "
                f"o limite de {m['type_name']}: {detalhe} desde a última."
            )

            if socketio_events:
                socketio_events.emit_fleet_notification(
                    user_ids=destinatarios,
                    notification_type=m['notification_type'],
                    title=titulo, message=corpo,
                    tb_vehicle=m['tb_vehicle'],
                    tt_maintenancetype=m['tt_maintenancetype'],
                )
            else:
                logger.warning("[Frota] socketio_events não disponível — alerta de manutenção não enviado.")

            logger.info(f"[Frota] {titulo} — {len(destinatarios)} utilizador(es).")
