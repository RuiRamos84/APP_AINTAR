from sqlalchemy.sql import text
from ..utils.utils import db_session_manager, format_message
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
from app.utils.error_handler import api_error_handler, ResourceNotFoundError

class EtarUpdate(BaseModel):
    nome: Optional[str] = None
    coord_m: Optional[float] = None
    coord_p: Optional[float] = None
    apa_licenca: Optional[str] = None
    apa_data_ini: Optional[date] = None
    apa_data_fim: Optional[date] = None
    ener_entidade: Optional[int] = None
    ener_cpe: Optional[str] = None
    ener_potencia: Optional[float] = None
    ener_val: Optional[int] = None

class EeUpdate(BaseModel):
    nome: Optional[str] = None
    coord_m: Optional[float] = None
    coord_p: Optional[float] = None
    ener_entidade: Optional[int] = None
    ener_cpe: Optional[str] = None
    ener_potencia: Optional[float] = None
    ener_val: Optional[int] = None

class VolumeCreate(BaseModel):
    pndate: date
    pnval: float
    pnspot: int

class WaterVolumeCreate(BaseModel):
    pndate: date
    pnval: float

class EnergyCreate(BaseModel):
    pndate: date
    pnval_vazio: float
    pnval_ponta: float
    pnval_cheia: float

class EtarExpenseCreate(BaseModel):
    pntt_expensedest: int
    pndate: date
    pnval: float
    pntt_etar: int
    pnts_associate: int
    pnmemo: Optional[str] = None

class RedeExpenseCreate(BaseModel):
    pntt_expensedest: int
    pndate: date
    pnval: float
    pnts_associate: int
    pnmemo: Optional[str] = None

class EeExpenseCreate(BaseModel):
    pntt_expensedest: int
    pndate: date
    pnval: float
    pntt_ee: int
    pnts_associate: int
    pnmemo: Optional[str] = None

class GenericExpenseCreate(BaseModel):
    pntt_expensedest: int
    pndate: date
    pnval: float
    pnts_associate: int
    pnmemo: Optional[str] = None

@api_error_handler
def update_etar_details(pk: int, data: dict, current_user: str):
    update_data = EtarUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("""
                SELECT fbf_etar(
                    1, -- pop = 1 para UPDATE
                    :pk,
                    :nome,
                    :coord_m,
                    :coord_p,
                    :apa_licenca,
                    :apa_data_ini,
                    :apa_data_fim,
                    :ener_entidade,
                    :ener_cpe,
                    :ener_potencia,
                    :ener_val
                )
            """)
        params = update_data.model_dump()
        params['pk'] = pk
        result = session.execute(query, params).scalar()
        return {'message': 'ETAR actualizada com sucesso', 'pk': result}, 200

@api_error_handler
def update_ee_details(pk: int, data: dict, current_user: str):
    update_data = EeUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("""
                SELECT fbf_ee(
                    1, -- pop = 1 para UPDATE
                    :pk,
                    :nome,
                    :coord_m,
                    :coord_p,
                    :ener_entidade,
                    :ener_cpe,
                    :ener_potencia,
                    :ener_val
                )
            """)
        params = update_data.model_dump()
        params['pk'] = pk
        result = session.execute(query, params).scalar()
        return {'message': 'EE actualizada com sucesso', 'pk': result}, 200

