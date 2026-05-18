from flask import jsonify
from sqlalchemy.sql import text
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date
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


def _overlaps(s1: date, e1: date, s2: date, e2: date) -> bool:
    """Verdadeiro se os dois intervalos [s1,e1] e [s2,e2] se sobrepõem."""
    return s1 <= e2 and e1 >= s2


def _fmt(d) -> str:
    """Formata uma data como DD/MM/YYYY."""
    if isinstance(d, date):
        return d.strftime('%d/%m/%Y')
    return str(d)


def _ano_valido(ano):
    try:
        v = int(ano)
    except (TypeError, ValueError):
        return None, (jsonify({'error': 'Ano inválido.'}), 400)
    if not (_ANO_MIN <= v <= _ANO_MAX):
        return None, (
            jsonify({'error': 'Ano fora do intervalo permitido.'}), 400
        )
    return v, None


# ── Leitura ────────────────────────────────────────────────────────────────

def get_orcamento_detalhe(session, ano=None):
    query = """
        SELECT
            o.pk,
            o.ano,
            o.ts_orcamento_subclasse,
            c.designacao    AS classe,
            s.designacao    AS subclasse,
            COALESCE((
                SELECT string_agg(t.designacao, ', ' ORDER BY t.pk)
                FROM   ts_orcamento_subclasse_tipo st
                JOIN   ts_orcamento_tipo t ON t.pk = st.ts_orcamento_tipo
                WHERE  st.ts_orcamento_subclasse = s.pk
            ), '') AS tipo,
            s.sncap,
            s.memo,
            o.valor,
            o.data_inicio,
            o.data_fim
        FROM tb_orcamento           o
        JOIN ts_orcamento_subclasse s ON s.pk = o.ts_orcamento_subclasse
        JOIN ts_orcamento_classe    c ON c.pk = s.ts_orcamento_classe
    """
    params = {}
    if ano is not None:
        try:
            ano_int = int(ano)
        except (TypeError, ValueError):
            return jsonify({'error': 'Ano inválido.'}), 400
        if not (_ANO_MIN <= ano_int <= _ANO_MAX):
            return jsonify({'error': 'Ano fora do intervalo permitido.'}), 400
        query += " WHERE o.ano = :ano"
        params['ano'] = ano_int
    query += " ORDER BY classe, subclasse, o.ano"
    rows = session.execute(text(query), params).mappings().all()
    return jsonify([dict(r) for r in rows]), 200


def get_orcamento_summary(session, ano=None):
    query = "SELECT * FROM vbl_orcamento_classe"
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
        text("""
            SELECT
                s.pk,
                s.designacao,
                c.designacao AS classe,
                s.sncap,
                s.memo,
                COALESCE(
                    string_agg(t.designacao, ', ' ORDER BY t.pk), ''
                ) AS tipo,
                COALESCE(
                    array_agg(st.ts_orcamento_tipo ORDER BY t.pk)
                        FILTER (WHERE st.ts_orcamento_tipo IS NOT NULL),
                    ARRAY[]::integer[]
                ) AS tipo_pks
            FROM ts_orcamento_subclasse s
            JOIN ts_orcamento_classe c ON c.pk = s.ts_orcamento_classe
            LEFT JOIN ts_orcamento_subclasse_tipo st ON st.ts_orcamento_subclasse = s.pk
            LEFT JOIN ts_orcamento_tipo t ON t.pk = st.ts_orcamento_tipo
            GROUP BY s.pk, s.designacao, c.designacao, s.sncap, s.memo
            ORDER BY c.designacao, s.designacao
        """)
    ).mappings().all()
    result = []
    for r in rows:
        d = dict(r)
        if d.get('tipo_pks') is None:
            d['tipo_pks'] = []
        result.append(d)
    return jsonify(result), 200


def get_orcamento_tipos(session):
    rows = session.execute(
        text("SELECT pk, designacao FROM ts_orcamento_tipo ORDER BY pk")
    ).mappings().all()
    return jsonify([dict(r) for r in rows]), 200


