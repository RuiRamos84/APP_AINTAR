from flask import current_app
from sqlalchemy.sql import text
from ..utils.utils import format_message, db_session_manager
from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator
from app.utils.error_handler import api_error_handler, DuplicateResourceError
from typing import Optional, Union

class EpiDeliveryFilter(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    employee_id: Optional[int] = None

class EpiDeliveryCreate(BaseModel):
    pntb_epi: int
    pntt_epiwhat: int
    pndata: date
    pnquantity: int = 1
    pndim: Optional[str] = None
    pnmemo: str = ""

    @field_validator('pndim', mode='before')
    @classmethod
    def convert_pndim_to_string(cls, v):
        """Converter pndim para string se vier como int"""
        if v is None:
            return None
        return str(v)

class EpiDeliveryUpdate(BaseModel):
    pndata: date
    pnquantity: int = 1
    pndim: Optional[str] = None
    pnmemo: str = ""

    @field_validator('pndim', mode='before')
    @classmethod
    def convert_pndim_to_string(cls, v):
        """Converter pndim para string se vier como int"""
        if v is None:
            return None
        return str(v)

class EpiDeliveryReturn(BaseModel):
    pndata: date
    pnmemo: str = ""

class EpiCreate(BaseModel):
    pk: int
    name: str

class EpiPreferencesUpdate(BaseModel):
    shoe: Optional[int] = None
    boot: Optional[int] = None
    tshirt: Optional[str] = None
    sweatshirt: Optional[str] = None
    reflectivejacket: Optional[str] = None
    polarjacket: Optional[str] = None
    monkeysuit: Optional[str] = None
    pants: Optional[str] = None
    apron: Optional[str] = None
    gown: Optional[str] = None
    welderboot: Optional[str] = None
    waterproof: Optional[str] = None
    reflectivevest: Optional[str] = None
    galoshes: Optional[str] = None
    gloves: Optional[str] = None
    mask: Optional[str] = None
    memo: Optional[str] = None

    @field_validator('shoe', 'boot', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        """Converte strings vazias para None para campos inteiros opcionais."""
        if v == '':
            return None
        return v

class EpiUserCreate(EpiPreferencesUpdate):
    pk: int
    name: str


@api_error_handler
def get_epi_deliveries(current_user: str, filters: dict = None):
    """
    Obtém o histórico de entregas de EPI com filtros opcionais
    """
    with db_session_manager(current_user) as session:
        query_str = "SELECT * FROM vbl_epi_deliver WHERE 1=1"
        params = {}

        if filters:
            filter_data = EpiDeliveryFilter.model_validate(filters)
            if filter_data.start_date:
                query_str += " AND data >= :start_date"
                params['start_date'] = filter_data.start_date
            if filter_data.end_date:
                query_str += " AND data <= :end_date"
                params['end_date'] = filter_data.end_date
            if filter_data.employee_id:
                query_str += " AND tb_epi = :employee_id"
                params['employee_id'] = filter_data.employee_id

        query_str += " ORDER BY data DESC"
        result = session.execute(text(query_str), params).mappings().all()

        deliveries = []
        for row in result:
            delivery = dict(row)
            if isinstance(delivery.get("data"), (datetime, date)):
                delivery["data"] = delivery["data"].isoformat()
            deliveries.append(delivery)
        
        return {'deliveries': deliveries}, 200


@api_error_handler
def create_epi_delivery(data: dict, current_user: str):
    """
    Registra uma nova entrega de EPI usando a função fbo_epi_deliver_create
    """
    delivery_data = EpiDeliveryCreate.model_validate(data)

    with db_session_manager(current_user) as session:
        # Verificar se já existe entrega para essa combinação
        check_query = text("""
            SELECT COUNT(*) FROM tb_epi_deliver 
            WHERE tb_epi = :tb_epi 
            AND tt_epiwhat = :tt_epiwhat 
            AND data = :data
        """)

        exists = session.execute(check_query, {
            'tb_epi': delivery_data.pntb_epi,
            'tt_epiwhat': delivery_data.pntt_epiwhat,
            'data': delivery_data.pndata
        }).scalar()

        if exists:
            raise DuplicateResourceError('Já existe uma entrega registrada para este equipamento nesta data para este funcionário.')

        query = text("""
            SELECT fbo_epi_deliver_create(
                :pntb_epi, :pntt_epiwhat, :pndata, :pnquantity, :pndim, :pnmemo
            ) AS result
        """)

        result = session.execute(query, delivery_data.model_dump()).scalar()

        if not result or "<sucess>" not in result:
            raise APIError('Falha ao registrar entrega', 500)
        formatted_result = format_message(result)
        return {'message': 'Entrega registrada com sucesso', 'result': formatted_result}, 201

@api_error_handler
def update_epi_preferences(user_pk: int, data: dict, current_user: str):
    preferences_data = EpiPreferencesUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_epi_update(
                :pk, :shoe, :boot, :tshirt, :sweatshirt, :reflectivejacket,
                :polarjacket, :monkeysuit, :pants, :apron, :gown, :welderboot,
                :waterproof, :reflectivevest, :galoshes, :gloves, :mask, :memo
            )
        """)
        params = preferences_data.model_dump(exclude_unset=True)
        params['pk'] = user_pk
        result = session.execute(query, params).scalar()
        if result:
            return {'message': 'Preferências atualizadas com sucesso', 'result': format_message(result)}, 200
        # Se a função da DB não retornar nada, pode ser que o user_pk não exista
        raise ResourceNotFoundError('Utilizador', user_pk)


@api_error_handler
def update_epi_delivery(pk: int, data: dict, current_user: str):
    """
    Atualiza uma entrega de EPI usando a função fbo_epi_deliver_update
    """
    update_data = EpiDeliveryUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_epi_deliver_update(
                :pnpk, :pndata, :pnquantity, :pndim, :pnmemo
            ) AS result
        """)
        params = update_data.model_dump()
        params['pnpk'] = pk
        result = session.execute(query, params).scalar()

        if not result or "<sucess>" not in result:
            raise APIError('Falha ao atualizar entrega', 500)
        formatted_result = format_message(result)
        return {'message': 'Entrega atualizada com sucesso', 'result': formatted_result}, 200


@api_error_handler
def return_epi_delivery(pk: int, data: dict, current_user: str):
    """
    Anula uma entrega de EPI usando a função fbo_epi_deliver_return
    """
    return_data = EpiDeliveryReturn.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_epi_deliver_return(
                :pnpk, :pndata, :pnmemo
            ) AS result
        """)
        params = return_data.model_dump()
        params['pnpk'] = pk
        result = session.execute(query, params).scalar()

        if not result or "<sucess>" not in result:
            raise APIError('Falha ao anular entrega', 500)
        formatted_result = format_message(result)
        return {'message': 'Entrega anulada com sucesso', 'result': formatted_result}, 200


@api_error_handler
def create_epi(data: dict, current_user: str):
    """
    Cria um novo colaborador EPI usando a função fbo_epi_insert
    """
    epi_user_data = EpiUserCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_epi_insert(
                :pk, :name, :shoe, :boot, :tshirt, :sweatshirt, :reflectivejacket,
                :polarjacket, :monkeysuit, :pants, :apron, :gown, :welderboot,
                :waterproof, :reflectivevest, :galoshes, :gloves, :mask, :memo
            ) AS result
        """)
        result = session.execute(query, epi_user_data.model_dump()).scalar()

        if not result or "<sucess>" not in result:
            raise APIError('Falha ao criar colaborador', 500)

        # Limpar cache após inserção
        from ..services.meta_data_service import clear_meta_data_cache
        clear_meta_data_cache()

        formatted_result = format_message(result)
        return {'message': 'Colaborador criado com sucesso', 'result': formatted_result}, 201