@api_error_handler
def create_etar_document(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_etar_document_createdirect(:pk)")
        result = session.execute(query, {'pk': pk}).scalar()
        formated_message = format_message(result)
        return {'result': formated_message}, 201

@api_error_handler
def create_ee_document(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_ee_document_createdirect(:pk)")
        result = session.execute(query, {'pk': pk}).scalar()
        formated_message = format_message(result)
        return {'result': formated_message}, 201

@api_error_handler
def create_etar_volume(pnpk: int, data: dict, current_user: str):
    volume_data = VolumeCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_etar_volumeread_createdirect(:pnpk, :pndate, :pnval, :pnspot)")
        params = volume_data.model_dump()
        params['pnpk'] = pnpk
        result = session.execute(query, params).scalar()
        success_message = format_message(result)
        return {'message': 'Volume de ETAR registado com sucesso', 'result': success_message}, 201

@api_error_handler
def create_ee_volume(pnpk: int, data: dict, current_user: str):
    volume_data = VolumeCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_ee_volumeread_createdirect(:pnpk, :pndate, :pnval, :pnspot)")
        params = volume_data.model_dump()
        params['pnpk'] = pnpk
        result = session.execute(query, params).scalar()
        success_message = format_message(result)
        return {'message': 'Volume de EE registado com sucesso', 'result': success_message}, 201

@api_error_handler
def list_etar_volumes(tb_etar: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_etar_volumeread WHERE tb_etar = :tb_etar order by data desc")
        results = session.execute(query, {'tb_etar': tb_etar}).mappings().all()
        return {'volumes': [dict(row) for row in results]}, 200

@api_error_handler
def list_ee_volumes(tb_ee: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_ee_volumeread WHERE tb_ee = :tb_ee  order by data desc")
        results = session.execute(query, {'tb_ee': tb_ee}).mappings().all()
        return {'volumes': [dict(row) for row in results]}, 200

@api_error_handler
def create_water_etar_volume(pnpk: int, data: dict, current_user: str):
    volume_data = WaterVolumeCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_etar_waterread_createdirect(:pnpk, :pndate, :pnval)")
        params = volume_data.model_dump()
        params['pnpk'] = pnpk
        result = session.execute(query, params).scalar()
        success_message = format_message(result)
        return {'message': 'Volume de água registado com sucesso', 'result': success_message}, 201

@api_error_handler
def create_water_ee_volume(pnpk: int, data: dict, current_user: str):
    volume_data = WaterVolumeCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_ee_waterread_createdirect(:pnpk, :pndate, :pnval)")
        params = volume_data.model_dump()
        params['pnpk'] = pnpk
        result = session.execute(query, params).scalar()
        success_message = format_message(result)
        return {'message': 'Volume de água registado com sucesso', 'result': success_message}, 201

@api_error_handler
def list_etar_water_volumes(tb_etar: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_etar_waterread WHERE tb_etar = :tb_etar order by data desc")
        results = session.execute(query, {'tb_etar': tb_etar}).mappings().all()
        return {'water_volumes': [dict(row) for row in results]}, 200

@api_error_handler
def list_ee_water_volumes(tb_ee: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_ee_waterread WHERE tb_ee = :tb_ee order by data desc")
        results = session.execute(query, {'tb_ee': tb_ee}).mappings().all()
        return {'water_volumes': [dict(row) for row in results]}, 200

@api_error_handler
def create_etar_energy(pnpk: int, data: dict, current_user: str):
    energy_data = EnergyCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_etar_energyread_createdirect(:pnpk, :pndate, :pnval_vazio, :pnval_ponta, :pnval_cheia)")
        params = energy_data.model_dump()
        params['pnpk'] = pnpk
        result = session.execute(query, params).scalar()
        success_message = format_message(result)
        return {'message': 'Energia de ETAR registada com sucesso', 'result': success_message}, 201

@api_error_handler
def create_ee_energy(pnpk: int, data: dict, current_user: str):
    energy_data = EnergyCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_ee_energyread_createdirect(:pnpk, :pndate, :pnval_vazio, :pnval_ponta, :pnval_cheia)")
        params = energy_data.model_dump()
        params['pnpk'] = pnpk
        result = session.execute(query, params).scalar()
        success_message = format_message(result)
        return {'message': 'Energia de EE registada com sucesso', 'result': success_message}, 201

@api_error_handler
def list_etar_energy(tb_etar: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_etar_energyread WHERE tb_etar = :tb_etar order by data desc")
        results = session.execute(query, {'tb_etar': tb_etar}).mappings().all()
        return {'energy': [dict(row) for row in results]}, 200

@api_error_handler
def list_ee_energy(tb_ee: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_ee_energyread WHERE tb_ee = :tb_ee  order by data desc")
        results = session.execute(query, {'tb_ee': tb_ee}).mappings().all()
        return {'energy': [dict(row) for row in results]}, 200

@api_error_handler
def create_etar_expense(pntt_expensedest, pndate, pnval, pntt_etar, pnts_associate, pnmemo, current_user: str):
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_expense_etar_create(:pntt_expensedest, :pndate, :pnval, :pntt_etar, :pnts_associate,  :pnmemo )")
        result = session.execute(query, {
            'pntt_expensedest': pntt_expensedest,
            'pndate': pndate,
            'pnval': pnval,
            'pntt_etar': pntt_etar,
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo
        }).scalar()
        success_message = format_message(result)
        return {'message': 'Despesa em ETAR registada com sucesso', 'result': success_message}, 201


@api_error_handler
def create_ee_expense(data: dict, current_user: str):
    expense_data = EeExpenseCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_expense_ee_create(:pntt_expensedest, :pndate, :pnval, :pntt_ee, :pnts_associate, :pnmemo)")
        result = session.execute(query, expense_data.model_dump()).scalar()
        success_message = format_message(result)
        return {'message': 'Despesa em EE registada com sucesso', 'result': success_message}, 201


@api_error_handler
def create_rede_expense(data: dict, current_user: str):
    expense_data = RedeExpenseCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_expense_rede_create(:pntt_expensedest, :pndate, :pnval, :pnts_associate, :pnmemo)")
        result = session.execute(query, expense_data.model_dump()).scalar()
        success_message = format_message(result)
        return {'message': 'Despesa na rede registada com sucesso', 'result': success_message}, 201


@api_error_handler
def create_ramal_expense(data: dict, current_user: str):
    expense_data = GenericExpenseCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_expense_ramal_create(:pntt_expensedest, :pndate, :pnval, :pnts_associate, :pnmemo)")
        result = session.execute(query, expense_data.model_dump()).scalar()
        success_message = format_message(result)
        return {'message': 'Despesa no ramal registada com sucesso', 'result': success_message}, 201


@api_error_handler
def list_etar_expenses(tb_etar, current_user):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_expense WHERE tb_etar = :tb_etar order by data desc")
        results = session.execute(query, {'tb_etar': tb_etar}).mappings().all()
        expenses = [dict(row) for row in results]
        return {'expenses': expenses}, 200


@api_error_handler
def list_ee_expenses(tb_ee, current_user):
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT * FROM vbl_expense WHERE tb_ee = :tb_ee order by data desc")
        results = session.execute(query, {'tb_ee': tb_ee}).mappings().all()
        expenses = [dict(row) for row in results]
        return {'expenses': expenses}, 200


@api_error_handler
def list_rede_expenses(current_user):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_expense WHERE tt_expensetype = 3 order by data desc")
        results = session.execute(query).mappings().all()
        expenses = [dict(row) for row in results]
        return {'expenses': expenses}, 200


@api_error_handler
def list_ramal_expenses(current_user):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_expense WHERE tt_expensetype = 4 order by data desc")
        results = session.execute(query).mappings().all()
        expenses = [dict(row) for row in results]
        return {'expenses': expenses}, 200


@api_error_handler
def get_etar_details_by_pk(current_user, pk):
    """
    Obter detalhes de uma ETAR específica a partir da view vbf_etar.
    """
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbf_etar WHERE pk = :pk")
        result = session.execute(query, {'pk': pk}).fetchone()
        if result:
            return {'details': dict(result._mapping)}, 200
        else:
            raise ResourceNotFoundError('ETAR não encontrada.')


@api_error_handler
def get_ee_details_by_pk(current_user, pk):
    """
    Obter detalhes de uma EE específica a partir da view vbf_ee.
    """
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbf_ee WHERE pk = :pk")
        result = session.execute(query, {'pk': pk}).fetchone()
        if result:
            return {'details': dict(result._mapping)}, 200
        else:
            raise ResourceNotFoundError('EE não encontrada.')


@api_error_handler
def create_manut_expense(data: dict, current_user: str):
    expense_data = GenericExpenseCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_expense_manut_create(:pntt_expensedest, :pndate, :pnval, :pnts_associate, :pnmemo)")
        result = session.execute(query, expense_data.model_dump()).scalar()
        success_message = format_message(result)
        return {'message': 'Despesa de Material de Manutenção registada com sucesso', 'result': success_message}, 201


@api_error_handler
def list_manut_expenses(current_user):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_expense WHERE tt_expensetype = 5 order by data desc")
        results = session.execute(query).mappings().all()
        expenses = [dict(row) for row in results]
        return {'expenses': expenses}, 200


@api_error_handler
def create_equip_expense(data: dict, current_user: str):
    expense_data = GenericExpenseCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_expense_equip_create(:pntt_expensedest, :pndate, :pnval, :pnts_associate, :pnmemo)")
        result = session.execute(query, expense_data.model_dump()).scalar()
        success_message = format_message(result)
        return {'message': 'Despesa de Equipamento registada com sucesso', 'result': success_message}, 201


@api_error_handler
def list_equip_expenses(current_user):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_expense WHERE tt_expensetype = 6 ORDER BY data DESC")
        results = session.execute(query).mappings().all()
        expenses = [dict(row) for row in results]
        return {'expenses': expenses}, 200


@api_error_handler
def create_etar_desmatacao(pnts_associate, pnmemo, pnpk_etar, current_user):
    """Criar pedido de desmatação para ETAR"""
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_document_createintern(20, :pnts_associate, :pnmemo, :pnpk_etar, NULL)")
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnpk_etar': pnpk_etar
        }).scalar()
        return {'message': 'Pedido de desmatação para ETAR criado com sucesso', 'document_id': result}, 201


@api_error_handler
def create_etar_retirada_lamas(pnts_associate, pnmemo, pnpk_etar, current_user):
    """Criar pedido de retirada de lamas para ETAR"""
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_document_createintern(40, :pnts_associate, :pnmemo, :pnpk_etar, NULL)")
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnpk_etar': pnpk_etar
        }).scalar()
        return {'message': 'Pedido de retirada de lamas para ETAR criado com sucesso', 'document_id': result}, 201


@api_error_handler
def create_etar_reparacao(pnts_associate, pnmemo, pnpk_etar, current_user):
    """Criar pedido de reparação para ETAR"""
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_document_createintern(45, :pnts_associate, :pnmemo, :pnpk_etar, NULL)")
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnpk_etar': pnpk_etar
        }).scalar()
        return {'message': 'Pedido de reparação para ETAR criado com sucesso', 'document_id': result}, 201


@api_error_handler
def create_etar_vedacao(pnts_associate, pnmemo, pnpk_etar, current_user):
    """Criar pedido de vedação para ETAR"""
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_document_createintern(47, :pnts_associate, :pnmemo, :pnpk_etar, NULL)")
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnpk_etar': pnpk_etar
        }).scalar()
        return {'message': 'Pedido de vedação para ETAR criado com sucesso', 'document_id': result}, 201


