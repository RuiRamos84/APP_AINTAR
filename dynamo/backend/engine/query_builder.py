"""
Constrói queries SQL dinâmicas de forma segura (bound parameters).
Nunca concatena valores de utilizador directamente no SQL.
"""
from __future__ import annotations
from datetime import date, datetime
from sqlalchemy import text
from engine.loader import get_text_fields


def _col(name: str) -> str:
    """Quote column names that contain special characters ($, spaces, etc.)."""
    if any(c in name for c in ('$', ' ', '-', '.')):
        return f'"{name}"'
    return name


def _coerce(entity_cfg: dict, field_key: str, value):
    """
    Converte valores vindos do JSON (sempre strings/numbers) para o tipo
    Python correto que asyncpg espera para a coluna PostgreSQL.
    """
    if value is None or value == '':
        return None

    field_map = {f["key"]: f for f in entity_cfg.get("fields", [])}
    field = field_map.get(field_key, {})
    ftype = field.get("type", "text")

    try:
        if ftype == "date":
            if isinstance(value, date):
                return value
            # Aceita "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM:SS..."
            return date.fromisoformat(str(value)[:10])

        if ftype in ("datetime", "timestamp"):
            if isinstance(value, datetime):
                return value
            return datetime.fromisoformat(str(value)[:19])

        if ftype == "number":
            if isinstance(value, (int, float)):
                return value
            s = str(value).strip()
            return int(s) if s.lstrip('-').isdigit() else float(s)

        if ftype == "boolean":
            if isinstance(value, bool):
                return value
            return str(value).lower() in ("true", "1", "yes", "sim")

    except (ValueError, TypeError):
        # Se a conversão falhar, devolve o valor original e deixa o asyncpg falhar
        # com uma mensagem mais clara, em vez de um AttributeError interno.
        return value

    return value


def _coerce_data(entity_cfg: dict, data: dict) -> dict:
    return {k: _coerce(entity_cfg, k, v) for k, v in data.items()}


def build_list_query(entity_cfg: dict, search: str | None, page: int, per_page: int, sort: str | None, direction: str):
    view = entity_cfg["db"]["readView"]
    pk = entity_cfg["db"]["pkField"]
    per_page = min(max(per_page, 1), 200)
    page = max(page, 1)
    offset = (page - 1) * per_page
    direction = "DESC" if direction.upper() == "DESC" else "ASC"

    allowed_fields = {f["key"] for f in entity_cfg["fields"]}
    sort_field = sort if sort in allowed_fields else pk

    params: dict = {"limit": per_page, "offset": offset}

    where_clause = ""
    if search and search.strip():
        text_fields = get_text_fields(entity_cfg)
        if text_fields:
            conditions = " OR ".join(f"CAST({_col(col)} AS TEXT) ILIKE :search" for col in text_fields)
            where_clause = f"WHERE ({conditions})"
            params["search"] = f"%{search.strip()}%"

    sql = f"""
        SELECT * FROM {view}
        {where_clause}
        ORDER BY {_col(sort_field)} {direction}
        LIMIT :limit OFFSET :offset
    """
    count_sql = f"SELECT COUNT(*) FROM {view} {where_clause}"
    return text(sql), text(count_sql), params


def build_get_query(entity_cfg: dict, pk_value: int):
    view = entity_cfg["db"]["readView"]
    pk_field = entity_cfg["db"]["pkField"]
    sql = f"SELECT * FROM {view} WHERE {_col(pk_field)} = :pk"
    return text(sql), {"pk": pk_value}


def build_relation_query(
    parent_cfg: dict,
    relation_cfg: dict,
    child_cfg: dict,
    parent_pk: int,
    search: str | None,
    page: int,
    per_page: int,
):
    child_view = child_cfg["db"]["readView"]
    fk = relation_cfg["foreignKey"]
    per_page = min(max(per_page, 1), 200)
    offset = (max(page, 1) - 1) * per_page

    params: dict = {"parent_pk": parent_pk, "limit": per_page, "offset": offset}
    extra_where = ""

    if search and search.strip():
        text_fields = get_text_fields(child_cfg)
        if text_fields:
            conditions = " OR ".join(f"CAST({_col(col)} AS TEXT) ILIKE :search" for col in text_fields)
            extra_where = f"AND ({conditions})"
            params["search"] = f"%{search.strip()}%"

    child_pk = child_cfg["db"]["pkField"]
    sql = f"""
        SELECT * FROM {child_view}
        WHERE {_col(fk)} = :parent_pk {extra_where}
        ORDER BY {_col(child_pk)} DESC
        LIMIT :limit OFFSET :offset
    """
    count_sql = f"SELECT COUNT(*) FROM {child_view} WHERE {_col(fk)} = :parent_pk {extra_where}"
    return text(sql), text(count_sql), params


def build_insert_query(entity_cfg: dict, data: dict):
    view = entity_cfg["db"].get("writeView") or entity_cfg["db"]["readView"]
    coerced = _coerce_data(entity_cfg, data)
    fields = [k for k in coerced if coerced[k] is not None]
    if not fields:
        raise ValueError("Sem campos para inserir")
    cols = ", ".join(_col(f) for f in fields)
    safe_keys = {f: f.replace("$", "__") for f in fields}
    vals = ", ".join(f":{safe_keys[f]}" for f in fields)
    pk = entity_cfg["db"]["pkField"]
    sql = f"INSERT INTO {view} ({cols}) VALUES ({vals}) RETURNING {_col(pk)}"
    safe_data = {safe_keys[k]: coerced[k] for k in fields}
    return text(sql), safe_data


def build_update_query(entity_cfg: dict, pk_value: int, data: dict):
    view = entity_cfg["db"].get("writeView") or entity_cfg["db"]["readView"]
    pk_field = entity_cfg["db"]["pkField"]
    coerced = _coerce_data(entity_cfg, data)
    fields = [k for k in coerced if k != pk_field]
    if not fields:
        raise ValueError("Sem campos para actualizar")
    safe_keys = {f: f.replace("$", "__") for f in fields}
    assignments = ", ".join(f"{_col(f)} = :{safe_keys[f]}" for f in fields)
    sql = f"UPDATE {view} SET {assignments} WHERE {_col(pk_field)} = :__pk"
    params = {safe_keys[k]: coerced[k] for k in fields}
    params["__pk"] = pk_value
    return text(sql), params


def build_delete_query(entity_cfg: dict, pk_value: int):
    view = entity_cfg["db"].get("writeView") or entity_cfg["db"]["readView"]
    pk_field = entity_cfg["db"]["pkField"]
    sql = f"DELETE FROM {view} WHERE {_col(pk_field)} = :pk"
    return text(sql), {"pk": pk_value}
