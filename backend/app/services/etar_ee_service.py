import unicodedata
from sqlalchemy.sql import text
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from ..utils.utils import db_session_manager, format_message
from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional, List
from app.utils.error_handler import api_error_handler, ResourceNotFoundError
from app.utils.logger import get_logger
from app.services.meta_data_service import clear_meta_data_cache

logger = get_logger(__name__)


def _normalize_text(value):
    """Remove acentos e caixa para comparação aproximada de texto (ex: 'Saída' -> 'saida')."""
    if not value:
        return ''
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    return value.strip().lower()


def _resolve_lookup_pk(session, tabela: str, contains: str):
    """Resolve o pk de uma linha de uma tabela de lookup (tt_analiseponto,
    tt_analiseforma) cujo 'value' contenha o texto indicado, ignorando
    acentos/maiúsculas. `tabela` nunca vem do cliente — é sempre uma das
    constantes fixas chamadas abaixo."""
    rows = session.execute(text(f"SELECT pk, value FROM {tabela}")).mappings().all()
    for row in rows:
        if contains in _normalize_text(row['value']):
            return row['pk']
    return None




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
    tt_instalacaoautocontrolo: Optional[int] = None
    memo: Optional[str] = None


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


class InstalacaoExpenseCreate(BaseModel):
    pntt_expensedest: int
    pndate: date
    pnval: float
    pntt_instalacao: int
    pnts_associate: Optional[int] = None
    pnmemo: Optional[str] = None


class RedeExpenseCreate(BaseModel):
    pntt_expensedest: int
    pndate: date
    pnval: float
    pnts_associate: Optional[int] = None
    pnmemo: Optional[str] = None

    @field_validator('pndate', mode='before')
    def parse_date(cls, value):
        if isinstance(value, str):
            return value.split('T')[0]
        return value