@api_error_handler
def create_etar_qualidade_ambiental(pnts_associate, pnmemo, pnpk_etar, current_user):
    """Criar pedido de controlo de qualidade ambiental para ETAR"""
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_document_createintern(49, :pnts_associate, :pnmemo, :pnpk_etar, NULL)")
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnpk_etar': pnpk_etar
        }).scalar()
        return {'message': 'Pedido de controlo de qualidade ambiental para ETAR criado com sucesso', 'document_id': result}, 201

@api_error_handler
def create_ee_desmatacao(pnts_associate, pnmemo, pnpk_ee, current_user):
    """Criar pedido de desmatação para EE"""
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_document_createintern(20, :pnts_associate, :pnmemo, NULL, :pnpk_ee)")
        result = session.execute(query, {'pnts_associate': pnts_associate, 'pnmemo': pnmemo, 'pnpk_ee': pnpk_ee}).scalar()
        return {'message': 'Pedido de desmatação para EE criado com sucesso', 'document_id': result}, 201

@api_error_handler
def create_ee_retirada_lamas(pnts_associate, pnmemo, pnpk_ee, current_user):
    """Criar pedido de retirada de lamas para EE"""
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_document_createintern(41, :pnts_associate, :pnmemo, NULL, :pnpk_ee)")
        result = session.execute(query, {'pnts_associate': pnts_associate, 'pnmemo': pnmemo, 'pnpk_ee': pnpk_ee}).scalar()
        return {'message': 'Pedido de retirada de lamas para EE criado com sucesso', 'document_id': result}, 201

