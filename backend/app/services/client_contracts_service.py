from sqlalchemy.sql import text
from app.utils.utils import db_session_manager
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.utils.error_handler import api_error_handler, ResourceNotFoundError
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ===================================================================
# MODELOS DE DADOS COM PYDANTIC (CONTRATOS)
# ===================================================================

class ContractModel(BaseModel):
    ts_entity: int
    start_date: Optional[datetime] = None
    stop_date: Optional[datetime] = None
    family: Optional[int] = None
    tt_contractfrequency: Optional[int] = None
    address: Optional[str] = None
    postal: Optional[str] = None
    door: Optional[str] = None
    floor: Optional[str] = None
    nut1: Optional[str] = None
    nut2: Optional[str] = None
    nut3: Optional[str] = None
    nut4: Optional[str] = None

class ContractUpdateModel(ContractModel):
    ts_entity: Optional[int] = None

class ContractPaymentModel(BaseModel):
    tb_contract: int
    start_date: Optional[datetime] = None
    stop_date: Optional[datetime] = None
    value: Optional[float] = None
    presented: Optional[bool] = False
    payed: Optional[bool] = False

class ContractPaymentUpdateModel(BaseModel):
    start_date: Optional[datetime] = None
    stop_date: Optional[datetime] = None
    value: Optional[float] = None
    presented: Optional[bool] = None
    payed: Optional[bool] = None

# ===================================================================
# FUNÇÕES DE SERVIÇO (CONTRATOS)
# ===================================================================

@api_error_handler
def list_contracts(entity_id: Optional[int], current_user: str):
    with db_session_manager(current_user) as session:
        if entity_id is not None:
            # vbl_contract tem ts_entity como texto (nome). Juntamos com vbf_ para filtrar por FK
            query = text("""
                SELECT vbl.*, vbf.ts_entity as entity_id 
                FROM vbl_contract vbl
                JOIN vbf_contract vbf ON vbl.pk = vbf.pk
                WHERE vbf.ts_entity = :entity_id
                ORDER BY vbl.pk DESC
            """)
            result = session.execute(query, {'entity_id': entity_id}).mappings().all()
        else:
            query = text("""
                SELECT vbl.*, vbf.ts_entity as entity_id 
                FROM vbl_contract vbl
                JOIN vbf_contract vbf ON vbl.pk = vbf.pk
                ORDER BY vbl.pk DESC
            """)
            result = session.execute(query).mappings().all()
        return {'contracts': [dict(row) for row in result]}, 200

@api_error_handler
def get_contract(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT vbl.*, vbf.ts_entity as entity_id 
            FROM vbl_contract vbl
            JOIN vbf_contract vbf ON vbl.pk = vbf.pk
            WHERE vbl.pk = :pk
        """)
        result = session.execute(query, {'pk': pk}).fetchone()
        if not result:
            raise ResourceNotFoundError("Contrato", pk)
        return {'contract': dict(result._mapping)}, 200

@api_error_handler
def create_contract(data: dict, current_user: str):
    contract_data = ContractModel.model_validate(data)
    contract_dict = contract_data.model_dump(exclude_none=True)
    
    with db_session_manager(current_user) as session:
        columns = ", ".join(contract_dict.keys())
        values_placeholders = ", ".join([f":{k}" for k in contract_dict.keys()])
        
        insert_query = text(f"""
            INSERT INTO vbf_contract ({columns})
            VALUES ({values_placeholders})
            RETURNING pk
        """)
        result = session.execute(insert_query, contract_dict)
        pk = result.scalar()
        logger.info(f"Contrato criado com sucesso: {pk} para a entidade {contract_dict.get('ts_entity')}")
    return {'message': 'Contrato criado com sucesso', 'pk': pk}, 201

@api_error_handler
def update_contract(pk: int, data: dict, current_user: str):
    update_data = ContractUpdateModel.model_validate(data)
    update_dict = update_data.model_dump(exclude_unset=True)
    
    if not update_dict:
        return {'message': 'Nenhum dado para atualizar'}, 200
        
    set_clause = ", ".join([f"{key} = :{key}" for key in update_dict.keys()])
    update_query = text(f"UPDATE vbf_contract SET {set_clause} WHERE pk = :pk")
    
    with db_session_manager(current_user) as session:
        result = session.execute(update_query, {**update_dict, 'pk': pk})
        if result.rowcount == 0:
            raise ResourceNotFoundError("Contrato", pk)
        logger.info(f"Contrato {pk} atualizado")
    return {'message': 'Contrato atualizado com sucesso'}, 200

@api_error_handler
def delete_contract(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("DELETE FROM vbf_contract WHERE pk = :pk")
        result = session.execute(query, {'pk': pk})
        if result.rowcount == 0:
            raise ResourceNotFoundError("Contrato", pk)
        logger.info(f"Contrato {pk} apagado")
    return {'message': 'Contrato eliminado com sucesso'}, 200

# ===================================================================
# FUNÇÕES DE SERVIÇO (FREQUÊNCIAS)
# ===================================================================
@api_error_handler
def list_contract_frequencies(current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT pk, value FROM vbl_contractfrequency ORDER BY pk")
        result = session.execute(query).mappings().all()
        return {'frequencies': [dict(row) for row in result]}, 200

# ===================================================================
# FUNÇÕES DE SERVIÇO (PAGAMENTOS DE CONTRATOS)
# ===================================================================

@api_error_handler
def list_contract_payments(contract_id: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT * FROM vbl_contract_payment 
            WHERE tb_contract = :contract_id 
            ORDER BY start_date DESC, pk DESC
        """)
        result = session.execute(query, {'contract_id': contract_id}).mappings().all()
        return {'payments': [dict(row) for row in result]}, 200

