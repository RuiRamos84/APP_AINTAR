"""
Alerta de renovação de licenças APA das ETARs (tb_etar.apa_licenca/apa_data_ini/
apa_data_fim/apa_data_renovacao). Só as ETARs têm licença — as EE não.
"""
import re
from datetime import date
from sqlalchemy.sql import text
from ..utils.utils import db_session_manager, db_system_session
from app.utils.error_handler import api_error_handler
from app.utils.logger import get_logger
from app.services.notification_service import central_notification_service
from app.services.user_service import send_email

logger = get_logger(__name__)

# Limiares (dias até ao fim) em que se dispara um alerta — evita notificar todos
# os dias enquanto a licença está "em atenção"; só nestas marcas + a cada 7 dias
# depois de expirada.
LIMIARES_ALERTA = {90, 60, 30, 15, 7, 1, 0}


# Convenção da equipa: quando a renovação é submetida no portal da APA, o nº do
# pedido (ex: PL20241211011043) é registado nas notas da instalação (tb_etar.memo).
# É este padrão — e não "memo preenchido" — que sinaliza renovação em tramitação,
# porque o memo também guarda outros valores ('0'/'1') em várias ETARs.
RENOVACAO_RE = re.compile(r'PL\d{8,}')


def _renovacao_submetida(memo):
    return bool(memo and RENOVACAO_RE.search(memo))


def _status_licenca(dias, memo=None):
    if dias is None:
        return None
    if dias <= 30 and _renovacao_submetida(memo):
        # Expirada ou quase, mas o pedido já está com a APA — pendente de
        # terceiros, não de ação nossa.
        return 'renovacao'
    if dias < 0:
        return 'atraso'
    if dias <= 30:
        return 'atencao'
    return 'ok'


def _dias_restantes(data_fim):
    if not data_fim:
        return None
    return (data_fim - date.today()).days


@api_error_handler
def list_licencas_etar(current_user: str):
    """Licenças de todas as ETARs com data de fim registada, com estado calculado."""
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT e.pk AS tb_etar, i.nome, i.ts_entity,
                   e.apa_licenca, e.apa_data_ini, e.apa_data_fim, e.apa_data_renovacao,
                   e.memo
            FROM tb_etar e
            JOIN tb_instalacao i ON i.pk = e.pk
            WHERE e.apa_data_fim IS NOT NULL
              AND COALESCE(i.ativa, 1) = 1
            ORDER BY e.apa_data_fim
        """)).mappings().all()

        licencas = []
        for r in rows:
            d = dict(r)
            dias = _dias_restantes(d['apa_data_fim'])
            d['dias_restantes'] = dias
            d['status'] = _status_licenca(dias, d.get('memo'))
            # O memo só é relevante para a UI quando explica o estado 'renovacao'
            if d['status'] != 'renovacao':
                d['memo'] = None
            licencas.append(d)
        return {'licencas': licencas}, 200


def _get_destinatarios(session):
    """Utilizadores ativos com a permissão dedicada licenca.alerts (migração
    alert_permissions.sql atribuiu-a a quem tinha operation.access). O email
    de entidade é opcional — sem ele o utilizador recebe só a notificação
    in-app, ao contrário do critério antigo que o excluía por completo."""
    rows = session.execute(text("""
        SELECT c.pk, e.email, c.name
        FROM ts_client c
        LEFT JOIN ts_entity e ON c.ts_entity = e.pk
        WHERE COALESCE(c.active, 1) = 1
          AND EXISTS (
              SELECT 1 FROM ts_interface i
              WHERE i.value = 'licenca.alerts' AND c.interface @> ARRAY[i.pk]
          )
    """)).mappings().all()
    return [dict(r) for r in rows]


def check_licencas_expirando(app):
    """Job diário: identifica licenças de ETAR que cruzam hoje um limiar de
    alerta (90/60/30/15/7/1/0 dias por expirar, ou múltiplos de 7 dias já
    expiradas) e notifica quem tem acesso ao módulo Gestão — notificação
    in-app (sino, tempo real) + email (deduplicado por endereço, já que várias
    contas partilham o mesmo email de entidade)."""
    with app.app_context():
        socketio_events = app.extensions.get('socketio_events')

        with db_system_session() as session:
            rows = session.execute(text("""
                SELECT e.pk AS tb_etar, i.nome, e.apa_licenca, e.apa_data_fim, e.memo
                FROM tb_etar e
                JOIN tb_instalacao i ON i.pk = e.pk
                WHERE e.apa_data_fim IS NOT NULL
                  AND COALESCE(i.ativa, 1) = 1
            """)).mappings().all()

            a_alertar = []
            for r in rows:
                # Renovação já submetida à APA (nº PL nas notas): a bola está do
                # lado de terceiros — alertar semanalmente seria só ruído. O
                # painel de licenças mostra o estado 'renovacao' (amarelo).
                if _renovacao_submetida(r['memo']):
                    continue
                dias = _dias_restantes(r['apa_data_fim'])
                if dias in LIMIARES_ALERTA or (dias < 0 and dias % 7 == 0):
                    a_alertar.append({**dict(r), 'dias_restantes': dias})

            if not a_alertar:
                logger.info("[Licenças] Nenhuma licença cruza um limiar de alerta hoje.")
                return

            destinatarios = _get_destinatarios(session)

        if not destinatarios:
            logger.warning("[Licenças] Nenhum utilizador com licenca.alerts — alertas não enviados.")
            return

        emails_unicos = {d['email'] for d in destinatarios if d.get('email')}

        for lic in a_alertar:
            dias = lic['dias_restantes']
            expirada = dias < 0
            titulo = f"Licença {'expirada' if expirada else 'a expirar'} — {lic['nome']}"
            corpo = (
                f"A licença {lic['apa_licenca'] or '(sem número)'} da instalação {lic['nome']} "
                f"{'expirou há' if expirada else 'expira em'} {abs(dias)} dia(s) "
                f"({lic['apa_data_fim'].strftime('%d/%m/%Y')})."
            )
            notification_type = 'licenca_expirada' if expirada else 'licenca_expirar'

            if socketio_events:
                socketio_events.emit_licenca_notification(
                    user_ids=[d['pk'] for d in destinatarios],
                    notification_type=notification_type,
                    title=titulo, message=corpo, tb_etar=lic['tb_etar'],
                )
            else:
                logger.warning("[Licenças] socketio_events não disponível — a gravar só na tabela central.")
                for dest in destinatarios:
                    try:
                        central_notification_service.add(
                            ts_client=dest['pk'], type_='licenca', notification_type=notification_type,
                            title=titulo, message=corpo, route='/etar',
                            metadata={'tb_etar': lic['tb_etar'], 'dias_restantes': dias},
                        )
                    except Exception:
                        logger.error(f"[Licenças] Falha ao notificar utilizador {dest['pk']}", exc_info=True)

            for email in emails_unicos:
                try:
                    send_email(email, titulo, corpo)
                except Exception:
                    logger.warning(f"[Licenças] Falha ao enviar email para {email}", exc_info=True)

            logger.info(f"[Licenças] {titulo} — {len(destinatarios)} utilizador(es), {len(emails_unicos)} email(s).")