# ... e assim por diante para o resto do ficheiro ...


@api_error_handler
def create_ee_reparacao(pnts_associate, pnmemo, pnpk_ee, current_user):
    """Criar pedido de reparação para EE"""
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_document_createintern(46, :pnts_associate, :pnmemo, NULL, :pnpk_ee)")
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnpk_ee': pnpk_ee
        }).scalar()
        return {'message': 'Pedido de reparação para EE criado com sucesso', 'document_id': result}, 201


@api_error_handler
def create_ee_vedacao(pnts_associate, pnmemo, pnpk_ee, current_user):
    """Criar pedido de vedação para EE"""
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_document_createintern(48, :pnts_associate, :pnmemo, NULL, :pnpk_ee)")
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnpk_ee': pnpk_ee
        }).scalar()
        return {'message': 'Pedido de vedação para EE criado com sucesso', 'document_id': result}, 201


@api_error_handler
def create_ee_qualidade_ambiental(pnts_associate, pnmemo, pnpk_ee, current_user):
    """Criar pedido de controlo de qualidade ambiental para EE"""
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_document_createintern(49, :pnts_associate, :pnmemo, NULL, :pnpk_ee)")
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnpk_ee': pnpk_ee
        }).scalar()
        return {'message': 'Pedido de controlo de qualidade ambiental para EE criado com sucesso', 'document_id': result}, 201

