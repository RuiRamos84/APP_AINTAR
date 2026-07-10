from datetime import datetime
from sqlalchemy.sql import text
from sqlalchemy.exc import IntegrityError
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler, APIError, ResourceNotFoundError, DuplicateResourceError
from app.utils.permissions_decorator import get_user_permissions_from_jwt, check_permission_by_id
from app.utils.logger import get_logger

logger = get_logger(__name__)

RESERVATION_CONFLICT_MESSAGE = "A viatura já está reservada nesse período. Escolha outro horário ou viatura."


def _parse_datetime(value):
    if isinstance(value, str):
        return datetime.fromisoformat(value)
    return value


def _execute_checking_overlap(session, query, params):
    """
    Executa um INSERT/UPDATE que pode disparar o trigger de sobreposição
    (fbh_vehicle_reservation_overlap, ver backend/sql/vehicle_reservation.sql).

    Convertido aqui em DuplicateResourceError (em vez de deixar propagar como
    SQLAlchemyError genérico) para que fique registado como um único aviso de
    negócio a WARNING — não como um erro de sistema com traceback completo a
    ERROR: um conflito de reserva é operação normal do dia a dia, não uma
    falha. DuplicateResourceError já garante log único (api_error_handler
    trata-a com logger.warning, sem duplicar aqui).
    """
    try:
        return session.execute(query, params)
    except IntegrityError as e:
        session.rollback()
        if "vehicle_reservation_no_overlap" in str(e):
            raise DuplicateResourceError(RESERVATION_CONFLICT_MESSAGE) from e
        raise


def _can_manage_others(current_user: str) -> bool:
    _, user_profile, user_interfaces, _ = get_user_permissions_from_jwt()
    return check_permission_by_id('fleet.reservations.manage', user_profile, user_interfaces)


def _assert_vehicle_not_assigned(session, tb_vehicle: int):
    """
    Garante que a viatura não tem uma atribuição perpétua ativa (tb_vehicle_assign).
    Sem isto, uma viatura atribuída a tempo inteiro a alguém aparecia "Livre" nas
    Reservas e podia ser reservada por outra pessoa em cima.
    """
    # Atribuição vigente = registo mais recente (ORDER BY hist_time — quando foi
    # decidido, não "data", introduzida pelo utilizador sem restrição de
    # futuro/passado) SEM end_date (senão já foi devolvida à pool).
    assignee = session.execute(text("""
        SELECT c.name FROM tb_vehicle_assign a
        JOIN ts_client c ON c.pk = a.ts_client
        WHERE a.tb_vehicle = :v AND a.end_date IS NULL
          AND a.pk = (
              SELECT a2.pk FROM tb_vehicle_assign a2
              WHERE a2.tb_vehicle = a.tb_vehicle
              ORDER BY a2.hist_time DESC, a2.pk DESC LIMIT 1
          )
    """), {"v": tb_vehicle}).scalar()

    if assignee is not None:
        raise APIError(
            f"Viatura atribuída a {assignee} — não pode ser reservada.",
            409, "ERR_VEHICLE_ASSIGNED"
        )


def _assert_ownership(session, pk: int, current_user: str):
    """Garante que a reserva pertence ao utilizador logado, salvo se este tiver fleet.reservations.manage."""
    owner = session.execute(
        text("SELECT ts_client FROM tb_vehicle_reservation WHERE pk = :pk"),
        {"pk": pk}
    ).scalar()

    if owner is None:
        raise ResourceNotFoundError("Reserva", pk)

    if _can_manage_others(current_user):
        return

    own_pk = session.execute(text("SELECT fs_client()")).scalar()
    if owner != own_pk:
        raise APIError("Não tem permissão para alterar reservas de outros colaboradores.", 403, "ERR_NOT_OWNER")


@api_error_handler
def list_vehicle_reservations(current_user: str, filters: dict | None = None):
    filters = filters or {}
    conditions = []
    params = {}

    if filters.get("vehicle"):
        conditions.append("tb_vehicle = :vehicle")
        params["vehicle"] = filters["vehicle"]
    if filters.get("date_from"):
        conditions.append("end_time >= :date_from")
        params["date_from"] = _parse_datetime(filters["date_from"])
    if filters.get("date_to"):
        conditions.append("start_time <= :date_to")
        params["date_to"] = _parse_datetime(filters["date_to"])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    with db_session_manager(current_user) as session:
        query = text(f"SELECT * FROM vbl_vehicle_reservation {where_clause} ORDER BY start_time DESC")
        result = session.execute(query, params).mappings().all()

        reservations = []
        for row in result:
            item = dict(row)
            for field in ("start_time", "end_time", "hist_time"):
                if isinstance(item.get(field), datetime):
                    item[field] = item[field].isoformat()
            reservations.append(item)

        logger.info("Reservas de viaturas listadas com sucesso")
        return {"vehicle_reservation": reservations}, 200


