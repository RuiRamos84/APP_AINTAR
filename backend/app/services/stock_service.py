from datetime import datetime
from sqlalchemy.sql import text
from ..utils.utils import db_session_manager
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _iso(val):
    if isinstance(val, str):
        return datetime.fromisoformat(val)
    return val


# ─── Metadata ────────────────────────────────────────────────────────────────

def list_stock_types(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("SELECT * FROM vbl_stocktype ORDER BY value")).mappings().all()
        return {'types': [dict(r) for r in rows]}, 200


def list_units(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("SELECT * FROM tt_unit ORDER BY value")).mappings().all()
        return {'units': [dict(r) for r in rows]}, 200


# ─── Artigos (tt_stockitem) ───────────────────────────────────────────────────

def list_stock_items(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("SELECT * FROM vbl_stockitem ORDER BY value")).mappings().all()
        return {'items': [dict(r) for r in rows]}, 200


def create_stock_item(current_user: str, data: dict):
    with db_session_manager(current_user) as session:
        pk = session.execute(text("SELECT fs_nextcode()")).scalar()
        session.execute(text("""
            INSERT INTO tt_stockitem (pk, tt_stocktype, tt_unit, value, threshold)
            VALUES (:pk, :tt_stocktype, :tt_unit, :value, :threshold)
        """), {
            'pk': pk,
            'tt_stocktype': data.get('tt_stocktype'),
            'tt_unit': data.get('tt_unit'),
            'value': data.get('value', '').strip(),
            'threshold': data.get('threshold', 0),
        })
        session.commit()
    return {'message': 'Artigo criado com sucesso.', 'pk': pk}, 201


def update_stock_item(current_user: str, pk: int, data: dict):
    allowed = ['tt_stocktype', 'tt_unit', 'value', 'threshold']
    fields = {k: v for k, v in data.items() if k in allowed}
    if not fields:
        return {'error': 'Nenhum campo válido para atualizar.'}, 400
    set_clause = ', '.join(f"{k} = :{k}" for k in fields)
    with db_session_manager(current_user) as session:
        result = session.execute(
            text(f"UPDATE tt_stockitem SET {set_clause} WHERE pk = :pk"),
            {**fields, 'pk': pk},
        )
        session.commit()
    if result.rowcount == 0:
        return {'error': 'Artigo não encontrado.'}, 404
    return {'message': 'Artigo atualizado com sucesso.'}, 200


def delete_stock_item(current_user: str, pk: int):
    with db_session_manager(current_user) as session:
        result = session.execute(text("DELETE FROM tt_stockitem WHERE pk = :pk"), {'pk': pk})
        session.commit()
    if result.rowcount == 0:
        return {'error': 'Artigo não encontrado.'}, 404
    return {'message': 'Artigo eliminado com sucesso.'}, 200


# ─── Stock Atual (vbl_stockcurrent) ──────────────────────────────────────────

def list_stock_current(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(
            text("SELECT * FROM vbl_stockcurrent ORDER BY tt_stocktype, value")
        ).mappings().all()
        return {'current': [dict(r) for r in rows]}, 200


# ─── Entradas (fbf_stockin) ──────────────────────────────────────────────────

def list_stock_in(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(
            text("SELECT * FROM vbl_stockin ORDER BY date DESC")
        ).mappings().all()
        items = []
        for r in rows:
            d = dict(r)
            if d.get('date'):
                d['date'] = d['date'].isoformat()
            items.append(d)
        return {'stockin': items}, 200


def create_stock_in(current_user: str, data: dict):
    with db_session_manager(current_user) as session:
        pk = session.execute(text("SELECT fs_nextcode()")).scalar()
        session.execute(text("""
            SELECT fbf_stockin(0, :pk, :tt_stockitem, :date, :quantity, :price)
        """), {
            'pk': pk,
            'tt_stockitem': data.get('tt_stockitem'),
            'date': _iso(data.get('date')),
            'quantity': data.get('quantity'),
            'price': data.get('price'),
        })
        session.commit()
    return {'message': 'Entrada registada com sucesso.', 'pk': pk}, 201


def update_stock_in(current_user: str, pk: int, data: dict):
    with db_session_manager(current_user) as session:
        session.execute(text("""
            SELECT fbf_stockin(1, :pk, :tt_stockitem, :date, :quantity, :price)
        """), {
            'pk': pk,
            'tt_stockitem': data.get('tt_stockitem'),
            'date': _iso(data.get('date')),
            'quantity': data.get('quantity'),
            'price': data.get('price'),
        })
        session.commit()
    return {'message': 'Entrada atualizada com sucesso.'}, 200


def delete_stock_in(current_user: str, pk: int):
    with db_session_manager(current_user) as session:
        session.execute(
            text("SELECT fbf_stockin(2, :pk, NULL, NULL, NULL, NULL)"),
            {'pk': pk},
        )
        session.commit()
    return {'message': 'Entrada eliminada com sucesso.'}, 200


# ─── Saídas (fbf_stockout) ───────────────────────────────────────────────────

def list_stock_out(current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(
            text("SELECT * FROM vbl_stockout ORDER BY date DESC")
        ).mappings().all()
        items = []
        for r in rows:
            d = dict(r)
            if d.get('date'):
                d['date'] = d['date'].isoformat()
            items.append(d)
        return {'stockout': items}, 200


def create_stock_out(current_user: str, data: dict):
    with db_session_manager(current_user) as session:
        pk = session.execute(text("SELECT fs_nextcode()")).scalar()
        session.execute(text("""
            SELECT fbf_stockout(0, :pk, :tt_stockitem, :date, :quantity, :dest_place, :dest_type, :dest_descr)
        """), {
            'pk': pk,
            'tt_stockitem': data.get('tt_stockitem'),
            'date': _iso(data.get('date')),
            'quantity': data.get('quantity'),
            'dest_place': data.get('dest_place'),
            'dest_type': data.get('dest_type'),
            'dest_descr': data.get('dest_descr'),
        })
        session.commit()
    return {'message': 'Saída registada com sucesso.', 'pk': pk}, 201


def update_stock_out(current_user: str, pk: int, data: dict):
    with db_session_manager(current_user) as session:
        session.execute(text("""
            SELECT fbf_stockout(1, :pk, :tt_stockitem, :date, :quantity, :dest_place, :dest_type, :dest_descr)
        """), {
            'pk': pk,
            'tt_stockitem': data.get('tt_stockitem'),
            'date': _iso(data.get('date')),
            'quantity': data.get('quantity'),
            'dest_place': data.get('dest_place'),
            'dest_type': data.get('dest_type'),
            'dest_descr': data.get('dest_descr'),
        })
        session.commit()
    return {'message': 'Saída atualizada com sucesso.'}, 200


def delete_stock_out(current_user: str, pk: int):
    with db_session_manager(current_user) as session:
        session.execute(
            text("SELECT fbf_stockout(2, :pk, NULL, NULL, NULL, NULL, NULL, NULL)"),
            {'pk': pk},
        )
        session.commit()
    return {'message': 'Saída eliminada com sucesso.'}, 200