# Funções para Rede (atualizadas)


@api_error_handler
def create_rede_desobstrucao(pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor, pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user):
    """Criar pedido de desobstrução para Rede"""
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_document_createintern(
                28, :pnts_associate, :pnmemo, NULL, NULL,
                :pnaddress, :pnpostal, :pndoor, :pnfloor,
                :pnnut1, :pnnut2, :pnnut3, :pnnut4,
                :pnglat, :pnglong
            )
        """)
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnaddress': pnaddress,
            'pnpostal': pnpostal,
            'pndoor': pndoor,
            'pnfloor': pnfloor,
            'pnnut1': pnnut1,
            'pnnut2': pnnut2,
            'pnnut3': pnnut3,
            'pnnut4': pnnut4,
            'pnglat': float(pnglat) if pnglat else None,
            'pnglong': float(pnglong) if pnglong else None
        }).scalar()
        return {'message': 'Pedido de desobstrução para Rede criado com sucesso', 'document_id': result}, 201


@api_error_handler
def create_rede_reparacao_colapso(pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor, pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user):
    """Criar pedido de reparação/colapso para Rede"""
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_document_createintern(
                27, :pnts_associate, :pnmemo, NULL, NULL,
                :pnaddress, :pnpostal, :pndoor, :pnfloor,
                :pnnut1, :pnnut2, :pnnut3, :pnnut4,
                :pnglat, :pnglong
            )
        """)
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnaddress': pnaddress,
            'pnpostal': pnpostal,
            'pndoor': pndoor,
            'pnfloor': pnfloor,
            'pnnut1': pnnut1,
            'pnnut2': pnnut2,
            'pnnut3': pnnut3,
            'pnnut4': pnnut4,
            'pnglat': float(pnglat) if pnglat else None,
            'pnglong': float(pnglong) if pnglong else None
        }).scalar()
        return {'message': 'Pedido de reparação/colapso para Rede criado com sucesso', 'document_id': result}, 201

# Funções para Caixas (atualizadas)


@api_error_handler
def create_caixa_desobstrucao(pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor, pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user):
    """Criar pedido de desobstrução para Caixas"""
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_document_createintern(
                23, :pnts_associate, :pnmemo, NULL, NULL,
                :pnaddress, :pnpostal, :pndoor, :pnfloor,
                :pnnut1, :pnnut2, :pnnut3, :pnnut4,
                :pnglat, :pnglong
            )
        """)
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnaddress': pnaddress,
            'pnpostal': pnpostal,
            'pndoor': pndoor,
            'pnfloor': pnfloor,
            'pnnut1': pnnut1,
            'pnnut2': pnnut2,
            'pnnut3': pnnut3,
            'pnnut4': pnnut4,
            'pnglat': float(pnglat) if pnglat else None,
            'pnglong': float(pnglong) if pnglong else None
        }).scalar()
        return {'message': 'Pedido de desobstrução para Caixas criado com sucesso', 'document_id': result}, 201


@api_error_handler
def create_caixa_reparacao(pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor, pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user):
    """Criar pedido de reparação para Caixas"""
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_document_createintern(
                22, :pnts_associate, :pnmemo, NULL, NULL,
                :pnaddress, :pnpostal, :pndoor, :pnfloor,
                :pnnut1, :pnnut2, :pnnut3, :pnnut4,
                :pnglat, :pnglong
            )
        """)
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnaddress': pnaddress,
            'pnpostal': pnpostal,
            'pndoor': pndoor,
            'pnfloor': pnfloor,
            'pnnut1': pnnut1,
            'pnnut2': pnnut2,
            'pnnut3': pnnut3,
            'pnnut4': pnnut4,
            'pnglat': float(pnglat) if pnglat else None,
            'pnglong': float(pnglong) if pnglong else None
        }).scalar()
        return {'message': 'Pedido de reparação para Caixas criado com sucesso', 'document_id': result}, 201


