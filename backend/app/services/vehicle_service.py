from flask import current_app
from pydantic import BaseModel, Field, conint, constr
from typing import Optional, List
from sqlalchemy.sql import text
from ..utils.utils import format_message, db_session_manager
from .auth_service import fs_login, validate_session, fs_logout
from datetime import datetime
import os
from app import socket_io
from flask import request, send_file
from app.utils.utils import send_mail
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from app.utils.error_handler import api_error_handler, ResourceNotFoundError, APIError
from . import pdf_filler_service
from app.utils.logger import get_logger
from datetime import datetime, date
logger = get_logger(__name__)



@api_error_handler
def list_vehicle(current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_vehicle order by hist_time desc")
        vehicle_result = session.execute(query).mappings().all()
        vehicle_list = [dict(v) for v in vehicle_result]
        logger.info("Veículos listados com sucesso")
        return {'vehicle': vehicle_list}, 200

@api_error_handler
def add_vehicle(current_user: str, data: dict):
    with db_session_manager(current_user) as session:

        # Gerar PK
        pk_generate = text("SELECT fs_nextcode()")
        pk = session.execute(pk_generate).scalar()

        # Extrair dados
        brand = data.get("brand")
        licence = data.get("licence")
        model = data.get("model")
        current_km = data.get("current_km")
        delivery_km = data.get("delivery_km", 0)

        # Corrigir typo e converter datas
        delivery = data.get("delivery")
        inspection_date = data.get("inspection_date")  # corrigido
        insurance_date = data.get("insurance_date")
        iuc_date = data.get("iuc_date")

        # Converter strings para date
        for date_name, date_value in [("delivery", delivery),
                                      ("inspection_date", inspection_date),
                                      ("insurance_date", insurance_date),
                                      ("iuc_date", iuc_date)]:
            if isinstance(date_value, str):
                converted_date = datetime.fromisoformat(date_value).date()
                if date_name == "delivery":
                    delivery = converted_date
                elif date_name == "inspection_date":
                    inspection_date = converted_date
                elif date_name == "insurance_date":
                    insurance_date = converted_date
                else:
                    iuc_date = converted_date

        # Montar query SQL
        query = text("""
            INSERT INTO vbf_vehicle
            (pk, brand, delivery, delivery_km, current_km, inspection_date, insurance_date, iuc_date, licence, model)
            VALUES
            (:pk, :brand, :delivery, :delivery_km, :current_km, :inspection_date, :insurance_date, :iuc_date, :licence, :model)
        """)

        params = {
            "pk": pk,
            "brand": brand,
            "delivery": delivery,
            "delivery_km": delivery_km,
            "current_km": current_km,
            "inspection_date": inspection_date,
            "insurance_date": insurance_date,
            "iuc_date": iuc_date,
            "licence": licence,
            "model": model
        }

        session.execute(query, params)
        session.commit()  # Confirma no banco

    return {
        "message": "Registro de veículo criado com sucesso",
        "pk": pk
    }, 201
@api_error_handler
def update_vehicle(current_user: str, pk: int, data: dict):
    """
    Atualiza um registro na tabela vbf_vehicle baseado na pk.

    Parâmetros:
      - pk: int (chave primária do registro a atualizar)
      - data: dict com os campos que quer atualizar:
          - brand: text (opcional)
          - delivery: date ou string ISO (opcional)
          - delivery_km: int (opcional)
          - current_km: int (opcional)
          - inspection_date: date ou string ISO (opcional)
          - insurance_date: date ou string ISO (opcional)
          - iuc_date: date ou string ISO (opcional)
          - licence: text (opcional)
          - model: text (opcional)
    """
    # Converter datas se forem strings
    for date_field in ["delivery", "inspection_date", "insurance_date", "iuc_date"]:
        if date_field in data and isinstance(data[date_field], str):
            data[date_field] = datetime.fromisoformat(data[date_field])

    # Apenas campos permitidos
    allowed_fields = [
        "brand", "delivery", "delivery_km", "current_km",
        "inspection_date", "insurance_date", "iuc_date", "licence", "model",
    ]
    update_fields = {k: v for k, v in data.items() if k in allowed_fields}

    if not update_fields:
        return {"message": "Nenhum campo válido para atualizar"}, 400

    # Monta SET dinamicamente
    set_clause = ", ".join([f"{key} = :{key}" for key in update_fields.keys()])
    query = text(f"""
        UPDATE vbf_vehicle
        SET {set_clause}
        WHERE pk = :pk
    """)

    # Adiciona pk aos parâmetros
    params = update_fields.copy()
    params["pk"] = pk

    # Executa no banco
    with db_session_manager(current_user) as session:
        if "current_km" in update_fields and update_fields["current_km"] is not None:
            max_km = session.execute(
                text("SELECT MAX(km) FROM tb_vehicle_maintenance WHERE tb_vehicle = :pk"),
                {"pk": pk}
            ).scalar()
            if max_km is not None and update_fields["current_km"] < max_km:
                raise APIError(
                    "A quilometragem não pode ser inferior à última manutenção registada.",
                    400, "ERR_VALIDATION"
                )

        result = session.execute(query, params)
        session.commit()

    if result.rowcount == 0:
        return {"message": f"Registro com pk={pk} não encontrado"}, 404

    return {"message": f"Registro com pk={pk} atualizado com sucesso"}, 200
@api_error_handler
def list_vehicle_assign(current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_vehicle_assign ORDER BY hist_time DESC")
        vehicle_assign_result = session.execute(query).mappings().all()
        vehicle_assign_list = []

        for assign in vehicle_assign_result:
            assign_dict = dict(assign)
            # Converter data se necessário
            if isinstance(assign_dict.get("data"), (datetime, date)):
                assign_dict["data"] = assign_dict["data"].isoformat()
            vehicle_assign_list.append(assign_dict)

        logger.info("Atribuições de veículos listadas com sucesso")
        return {"vehicle_assign": vehicle_assign_list}, 200


@api_error_handler
def add_vehicle_assign(current_user: str, data: dict):
    """
    Adiciona um registro na tabela vbl_vehicle_assign.

    Parâmetros esperados em data:
      - tb_vehicle: int4
      - data: date ou string ISO
      - ts_client: text
    """
    with db_session_manager(current_user) as session:
        # Gerar PK
        pk_generate = text("SELECT fs_nextcode()")
        pk = session.execute(pk_generate).scalar()

        # Extrair dados
        tb_vehicle = data.get("tb_vehicle")
        assign_date = data.get("data")
        ts_client = data.get("ts_client")

        # Converter datas se forem string
        if isinstance(assign_date, str):
            assign_date = datetime.fromisoformat(assign_date)

        # Montar query SQL
        query = text("""
            INSERT INTO vbf_vehicle_assign
            (pk, tb_vehicle, data, ts_client)
            VALUES
            (:pk, :tb_vehicle, :data, :ts_client)
        """)

        params = {
            "pk": pk,
            "tb_vehicle": tb_vehicle,
            "data": assign_date,
            "ts_client": ts_client
        }

        session.execute(query, params)
        session.commit()

    return {
        "message": "Registro de veículo atribuído criado com sucesso",
        "pk": pk
    }, 201


@api_error_handler
def update_vehicle_assign(current_user: str, pk: int, data: dict):
    """
    Atualiza um registro na tabela vbf_vehicle_assign.

    Parâmetros:
      - pk: int (chave primária da URL)
      - data: dict com os campos a atualizar:
          - tb_vehicle: int4 (opcional)
          - data: date ou string ISO (opcional)
          - ts_client: text (opcional)

    NOTA: fbf_vehicle_assign bloqueia UPDATE de propósito (pop=1 -> fs_errors,
    mesmo padrão "nunca apagar" do resto da BD) — esta função nunca chega a ter
    sucesso contra a BD tal como está; mantida por compatibilidade com a rota
    já existente, não estendida com novos campos.
    """
    allowed_fields = ["tb_vehicle", "data", "ts_client"]
    update_fields = {k: v for k, v in data.items() if k in allowed_fields}

    if not update_fields:
        return {"message": "Nenhum campo válido para atualizar"}, 400

    # Converter data se vier como string
    if "data" in update_fields and isinstance(update_fields["data"], str):
        update_fields["data"] = datetime.fromisoformat(update_fields["data"])

    set_clause = ", ".join([f"{key} = :{key}" for key in update_fields.keys()])
    query = text(f"""
        UPDATE vbf_vehicle_assign
        SET {set_clause}
        WHERE pk = :pk
    """)

    params = update_fields.copy()
    params["pk"] = pk

    with db_session_manager(current_user) as session:
        result = session.execute(query, params)
        session.commit()

    if result.rowcount == 0:
        return {"message": f"Registo com pk={pk} não encontrado"}, 404

    return {
        "message": "Atribuição de veículo atualizada com sucesso",
        "pk": pk
    }, 200


@api_error_handler
def end_vehicle_assign(current_user: str, tb_vehicle: int):
    """
    "Devolver à pool": insere uma NOVA linha em vbf_vehicle_assign já com
    end_date preenchido (nunca UPDATE — fbf_vehicle_assign bloqueia-o de
    propósito). ts_client mantém o último condutor (NOT NULL por constraint),
    só que a linha já nasce "terminada" — current_assignee/is_current passam
    a refletir "pool" a partir desta linha, sem tocar em nenhum registo antigo.
    """
    with db_session_manager(current_user) as session:
        current = session.execute(text("""
            SELECT a.pk, a.ts_client FROM tb_vehicle_assign a
            WHERE a.tb_vehicle = :v AND a.end_date IS NULL
              AND a.pk = (
                  SELECT a2.pk FROM tb_vehicle_assign a2
                  WHERE a2.tb_vehicle = a.tb_vehicle
                  ORDER BY a2.hist_time DESC, a2.pk DESC LIMIT 1
              )
        """), {"v": tb_vehicle}).mappings().first()

        if not current:
            raise APIError("Esta viatura já não tem nenhuma atribuição ativa.", 400, "ERR_VALIDATION")

        pk = session.execute(text("SELECT fs_nextcode()")).scalar()
        today = date.today()

        session.execute(text("""
            INSERT INTO vbf_vehicle_assign (pk, tb_vehicle, data, ts_client, end_date)
            VALUES (:pk, :tb_vehicle, :data, :ts_client, :end_date)
        """), {
            "pk": pk,
            "tb_vehicle": tb_vehicle,
            "data": today,
            "ts_client": current["ts_client"],
            "end_date": today,
        })
        session.commit()

    return {"message": "Viatura devolvida à pool com sucesso", "pk": pk}, 201


@api_error_handler
def list_vehicle_maintenance(current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_vehicle_maintenance ORDER BY hist_time DESC")
        maintenance_result = session.execute(query).mappings().all()
        maintenance_list = []

        for maint in maintenance_result:
            maint_dict = dict(maint)
            # Converter data se necessário
            if isinstance(maint_dict.get("data"), (datetime, date)):
                maint_dict["data"] = maint_dict["data"].isoformat()
            maintenance_list.append(maint_dict)

        logger.info("Manutenções de veículos listadas com sucesso")
        return {"vehicle_maintenance": maintenance_list}, 200


@api_error_handler
def add_vehicle_maintenance(current_user: str, data: dict):
    """
    Adiciona um registro na tabela vbf_vehicle_maintenance.

    Parâmetros esperados em data:
      - brand: text
      - model: text
      - licence: text
      - tt_maintenancetype: text
      - data: date ou string ISO
      - km: int (opcional — quilometragem da viatura nesta intervenção)
      - price: int
    """
    with db_session_manager(current_user) as session:
        # Gerar PK
        pk_generate = text("SELECT fs_nextcode()")
        pk = session.execute(pk_generate).scalar()

        # Extrair dados
        tb_vehicle =data.get("tb_vehicle")
        maint_type = data.get("tt_maintenancetype")
        maint_date = data.get("data")
        km = data.get("km")
        price = data.get("price")
        memo = data.get("memo")

        # Converter data se for string
        if isinstance(maint_date, str):
            maint_date = datetime.fromisoformat(maint_date)

        # Montar query SQL
        query = text("""
            INSERT INTO vbf_vehicle_maintenance
            (pk, tb_vehicle, tt_maintenancetype, data, km, price, memo)
            VALUES
            (:pk, :tb_vehicle, :tt_maintenancetype, :data, :km, :price, :memo)
        """)

        params = {
            "pk": pk,
            "tb_vehicle": tb_vehicle,
            "tt_maintenancetype": maint_type,
            "data": maint_date,
            "km": km,
            "price": price,
            "memo": memo
        }

        session.execute(query, params)

        # Mantém tb_vehicle.current_km sincronizado com a manutenção mais recente
        if km is not None:
            session.execute(
                text("UPDATE tb_vehicle SET current_km = GREATEST(COALESCE(current_km, 0), :km) WHERE pk = :tb_vehicle"),
                {"km": km, "tb_vehicle": tb_vehicle}
            )

        session.commit()

    return {
        "message": "Registro de manutenção criado com sucesso",
        "pk": pk
    }, 201


@api_error_handler
def update_vehicle_maintenance(current_user: str, pk: int, data: dict):
    """
    Atualiza um registro na tabela vbf_vehicle_maintenance baseado na pk.

    Parâmetros:
      - pk: int (chave primária do registro a atualizar)
      - data: dict com os campos que quer atualizar:
          - tb_vehicle: int (opcional)
          - tt_maintenancetype: int (opcional)
          - data: timestamp (string ISO ou datetime) (opcional)
          - km: int (opcional)
          - price: numeric (opcional)
    """

    # Converte datas se forem strings
    if "data" in data and isinstance(data["data"], str):
        data["data"] = datetime.fromisoformat(data["data"])

    # Só campos permitidos
    allowed_fields = ["tb_vehicle", "tt_maintenancetype", "data", "km", "price"]
    update_fields = {k: v for k, v in data.items() if k in allowed_fields}

    if not update_fields:
        return {"message": "Nenhum campo válido para atualizar"}, 400

    # Monta SET dinamicamente
    set_clause = ", ".join([f"{key} = :{key}" for key in update_fields.keys()])
    query = text(f"""
        UPDATE vbf_vehicle_maintenance
        SET {set_clause}
        WHERE pk = :pk
    """)

    # Adiciona pk aos parâmetros
    params = update_fields.copy()
    params["pk"] = pk

    # Executa no banco
    with db_session_manager(current_user) as session:
        result = session.execute(query, params)
        session.commit()

    if result.rowcount == 0:
        return {"message": f"Registro com pk={pk} não encontrado"}, 404

    return {"message": f"Registro com pk={pk} atualizado com sucesso"}, 200


MAINTENANCE_STATUS_IDS = (1, 2, 3)  # 1=Reportada, 2=Em resolução, 3=Resolvida


@api_error_handler
def set_vehicle_maintenance_status(current_user: str, pk: int, status: int):
    """
    Transição de estado de uma manutenção/avaria (fbf_vehicle_maintenance$status).
    Separado do UPDATE genérico porque este está bloqueado de propósito
    (fbf_vehicle_maintenance trata o registo como histórico imutável) — o
    estado é metadado de fluxo de trabalho, não parte do registo em si.
    """
    if status not in MAINTENANCE_STATUS_IDS:
        raise APIError("Estado inválido.", 400, "ERR_VALIDATION")

    with db_session_manager(current_user) as session:
        result = session.execute(
            text("SELECT fbf_vehicle_maintenance$status(:pk, :status)"),
            {"pk": pk, "status": status},
        )
        session.commit()
        if result.scalar() is None:
            return {"message": f"Registro com pk={pk} não encontrado"}, 404

    return {"message": "Estado atualizado com sucesso", "pk": pk}, 200