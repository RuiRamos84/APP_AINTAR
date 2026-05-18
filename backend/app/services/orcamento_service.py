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
    designacao: str = Field(min_length=1, max_length=_STR_MAX)

    @field_validator('designacao', mode='before')
    @classmethod
    def sanitize(cls, v):
        if not isinstance(v, str):
            raise ValueError('Valor inválido.')
        return _clean(v)


class ClasseUpdate(ClasseCreate):
    pass


class SubclasseCreate(BaseModel):
    designacao: str = Field(min_length=1, max_length=_STR_MAX)
    ts_orcamento_classe: int = Field(ge=1)
    sncap: Optional[str] = None
    memo: Optional[str] = None

    @field_validator('designacao', mode='before')
    @classmethod
    def sanitize(cls, v):
        if not isinstance(v, str):
            raise ValueError('Valor inválido.')
        return _clean(v)

    @field_validator('sncap', mode='before')
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
    ts_orcamento_subclasse: int = Field(ge=1)
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

    @field_validator('memo', mode='before')
    @classmethod
    def parse_memo(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ''):
            return None
        return _clean(str(v))


class OrcamentoUpdate(BaseModel):
    valor: float = Field(ge=0, le=999_999_999.99)
    memo: Optional[str] = None

    @field_validator('valor', mode='before')
    @classmethod
    def parse_valor(cls, v):
        if v is None:
            return 0.0
        try:
            return float(v)
        except (TypeError, ValueError):
            raise ValueError('Valor inválido.')

    @field_validator('memo', mode='before')
    @classmethod
    def parse_memo(cls, v):
        if v is None or (isinstance(v, str) and v.strip() == ''):
            return None
        return _clean(str(v))


# ── Leitura ────────────────────────────────────────────────────────────────

def get_orcamento_detalhe(session, ano=None):
    query = "SELECT * FROM vbl_orcamento"
    params = {}
    if ano is not None:
        try:
            ano_int = int(ano)
        except (TypeError, ValueError):
            return jsonify({'error': 'Ano inválido.'}), 400
        if not (_ANO_MIN <= ano_int <= _ANO_MAX):
            return jsonify({'error': 'Ano fora do intervalo permitido.'}), 400
        query += " WHERE ano = :ano"
        params['ano'] = ano_int
    rows = session.execute(text(query), params).mappings().all()
    return jsonify([dict(r) for r in rows]), 200


def get_orcamento_summary(session, ano=None):
    query = 'SELECT * FROM "vbl_orcamento$classe_totais"'
    params = {}
    if ano is not None:
        try:
            ano_int = int(ano)
        except (TypeError, ValueError):
            return jsonify({'error': 'Ano inválido.'}), 400
        if not (_ANO_MIN <= ano_int <= _ANO_MAX):
            return jsonify({'error': 'Ano fora do intervalo permitido.'}), 400
        query += " WHERE ano = :ano"
        params['ano'] = ano_int
    query += " ORDER BY classe"
    rows = session.execute(text(query), params).mappings().all()
    return jsonify([dict(r) for r in rows]), 200


def get_orcamento_anos(session):
    rows = session.execute(
        text("SELECT DISTINCT ano FROM tb_orcamento ORDER BY ano DESC")
    ).mappings().all()
    return jsonify([r['ano'] for r in rows]), 200


def get_orcamento_classes(session):
    rows = session.execute(
        text('SELECT * FROM "vbl_orcamento$classe" ORDER BY ord')
    ).mappings().all()
    return jsonify([dict(r) for r in rows]), 200


def get_orcamento_subclasses(session):
    rows = session.execute(
        text('SELECT * FROM "vbl_orcamento$subclasse" ORDER BY classe, ord')
    ).mappings().all()
    return jsonify([dict(r) for r in rows]), 200


def get_orcamento_tipos(session):
    return jsonify([
        {'pk': 1, 'designacao': 'Corrente'},
        {'pk': 2, 'designacao': 'Capital'},
    ]), 200


def get_sncap_summary(session, ano=None):
    params = {}
    year_clause = ""
    if ano is not None:
        try:
            ano_int = int(ano)
        except (TypeError, ValueError):
            return jsonify({'error': 'Ano inválido.'}), 400
        if not (_ANO_MIN <= ano_int <= _ANO_MAX):
            return jsonify({'error': 'Ano fora do intervalo permitido.'}), 400
        year_clause = "AND b.ano = :ano"
        params['ano'] = ano_int

    rows = session.execute(text(f"""
        WITH niveis AS (
            SELECT a."tt_orcamento$sncap"                AS sncap,
                   string_to_array(a."tt_orcamento$sncap", '.') AS partes,
                   b.valor
            FROM   tb_orcamento             b
            JOIN   "tt_orcamento$subclasse" a
                     ON a.pk = b."tt_orcamento$subclasse"
            WHERE  1=1 {year_clause}
        ), explodido AS (
            SELECT array_to_string(partes[1:1],'.') AS codigo,
                   1 AS level, valor FROM niveis
            UNION ALL
            SELECT array_to_string(partes[1:2],'.'), 2, valor
            FROM niveis WHERE array_length(partes,1) >= 2
            UNION ALL
            SELECT array_to_string(partes[1:3],'.'), 3, valor
            FROM niveis WHERE array_length(partes,1) >= 3
            UNION ALL
            SELECT array_to_string(partes[1:4],'.'), 4, valor
            FROM niveis WHERE array_length(partes,1) >= 4
        )
        SELECT   e.level,
                 e.codigo,
                 c.name  AS label,
                 SUM(e.valor) AS total
        FROM     explodido e
        LEFT JOIN "tt_orcamento$sncap" c ON c.pk = e.codigo
        GROUP BY e.level, e.codigo, c.name
        ORDER BY e.codigo
    """), params).mappings().all()
    return jsonify([dict(r) for r in rows]), 200