class GenericExpenseCreate(BaseModel):
    pntt_expensedest: int
    pndate: date
    pnval: float
    pnts_associate: Optional[int] = None
    pnmemo: Optional[str] = None


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
                    :tt_instalacaoautocontrolo,
                    :file_operacao,
                    :memo
                )
            """)
        params = update_data.model_dump()
        params['pk'] = pk
        params['file_operacao'] = None
        result = session.execute(query, params).scalar()
        clear_meta_data_cache()  # a lista 'etar' da metadata fica desatualizada (ex: periodicidade de autocontrolo)
        return {'message': 'ETAR actualizada com sucesso', 'pk': result}, 200


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
        clear_meta_data_cache()  # a lista 'ee' da metadata fica desatualizada
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

# VOLUMES - Unificadas para usar tb_instalacao


@api_error_handler
def create_instalacao_volume(pnpk: int, data: dict, current_user: str):
    """Criar volume para instalação (ETAR ou EE)"""
    volume_data = VolumeCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_instalacao_volumeread_createdirect(:pnpk, :pndate, :pnval, :pnspot)")
        params = volume_data.model_dump()
        params['pnpk'] = pnpk
        result = session.execute(query, params).scalar()
        success_message = format_message(result)
        return {'message': 'Volume de instalação registado com sucesso', 'result': success_message}, 201


@api_error_handler
def list_instalacao_volumes(tb_instalacao: int, current_user: str):
    """Listar volumes de uma instalação"""
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT * FROM vbl_instalacao_volumeread WHERE tb_instalacao = :tb_instalacao order by data desc")
        results = session.execute(
            query, {'tb_instalacao': tb_instalacao}).mappings().all()
        return {'volumes': [dict(row) for row in results]}, 200

# WATER VOLUMES - Unificadas para usar tb_instalacao


@api_error_handler
def create_instalacao_water_volume(pnpk: int, data: dict, current_user: str):
    """Criar volume de água para instalação"""
    volume_data = WaterVolumeCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_instalacao_waterread_createdirect(:pnpk, :pndate, :pnval)")
        params = volume_data.model_dump()
        params['pnpk'] = pnpk
        result = session.execute(query, params).scalar()
        success_message = format_message(result)
        return {'message': 'Volume de água registado com sucesso', 'result': success_message}, 201


@api_error_handler
def list_instalacao_water_volumes(tb_instalacao: int, current_user: str):
    """Listar volumes de água de uma instalação"""
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT * FROM vbl_instalacao_waterread WHERE tb_instalacao = :tb_instalacao order by data desc")
        results = session.execute(
            query, {'tb_instalacao': tb_instalacao}).mappings().all()
        return {'water_volumes': [dict(row) for row in results]}, 200

# ENERGY - Unificadas para usar tb_instalacao


@api_error_handler
def create_instalacao_energy(pnpk: int, data: dict, current_user: str):
    """Criar energia para instalação"""
    energy_data = EnergyCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_instalacao_energyread_createdirect(:pnpk, :pndate, :pnval_vazio, :pnval_ponta, :pnval_cheia)")
        params = energy_data.model_dump()
        params['pnpk'] = pnpk
        result = session.execute(query, params).scalar()
        success_message = format_message(result)
        return {'message': 'Energia de instalação registada com sucesso', 'result': success_message}, 201


@api_error_handler
def list_instalacao_energy(tb_instalacao: int, current_user: str):
    """Listar energia de uma instalação"""
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT * FROM vbl_instalacao_energyread WHERE tb_instalacao = :tb_instalacao order by data desc")
        results = session.execute(
            query, {'tb_instalacao': tb_instalacao}).mappings().all()
        return {'energy': [dict(row) for row in results]}, 200

# EXPENSES - Unificada para usar tb_instalacao


@api_error_handler
def create_instalacao_expense(data: dict, current_user: str):
    """Criar despesa para instalação"""
    expense_data = InstalacaoExpenseCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_expense_instalacao_create(:pntt_expensedest, :pndate, :pnval, :pntt_instalacao, :pnts_associate, :pnmemo)")
        result = session.execute(query, expense_data.model_dump()).scalar()
        success_message = format_message(result)
        return {'message': 'Despesa em instalação registada com sucesso', 'result': success_message}, 201


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
        query = text(
            "SELECT fbo_expense_ramal_create(:pntt_expensedest, :pndate, :pnval, :pnts_associate, :pnmemo)")
        result = session.execute(query, expense_data.model_dump()).scalar()
        success_message = format_message(result)
        return {'message': 'Despesa no ramal registada com sucesso', 'result': success_message}, 201


@api_error_handler
def list_instalacao_expenses(tb_instalacao, current_user):
    """Listar despesas de uma instalação"""
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT * FROM vbl_expense WHERE tb_instalacao = :tb_instalacao order by data desc")
        results = session.execute(
            query, {'tb_instalacao': tb_instalacao}).mappings().all()
        expenses = [dict(row) for row in results]
        return {'expenses': expenses}, 200


@api_error_handler
def list_rede_expenses(current_user):
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT * FROM vbl_expense WHERE tt_expensetype = 3 order by data desc")
        results = session.execute(query).mappings().all()
        expenses = [dict(row) for row in results]
        return {'expenses': expenses}, 200


@api_error_handler
def list_ramal_expenses(current_user):
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT * FROM vbl_expense WHERE tt_expensetype = 4 order by data desc")
        results = session.execute(query).mappings().all()
        expenses = [dict(row) for row in results]
        return {'expenses': expenses}, 200


# ── Rede de Saneamento ────────────────────────────────────────────────────────

@api_error_handler
def list_rede_saneamento(current_user):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_rede_saneamento ORDER BY pk")
        results = session.execute(query).mappings().all()
        return {'rede': [dict(row) for row in results]}, 200


@api_error_handler
def create_rede_saneamento(instalacao_origem: int, instalacao_destino: int, current_user: str):
    from app.utils.error_handler import APIError
    with db_session_manager(current_user) as session:
        existing = session.execute(
            text("SELECT pk FROM vbf_rede_saneamento WHERE instalacao_origem = :origem"),
            {'origem': instalacao_origem},
        ).fetchone()
        if existing:
            raise APIError('Esta Estação Elevatória já tem uma ligação de saída configurada.', status_code=400)
        new_pk = session.execute(text("SELECT fs_nextcode()")).scalar()
        session.execute(
            text("INSERT INTO vbf_rede_saneamento (pk, instalacao_origem, instalacao_destino) VALUES (:pk, :origem, :destino)"),
            {'pk': new_pk, 'origem': instalacao_origem, 'destino': instalacao_destino},
        )
        return {'message': 'Ligação criada com sucesso', 'pk': new_pk}, 201


@api_error_handler
def delete_rede_saneamento(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        session.execute(text("DELETE FROM vbf_rede_saneamento WHERE pk = :pk"), {'pk': pk})
        return {'message': 'Ligação eliminada com sucesso'}, 200


class InstalacaoAutocontroloUpdate(BaseModel):
    boletim: Optional[str] = None
    data: Optional[date] = None
    cumprimento: Optional[int] = None


def list_instalacao_autocontrolo(tb_instalacao: int, current_user: str, ano: int = None):
    """Listar períodos de autocontrolo de uma instalação (opcionalmente filtrado por ano)."""
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT * FROM vbl_instalacao_autocontrolo
            WHERE tb_instalacao = :tb_instalacao
            AND (:ano IS NULL OR ano = :ano)
            ORDER BY ano DESC, periodo
        """)
        results = session.execute(
            query, {'tb_instalacao': tb_instalacao, 'ano': ano}).mappings().all()
        return {'autocontrolo': [dict(row) for row in results]}, 200


