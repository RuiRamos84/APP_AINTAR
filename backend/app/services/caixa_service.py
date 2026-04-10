from sqlalchemy.sql import text
from sqlalchemy.exc import IntegrityError
from datetime import datetime, date
from ..utils.utils import db_session_manager
from app.utils.error_handler import api_error_handler, ResourceNotFoundError, APIError
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Tipos de movimento e regra de sinal (conforme fbf_caixa):
# Tipos 1, 2 → entrada (valor positivo)
# Tipos 3, 4 → saída  (valor negativo)
# Tipo 4 = Fecho de caixa  → dois utilizadores + rotação
# Tipo 5 = Ponto de controlo → dois utilizadores + rotação, valor = 0
TIPOS_ENTRADA    = (1, 2)
TIPOS_SAIDA      = (3, 4)
TIPOS_TWO_PERSON = (4, 5)  # requerem rotação e validação por segundo utilizador
TIPO_FECHO       = 4
TIPO_CONTROLO    = 5

TIPO_LABELS = {
    TIPO_FECHO:    'fecho de caixa',
    TIPO_CONTROLO: 'ponto de controlo',
}


def _serialize(row: dict) -> dict:
    result = dict(row)
    if result.get('data') and isinstance(result['data'], str):
        result['data'] = result['data'][:10]
    for k in ('valor', 'saldo'):
        if k in result and result[k] is not None:
            result[k] = float(result[k])
    for k in ('hist_time',):
        if k in result and isinstance(result[k], (datetime, date)):
            result[k] = result[k].isoformat()
    return result


def _signed_valor(tipo: int, valor: float) -> float:
    if tipo in TIPOS_TWO_PERSON and tipo == TIPO_CONTROLO:
        return 0.0
    abs_v = abs(valor)
    if tipo in TIPOS_ENTRADA:
        return abs_v
    if tipo in TIPOS_SAIDA:
        return -abs_v
    return valor


def _get_last_two_person(session, tipo: int):
    """Devolve o último movimento de dois utilizadores (tipo 4 ou 5) com dados dos clientes.
    LEFT JOIN em ts_client c2 para suportar registos pendentes (ts_client2 IS NULL)."""
    return session.execute(text("""
        SELECT b.pk,
               b.tt_caixamovimento,
               b.data,
               b.valor,
               b.tb_document,
               b.ordempagamento,
               b.ts_client1,
               b.ts_client2,
               COALESCE(c1.name, c1.username) AS c1_name,
               c1.username                    AS c1_username,
               COALESCE(c2.name, c2.username) AS c2_name,
               c2.username                    AS c2_username
        FROM tb_caixa b
        JOIN  ts_client c1 ON b.ts_client1 = c1.pk
        LEFT JOIN ts_client c2 ON b.ts_client2 = c2.pk
        WHERE b.tt_caixamovimento = :tipo
        ORDER BY b.hist_time DESC, b.pk DESC
        LIMIT 1
    """), {'tipo': tipo}).mappings().fetchone()


def _build_tipo_state(last) -> dict:
    """Constrói o estado de rotação para um tipo de movimento de dois utilizadores."""
    if not last:
        return {
            'has_previous':   False,
            'pending':        None,
            'next_creator':   None,
            'next_validator': None,
        }

    if last['ts_client2'] is None:
        return {
            'has_previous': True,
            'pending': {
                'pk':      last['pk'],
                'creator': {
                    'pk':       last['ts_client1'],
                    'name':     last['c1_name'],
                    'username': last['c1_username'],
                },
            },
            'next_creator':   None,
            'next_validator': None,
        }

    return {
        'has_previous': True,
        'pending': None,
        'next_creator': {
            'pk':       last['ts_client2'],
            'name':     last['c2_name'],
            'username': last['c2_username'],
        },
        'next_validator': {
            'pk':       last['ts_client1'],
            'name':     last['c1_name'],
            'username': last['c1_username'],
        },
    }


