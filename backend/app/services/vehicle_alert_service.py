"""
Alerta de documentos de viatura (seguro, inspeção, IUC) a expirar ou já
expirados. Mesmo padrão de app/services/licenca_service.py (licenças APA de
ETAR), mas notifica quem tem fleet.edit (ou admin) em vez de operation.access,
e só in-app — sem email, para não gerar N mensagens/dia quando várias
viaturas cruzam o mesmo limiar.
"""
from datetime import date
from sqlalchemy.sql import text
from ..utils.utils import db_system_session
from app.utils.logger import get_logger
from .my_vehicle_service import _get_fleet_managers

logger = get_logger(__name__)

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