@api_error_handler
def add_vehicle_reservation(current_user: str, data: dict):
    """
    Parâmetros esperados em data:
      - tb_vehicle: int
      - ts_client: int (opcional — por omissão, o próprio utilizador logado)
      - start_time: datetime ISO
      - end_time: datetime ISO
      - destination: text
      - memo: text (opcional)
    """
    with db_session_manager(current_user) as session:
        pk = session.execute(text("SELECT fs_nextcode()")).scalar()

        ts_client = data.get("ts_client")
        if not ts_client:
            ts_client = session.execute(text("SELECT fs_client()")).scalar()
        elif not _can_manage_others(current_user):
            own_pk = session.execute(text("SELECT fs_client()")).scalar()
            if int(ts_client) != own_pk:
                raise APIError("Não tem permissão para reservar em nome de outro colaborador.", 403, "ERR_NOT_OWNER")

        start_time = _parse_datetime(data.get("start_time"))
        end_time = _parse_datetime(data.get("end_time"))
        destination = data.get("destination")

        if not data.get("tb_vehicle") or not start_time or not end_time or not destination:
            raise APIError("Veículo, período e destino são obrigatórios.", 400, "ERR_VALIDATION")

        _assert_vehicle_not_assigned(session, data.get("tb_vehicle"))

        query = text("""
            INSERT INTO vbf_vehicle_reservation
            (pk, tb_vehicle, ts_client, start_time, end_time, destination, memo)
            VALUES
            (:pk, :tb_vehicle, :ts_client, :start_time, :end_time, :destination, :memo)
        """)
        _execute_checking_overlap(session, query, {
            "pk": pk,
            "tb_vehicle": data.get("tb_vehicle"),
            "ts_client": ts_client,
            "start_time": start_time,
            "end_time": end_time,
            "destination": destination,
            "memo": data.get("memo"),
        })
        session.commit()

    return {"message": "Reserva de viatura criada com sucesso", "pk": pk}, 201


@api_error_handler
def update_vehicle_reservation(current_user: str, pk: int, data: dict):
    """
    Reagenda/edita uma reserva existente. Campos aceites: tb_vehicle, start_time,
    end_time, destination, memo. Exige ser o dono da reserva ou ter fleet.reservations.manage.
    """
    if "start_time" in data:
        data["start_time"] = _parse_datetime(data["start_time"])
    if "end_time" in data:
        data["end_time"] = _parse_datetime(data["end_time"])

    allowed_fields = ["tb_vehicle", "start_time", "end_time", "destination", "memo"]
    update_fields = {k: v for k, v in data.items() if k in allowed_fields}

    if not update_fields:
        raise APIError("Nenhum campo válido para atualizar", 400, "ERR_VALIDATION")

    set_clause = ", ".join([f"{key} = :{key}" for key in update_fields.keys()])
    params = update_fields.copy()
    params["pk"] = pk

    with db_session_manager(current_user) as session:
        _assert_ownership(session, pk, current_user)

        if "tb_vehicle" in update_fields:
            _assert_vehicle_not_assigned(session, update_fields["tb_vehicle"])

        result = _execute_checking_overlap(
            session,
            text(f"UPDATE vbf_vehicle_reservation SET {set_clause} WHERE pk = :pk"),
            params
        )
        session.commit()

    if result.rowcount == 0:
        raise ResourceNotFoundError("Reserva", pk)

    return {"message": "Reserva atualizada com sucesso", "pk": pk}, 200


@api_error_handler
def cancel_vehicle_reservation(current_user: str, pk: int):
    with db_session_manager(current_user) as session:
        _assert_ownership(session, pk, current_user)

        result = session.execute(
            text("UPDATE vbf_vehicle_reservation SET ts_reservationstatus = 4 WHERE pk = :pk"),
            {"pk": pk}
        )
        session.commit()

    if result.rowcount == 0:
        raise ResourceNotFoundError("Reserva", pk)

    return {"message": "Reserva cancelada com sucesso", "pk": pk}, 200


@api_error_handler
def complete_vehicle_reservation(current_user: str, pk: int, km: int | None = None):
    with db_session_manager(current_user) as session:
        _assert_ownership(session, pk, current_user)

        result = session.execute(
            text("UPDATE vbf_vehicle_reservation SET ts_reservationstatus = 3 WHERE pk = :pk"),
            {"pk": pk}
        )

        if result.rowcount == 0:
            raise ResourceNotFoundError("Reserva", pk)

        # Km de retorno — mesmo padrão de sincronização já usado em add_vehicle_maintenance
        if km is not None:
            session.execute(text("""
                UPDATE tb_vehicle SET current_km = GREATEST(COALESCE(current_km, 0), :km)
                WHERE pk = (SELECT tb_vehicle FROM tb_vehicle_reservation WHERE pk = :pk)
            """), {"km": km, "pk": pk})

        session.commit()

    return {"message": "Reserva concluída com sucesso", "pk": pk}, 200