def get_orcamento_subclasses(session):
    rows = session.execute(
        text("SELECT pk, designacao FROM ts_orcamento_classe ORDER BY designacao")
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

    existentes = session.execute(
        text("""
            SELECT pk, data_inicio, data_fim
            FROM tb_orcamento
            WHERE ano = :ano AND ts_orcamento_subclasse = :subclasse
        """),
        {'ano': payload.ano, 'subclasse': payload.ts_orcamento_subclasse}
    ).mappings().all()

    if existentes:
        sem_datas = [r for r in existentes if not r['data_inicio'] or not r['data_fim']]
        if sem_datas:
            return jsonify({
                'error': 'Já existe um registo sem datas para esta subclasse e ano. '
                         'Para adicionar um segundo registo, edite primeiro o existente '
                         'e preencha as datas de início e fim.'
            }), 409
        if not payload.data_inicio or not payload.data_fim:
            return jsonify({
                'error': 'Já existe um registo para esta subclasse e ano. '
                         'As datas de início e fim são obrigatórias quando há múltiplos registos.'
            }), 409
        # Verificar sobreposição de datas
        for r in existentes:
            if _overlaps(payload.data_inicio, payload.data_fim, r['data_inicio'], r['data_fim']):
                return jsonify({
                    'error': f"O intervalo de datas sobrepõe-se com um registo existente "
                             f"({_fmt(r['data_inicio'])} → {_fmt(r['data_fim'])})."
                }), 409

    session.execute(
        text("""
            INSERT INTO tb_orcamento (ano, ts_orcamento_subclasse, valor, data_inicio, data_fim)
            VALUES (:ano, :subclasse, :valor, :data_inicio, :data_fim)
        """),
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

    atual = session.execute(
        text("SELECT ano, ts_orcamento_subclasse FROM tb_orcamento WHERE pk = :pk"),
        {'pk': pk}
    ).mappings().first()

    if not atual:
        return jsonify({'error': 'Registo não encontrado.'}), 404

    outros = session.execute(
        text("""
            SELECT pk FROM tb_orcamento
            WHERE ano = :ano AND ts_orcamento_subclasse = :subclasse AND pk != :pk
        """),
        {'ano': atual['ano'], 'subclasse': atual['ts_orcamento_subclasse'], 'pk': pk}
    ).mappings().all()

    if outros:
        if not payload.data_inicio or not payload.data_fim:
            return jsonify({
                'error': 'Existem múltiplos registos para esta subclasse e ano. '
                         'As datas de início e fim são obrigatórias em todos eles.'
            }), 409
        # Verificar sobreposição com os outros registos
        outros_com_datas = session.execute(
            text("""
                SELECT pk, data_inicio, data_fim FROM tb_orcamento
                WHERE ano = :ano AND ts_orcamento_subclasse = :subclasse AND pk != :pk
                  AND data_inicio IS NOT NULL AND data_fim IS NOT NULL
            """),
            {'ano': atual['ano'], 'subclasse': atual['ts_orcamento_subclasse'], 'pk': pk}
        ).mappings().all()
        for r in outros_com_datas:
            if _overlaps(payload.data_inicio, payload.data_fim, r['data_inicio'], r['data_fim']):
                return jsonify({
                    'error': f"O intervalo de datas sobrepõe-se com um registo existente "
                             f"({_fmt(r['data_inicio'])} → {_fmt(r['data_fim'])})."
                }), 409

    result = session.execute(
        text("""
            UPDATE tb_orcamento
            SET valor = :valor, data_inicio = :data_inicio, data_fim = :data_fim
            WHERE pk = :pk
        """),
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
        text("DELETE FROM tb_orcamento WHERE pk = :pk"),
        {'pk': pk}
    )
    if result.rowcount == 0:
        return jsonify({'error': 'Registo não encontrado.'}), 404
    return jsonify({'message': 'Registo eliminado com sucesso.'}), 200


def create_classe(data, session):
    payload = ClasseCreate(**data)
    session.execute(
        text("INSERT INTO ts_orcamento_classe (designacao) VALUES (:designacao)"),
        {'designacao': payload.designacao}
    )
    return jsonify({'message': 'Classe criada com sucesso.'}), 201


def create_subclasse(data, session):
    payload = SubclasseCreate(**data)
    result = session.execute(
        text("""
            INSERT INTO ts_orcamento_subclasse (designacao, ts_orcamento_classe, sncap, memo)
            VALUES (:designacao, :classe, :sncap, :memo)
            RETURNING pk
        """),
        {'designacao': payload.designacao, 'classe': payload.ts_orcamento_classe, 'sncap': payload.sncap, 'memo': payload.memo}
    )
    new_pk = result.scalar()
    for tipo_pk in payload.tipos:
        session.execute(
            text("""
                INSERT INTO ts_orcamento_subclasse_tipo (ts_orcamento_subclasse, ts_orcamento_tipo)
                VALUES (:s, :t)
                ON CONFLICT DO NOTHING
            """),
            {'s': new_pk, 't': tipo_pk}
        )
    return jsonify({'message': 'Subclasse criada com sucesso.'}), 201


def update_classe(pk, data, session):
    payload = ClasseUpdate(**data)
    updated = session.execute(
        text("UPDATE ts_orcamento_classe SET designacao = :designacao WHERE pk = :pk RETURNING pk"),
        {'designacao': payload.designacao, 'pk': pk}
    ).fetchone()
    if not updated:
        return jsonify({'error': 'Classe não encontrada.'}), 404
    return jsonify({'message': 'Classe actualizada com sucesso.'}), 200


def update_subclasse(pk, data, session):
    payload = SubclasseUpdate(**data)
    updated = session.execute(
        text("""
            UPDATE ts_orcamento_subclasse
            SET designacao = :designacao, ts_orcamento_classe = :classe, sncap = :sncap, memo = :memo
            WHERE pk = :pk
            RETURNING pk
        """),
        {'designacao': payload.designacao, 'classe': payload.ts_orcamento_classe, 'sncap': payload.sncap, 'memo': payload.memo, 'pk': pk}
    ).fetchone()
    if not updated:
        return jsonify({'error': 'Subclasse não encontrada.'}), 404
    session.execute(
        text("DELETE FROM ts_orcamento_subclasse_tipo WHERE ts_orcamento_subclasse = :pk"),
        {'pk': pk}
    )
    for tipo_pk in payload.tipos:
        session.execute(
            text("""
                INSERT INTO ts_orcamento_subclasse_tipo (ts_orcamento_subclasse, ts_orcamento_tipo)
                VALUES (:s, :t)
                ON CONFLICT DO NOTHING
            """),
            {'s': pk, 't': tipo_pk}
        )
    return jsonify({'message': 'Subclasse actualizada com sucesso.'}), 200