@api_error_handler
def list_movements(current_user: str, date_from=None, date_to=None):
    with db_session_manager(current_user) as session:
        params = {}
        view_where_parts  = []  # com prefixo v. para a query com JOIN
        table_where_parts = []  # sem prefixo para a query directa em tb_caixa
        if date_from:
            view_where_parts.append("v.data >= :date_from")
            table_where_parts.append("data >= :date_from")
            params['date_from'] = date_from
        if date_to:
            view_where_parts.append("v.data <= :date_to")
            table_where_parts.append("data <= :date_to")
            params['date_to'] = date_to

        where_clause       = f"WHERE {' AND '.join(view_where_parts)}"  if view_where_parts  else ""
        saldo_where_clause = f"WHERE {' AND '.join(table_where_parts)}" if table_where_parts else ""

        rows = session.execute(text(f"""
            SELECT v.pk, v.tt_caixamovimento,
                   v.data::text      AS data,
                   v.valor, v.saldo,
                   v.tb_document, v.ordempagamento,
                   v.ts_client1, v.ts_client2,
                   v.hist_client,
                   v.hist_time::text AS hist_time,
                   b.tt_caixamovimento                         AS tt_caixamovimento_raw,
                   b.ts_client1                                AS ts_client1_pk,
                   b.ts_client2                                AS ts_client2_pk,
                   (b.tt_caixamovimento = ANY(:two_person_tipos) AND b.ts_client2 IS NULL) AS is_pending_validation
            FROM vbl_caixa v
            JOIN tb_caixa b ON b.pk = v.pk
            {where_clause}
            ORDER BY b.hist_time DESC, v.pk DESC
        """), {**params, 'two_person_tipos': list(TIPOS_TWO_PERSON)}).mappings().all()

        # Saldo calculado directamente para evitar dependência da ordenação da view
        saldo_atual = session.execute(text(f"""
            SELECT COALESCE(SUM(valor), 0) FROM tb_caixa {saldo_where_clause}
        """), params).scalar()
        saldo_atual   = float(saldo_atual)
        total_entrada = sum(float(r['valor'] or 0) for r in rows if (r['valor'] or 0) > 0)
        total_saida   = abs(sum(float(r['valor'] or 0) for r in rows if (r['valor'] or 0) < 0))

        return {
            'movements': [_serialize(r) for r in rows],
            'summary': {
                'saldo':         saldo_atual,
                'total_entrada': total_entrada,
                'total_saida':   total_saida,
                'count':         len(rows),
            }
        }, 200


