from flask import jsonify
from sqlalchemy.sql import text
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from app.utils.logger import get_logger

logger = get_logger(__name__)

_ANO_MIN = 2000
_ANO_MAX = 2100
_STR_MAX = 200


def _clean(v: str) -> str:
    return ' '.join(v.split())


# ── Modelos Pydantic ───────────────────────────────────────────────────────

class ClasseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=_STR_MAX)
    memo: Optional[str] = None
    ord: Optional[int] = None

    @field_validator('name', mode='before')
    @classmethod
    def sanitize_name(cls, v):
        if not isinstance(v, str):
            raise ValueError('Valor inválido.')
        return _clean(v)

    @field_validator('memo', mode='before')
    @classmethod
    def parse_memo(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ''):
            return None
        return _clean(v)


class ClasseUpdate(ClasseCreate):
    pass


class SubclasseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=_STR_MAX)
    classe_pk: int = Field(ge=1)
    sncap_pk: Optional[str] = None
    memo: Optional[str] = None
    ord: Optional[int] = None

    @field_validator('name', mode='before')
    @classmethod
    def sanitize_name(cls, v):
        if not isinstance(v, str):
            raise ValueError('Valor inválido.')
        return _clean(v)

    @field_validator('sncap_pk', mode='before')
    @classmethod
    def parse_sncap(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ''):
            return None
        return str(v).strip()

    @field_validator('memo', mode='before')
    @classmethod
    def parse_memo(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ''):
            return None
        return _clean(v)


class SubclasseUpdate(SubclasseCreate):
    pass


class OrcamentoCreate(BaseModel):
    ano: int = Field(ge=_ANO_MIN, le=_ANO_MAX)
    subclasse_pk: int = Field(ge=1)
    name: Optional[str] = None
    valor: float = Field(ge=0, le=999_999_999.99)
    memo: Optional[str] = None

    @field_validator('ano', mode='before')
    @classmethod
    def parse_ano(cls, v):
        try:
            return int(v)
        except (TypeError, ValueError):
            raise ValueError('Ano inválido.')

    @field_validator('valor', mode='before')
    @classmethod
    def parse_valor(cls, v):
        if v is None:
            return 0.0
        try:
            return float(v)
        except (TypeError, ValueError):
            raise ValueError('Valor inválido.')

    @field_validator('name', 'memo', mode='before')
    @classmethod
    def parse_str(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ''):
            return None
        return _clean(v)


class OrcamentoUpdate(OrcamentoCreate):
    pass


# ── Leitura ────────────────────────────────────────────────────────────────

def get_orcamento_detalhe(session, ano=None):
    query = '''
        SELECT
            pk, ano,
            "tt_orcamento$classe"    AS classe,
            "tt_orcamento$subclasse" AS subclasse,
            sncap, name, valor, memo
        FROM vbl_orcamento
    '''
    params = {}
    if ano is not None:
        try:
            ano_int = int(ano)
        except (TypeError, ValueError):
            return jsonify({'error': 'Ano inválido.'}), 400
        if not (_ANO_MIN <= ano_int <= _ANO_MAX):
            return jsonify({'error': 'Ano fora do intervalo permitido.'}), 400
        query += ' WHERE ano = :ano'
        params['ano'] = ano_int
    query += ' ORDER BY classe, subclasse'
    rows = session.execute(text(query), params).mappings().all()
    return jsonify([dict(r) for r in rows]), 200


def get_orcamento_anos(session):
    rows = session.execute(
        text('SELECT DISTINCT ano FROM vbf_orcamento ORDER BY ano DESC')
    ).mappings().all()
    return jsonify([r['ano'] for r in rows]), 200


def get_orcamento_classes(session):
    rows = session.execute(
        text('SELECT pk, name, memo, ord FROM "vbl_orcamento$classe" ORDER BY ord NULLS LAST, name')
    ).mappings().all()
    return jsonify([dict(r) for r in rows]), 200


def get_orcamento_subclasses(session):
    rows = session.execute(
        text('''
            SELECT pk, "tt_orcamento$classe" AS classe, name, sncap, memo, ord
            FROM "vbl_orcamento$subclasse"
            ORDER BY "tt_orcamento$classe", ord NULLS LAST, name
        ''')
    ).mappings().all()
    return jsonify([dict(r) for r in rows]), 200


def get_sncap(session, pk: str):
    if not pk or len(pk.strip()) > 30:
        return jsonify({'error': 'Código SNC-AP inválido.'}), 400
    row = session.execute(
        text('SELECT pk, name, memo, example FROM "vbl_orcamento$sncap" WHERE pk = :pk'),
        {'pk': pk.strip()}
    ).mappings().first()
    if not row:
        return jsonify({'error': 'Código SNC-AP não encontrado.'}), 404
    return jsonify(dict(row)), 200


# ── Escrita — Orçamento ────────────────────────────────────────────────────

def create_orcamento(data, session):
    payload = OrcamentoCreate(**data)
    session.execute(
        text('''
            INSERT INTO vbf_orcamento (ano, "tt_orcamento$subclasse", name, valor, memo)
            VALUES (:ano, :subclasse_pk, :name, :valor, :memo)
        '''),
        {
            'ano':          payload.ano,
            'subclasse_pk': payload.subclasse_pk,
            'name':         payload.name,
            'valor':        payload.valor,
            'memo':         payload.memo,
        }
    )
    return jsonify({'message': 'Registo criado com sucesso.'}), 201


def update_orcamento(pk, data, session):
    payload = OrcamentoUpdate(**data)
    result = session.execute(
        text('''
            UPDATE vbf_orcamento
            SET ano = :ano, "tt_orcamento$subclasse" = :subclasse_pk,
                name = :name, valor = :valor, memo = :memo
            WHERE pk = :pk
        '''),
        {
            'pk':           pk,
            'ano':          payload.ano,
            'subclasse_pk': payload.subclasse_pk,
            'name':         payload.name,
            'valor':        payload.valor,
            'memo':         payload.memo,
        }
    )
    if result.rowcount == 0:
        return jsonify({'error': 'Registo não encontrado.'}), 404
    return jsonify({'message': 'Registo atualizado com sucesso.'}), 200


def delete_orcamento(pk, session):
    result = session.execute(
        text('DELETE FROM vbf_orcamento WHERE pk = :pk'),
        {'pk': pk}
    )
    if result.rowcount == 0:
        return jsonify({'error': 'Registo não encontrado.'}), 404
    return jsonify({'message': 'Registo eliminado com sucesso.'}), 200


