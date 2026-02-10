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

logger = get_logger(__name__)

@api_error_handler

def list_inventory(current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_inventory ORDER BY hist_time DESC")
        inventory_result = session.execute(query).mappings().all()
        inventory_list=[]
        for inv in inventory_result:
            inventory_dict=dict(inv)
            if isinstance(inventory_dict.get("submission"), datetime):
                inventory_dict["submission"] = inventory_dict["submission"].isoformat
            inventory_list.append(inventory_dict)

        # cada linha vira um dicionário
        

        print("✅ INVENTORY LIDO COM SUCESSO")

        return {'inventory': inventory_list}, 200
@api_error_handler

def add_inventory(current_user:str , data: dict ):
    """
    Adiciona um registro completo na tabela vbf_inventory.

    Parâmetros esperados no dict 'data':
      - pk: int
      - tt_inventorytype: int
      - brand: str
      - model: str
      - assign_date: timestamp (string ISO ou datetime)
      - assign_who: int
      - cost: numeric

    """
    #Criar pk
    with db_session_manager(current_user) as session:
        pk_generate = text("SELECT fs_nextcode()")
        pk = session.execute(pk_generate).scalar()
        # Extrair dados
        tt_inventorytype = data.get("tt_inventorytype")
        brand = data.get("brand")
        model = data.get("model")
        assign_date = data.get("assign_date")
        assign_who = data.get("assign_who")
        cost = data.get("cost")
        hist_client = data.get("hist_client")
        hist_time = data.get("hist_time")
        if isinstance(assign_date, str):
            assign_date = datetime.fromisoformat(assign_date)
        if isinstance(hist_time, str):
            hist_time = datetime.fromisoformat(hist_time)

        # Montar query SQL
        query = text("""
            INSERT INTO vbf_inventory 
            (pk, tt_inventorytype, brand, model, assign_date, assign_who, cost)
            VALUES
            (:pk, :tt_inventorytype, :brand, :model, :assign_date, :assign_who, :cost)
        """)
        params = {
            "pk": pk,
            "tt_inventorytype": tt_inventorytype,
            "brand": brand,
            "model": model,
            "assign_date": assign_date,
            "assign_who": assign_who,
            "cost": cost,
            
        }
    
        session.execute(query, params)
        session.commit()  # Confirma no banco

    return {
        "message": "Registro de inventário criado com sucesso",
        "pk": pk
    }, 201

@api_error_handler
def update_inventory(current_user: str, pk: int, data: dict):
    """
    Atualiza um registro na tabela vbf_inventory baseado na pk.

    Parâmetros:
      - pk: int (chave primária do registro a atualizar)
      - data: dict com os campos que quer atualizar:
          - tt_inventorytype: int (opcional)
          - brand: str (opcional)
          - model: str (opcional)
          - assign_date: timestamp (string ISO ou datetime) (opcional)
          - assign_who: int (opcional)
          - cost: numeric (opcional)
    """

    # Converte datas se forem strings
    if "assign_date" in data and isinstance(data["assign_date"], str):
        data["assign_date"] = datetime.fromisoformat(data["assign_date"])

    # Só campos permitidos
    allowed_fields = ["tt_inventorytype", "brand", "model", "assign_date", "assign_who", "cost"]
    update_fields = {k: v for k, v in data.items() if k in allowed_fields}

    if not update_fields:
        return {"message": "Nenhum campo válido para atualizar"}, 400

    # Monta SET dinamicamente
    set_clause = ", ".join([f"{key} = :{key}" for key in update_fields.keys()])
    query = text(f"""
        UPDATE vbf_inventory
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
def delete_inventory(current_user: str, pk: int):
    """
    Deleta um registro da tabela vbf_inventory baseado na pk.

    Parâmetros:
      - pk: int (chave primária do registro a deletar)
    """
    query = text("""
        DELETE FROM vbf_inventory
        WHERE pk = :pk
    """)

    with db_session_manager(current_user) as session:
        result = session.execute(query, {"pk": pk})
        session.commit()

    if result.rowcount == 0:
        return {"message": f"Registro com pk={pk} não encontrado"}, 404

    return {"message": f"Registro com pk={pk} deletado com sucesso"}, 200



        