@api_error_handler
def create_contract_payment(contract_id: int, data: dict, current_user: str):
    data['tb_contract'] = contract_id
    payment_data = ContractPaymentModel.model_validate(data)
    payment_dict = payment_data.model_dump(exclude_none=True)
    
    # O Pydantic valida como boolean da UI mas a Base de Dados espera um Timestamp
    if 'payed' in payment_dict:
        if payment_dict['payed'] is True:
            payment_dict['payed'] = datetime.now()
        elif payment_dict['payed'] is False:
            payment_dict['payed'] = None
    
    with db_session_manager(current_user) as session:
        columns = ", ".join(payment_dict.keys())
        values_placeholders = ", ".join([f":{k}" for k in payment_dict.keys()])
        
        insert_query = text(f"""
            INSERT INTO vbf_contract_payment ({columns})
            VALUES ({values_placeholders})
            RETURNING pk
        """)
        result = session.execute(insert_query, payment_dict)
        pk = result.scalar()
        logger.info(f"Pagamento/Fatura de Contrato criado com sucesso: {pk} (Contrato: {contract_id})")
    return {'message': 'Pagamento criado com sucesso', 'pk': pk}, 201

@api_error_handler
def update_contract_payment(pk: int, data: dict, current_user: str):
    update_data = ContractPaymentUpdateModel.model_validate(data)
    update_dict = update_data.model_dump(exclude_unset=True)
    
    if not update_dict:
        return {'message': 'Nenhum dado para atualizar'}, 200
        
    # O Pydantic valida como boolean da UI mas a Base de Dados espera um Timestamp
    if 'payed' in update_dict:
        if update_dict['payed'] is True:
            update_dict['payed'] = datetime.now()
        elif update_dict['payed'] is False:
            update_dict['payed'] = None
        
    set_clause = ", ".join([f"{key} = :{key}" for key in update_dict.keys()])
    update_query = text(f"UPDATE vbf_contract_payment SET {set_clause} WHERE pk = :pk")
    
    with db_session_manager(current_user) as session:
        result = session.execute(update_query, {**update_dict, 'pk': pk})
        if result.rowcount == 0:
            raise ResourceNotFoundError("Pagamento/Fatura", pk)
        logger.info(f"Pagamento/Fatura {pk} de Contrato atualizado")
    return {'message': 'Pagamento atualizado com sucesso'}, 200

@api_error_handler
def delete_contract_payment(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("DELETE FROM vbf_contract_payment WHERE pk = :pk")
        result = session.execute(query, {'pk': pk})
        if result.rowcount == 0:
            raise ResourceNotFoundError("Pagamento/Fatura", pk)
        logger.info(f"Pagamento/Fatura {pk} apagado")
    return {'message': 'Pagamento eliminado com sucesso'}, 200