def get_sncap(session, pk: str):
    if not pk or len(pk.strip()) > 30:
        return jsonify({'error': 'Código SNC-AP inválido.'}), 400
    row = session.execute(
        text(
            'SELECT pk, name, memo, example'
            ' FROM "vbl_orcamento$sncap" WHERE pk = :pk'
        ),
        {'pk': pk.strip()}
    ).mappings().first()
    if not row:
        return jsonify({'error': 'Código SNC-AP não encontrado.'}), 404
    return jsonify(dict(row)), 200


# ── Escrita — Orçamento ────────────────────────────────────────────────────

def create_orcamento(data, session):
    payload = OrcamentoCreate(**data)

    existente = session.execute(
        text("""
            SELECT pk FROM tb_orcamento
            WHERE ano = :ano AND "tt_orcamento$subclasse" = :subclasse
        """),
        {'ano': payload.ano, 'subclasse': payload.ts_orcamento_subclasse}
    ).mappings().first()

    if existente:
        return jsonify({
            'error': 'Já existe uma dotação para esta subclasse e ano.'
        }), 409

    session.execute(
        text("""
            INSERT INTO tb_orcamento
                (ano, "tt_orcamento$subclasse", valor, memo)
            VALUES (:ano, :subclasse, :valor, :memo)
        """),
        {
            'ano':       payload.ano,
            'subclasse': payload.ts_orcamento_subclasse,
            'valor':     payload.valor,
            'memo':      payload.memo,
        }
    )
    return jsonify({'message': 'Registo criado com sucesso.'}), 201


def update_orcamento(pk, data, session):
    payload = OrcamentoUpdate(**data)

    result = session.execute(
        text("UPDATE tb_orcamento SET valor = :valor, memo = :memo WHERE pk = :pk"),
        {'pk': pk, 'valor': payload.valor, 'memo': payload.memo}
    )
    if result.rowcount == 0:
        return jsonify({'error': 'Registo não encontrado.'}), 404
    return jsonify({'message': 'Registo atualizado com sucesso.'}), 200


def delete_orcamento(pk, session):
    result = session.execute(
        text("DELETE FROM tb_orcamento WHERE pk = :pk"),
        {'pk': pk}
    )
    if result.rowcount == 0:
        return jsonify({'error': 'Registo não encontrado.'}), 404
    return jsonify({'message': 'Registo eliminado com sucesso.'}), 200


# ── Escrita — Catálogo ─────────────────────────────────────────────────────

def create_classe(data, session):
    payload = ClasseCreate(**data)
    session.execute(
        text('INSERT INTO "tt_orcamento$classe" (name) VALUES (:name)'),
        {'name': payload.designacao}
    )
    return jsonify({'message': 'Classe criada com sucesso.'}), 201


def update_classe(pk, data, session):
    payload = ClasseUpdate(**data)
    result = session.execute(
        text(
            'UPDATE "tt_orcamento$classe"'
            ' SET name = :name WHERE pk = :pk RETURNING pk'
        ),
        {'name': payload.designacao, 'pk': pk}
    ).fetchone()
    if not result:
        return jsonify({'error': 'Classe não encontrada.'}), 404
    return jsonify({'message': 'Classe actualizada com sucesso.'}), 200


def create_subclasse(data, session):
    payload = SubclasseCreate(**data)
    session.execute(
        text("""
            INSERT INTO "tt_orcamento$subclasse"
                ("tt_orcamento$classe", "tt_orcamento$sncap", name, memo)
            VALUES (:classe, :sncap, :name, :memo)
        """),
        {
            'classe': payload.ts_orcamento_classe,
            'sncap':  payload.sncap,
            'name':   payload.designacao,
            'memo':   payload.memo,
        }
    )
    return jsonify({'message': 'Subclasse criada com sucesso.'}), 201


def update_subclasse(pk, data, session):
    payload = SubclasseUpdate(**data)
    result = session.execute(
        text("""
            UPDATE "tt_orcamento$subclasse"
            SET "tt_orcamento$classe" = :classe,
                "tt_orcamento$sncap"  = :sncap,
                name = :name,
                memo = :memo
            WHERE pk = :pk
            RETURNING pk
        """),
        {
            'classe': payload.ts_orcamento_classe,
            'sncap':  payload.sncap,
            'name':   payload.designacao,
            'memo':   payload.memo,
            'pk':     pk,
        }
    ).fetchone()
    if not result:
        return jsonify({'error': 'Subclasse não encontrada.'}), 404
    return jsonify({'message': 'Subclasse actualizada com sucesso.'}), 200