@api_error_handler
def list_tipos(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, value FROM vbl_caixamovimento ORDER BY pk
        """)).mappings().all()
        return {'tipos': [dict(r) for r in rows]}, 200


@api_error_handler
def get_fecho_state(current_user: str):
    """
    Devolve o estado de rotação para fecho de caixa (tipo 4) e ponto de controlo (tipo 5).
    Cada tipo tem a sua rotação independente.
    """
    with db_session_manager(current_user) as session:
        return {
            'fecho':    _build_tipo_state(_get_last_two_person(session, TIPO_FECHO)),
            'controlo': _build_tipo_state(_get_last_two_person(session, TIPO_CONTROLO)),
        }, 200


@api_error_handler
def create_movement(data: dict, current_user: str, user_client_pk: int):
    tipo = data.get('tt_caixamovimento')
    if not tipo:
        raise APIError("Tipo de movimento obrigatório.", 400)
    tipo = int(tipo)

    # Tipo 5 (ponto de controlo) não tem valor monetário
    if tipo == TIPO_CONTROLO:
        valor = 0.0
    else:
        valor_raw = data.get('valor')
        if valor_raw is None or valor_raw == '':
            raise APIError("Valor obrigatório.", 400)
        valor = _signed_valor(tipo, float(valor_raw))

    movimento_data = data.get('data') or datetime.now().isoformat()

    with db_session_manager(current_user) as session:
        ts_client2 = data.get('ts_client2') or None

        # ── Regra de rotação para tipos de dois utilizadores (4 e 5) ─────────
        if tipo in TIPOS_TWO_PERSON:
            label = TIPO_LABELS[tipo]
            last = _get_last_two_person(session, tipo)

            # Bloquear se já existe um registo pendente de validação
            if last and last['ts_client2'] is None:
                raise APIError(
                    f"Existe um {label} pendente de validação. "
                    f"Valide-o antes de criar um novo.",
                    422
                )

            # Enforçar rotação quando existe histórico completo
            if last and last['ts_client2'] is not None:
                expected_creator = last['ts_client2']
                if user_client_pk != expected_creator:
                    raise APIError(
                        f"O próximo {label} deve ser iniciado por "
                        f"{last['c2_name']} ({last['c2_username']}).",
                        422
                    )

            # ts_client2 fica NULL — será definido pelo validador via /validar
            ts_client2 = None

        new_pk = session.execute(text("SELECT fs_nextcode()")).scalar()
        try:
            session.execute(text("""
                INSERT INTO vbf_caixa (
                    pk, tt_caixamovimento, data, valor,
                    tb_document, ordempagamento,
                    ts_client1, ts_client2,
                    hist_client, hist_time
                ) VALUES (
                    :pk, :tipo, :data, :valor,
                    :tb_document, :ordempagamento,
                    :ts_client1, :ts_client2,
                    :ts_client1, NOW()
                )
            """), {
                'pk':             new_pk,
                'tipo':           tipo,
                'data':           movimento_data,
                'valor':          valor,
                'tb_document':    data.get('tb_document') or None,
                'ordempagamento': data.get('ordempagamento') or None,
                'ts_client1':     user_client_pk,
                'ts_client2':     ts_client2,
            })
        except IntegrityError as e:
            orig = str(e.orig).lower() if e.orig else str(e).lower()
            if 'tb_caixa_chk01' in orig:
                raise APIError("O registo deve ser validado por duas pessoas diferentes.", 422)
            raise

        logger.info(f"Movimento de caixa {new_pk} (tipo {tipo}) criado por {current_user}")
        return {'message': 'Movimento registado com sucesso', 'pk': new_pk}, 201


@api_error_handler
def validate_fecho(pk: int, user_client_pk: int, current_user: str):
    """
    Regista a validação de um fecho de caixa (tipo 4) ou ponto de controlo (tipo 5)
    pelo segundo utilizador. Só pode ser feita por alguém diferente do criador.
    """
    with db_session_manager(current_user) as session:
        record = session.execute(text("""
            SELECT pk, tt_caixamovimento, data, valor,
                   tb_document, ordempagamento, ts_client1, ts_client2
            FROM tb_caixa
            WHERE pk = :pk
        """), {'pk': pk}).mappings().fetchone()

        if not record:
            raise ResourceNotFoundError("Movimento de caixa", pk)

        tipo = int(record['tt_caixamovimento'])
        if tipo not in TIPOS_TWO_PERSON:
            raise APIError("Este movimento não requer validação por segundo utilizador.", 400)

        if record['ts_client2'] is not None:
            raise APIError(f"Este {TIPO_LABELS[tipo]} já foi validado.", 409)

        if record['ts_client1'] == user_client_pk:
            raise APIError(f"Não pode validar o seu próprio {TIPO_LABELS[tipo]}.", 422)

        try:
            session.execute(text("""
                UPDATE vbf_caixa
                SET tt_caixamovimento = :tipo,
                    data              = :data,
                    valor             = :valor,
                    tb_document       = :tb_document,
                    ordempagamento    = :ordempagamento,
                    ts_client1        = :ts_client1,
                    ts_client2        = :ts_client2
                WHERE pk = :pk
            """), {
                'pk':             pk,
                'tipo':           tipo,
                'data':           record['data'],
                'valor':          float(record['valor']),
                'tb_document':    record['tb_document'],
                'ordempagamento': record['ordempagamento'],
                'ts_client1':     record['ts_client1'],
                'ts_client2':     user_client_pk,
            })
        except IntegrityError as e:
            orig = str(e.orig).lower() if e.orig else str(e).lower()
            if 'tb_caixa_chk01' in orig:
                raise APIError(f"Não pode validar o seu próprio {TIPO_LABELS[tipo]}.", 422)
            raise

        logger.info(
            f"{TIPO_LABELS[tipo].capitalize()} {pk} validado por {current_user} (pk={user_client_pk})"
        )
        return {'message': f'{TIPO_LABELS[tipo].capitalize()} validado com sucesso', 'pk': pk}, 200


@api_error_handler
def update_movement(pk: int, data: dict, current_user: str, user_client_pk: int):
    tipo = data.get('tt_caixamovimento')
    if not tipo:
        raise APIError("Tipo de movimento obrigatório.", 400)
    tipo = int(tipo)

    if tipo == TIPO_CONTROLO:
        valor = 0.0
    else:
        valor_raw = data.get('valor')
        if valor_raw is None or valor_raw == '':
            raise APIError("Valor obrigatório.", 400)
        valor = _signed_valor(tipo, float(valor_raw))

    with db_session_manager(current_user) as session:
        exists = session.execute(
            text("SELECT pk FROM vbl_caixa WHERE pk = :pk"), {'pk': pk}
        ).scalar()
        if not exists:
            raise ResourceNotFoundError("Movimento", pk)

        session.execute(text("""
            UPDATE vbf_caixa
            SET tt_caixamovimento = :tipo,
                data              = :data,
                valor             = :valor,
                tb_document       = :tb_document,
                ordempagamento    = :ordempagamento,
                ts_client1        = :ts_client1,
                ts_client2        = :ts_client2,
                hist_client       = :ts_client1,
                hist_time         = NOW()
            WHERE pk = :pk
        """), {
            'pk':             pk,
            'tipo':           tipo,
            'data':           data.get('data'),
            'valor':          valor,
            'tb_document':    data.get('tb_document') or None,
            'ordempagamento': data.get('ordempagamento') or None,
            'ts_client1':     user_client_pk,
            'ts_client2':     data.get('ts_client2') or None,
        })
        logger.info(f"Movimento de caixa {pk} atualizado por {current_user}")
        return {'message': 'Movimento atualizado com sucesso', 'pk': pk}, 200