@api_error_handler
def create_caixa_reparacao_tampa(pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor, pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user):
    """Criar pedido de reparação de tampa para Caixas"""
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_document_createintern(
                29, :pnts_associate, :pnmemo, NULL, NULL,
                :pnaddress, :pnpostal, :pndoor, :pnfloor,
                :pnnut1, :pnnut2, :pnnut3, :pnnut4,
                :pnglat, :pnglong
            )
        """)
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnaddress': pnaddress,
            'pnpostal': pnpostal,
            'pndoor': pndoor,
            'pnfloor': pnfloor,
            'pnnut1': pnnut1,
            'pnnut2': pnnut2,
            'pnnut3': pnnut3,
            'pnnut4': pnnut4,
            'pnglat': float(pnglat) if pnglat else None,
            'pnglong': float(pnglong) if pnglong else None
        }).scalar()
        return {'message': 'Pedido de reparação de tampa para Caixas criado com sucesso', 'document_id': result}, 201

# Funções para Ramais (atualizadas)


@api_error_handler
def create_ramal_desobstrucao(pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor, pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user):
    """Criar pedido de desobstrução para Ramais"""
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_document_createintern(
                25, :pnts_associate, :pnmemo, NULL, NULL,
                :pnaddress, :pnpostal, :pndoor, :pnfloor,
                :pnnut1, :pnnut2, :pnnut3, :pnnut4,
                :pnglat, :pnglong
            )
        """)
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnaddress': pnaddress,
            'pnpostal': pnpostal,
            'pndoor': pndoor,
            'pnfloor': pnfloor,
            'pnnut1': pnnut1,
            'pnnut2': pnnut2,
            'pnnut3': pnnut3,
            'pnnut4': pnnut4,
            'pnglat': float(pnglat) if pnglat else None,
            'pnglong': float(pnglong) if pnglong else None
        }).scalar()
        return {'message': 'Pedido de desobstrução para Ramais criado com sucesso', 'document_id': result}, 201


@api_error_handler
def create_ramal_reparacao(pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor, pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user):
    """Criar pedido de reparação para Ramais"""
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_document_createintern(
                24, :pnts_associate, :pnmemo, NULL, NULL,
                :pnaddress, :pnpostal, :pndoor, :pnfloor,
                :pnnut1, :pnnut2, :pnnut3, :pnnut4,
                :pnglat, :pnglong
            )
        """)
        result = session.execute(query, {
            'pnts_associate': pnts_associate,
            'pnmemo': pnmemo,
            'pnaddress': pnaddress,
            'pnpostal': pnpostal,
            'pndoor': pndoor,
            'pnfloor': pnfloor,
            'pnnut1': pnnut1,
            'pnnut2': pnnut2,
            'pnnut3': pnnut3,
            'pnnut4': pnnut4,
            'pnglat': float(pnglat) if pnglat else None,
            'pnglong': float(pnglong) if pnglong else None
        }).scalar()
        return {'message': 'Pedido de reparação para Ramais criado com sucesso', 'document_id': result}, 201

# Função para Requisição Interna


@api_error_handler
def create_requisicao_interna(pnmemo, current_user):
    """Criar pedido de requisição interna"""
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_document_createintern(19, NULL, :pnmemo, NULL, NULL)")
        result = session.execute(query, {
            'pnmemo': pnmemo
        }).scalar()
        return {'message': 'Pedido de requisição interna criado com sucesso', 'document_id': result}, 201


@api_error_handler
def create_etar_incumprimento(tb_etar, tt_analiseparam, resultado, limite, data, operador1, operador2, current_user):
    """Registar incumprimento em ETAR"""
    with db_session_manager(current_user) as session:
        query = text("""
            INSERT INTO vbf_etar_incumprimento 
            (tb_etar, tt_analiseparam, resultado, limite, data, operador1, operador2)
            VALUES (:tb_etar, :tt_analiseparam, :resultado, :limite, :data, :operador1, :operador2)
            RETURNING pk
        """)
        result = session.execute(query, {
            'tb_etar': tb_etar,
            'tt_analiseparam': tt_analiseparam,
            'resultado': resultado,
            'limite': limite,
            'data': data,
            'operador1': operador1,
            'operador2': operador2
        }).scalar()

        return {'message': 'Incumprimento registado', 'pk': result}, 201


@api_error_handler
def list_etar_incumprimentos(tb_etar, current_user):
    """Listar incumprimentos de uma ETAR"""
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT * FROM vbl_etar_incumprimento
            WHERE tb_etar = :tb_etar
            ORDER BY data DESC
        """)
        results = session.execute(query, {'tb_etar': tb_etar}).mappings().all()
        incumprimentos = [dict(row) for row in results]
        return {'incumprimentos': incumprimentos}, 200
