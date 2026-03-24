from pydantic import BaseModel
from typing import Optional
from sqlalchemy.sql import text
from sqlalchemy.exc import IntegrityError
from ..utils.utils import db_session_manager
from app.utils.error_handler import (
    api_error_handler,
    ResourceNotFoundError,
)

# pk=1 corresponde a "Instalação" em tt_equipamento$aloc
ALOC_INSTALACAO_PK = 1

_MSG_INSTAL = (
    'Instalação e localização são obrigatórias '
    'para alocação em Instalação'
)


# ─── Pydantic Models ──────────────────────────────────────────────────

class EquipamentoCreate(BaseModel):
    tt_equipamento_tipo: int
    marca: str
    modelo: str
    serial: Optional[str] = None
    file_manual: Optional[str] = None
    file_specs: Optional[str] = None
    file_esquemas: Optional[str] = None


class EquipamentoUpdate(BaseModel):
    tt_equipamento_tipo: Optional[int] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    serial: Optional[str] = None
    file_manual: Optional[str] = None
    file_specs: Optional[str] = None
    file_esquemas: Optional[str] = None


class AlocacaoCreate(BaseModel):
    tt_equipamento_aloc: int
    tb_instalacao: Optional[int] = None
    tt_equipamento_localizacao: Optional[int] = None
    ts_client: Optional[int] = None
    start_date: str
    stop_date: Optional[str] = None
    memo: Optional[str] = None
    ord: Optional[int] = 1


class AlocacaoUpdate(BaseModel):
    tt_equipamento_aloc: Optional[int] = None
    tb_instalacao: Optional[int] = None
    tt_equipamento_localizacao: Optional[int] = None
    ts_client: Optional[int] = None
    start_date: Optional[str] = None
    stop_date: Optional[str] = None
    memo: Optional[str] = None
    ord: Optional[int] = None


class ReallocarData(BaseModel):
    tt_equipamento_aloc: int
    tb_instalacao: Optional[int] = None
    tt_equipamento_localizacao: Optional[int] = None
    ts_client: Optional[int] = None
    data: str
    memo: Optional[str] = None
    ord: Optional[int] = 1


class SpecCreate(BaseModel):
    tt_equipamento_spec: int
    valor: str


class SpecUpdate(BaseModel):
    tt_equipamento_spec: Optional[int] = None
    valor: Optional[str] = None


class RepairCreate(BaseModel):
    data: str
    valor: Optional[float] = None
    memo: str


class RepairUpdate(BaseModel):
    data: Optional[str] = None
    valor: Optional[float] = None
    memo: Optional[str] = None


# ─── Helper ───────────────────────────────────────────────────────────

_KEY_MAP = {
    'tt_equipamento_tipo': 'tt_equipamento$tipo',
    'tt_equipamento_aloc': 'tt_equipamento$aloc',
    'tt_equipamento_localizacao': 'tt_equipamento$localizacao',
    'tt_equipamento_spec': 'tt_equipamento$spec',
}


def _map_keys(d: dict) -> dict:
    """Converte chaves Pydantic para nomes reais da BD."""
    result = {}
    for k, v in d.items():
        if v is None:
            continue
        result[_KEY_MAP.get(k, k)] = v
    return result


def _build_insert(table: str, db_data: dict):
    """Devolve (sql, params) para um INSERT genérico."""
    cols = ', '.join(f'"{k}"' for k in db_data)
    placeholders = ', '.join(
        f':{k.replace("$", "_s_")}' for k in db_data
    )
    params = {k.replace('$', '_s_'): v for k, v in db_data.items()}
    sql = f'INSERT INTO {table} ({cols}) VALUES ({placeholders})'
    return text(sql), params


def _build_update(table: str, pk_val, db_data: dict):
    """Devolve (sql, params) para um UPDATE genérico por pk."""
    set_parts = [
        f'"{k}" = :{k.replace("$", "_s_")}' for k in db_data
    ]
    set_clause = ', '.join(set_parts)
    params = {k.replace('$', '_s_'): v for k, v in db_data.items()}
    params['pk'] = pk_val
    sql = f'UPDATE {table} SET {set_clause} WHERE pk = :pk'
    return text(sql), params


# ─── Meta (listas de referência) ──────────────────────────────────────