def update_instalacao_autocontrolo(pk: int, data: dict, current_user: str):
    """Atualizar um período de autocontrolo (boletim, data, cumprimento)."""
    payload = InstalacaoAutocontroloUpdate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbf_instalacao_autocontrolo(
                1, -- pop: 1 para UPDATE (único suportado)
                :pnpk, :pnboletim, :pndata, :pncumprimento
            )
        """)
        params = {
            'pnpk': pk,
            'pnboletim': payload.boletim,
            'pndata': payload.data,
            'pncumprimento': payload.cumprimento,
        }
        result = session.execute(query, params).scalar()
        success_message = format_message(result)
        return {'message': 'Autocontrolo atualizado com sucesso', 'result': success_message}, 200


def get_instalacao_autocontrolo_resumo(current_user, ano: int):
    """Estado agregado de autocontrolo por instalação, para um dado ano.

    Prioridade do estado agregado: 3 (atraso) > 2 (atenção) > 1 (não cumpre) > -1 (cumpre) > 0 (a aguardar).
    """
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT
                tb_instalacao,
                COUNT(*) AS total_periodos,
                COUNT(*) FILTER (WHERE cumprimento IS NOT NULL) AS reportados,
                COUNT(*) FILTER (WHERE status = -1) AS cumpre,
                COUNT(*) FILTER (WHERE status = 1) AS nao_cumpre,
                COUNT(*) FILTER (WHERE status = 2) AS atencao,
                COUNT(*) FILTER (WHERE status = 3) AS atraso,
                CASE
                    WHEN bool_or(status = 3) THEN 3
                    WHEN bool_or(status = 2) THEN 2
                    WHEN bool_or(status = 1) THEN 1
                    WHEN bool_and(status = -1) THEN -1
                    ELSE 0
                END AS status_resumo
            FROM vbl_instalacao_autocontrolo
            WHERE ano = :ano
            GROUP BY tb_instalacao
        """)
        results = session.execute(query, {'ano': ano}).mappings().all()
        resumo = {row['tb_instalacao']: dict(row) for row in results}
        return {'resumo': resumo}, 200


def get_instalacao_autocontrolo_periodos(current_user, ano: int):
    """Períodos de autocontrolo de TODAS as instalações, agrupados por instalação,
    para um dado ano — usado na grelha visual da página de entrada."""
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT * FROM vbl_instalacao_autocontrolo
            WHERE ano = :ano
            ORDER BY tb_instalacao, periodo
        """)
        results = session.execute(query, {'ano': ano}).mappings().all()
        periodos = {}
        for row in results:
            periodos.setdefault(row['tb_instalacao'], []).append(dict(row))
        return {'periodos': periodos}, 200


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
        query = text(
            "SELECT fbo_expense_manut_create(:pntt_expensedest, :pndate, :pnval, :pnts_associate, :pnmemo)")
        result = session.execute(query, expense_data.model_dump()).scalar()
        success_message = format_message(result)
        return {'message': 'Despesa de Material de Manutenção registada com sucesso', 'result': success_message}, 201


@api_error_handler
def list_manut_expenses(current_user):
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT * FROM vbl_expense WHERE tt_expensetype = 5 order by data desc")
        results = session.execute(query).mappings().all()
        expenses = [dict(row) for row in results]
        return {'expenses': expenses}, 200


@api_error_handler
def create_equip_expense(data: dict, current_user: str):
    expense_data = GenericExpenseCreate.model_validate(data)
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT fbo_expense_equip_create(:pntt_expensedest, :pndate, :pnval, :pnts_associate, :pnmemo)")
        result = session.execute(query, expense_data.model_dump()).scalar()
        success_message = format_message(result)
        return {'message': 'Despesa de Equipamento registada com sucesso', 'result': success_message}, 201


@api_error_handler
def list_equip_expenses(current_user):
    with db_session_manager(current_user) as session:
        query = text(
            "SELECT * FROM vbl_expense WHERE tt_expensetype = 6 ORDER BY data DESC")
        results = session.execute(query).mappings().all()
        expenses = [dict(row) for row in results]
        return {'expenses': expenses}, 200

# DOCUMENTOS - Funções unificadas para usar pnpk_instalacao


# ── Helper interno ────────────────────────────────────────────────────────────
# Chama fbf_operacao directamente (bypass de fbo_operacao$createdirect que tem bug interno)
# Parâmetros de fbf_operacao:
#   $1=pop(0=INSERT), $2=pnpk, $3=pndata, $4=pndescr, $5=pntb_instalacao,
#   $6=pntt_operacaomodo, $7=pnts_operador1, $8=pnts_operador2,
#   $9=pntt_operacaoaccao, $10=pnvalue, $11=pnvaluememo
_SQL_OPERACAO = """
    SELECT fbf_operacao(
        0,
        nextval('sq_codes'),
        :pndata,
        :pnmemo,
        :pk_entidade,
        NULL,
        :pk_operador,
        NULL,
        :tt_operacao,
        NULL,
        NULL
    )
