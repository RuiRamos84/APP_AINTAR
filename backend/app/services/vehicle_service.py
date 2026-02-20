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
from .file_service import FileService
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from app.utils.error_handler import api_error_handler, ResourceNotFoundError
from . import pdf_filler_service
from app.utils.logger import get_logger
from datetime import datetime, date
logger = get_logger(__name__)



@api_error_handler

def list_vehicle(current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_vehicle order by hist_time desc")
        vehicle_result = session.execute(query).mappings().all()
        vehicle_list=[]
        for vehicle in vehicle_result:
            vehicle_dict=dict(vehicle)
            vehicle_list.append(vehicle_dict)
        
        print("✅ Veículo LIDO COM SUCESSO")
        

        return{'vehicle': vehicle_list}, 200

def add_vehicle(current_user: str, data: dict):
    with db_session_manager(current_user) as session:

        # Gerar PK
        pk_generate = text("SELECT fs_nextcode()")
        pk = session.execute(pk_generate).scalar()

        # Extrair dados
        brand = data.get("brand")
        licence = data.get("licence")
        model = data.get("model")

        # Corrigir typo e converter datas
        delivery = data.get("delivery")
        inspection_date = data.get("inspection_date")  # corrigido
        insurance_date = data.get("insurance_date")

        # Converter strings para date
        for date_name, date_value in [("delivery", delivery), 
                                      ("inspection_date", inspection_date), 
                                      ("insurance_date", insurance_date)]:
            if isinstance(date_value, str):
                converted_date = datetime.fromisoformat(date_value).date()
                if date_name == "delivery":
                    delivery = converted_date
                elif date_name == "inspection_date":
                    inspection_date = converted_date
                else:
                    insurance_date = converted_date

        # Montar query SQL
        query = text("""
            INSERT INTO vbf_vehicle
            (pk, brand, delivery, inspection_date, insurance_date, licence, model)
            VALUES
            (:pk, :brand, :delivery, :inspection_date, :insurance_date, :licence, :model)
        """)

        params = {
            "pk": pk,
            "brand": brand,
            "delivery": delivery,
            "inspection_date": inspection_date,
            "insurance_date": insurance_date,
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
          - inspection_date: date ou string ISO (opcional)
          - insurance_date: date ou string ISO (opcional)
          - licence: text (opcional)
          - model: text (opcional)
    """
    # Converter datas se forem strings
    for date_field in ["delivery", "inspection_date", "insurance_date"]:
        if date_field in data and isinstance(data[date_field], str):
            data[date_field] = datetime.fromisoformat(data[date_field])

    # Apenas campos permitidos
    allowed_fields = ["brand", "delivery", "inspection_date", "insurance_date", "licence", "model"]
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

        print("✅ Veículos atribuídos LIDOS COM SUCESSO")
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
def update_vehicle_assign(current_user: str, data: dict):
    """
    Atualiza um registro na tabela vbf_vehicle_assign.

    Parâmetros esperados em data:
      - pk: int (obrigatório)
      - tb_vehicle: int4 (opcional)
      - data: date ou string ISO (opcional)
      - ts_client: text (opcional)
    """

    with db_session_manager(current_user) as session:

        pk = data.get("pk")
        tb_vehicle = data.get("tb_vehicle")
        assign_date = data.get("data")
        ts_client = data.get("ts_client")

        if not pk:
            return {"error": "pk é obrigatório para atualizar"}, 400

        # Converter data se vier como string
        if isinstance(assign_date, str):
            assign_date = datetime.fromisoformat(assign_date)

        query = text("""
            UPDATE vbf_vehicle_assign
            SET
                tb_vehicle = :tb_vehicle,
                data = :data,
                ts_client = :ts_client
            WHERE pk = :pk
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
        "message": "Registro de veículo atribuído atualizado com sucesso",
        "pk": pk
    }, 200
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

        print("✅ Manutenções LIDAS COM SUCESSO")
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
        price = data.get("price")
        memo = data.get("memo")

        # Converter data se for string
        if isinstance(maint_date, str):
            maint_date = datetime.fromisoformat(maint_date)

        # Montar query SQL
        query = text("""
            INSERT INTO vbf_vehicle_maintenance
            (pk, tb_vehicle, tt_maintenancetype, data, price, memo)
            VALUES
            (:pk, :tb_vehicle, :tt_maintenancetype, :data, :price, :memo)
        """)

        params = {
            "pk": pk,
            "tb_vehicle": tb_vehicle,
            "tt_maintenancetype": maint_type,
            "data": maint_date,
            "price": price,
            "memo": memo
        }

        session.execute(query, params)
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
          - price: numeric (opcional)
    """

    # Converte datas se forem strings
    if "data" in data and isinstance(data["data"], str):
        data["data"] = datetime.fromisoformat(data["data"])

    # Só campos permitidos
    allowed_fields = ["tb_vehicle", "tt_maintenancetype", "data", "price"]
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