@api_error_handler
def get_meta(current_user: str):
    with db_session_manager(current_user) as session:
        tipos = session.execute(
            text(
                'SELECT pk, value'
                ' FROM "tt_equipamento$tipo" ORDER BY pk'
            )
        ).mappings().all()

        aloc_tipos = session.execute(
            text(
                'SELECT pk, value'
                ' FROM "tt_equipamento$aloc" ORDER BY pk'
            )
        ).mappings().all()

        localizacoes = session.execute(
            text(
                'SELECT pk, value'
                ' FROM "tt_equipamento$localizacao" ORDER BY pk'
            )
        ).mappings().all()

        specs = session.execute(
            text(
                'SELECT pk, value'
                ' FROM "tt_equipamento$spec" ORDER BY pk'
            )
        ).mappings().all()

        instalacoes = session.execute(
            text("""
                SELECT pk,
                       nome || CASE tipo
                           WHEN 1 THEN ' (ETAR)'
                           WHEN 2 THEN ' (EE)'
                           ELSE ''
                       END AS nome
                FROM tb_instalacao
                ORDER BY nome
            """)
        ).mappings().all()

        clientes = session.execute(
            text(
                'SELECT pk, name FROM ts_client ORDER BY name'
            )
        ).mappings().all()

    return {
        'tipos': [dict(r) for r in tipos],
        'alocTipos': [dict(r) for r in aloc_tipos],
        'localizacoes': [dict(r) for r in localizacoes],
        'specs': [dict(r) for r in specs],
        'instalacoes': [dict(r) for r in instalacoes],
        'clientes': [dict(r) for r in clientes],
        'alocInstalacaoPk': ALOC_INSTALACAO_PK,
    }, 200


# ─── Equipamento CRUD ─────────────────────────────────────────────────

@api_error_handler
def list_equipamentos(current_user: str):
    """Lista equipamentos com estado de alocação atual."""
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT e.pk,
                   e."tt_equipamento$tipo",
                   e.marca,
                   e.modelo,
                   e.serial,
                   e.file_manual,
                   e.file_specs,
                   e.file_esquemas,
                   a."tt_equipamento$aloc"         AS estado,
                   a.tb_instalacao                 AS instalacao,
                   a."tt_equipamento$localizacao"  AS localizacao
            FROM vbl_equipamento e
            LEFT JOIN vbl_equipamento_aloc a
                   ON a.tb_equipamento = e.pk
                  AND a.stop_date IS NULL
            ORDER BY e.marca, e.modelo
        """)).mappings().all()
    return {'equipamentos': [dict(r) for r in rows]}, 200


@api_error_handler
def list_equipamentos_by_instalacao(
    instalacao_pk: int,
    current_user: str,
):
    """Lista equipamentos ativos numa instalação específica."""
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT e.pk,
                   e."tt_equipamento$tipo",
                   e.marca,
                   e.modelo,
                   e.serial,
                   a.pk                            AS aloc_pk,
                   a."tt_equipamento$aloc"          AS estado,
                   a."tt_equipamento$localizacao"   AS localizacao,
                   a.start_date,
                   a.memo
            FROM vbl_equipamento e
            JOIN vbl_equipamento_aloc a
                ON a.tb_equipamento = e.pk
            WHERE a.pk_instalacao = :pk
              AND a.stop_date IS NULL
            ORDER BY e.marca, e.modelo
        """), {'pk': instalacao_pk}).mappings().all()
    return {'equipamentos': [dict(r) for r in rows]}, 200


