from flask import jsonify
from sqlalchemy.sql import text
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date
from app.utils.logger import get_logger

logger = get_logger(__name__)

_ANO_MIN = 2000
_ANO_MAX = 2100
_STR_MAX = 150


def _clean(v: str) -> str:
    """Remove espaços extra e caracteres de controlo."""
    return ' '.join(v.split())


class ClasseCreate(BaseModel):
    designacao: str = Field(min_length=1, max_length=100)

    @field_validator('designacao', mode='before')
    @classmethod
    def sanitize(cls, v):
        if not isinstance(v, str):
            raise ValueError('Valor inválido.')
        return _clean(v)


class SubclasseCreate(BaseModel):
    designacao: str = Field(min_length=1, max_length=_STR_MAX)
    ts_orcamento_classe: int = Field(ge=1)
    tipos: List[int] = Field(min_length=1)
    sncap: int = Field(ge=0)

    @field_validator('designacao', mode='before')
    @classmethod
    def sanitize_des(cls, v):
        if not isinstance(v, str):
            raise ValueError('Valor inválido.')
        return _clean(v)

    @field_validator('sncap', mode='before')
    @classmethod
    def parse_sncap(cls, v):
        if v is None or v == '':
            raise ValueError('SNCAP é obrigatório.')
        try:
            return int(v)
        except (TypeError, ValueError):
            raise ValueError('SNCAP deve ser um número inteiro.')


class ClasseUpdate(BaseModel):
    designacao: str = Field(min_length=1, max_length=100)

    @field_validator('designacao', mode='before')
    @classmethod
    def sanitize(cls, v):
        if not isinstance(v, str):
            raise ValueError('Valor inválido.')
        return _clean(v)


class SubclasseUpdate(BaseModel):
    designacao: str = Field(min_length=1, max_length=_STR_MAX)
    ts_orcamento_classe: int = Field(ge=1)
    tipos: List[int] = Field(min_length=1)
    sncap: int = Field(ge=0)

    @field_validator('designacao', mode='before')
    @classmethod
    def sanitize_des(cls, v):
        if not isinstance(v, str):
            raise ValueError('Valor inválido.')
        return _clean(v)

    @field_validator('sncap', mode='before')
    @classmethod
    def parse_sncap(cls, v):
        if v is None or v == '':
            raise ValueError('SNCAP é obrigatório.')
        try:
            return int(v)
        except (TypeError, ValueError):
            raise ValueError('SNCAP deve ser um número inteiro.')


class OrcamentoCreate(BaseModel):
    ano: int = Field(ge=_ANO_MIN, le=_ANO_MAX)
    ts_orcamento_subclasse: int = Field(ge=1)
    valor: float = Field(ge=0, le=999_999_999.99)
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None

    @field_validator('valor', mode='before')
    @classmethod
    def parse_valor(cls, v):
        if v is None:
            return 0.0
        try:
            return float(v)
        except (TypeError, ValueError):
            raise ValueError('Valor inválido.')

    @field_validator('ano', mode='before')
    @classmethod
    def parse_ano(cls, v):
        try:
            return int(v)
        except (TypeError, ValueError):
            raise ValueError('Ano inválido.')


class OrcamentoUpdate(BaseModel):
    valor: float = Field(ge=0, le=999_999_999.99)
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None

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


def get_orcamento_subclasses(session):
    rows = session.execute(
        text("""
            SELECT
                s.pk,
                s.designacao,
                c.designacao AS classe,
                s.sncap,
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
            GROUP BY s.pk, s.designacao, c.designacao, s.sncap
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


def get_orcamento_classes(session):
    rows = session.execute(
        text("SELECT pk, designacao FROM ts_orcamento_classe ORDER BY designacao")
    ).mappings().all()
    return jsonify([dict(r) for r in rows]), 200


# ── Escrita ────────────────────────────────────────────────────────────────

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
            'ano': payload.ano,
            'subclasse': payload.ts_orcamento_subclasse,
            'valor': payload.valor,
            'data_inicio': payload.data_inicio,
            'data_fim': payload.data_fim,
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
            'pk': pk,
            'valor': payload.valor,
            'data_inicio': payload.data_inicio,
            'data_fim': payload.data_fim,
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
            INSERT INTO ts_orcamento_subclasse (designacao, ts_orcamento_classe, sncap)
            VALUES (:designacao, :classe, :sncap)
            RETURNING pk
        """),
        {'designacao': payload.designacao, 'classe': payload.ts_orcamento_classe, 'sncap': payload.sncap}
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
            SET designacao = :designacao, ts_orcamento_classe = :classe, sncap = :sncap
            WHERE pk = :pk
            RETURNING pk
        """),
        {'designacao': payload.designacao, 'classe': payload.ts_orcamento_classe, 'sncap': payload.sncap, 'pk': pk}
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