"""


def _exec_operacao(session, pndata, pk_entidade, pk_operador, tt_operacao, pnmemo):
    from datetime import date
    result = session.execute(text(_SQL_OPERACAO), {
        'pndata': pndata or date.today(),
        'pk_entidade': pk_entidade,
        'pk_operador': pk_operador,
        'tt_operacao': tt_operacao,
        'pnmemo': pnmemo,
    }).scalar()
    return result


# ── Instalação ────────────────────────────────────────────────────────────────

def create_instalacao_desmatacao(pnts_associate, pnmemo, pnpk_instalacao, current_user, pndata=None):
    """Registar operação de desmatação numa instalação (tt=105)"""
    with db_session_manager(current_user) as session:
        result = _exec_operacao(session, pndata, pnpk_instalacao, pnts_associate, 105, pnmemo)
        return {'message': 'Desmatação registada com sucesso', 'operacao_id': result}, 201


def create_instalacao_retirada_lamas(pnts_associate, pnmemo, pnpk_instalacao, current_user, pndata=None):
    """Registar operação de limpeza/retirada de lamas numa instalação (tt=100)"""
    with db_session_manager(current_user) as session:
        result = _exec_operacao(session, pndata, pnpk_instalacao, pnts_associate, 100, pnmemo)
        return {'message': 'Limpeza de lamas registada com sucesso', 'operacao_id': result}, 201


def create_instalacao_reparacao(pnts_associate, pnmemo, pnpk_instalacao, current_user, pndata=None):
    """Registar operação de reparação numa instalação (tt=102)"""
    with db_session_manager(current_user) as session:
        result = _exec_operacao(session, pndata, pnpk_instalacao, pnts_associate, 102, pnmemo)
        return {'message': 'Reparação registada com sucesso', 'operacao_id': result}, 201


def create_instalacao_vedacao(pnts_associate, pnmemo, pnpk_instalacao, current_user, pndata=None):
    """Registar operação de vedação numa instalação (tt=104)"""
    with db_session_manager(current_user) as session:
        result = _exec_operacao(session, pndata, pnpk_instalacao, pnts_associate, 104, pnmemo)
        return {'message': 'Vedação registada com sucesso', 'operacao_id': result}, 201


def create_instalacao_visita_tecnica(pnts_associate, pnmemo, pnpk_instalacao, current_user, pndata=None):
    """Registar visita técnica numa instalação (tt=6)"""
    with db_session_manager(current_user) as session:
        result = _exec_operacao(session, pndata, pnpk_instalacao, pnts_associate, 6, pnmemo)
        return {'message': 'Visita técnica registada com sucesso', 'operacao_id': result}, 201


def create_instalacao_qualidade_ambiental(pnts_associate, pnmemo, pnpk_instalacao, current_user, pndata=None):
    """Registar controlo de qualidade ambiental numa instalação (tt=49 — mantido por compatibilidade)"""
    with db_session_manager(current_user) as session:
        result = _exec_operacao(session, pndata, pnpk_instalacao, pnts_associate, 49, pnmemo)
        return {'message': 'Controlo de qualidade ambiental registado com sucesso', 'operacao_id': result}, 201


# ── Rede (pk_entidade = 4) ────────────────────────────────────────────────────

def create_rede_desobstrucao(pnts_associate, pnmemo, current_user, pndata=None):
    """Registar desobstrução de rede (tt=101)"""
    with db_session_manager(current_user) as session:
        result = _exec_operacao(session, pndata, 4, pnts_associate, 101, pnmemo)
        return {'message': 'Desobstrução de rede registada com sucesso', 'operacao_id': result}, 201


def create_rede_reparacao_colapso(pnts_associate, pnmemo, current_user, pndata=None):
    """Registar reparação/colapso de rede (tt=102)"""
    with db_session_manager(current_user) as session:
        result = _exec_operacao(session, pndata, 4, pnts_associate, 102, pnmemo)
        return {'message': 'Reparação de rede registada com sucesso', 'operacao_id': result}, 201


# ── Caixas (pk_entidade = 3) ──────────────────────────────────────────────────

def create_caixa_desobstrucao(pnts_associate, pnmemo, current_user, pndata=None):
    """Registar desobstrução de caixa (tt=101)"""
    with db_session_manager(current_user) as session:
        result = _exec_operacao(session, pndata, 3, pnts_associate, 101, pnmemo)
        return {'message': 'Desobstrução de caixa registada com sucesso', 'operacao_id': result}, 201


def create_caixa_reparacao(pnts_associate, pnmemo, current_user, pndata=None):
    """Registar reparação de caixa (tt=102)"""
    with db_session_manager(current_user) as session:
        result = _exec_operacao(session, pndata, 3, pnts_associate, 102, pnmemo)
        return {'message': 'Reparação de caixa registada com sucesso', 'operacao_id': result}, 201


def create_caixa_reparacao_tampa(pnts_associate, pnmemo, current_user, pndata=None):
    """Registar reparação de tampa de caixa (tt=106)"""
    with db_session_manager(current_user) as session:
        result = _exec_operacao(session, pndata, 3, pnts_associate, 106, pnmemo)
        return {'message': 'Reparação de tampa registada com sucesso', 'operacao_id': result}, 201


@api_error_handler
def create_ramal_desobstrucao(pnts_associate, pnmemo, pnaddress, pnpostal, pndoor, pnfloor, pnnut1, pnnut2, pnnut3, pnnut4, pnglat, pnglong, current_user):
    """Criar pedido de desobstrução para Ramais"""
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT fbo_document_createintern(
                25, :pnts_associate, :pnmemo, NULL,
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
                24, :pnts_associate, :pnmemo, NULL,
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


def _get_instalacao_nome(session, pk_instalacao):
    """Obter o nome da instalação (ETAR ou EE) a partir do pk."""
    result = session.execute(
        text("SELECT nome FROM vbf_etar WHERE pk = :pk UNION ALL SELECT nome FROM vbf_ee WHERE pk = :pk LIMIT 1"),
        {'pk': pk_instalacao}
    ).scalar()
    return result


def _set_document_address(session, doc_pk, nome):
    """Atualizar o campo address do documento com o nome da instalação."""
    session.execute(
        text("UPDATE tb_document SET address = :nome WHERE pk = :doc_pk"),
        {'nome': nome, 'doc_pk': doc_pk}
    )


def create_requisicao_interna(pnmemo, current_user, pk_instalacao=None):
    """Criar pedido de requisição de material (tipo 19), com instalação opcional"""
    with db_session_manager(current_user) as session:
        doc_pk = session.execute(
            text("SELECT fbo_document_createintern(19, NULL, :pnmemo, :pk_instalacao)"),
            {'pnmemo': pnmemo, 'pk_instalacao': pk_instalacao}
        ).scalar()
        if pk_instalacao and doc_pk:
            nome = _get_instalacao_nome(session, pk_instalacao)
            if nome:
                _set_document_address(session, doc_pk, nome)
        return {'message': 'Pedido de requisição de material criado com sucesso', 'document_id': doc_pk}, 201


def create_descarga_interdita(pk_instalacao, pk_entity, pnmemo, current_user):
    """Criar pedido de descarga interdita (tipo 57) associado a uma instalação"""
    with db_session_manager(current_user) as session:
        doc_pk = session.execute(
            text("SELECT fbo_document_createintern(57, :ts_entity, :pnmemo, :pk_instalacao)"),
            {'ts_entity': pk_entity, 'pnmemo': pnmemo, 'pk_instalacao': pk_instalacao}
        ).scalar()
        if pk_instalacao and doc_pk:
            nome = _get_instalacao_nome(session, pk_instalacao)
            if nome:
                _set_document_address(session, doc_pk, nome)
        return {'message': 'Descarga interdita registada com sucesso', 'document_id': doc_pk}, 201


def _sync_autocontrolo_periodo(session, tb_instalacao, data_incump, boletim=None):
    """Ao registar um incumprimento, marca automaticamente o período de autocontrolo
    correspondente (mês ou trimestre, segundo a periodicidade da instalação) como
    'não cumpre'. Não cria períodos nem altera o boletim já registado, exceto se for
    indicado um novo. Marcar 'Cumpre' continua a ser feito manualmente na tab Autocontrolo."""
    periodicidade = session.execute(
        text("SELECT tt_instalacaoautocontrolo FROM tb_instalacao WHERE pk = :pk"),
        {'pk': tb_instalacao}
    ).scalar()
    if periodicidade not in (1, 2):
        return  # instalação sem autocontrolo configurado

    data_obj = data_incump if isinstance(data_incump, date) else date.fromisoformat(str(data_incump))
    ano = data_obj.year
    periodo = data_obj.month if periodicidade == 1 else ((data_obj.month - 1) // 3) + 1

    row = session.execute(
        text("""
            SELECT pk, boletim, data FROM vbl_instalacao_autocontrolo
            WHERE tb_instalacao = :tb_instalacao AND ano = :ano AND periodo = :periodo
        """),
        {'tb_instalacao': tb_instalacao, 'ano': ano, 'periodo': periodo}
    ).mappings().first()
    if not row:
        return  # período ainda não foi gerado ($init/$initall)

    session.execute(
        text("SELECT fbf_instalacao_autocontrolo(1, :pnpk, :pnboletim, :pndata, 0)"),
        # Preserva boletim/data já registados manualmente; só usa os novos valores
        # quando o período ainda não tem nenhum (mesma lógica para ambos os campos).
        {'pnpk': row['pk'], 'pnboletim': boletim or row['boletim'], 'pndata': row['data'] or data_obj}
    )


class NaoConformidadePayload(BaseModel):
    tt_analiseparam: int
    resultado: Optional[float] = None
    limite: Optional[float] = None
    limitemin: Optional[float] = None


class ParametroAnalisePayload(BaseModel):
    """Um parâmetro do boletim (conforme ou não) — para o histórico de análises."""
    tt_analiseparam: int
    resultado: Optional[float] = None


class ImportarBoletimPayload(BaseModel):
    """Payload do endpoint transacional de importação de boletim PDF."""
    pk_periodo: int = Field(..., gt=0, description="pk do período de autocontrolo a atualizar")
    tb_instalacao: int = Field(..., gt=0)
    boletim: Optional[str] = None
    data: Optional[date] = None
    cumprimento: Optional[int] = None
    local_colheita: Optional[str] = None
    tipo: Optional[str] = None  # 'entrada' | 'saida' — ponto de colheita do boletim
    nao_conformidades: List[NaoConformidadePayload] = Field(default_factory=list)
    parametros: List[ParametroAnalisePayload] = Field(default_factory=list)


def importar_boletim_autocontrolo(data: dict, current_user: str):
    """Grava, numa única transação, o resultado da importação de um boletim de
    autocontrolo: atualiza o período (boletim/data/cumprimento), regista os
    incumprimentos assinalados pelo utilizador e guarda o mapeamento do 'Local
    de Colheita' para instalação. Se qualquer passo falhar, nada é gravado —
    substitui a sequência de pedidos HTTP separados feita anteriormente pelo
    frontend, que podia deixar o boletim gravado sem os incumprimentos (ou
    vice-versa) se um dos pedidos falhasse a meio."""
    payload = ImportarBoletimPayload.model_validate(data)
    with db_session_manager(current_user) as session:
        session.execute(
            text("SELECT fbf_instalacao_autocontrolo(1, :pnpk, :pnboletim, :pndata, :pncumprimento)"),
            {
                'pnpk': payload.pk_periodo,
                'pnboletim': payload.boletim,
                'pndata': payload.data,
                'pncumprimento': payload.cumprimento,
            }
        )

        registados = 0
        for nc in payload.nao_conformidades:
            new_pk = session.execute(text("SELECT fs_nextcode()")).scalar()
            # Savepoint próprio: (tb_instalacao, tt_analiseparam, data) é UNIQUE —
            # reimportar o mesmo boletim (ex: duplo clique, novo upload do mesmo
            # PDF) não pode reverter o período nem os outros incumprimentos já
            # gravados acima/antes neste loop.
            try:
                with session.begin_nested():
                    session.execute(
                        text("""
                            SELECT fbf_instalacao_incumprimento(
                                0, :pnpk, :pntb_instalacao, :pntt_analiseparam,
                                :pnresultado, :pnlimite, :pnlimitemin, :pndata, :pnoperador1, :pnoperador2
                            )
                        """),
                        {
                            'pnpk': new_pk,
                            'pntb_instalacao': payload.tb_instalacao,
                            'pntt_analiseparam': nc.tt_analiseparam,
                            'pnresultado': nc.resultado,
                            'pnlimite': nc.limite,
                            'pnlimitemin': nc.limitemin,
                            'pndata': payload.data,
                            'pnoperador1': None,
                            'pnoperador2': None,
                        }
                    )
                registados += 1
            except IntegrityError:
                logger.info(
                    f"Incumprimento já registado (tb_instalacao={payload.tb_instalacao}, "
                    f"tt_analiseparam={nc.tt_analiseparam}, data={payload.data}) — ignorado."
                )

        analises_registadas = 0
        if payload.parametros and payload.tipo in ('entrada', 'saida'):
            tt_ponto = _resolve_lookup_pk(session, 'tt_analiseponto', 'entrada' if payload.tipo == 'entrada' else 'sa')
            tt_forma = _resolve_lookup_pk(session, 'tt_analiseforma', 'laborat')
            if tt_ponto and tt_forma:
                for p in payload.parametros:
                    if p.resultado is None:
                        continue
                    new_pk = session.execute(text("SELECT fs_nextcode()")).scalar()
                    # Savepoint próprio: (instalação, parâmetro, ponto, forma, data) é
                    # UNIQUE — reimportar o mesmo boletim não pode reverter o resto.
                    try:
                        with session.begin_nested():
                            session.execute(
                                text("""
                                    SELECT fbf_instalacao_analise(
                                        0, :pnpk, :pndata, :pntb_instalacao,
                                        :pnponto, :pnparam, :pnforma, :pnresultado, NULL, NULL, NULL
                                    )
                                """),
                                {
                                    'pnpk': new_pk,
                                    'pndata': payload.data,
                                    'pntb_instalacao': payload.tb_instalacao,
                                    'pnponto': tt_ponto,
                                    'pnparam': p.tt_analiseparam,
                                    'pnforma': tt_forma,
                                    'pnresultado': p.resultado,
                                }
                            )
                        analises_registadas += 1
                    except IntegrityError:
                        logger.info(
                            f"Análise já registada (tb_instalacao={payload.tb_instalacao}, "
                            f"tt_analiseparam={p.tt_analiseparam}, data={payload.data}) — ignorada."
                        )
            else:
                logger.warning(
                    "tt_analiseponto/tt_analiseforma não resolvidos — histórico de análises não gravado"
                )

        if payload.local_colheita:
            # Savepoint próprio: o mapeamento é só uma conveniência para boletins
            # futuros — se a função ainda não existir na BD (ver
            # backend/sql/pdf_boletim_mapping.sql) ou falhar por outro motivo,
            # isso não pode reverter o boletim/incumprimentos já gravados acima.
            try:
                with session.begin_nested():
                    session.execute(
                        text("SELECT fbf_pdf_local_colheita(0, :local_colheita, :tb_instalacao)"),
                        {'local_colheita': payload.local_colheita, 'tb_instalacao': payload.tb_instalacao}
                    )
            except SQLAlchemyError:
                logger.warning(
                    "fbf_pdf_local_colheita indisponível — mapeamento do Local de Colheita não guardado",
                    exc_info=True,
                )

        return {
            'message': 'Boletim importado com sucesso',
            'incumprimentos_registados': registados,
            'analises_registadas': analises_registadas,
        }, 200


def create_instalacao_incumprimento(data: dict, current_user: str):
    """Registar incumprimento numa instalação (ETAR ou EE)."""
    with db_session_manager(current_user) as session:
        new_pk = session.execute(text("SELECT fs_nextcode()")).scalar()
        # Alterado para chamar a função da base de dados em vez de um INSERT direto
        query = text("""
            SELECT fbf_instalacao_incumprimento(
                0, -- pop: 0 para INSERT
                :pnpk,
                :pntb_instalacao,
                :pntt_analiseparam,
                :pnresultado,
                :pnlimite,
                :pnlimitemin,
                :pndata,
                :pnoperador1,
                :pnoperador2
            )
        """)
        data_incump = data.get('data_incump') or data.get('data')
        params = {
            'pnpk': new_pk,
            'pntb_instalacao': data.get('tb_instalacao'),
            'pntt_analiseparam': data.get('tt_analiseparam'),
            'pnresultado': data.get('resultado'),
            'pnlimite': data.get('limite'),
            'pnlimitemin': data.get('limitemin'),
            'pndata': data_incump,
            'pnoperador1': data.get('operador1'),
            'pnoperador2': data.get('operador2')
        }
        result = session.execute(query, params).scalar()
        _sync_autocontrolo_periodo(session, data.get('tb_instalacao'), data_incump, data.get('boletim'))
        return {'message': 'Incumprimento registado com sucesso', 'pk': result}, 201


@api_error_handler
def list_etar_incumprimentos(tb_etar, current_user):
    """Listar incumprimentos de uma ETAR"""
    with db_session_manager(current_user) as session:
        # A view vbl_etar_incumprimento pode ser mantida por compatibilidade
        # ou podemos usar a nova vbl_instalacao_incumprimento
        query = text("""
            SELECT i.* 
            FROM vbl_instalacao_incumprimento i
            JOIN tb_etar e ON i.tb_instalacao = e.pk
            WHERE i.tb_instalacao = :tb_etar
            ORDER BY data DESC
        """)
        results = session.execute(query, {'tb_etar': tb_etar}).mappings().all()
        incumprimentos = [dict(row) for row in results]
        return {'incumprimentos': incumprimentos}, 200

# FUNÇÕES DE COMPATIBILIDADE - Mantêm a interface antiga mas chamam as novas funções

@api_error_handler
def create_etar_incumprimento(tb_etar, tt_analiseparam, resultado, limite, data_incump, operador1, operador2, current_user):
    """Função de compatibilidade para criar incumprimento de ETAR."""
    payload = {'tb_instalacao': tb_etar, 'tt_analiseparam': tt_analiseparam, 'resultado': resultado, 'limite': limite, 'data': data_incump, 'operador1': operador1, 'operador2': operador2}
    return create_instalacao_incumprimento(payload, current_user)


@api_error_handler
def create_etar_volume(pnpk: int, data: dict, current_user: str):
    """Função de compatibilidade - usar create_instalacao_volume"""
    return create_instalacao_volume(pnpk, data, current_user)


@api_error_handler
def create_ee_volume(pnpk: int, data: dict, current_user: str):
    """Função de compatibilidade - usar create_instalacao_volume"""
    return create_instalacao_volume(pnpk, data, current_user)


@api_error_handler
def list_etar_volumes(tb_etar: int, current_user: str):
    """Função de compatibilidade - usar list_instalacao_volumes"""
    return list_instalacao_volumes(tb_etar, current_user)


@api_error_handler
def list_ee_volumes(tb_ee: int, current_user: str):
    """Função de compatibilidade - usar list_instalacao_volumes"""
    return list_instalacao_volumes(tb_ee, current_user)


@api_error_handler
def create_water_etar_volume(pnpk: int, data: dict, current_user: str):
    """Função de compatibilidade - usar create_instalacao_water_volume"""
    return create_instalacao_water_volume(pnpk, data, current_user)


@api_error_handler
def create_water_ee_volume(pnpk: int, data: dict, current_user: str):
    """Função de compatibilidade - usar create_instalacao_water_volume"""
    return create_instalacao_water_volume(pnpk, data, current_user)


@api_error_handler
def list_etar_water_volumes(tb_etar: int, current_user: str):
    """Função de compatibilidade - usar list_instalacao_water_volumes"""
    return list_instalacao_water_volumes(tb_etar, current_user)


@api_error_handler
def list_ee_water_volumes(tb_ee: int, current_user: str):
    """Função de compatibilidade - usar list_instalacao_water_volumes"""
    return list_instalacao_water_volumes(tb_ee, current_user)


@api_error_handler
def create_etar_energy(pnpk: int, data: dict, current_user: str):
    """Função de compatibilidade - usar create_instalacao_energy"""
    return create_instalacao_energy(pnpk, data, current_user)


@api_error_handler
def create_ee_energy(pnpk: int, data: dict, current_user: str):
    """Função de compatibilidade - usar create_instalacao_energy"""
    return create_instalacao_energy(pnpk, data, current_user)


@api_error_handler
def list_etar_energy(tb_etar: int, current_user: str):
    """Função de compatibilidade - usar list_instalacao_energy"""
    return list_instalacao_energy(tb_etar, current_user)


@api_error_handler
def list_ee_energy(tb_ee: int, current_user: str):
    """Função de compatibilidade - usar list_instalacao_energy"""
    return list_instalacao_energy(tb_ee, current_user)


@api_error_handler
def create_etar_expense(pntt_expensedest, pndate, pnval, pntt_etar, pnts_associate, pnmemo, current_user: str):
    """Função de compatibilidade - usar create_instalacao_expense"""
    data = {
        'pntt_expensedest': pntt_expensedest,
        'pndate': pndate,
        'pnval': pnval,
        'pntt_instalacao': pntt_etar,  # tb_etar agora é tb_instalacao
        'pnts_associate': pnts_associate,
        'pnmemo': pnmemo
    }
    return create_instalacao_expense(data, current_user)


@api_error_handler
def create_ee_expense(data: dict, current_user: str):
    """Função de compatibilidade - usar create_instalacao_expense"""
    # Converter pntt_ee para pntt_instalacao
    if 'pntt_ee' in data:
        data['pntt_instalacao'] = data.pop('pntt_ee')
    return create_instalacao_expense(data, current_user)


@api_error_handler
def list_etar_expenses(tb_etar, current_user):
    """Função de compatibilidade - usar list_instalacao_expenses"""
    return list_instalacao_expenses(tb_etar, current_user)


@api_error_handler
def list_ee_expenses(tb_ee, current_user):
    """Função de compatibilidade - usar list_instalacao_expenses"""
    return list_instalacao_expenses(tb_ee, current_user)

# ── ETAR — aliases diretos ────────────────────────────────────────────────────

def create_etar_desmatacao(pnts_associate, pnmemo, pnpk_etar, current_user, pndata=None):
    return create_instalacao_desmatacao(pnts_associate, pnmemo, pnpk_etar, current_user, pndata)


def create_etar_retirada_lamas(pnts_associate, pnmemo, pnpk_etar, current_user, pndata=None):
    return create_instalacao_retirada_lamas(pnts_associate, pnmemo, pnpk_etar, current_user, pndata)


def create_etar_reparacao(pnts_associate, pnmemo, pnpk_etar, current_user, pndata=None):
    return create_instalacao_reparacao(pnts_associate, pnmemo, pnpk_etar, current_user, pndata)


def create_etar_vedacao(pnts_associate, pnmemo, pnpk_etar, current_user, pndata=None):
    return create_instalacao_vedacao(pnts_associate, pnmemo, pnpk_etar, current_user, pndata)


def create_etar_visita_tecnica(pnts_associate, pnmemo, pnpk_etar, current_user, pndata=None):
    return create_instalacao_visita_tecnica(pnts_associate, pnmemo, pnpk_etar, current_user, pndata)


def create_etar_qualidade_ambiental(pnts_associate, pnmemo, pnpk_etar, current_user, pndata=None):
    return create_instalacao_qualidade_ambiental(pnts_associate, pnmemo, pnpk_etar, current_user, pndata)


# ── EE — aliases diretos ──────────────────────────────────────────────────────

def create_ee_desmatacao(pnts_associate, pnmemo, pnpk_ee, current_user, pndata=None):
    return create_instalacao_desmatacao(pnts_associate, pnmemo, pnpk_ee, current_user, pndata)


def create_ee_retirada_lamas(pnts_associate, pnmemo, pnpk_ee, current_user, pndata=None):
    return create_instalacao_retirada_lamas(pnts_associate, pnmemo, pnpk_ee, current_user, pndata)


def create_ee_reparacao(pnts_associate, pnmemo, pnpk_ee, current_user, pndata=None):
    return create_instalacao_reparacao(pnts_associate, pnmemo, pnpk_ee, current_user, pndata)


def create_ee_vedacao(pnts_associate, pnmemo, pnpk_ee, current_user, pndata=None):
    return create_instalacao_vedacao(pnts_associate, pnmemo, pnpk_ee, current_user, pndata)


def create_ee_visita_tecnica(pnts_associate, pnmemo, pnpk_ee, current_user, pndata=None):
    return create_instalacao_visita_tecnica(pnts_associate, pnmemo, pnpk_ee, current_user, pndata)


def create_ee_qualidade_ambiental(pnts_associate, pnmemo, pnpk_ee, current_user, pndata=None):
    return create_instalacao_qualidade_ambiental(pnts_associate, pnmemo, pnpk_ee, current_user, pndata)


@api_error_handler
def list_instalacoes_mapa(current_user: str):
    """Obter todas as instalações (ETAR e EE) com coordenadas para mapa."""
    with db_session_manager(current_user) as session:
        query = text("""
            SELECT pk, nome, coord_m, coord_p, 'ETAR' AS tipo
            FROM vbf_etar
            WHERE coord_m IS NOT NULL AND coord_p IS NOT NULL
            UNION ALL
            SELECT pk, nome, coord_m, coord_p, 'EE' AS tipo
            FROM vbf_ee
            WHERE coord_m IS NOT NULL AND coord_p IS NOT NULL
            ORDER BY nome
        """)
        results = session.execute(query).mappings().all()
        return {'instalacoes': [dict(row) for row in results]}, 200