@api_error_handler
def get_equipamento(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(
            text('SELECT * FROM vbl_equipamento WHERE pk = :pk'),
            {'pk': pk}
        ).mappings().first()
    if not row:
        raise ResourceNotFoundError('Equipamento', pk)
    return {'equipamento': dict(row)}, 200


@api_error_handler
def create_equipamento(data: dict, current_user: str):
    eq = EquipamentoCreate.model_validate(data)
    db_data = _map_keys(eq.model_dump(exclude_none=True))

    with db_session_manager(current_user) as session:
        pk = session.execute(
            text('SELECT fs_nextcode()')
        ).scalar()
        db_data['pk'] = pk
        sql, params = _build_insert('vbf_equipamento', db_data)
        session.execute(sql, params)
        session.commit()

    return {
        'message': 'Equipamento criado com sucesso',
        'pk': pk,
    }, 201


@api_error_handler
def update_equipamento(pk: int, data: dict, current_user: str):
    eq = EquipamentoUpdate.model_validate(data)
    db_data = _map_keys(eq.model_dump(exclude_none=True))

    if not db_data:
        return {'message': 'Nenhum campo válido para atualizar'}, 400

    sql, params = _build_update('vbf_equipamento', pk, db_data)

    with db_session_manager(current_user) as session:
        result = session.execute(sql, params)
        session.commit()

    if result.rowcount == 0:
        raise ResourceNotFoundError('Equipamento', pk)
    return {'message': 'Equipamento atualizado com sucesso'}, 200


@api_error_handler
def delete_equipamento(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        result = session.execute(
            text('DELETE FROM vbf_equipamento WHERE pk = :pk'),
            {'pk': pk}
        )
        session.commit()
    if result.rowcount == 0:
        raise ResourceNotFoundError('Equipamento', pk)
    return {'message': 'Equipamento eliminado com sucesso'}, 200


# ─── Alocações ────────────────────────────────────────────────────────

def _validate_instalacao(aloc_tipo, tb_instalacao, tt_localizacao):
    if aloc_tipo == ALOC_INSTALACAO_PK:
        if not tb_instalacao or not tt_localizacao:
            return False
    return True


@api_error_handler
def list_aloc(equipamento_pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(
            text(
                'SELECT * FROM vbl_equipamento_aloc'
                ' WHERE tb_equipamento = :pk'
                ' ORDER BY start_date DESC'
            ),
            {'pk': equipamento_pk}
        ).mappings().all()
    return {'alocacoes': [dict(r) for r in rows]}, 200


@api_error_handler
def create_aloc(equipamento_pk: int, data: dict, current_user: str):
    aloc = AlocacaoCreate.model_validate(data)

    if not _validate_instalacao(
        aloc.tt_equipamento_aloc,
        aloc.tb_instalacao,
        aloc.tt_equipamento_localizacao,
    ):
        return {'message': _MSG_INSTAL}, 400

    db_data = _map_keys(aloc.model_dump(exclude_none=True))
    db_data['tb_equipamento'] = equipamento_pk

    try:
        with db_session_manager(current_user) as session:
            pk = session.execute(
                text('SELECT fs_nextcode()')
            ).scalar()
            db_data['pk'] = pk
            sql, params = _build_insert(
                'vbf_equipamento_aloc', db_data
            )
            session.execute(sql, params)
            session.commit()
    except IntegrityError:
        return {
            'message': 'Já existe uma alocação registada nesta data para este equipamento'
        }, 409

    return {'message': 'Alocação criada com sucesso', 'pk': pk}, 201


@api_error_handler
def update_aloc(pk: int, data: dict, current_user: str):
    aloc = AlocacaoUpdate.model_validate(data)

    if not _validate_instalacao(
        aloc.tt_equipamento_aloc,
        aloc.tb_instalacao,
        aloc.tt_equipamento_localizacao,
    ):
        return {'message': _MSG_INSTAL}, 400

    db_data = _map_keys(aloc.model_dump(exclude_none=True))
    if not db_data:
        return {'message': 'Nenhum campo válido para atualizar'}, 400

    sql, params = _build_update('vbf_equipamento_aloc', pk, db_data)

    with db_session_manager(current_user) as session:
        result = session.execute(sql, params)
        session.commit()

    if result.rowcount == 0:
        raise ResourceNotFoundError('Alocação', pk)
    return {'message': 'Alocação atualizada com sucesso'}, 200


@api_error_handler
def delete_aloc(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        result = session.execute(
            text(
                'DELETE FROM vbf_equipamento_aloc WHERE pk = :pk'
            ),
            {'pk': pk}
        )
        session.commit()
    if result.rowcount == 0:
        raise ResourceNotFoundError('Alocação', pk)
    return {'message': 'Alocação eliminada com sucesso'}, 200


@api_error_handler
def reallocar_equipamento(
    equipamento_pk: int,
    data: dict,
    current_user: str,
):
    """Fecha alocação ativa e abre nova (realocar para armazém etc.)."""
    rd = ReallocarData.model_validate(data)

    if not _validate_instalacao(
        rd.tt_equipamento_aloc,
        rd.tb_instalacao,
        rd.tt_equipamento_localizacao,
    ):
        return {'message': _MSG_INSTAL}, 400

    try:
        with db_session_manager(current_user) as session:
            # fecha alocação ativa
            session.execute(
                text(
                    'UPDATE vbf_equipamento_aloc'
                    '   SET stop_date = :data'
                    ' WHERE tb_equipamento = :pk'
                    '   AND stop_date IS NULL'
                ),
                {'data': rd.data, 'pk': equipamento_pk}
            )

            # cria nova alocação
            new_pk = session.execute(
                text('SELECT fs_nextcode()')
            ).scalar()
            new_data = _map_keys(rd.model_dump(exclude_none=True))
            new_data.pop('data', None)  # campo "data" = stop da anterior
            new_data['tb_equipamento'] = equipamento_pk
            new_data['start_date'] = rd.data
            new_data['pk'] = new_pk

            sql, params = _build_insert('vbf_equipamento_aloc', new_data)
            session.execute(sql, params)
            session.commit()
    except IntegrityError:
        return {
            'message': 'Já existe uma alocação registada nesta data para este equipamento'
        }, 409

    return {
        'message': 'Equipamento realocado com sucesso',
        'pk': new_pk,
    }, 201


# ─── Especificações ───────────────────────────────────────────────────

@api_error_handler
def list_specs(equipamento_pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(
            text(
                'SELECT * FROM vbl_equipamento_spec'
                ' WHERE tb_equipamento = :pk'
                ' ORDER BY pk'
            ),
            {'pk': equipamento_pk}
        ).mappings().all()
    return {'specs': [dict(r) for r in rows]}, 200


@api_error_handler
def create_spec(equipamento_pk: int, data: dict, current_user: str):
    spec = SpecCreate.model_validate(data)
    db_data = _map_keys(spec.model_dump())
    db_data['tb_equipamento'] = equipamento_pk

    with db_session_manager(current_user) as session:
        pk = session.execute(
            text('SELECT fs_nextcode()')
        ).scalar()
        db_data['pk'] = pk
        sql, params = _build_insert('vbf_equipamento_spec', db_data)
        session.execute(sql, params)
        session.commit()

    return {
        'message': 'Especificação criada com sucesso',
        'pk': pk,
    }, 201


@api_error_handler
def update_spec(pk: int, data: dict, current_user: str):
    spec = SpecUpdate.model_validate(data)
    db_data = _map_keys(spec.model_dump(exclude_none=True))

    if not db_data:
        return {'message': 'Nenhum campo válido para atualizar'}, 400

    sql, params = _build_update('vbf_equipamento_spec', pk, db_data)

    with db_session_manager(current_user) as session:
        result = session.execute(sql, params)
        session.commit()

    if result.rowcount == 0:
        raise ResourceNotFoundError('Especificação', pk)
    return {'message': 'Especificação atualizada com sucesso'}, 200


@api_error_handler
def delete_spec(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        result = session.execute(
            text(
                'DELETE FROM vbf_equipamento_spec WHERE pk = :pk'
            ),
            {'pk': pk}
        )
        session.commit()
    if result.rowcount == 0:
        raise ResourceNotFoundError('Especificação', pk)
    return {'message': 'Especificação eliminada com sucesso'}, 200


# ─── Reparações / Manutenções ─────────────────────────────────────────

@api_error_handler
def list_repairs(equipamento_pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(
            text(
                'SELECT * FROM vbl_equipamento_repair'
                ' WHERE tb_equipamento = :pk'
                ' ORDER BY data DESC'
            ),
            {'pk': equipamento_pk}
        ).mappings().all()
    return {'repairs': [dict(r) for r in rows]}, 200


@api_error_handler
def create_repair(equipamento_pk: int, data: dict, current_user: str):
    repair = RepairCreate.model_validate(data)
    db_data = repair.model_dump(exclude_none=True)
    db_data['tb_equipamento'] = equipamento_pk

    with db_session_manager(current_user) as session:
        pk = session.execute(
            text('SELECT fs_nextcode()')
        ).scalar()
        db_data['pk'] = pk
        cols = ', '.join(db_data)
        vals = ', '.join(f':{k}' for k in db_data)
        session.execute(
            text(
                f'INSERT INTO vbf_equipamento_repair'
                f' ({cols}) VALUES ({vals})'
            ),
            db_data
        )
        session.commit()

    return {
        'message': 'Manutenção registada com sucesso',
        'pk': pk,
    }, 201


@api_error_handler
def update_repair(pk: int, data: dict, current_user: str):
    repair = RepairUpdate.model_validate(data)
    db_data = repair.model_dump(exclude_none=True)

    if not db_data:
        return {'message': 'Nenhum campo válido para atualizar'}, 400

    set_clause = ', '.join(f'{k} = :{k}' for k in db_data)
    db_data['pk'] = pk

    with db_session_manager(current_user) as session:
        result = session.execute(
            text(
                f'UPDATE vbf_equipamento_repair'
                f' SET {set_clause} WHERE pk = :pk'
            ),
            db_data
        )
        session.commit()

    if result.rowcount == 0:
        raise ResourceNotFoundError('Manutenção', pk)
    return {'message': 'Manutenção atualizada com sucesso'}, 200


@api_error_handler
def delete_repair(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        result = session.execute(
            text(
                'DELETE FROM vbf_equipamento_repair WHERE pk = :pk'
            ),
            {'pk': pk}
        )
        session.commit()
    if result.rowcount == 0:
        raise ResourceNotFoundError('Manutenção', pk)
    return {'message': 'Manutenção eliminada com sucesso'}, 200
