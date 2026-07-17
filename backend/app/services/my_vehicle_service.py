from datetime import datetime
from flask import current_app
from sqlalchemy.sql import text
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler, APIError
from app.utils.logger import get_logger
from .vehicle_service import add_vehicle_maintenance, set_vehicle_maintenance_status
from .notification_service import get_alert_recipients

logger = get_logger(__name__)

# tt_maintenancetype.pk para 'Reparação' — avarias entram como manutenção deste tipo
BREAKDOWN_MAINTENANCE_TYPE = 3
BREAKDOWN_STATUS_REPORTADA = 1


def _get_fleet_managers(session) -> list:
    """PKs de quem recebe alertas de frota — permissão dedicada fleet.alerts
    (migração alert_permissions.sql atribuiu-a a quem tinha fleet.edit/admin)."""
    return get_alert_recipients(session, 'fleet.alerts')


def _notify_fleet_managers(user_ids: list, licence: str, reporter_name: str,
                            memo: str, tb_vehicle: int, maintenance_pk: int):
    """Emite notificação de avaria reportada, silenciando falhas (best-effort)."""
    try:
        socketio_events = current_app.extensions.get('socketio_events')
        if socketio_events and user_ids:
            socketio_events.emit_fleet_notification(
                user_ids=user_ids,
                notification_type='avaria_reportada',
                title=f"Avaria reportada — {licence or 'viatura'}",
                message=f"{reporter_name or 'Um condutor'}: {memo}",
                tb_vehicle=tb_vehicle,
                maintenance_pk=maintenance_pk,
            )
    except Exception as e:
        logger.warning(f"Falha ao emitir notificação de avaria: {e}")


@api_error_handler
def get_my_vehicle(current_user: str):
    """
    Devolve a viatura atual do utilizador logado: prioridade a uma reserva
    'Em curso', depois a atribuição perpétua ativa (mais recente para essa
    viatura). Nenhuma das duas -> vehicle None.

    "Mais recente" é sempre por hist_time (quando foi decidido), nunca por
    "data" (introduzida pelo utilizador, sem restrição de futuro/passado —
    confirmado em produção existirem atribuições mais recentes com "data"
    anterior a atribuições já substituídas).
    """
    with db_session_manager(current_user) as session:
        own_pk = session.execute(text("SELECT fs_client()")).scalar()

        reservation = session.execute(text("""
            SELECT r.pk AS reservation_pk, r.tb_vehicle, r.brand, r.model, r.licence, r.end_time,
                   v.current_km
            FROM vbl_vehicle_reservation r
            JOIN tb_vehicle v ON v.pk = r.tb_vehicle
            WHERE r.ts_client = :c AND r.estado_atual = 'Em curso'
            ORDER BY r.start_time DESC LIMIT 1
        """), {"c": own_pk}).mappings().first()

        if reservation:
            item = dict(reservation)
            if isinstance(item.get("end_time"), datetime):
                item["end_time"] = item["end_time"].isoformat()
            return {"source": "reservation", "vehicle": item}, 200

        assignment = session.execute(text("""
            SELECT a.tb_vehicle, v.brand, v.model, v.licence, v.current_km
            FROM tb_vehicle_assign a
            JOIN tb_vehicle v ON v.pk = a.tb_vehicle
            WHERE a.ts_client = :c AND a.end_date IS NULL
              AND a.pk = (
                  SELECT a2.pk FROM tb_vehicle_assign a2
                  WHERE a2.tb_vehicle = a.tb_vehicle
                  ORDER BY a2.hist_time DESC, a2.pk DESC LIMIT 1
              )
            ORDER BY a.hist_time DESC LIMIT 1
        """), {"c": own_pk}).mappings().first()

        if assignment:
            return {"source": "assignment", "vehicle": dict(assignment)}, 200

        return {"source": None, "vehicle": None}, 200


def _owns_vehicle_now(session, own_pk: int, tb_vehicle: int) -> bool:
    has_reservation = session.execute(text("""
        SELECT 1 FROM vbl_vehicle_reservation
        WHERE tb_vehicle = :v AND ts_client = :c AND estado_atual = 'Em curso'
    """), {"v": tb_vehicle, "c": own_pk}).scalar()

    if has_reservation:
        return True

    has_assignment = session.execute(text("""
        SELECT 1 FROM tb_vehicle_assign a
        WHERE a.tb_vehicle = :v AND a.ts_client = :c AND a.end_date IS NULL
          AND a.pk = (
              SELECT a2.pk FROM tb_vehicle_assign a2
              WHERE a2.tb_vehicle = a.tb_vehicle
              ORDER BY a2.hist_time DESC, a2.pk DESC LIMIT 1
          )
    """), {"v": tb_vehicle, "c": own_pk}).scalar()

    return bool(has_assignment)


@api_error_handler
def report_breakdown(current_user: str, data: dict):
    """
    Regista uma avaria na viatura que o utilizador tem atualmente (reserva em
    curso ou atribuição perpétua). Reutiliza add_vehicle_maintenance — cria um
    registo de manutenção tipo 'Reparação', sincronizando current_km se km vier
    preenchido (mesmo helper GREATEST() já usado nas manutenções normais).
    """
    tb_vehicle = data.get("tb_vehicle")
    memo = data.get("memo")
    km = data.get("km")

    if not tb_vehicle or not memo:
        raise APIError("Viatura e descrição da avaria são obrigatórios.", 400, "ERR_VALIDATION")

    with db_session_manager(current_user) as session:
        own_pk = session.execute(text("SELECT fs_client()")).scalar()
        if not _owns_vehicle_now(session, own_pk, tb_vehicle):
            raise APIError(
                "Só pode reportar avarias na viatura que tem atualmente atribuída ou reservada.",
                403, "ERR_NOT_OWNER"
            )
        reporter_name = session.execute(text("SELECT name FROM ts_client WHERE pk = :c"), {"c": own_pk}).scalar()
        licence = session.execute(text("SELECT licence FROM tb_vehicle WHERE pk = :v"), {"v": tb_vehicle}).scalar()
        fleet_manager_ids = _get_fleet_managers(session)

    result, status_code = add_vehicle_maintenance(current_user, {
        "tb_vehicle": tb_vehicle,
        "tt_maintenancetype": BREAKDOWN_MAINTENANCE_TYPE,
        "data": datetime.now(),
        "km": km,
        # tb_vehicle_maintenance.price é NOT NULL (tb_vehicle_maintenance_nn05) —
        # uma avaria recém-reportada ainda não tem custo apurado, fica a 0 até
        # ser tratada (o estado "Reportada"/"Resolvida" é que sinaliza o fluxo,
        # não o preço).
        "price": 0,
        "memo": memo,
    })

    maintenance_pk = result.get("pk") if isinstance(result, dict) else None
    if maintenance_pk:
        # add_vehicle_maintenance insere sempre com o estado default (Resolvida) —
        # uma avaria reportada por um condutor começa antes por "Reportada".
        set_vehicle_maintenance_status(current_user, maintenance_pk, BREAKDOWN_STATUS_REPORTADA)
        _notify_fleet_managers(fleet_manager_ids, licence, reporter_name, memo, tb_vehicle, maintenance_pk)

    return result, status_code
