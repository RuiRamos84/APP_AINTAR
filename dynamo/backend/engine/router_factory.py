"""
Gera um APIRouter FastAPI completo para cada entidade no config.
Endpoints gerados: LIST, GET, POST, PUT, DELETE, + hasMany relations.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from auth import get_authed_db, get_current_user, require_permission
from engine import query_builder as qb


def _db_error_to_http(exc: Exception) -> HTTPException:
    """Converte erros de BD em respostas HTTP legíveis."""
    msg = str(exc)
    # Extrair mensagem útil do asyncpg sem expor detalhes internos
    if "DataError" in msg or "invalid input" in msg.lower():
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                             detail="Valor inválido num ou mais campos.")
    if "IntegrityError" in msg or "violates" in msg.lower() or "duplicate" in msg.lower():
        return HTTPException(status_code=status.HTTP_409_CONFLICT,
                             detail="Conflito de dados: registo duplicado ou referência inválida.")
    if "ForeignKeyViolation" in msg:
        return HTTPException(status_code=status.HTTP_409_CONFLICT,
                             detail="Referência inválida: registo relacionado não existe.")
    if "NotNullViolation" in msg or "not-null" in msg.lower():
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                             detail="Campo obrigatório em falta.")
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                         detail="Erro interno ao processar o pedido.")


def _rows_to_list(result) -> list[dict]:
    return [dict(row) for row in result.mappings().all()]


def _serialize(row) -> dict | None:
    m = row.mappings().first()
    return dict(m) if m else None


def create_entity_router(entity_cfg: dict, all_entities: dict) -> APIRouter:
    key = entity_cfg["key"]
    perm_view = entity_cfg.get("permissions", {}).get("view")
    perm_edit = entity_cfg.get("permissions", {}).get("edit")

    view_dep = require_permission(perm_view) if perm_view else get_current_user
    edit_dep = require_permission(perm_edit) if perm_edit else get_current_user

    router = APIRouter(prefix=f"/{key}", tags=[entity_cfg.get("label", key)])

    # ── LIST ─────────────────────────────────────────────────────────────────
    @router.get("")
    async def list_records(
        search: str | None = Query(None),
        page: int = Query(1, ge=1),
        per_page: int = Query(25, ge=1, le=200),
        sort: str | None = Query(None),
        dir: str = Query("asc"),
        db: AsyncSession = Depends(get_authed_db),
        _user: dict = Depends(view_dep),
    ):
        sql, count_sql, params = qb.build_list_query(entity_cfg, search, page, per_page, sort, dir)
        rows = await db.execute(sql, params)
        count_row = await db.execute(count_sql, params)
        total = count_row.scalar() or 0
        data = _rows_to_list(rows)
        return {"data": data, "total": total, "page": page, "per_page": per_page, "pages": -(-total // per_page)}

    # ── GET ONE ───────────────────────────────────────────────────────────────
    @router.get("/{pk}")
    async def get_record(
        pk: int,
        db: AsyncSession = Depends(get_authed_db),
        _user: dict = Depends(view_dep),
    ):
        sql, params = qb.build_get_query(entity_cfg, pk)
        result = await db.execute(sql, params)
        row = _serialize(result)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registo não encontrado")
        return {"data": row}

    # ── CREATE ────────────────────────────────────────────────────────────────
    @router.post("", status_code=status.HTTP_201_CREATED)
    async def create_record(
        body: dict,
        db: AsyncSession = Depends(get_authed_db),
        _user: dict = Depends(edit_dep),
    ):
        try:
            sql, params = qb.build_insert_query(entity_cfg, body)
            result = await db.execute(sql, params)
            await db.commit()
            new_pk = result.scalar()
            get_sql, get_params = qb.build_get_query(entity_cfg, new_pk)
            row_result = await db.execute(get_sql, get_params)
            return {"data": _serialize(row_result)}
        except HTTPException:
            raise
        except Exception as exc:
            await db.rollback()
            raise _db_error_to_http(exc)

    # ── UPDATE ────────────────────────────────────────────────────────────────
    @router.put("/{pk}")
    async def update_record(
        pk: int,
        body: dict,
        db: AsyncSession = Depends(get_authed_db),
        _user: dict = Depends(edit_dep),
    ):
        try:
            sql, params = qb.build_update_query(entity_cfg, pk, body)
            await db.execute(sql, params)
            await db.commit()
            get_sql, get_params = qb.build_get_query(entity_cfg, pk)
            row_result = await db.execute(get_sql, get_params)
            row = _serialize(row_result)
            if not row:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registo não encontrado")
            return {"data": row}
        except HTTPException:
            raise
        except Exception as exc:
            await db.rollback()
            raise _db_error_to_http(exc)

    # ── DELETE ────────────────────────────────────────────────────────────────
    @router.delete("/{pk}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_record(
        pk: int,
        db: AsyncSession = Depends(get_authed_db),
        _user: dict = Depends(edit_dep),
    ):
        try:
            sql, params = qb.build_delete_query(entity_cfg, pk)
            await db.execute(sql, params)
            await db.commit()
        except HTTPException:
            raise
        except Exception as exc:
            await db.rollback()
            raise _db_error_to_http(exc)

    # ── hasMany RELATIONS ─────────────────────────────────────────────────────
    for rel_key, rel_cfg in entity_cfg.get("relations", {}).items():
        if rel_cfg["type"] != "hasMany":
            continue

        child_entity_key = rel_cfg["entity"]
        child_cfg = all_entities.get(child_entity_key)
        if not child_cfg:
            continue

        child_perm_view = child_cfg.get("permissions", {}).get("view")
        child_view_dep = require_permission(child_perm_view) if child_perm_view else get_current_user

        # closure para capturar variáveis correctamente
        def make_relation_endpoint(r_cfg, c_cfg, c_view_dep):
            @router.get(f"/{{pk}}/{rel_key}")
            async def list_related(
                pk: int,
                search: str | None = Query(None),
                page: int = Query(1, ge=1),
                per_page: int = Query(25, ge=1, le=200),
                db: AsyncSession = Depends(get_authed_db),
                _user: dict = Depends(c_view_dep),
            ):
                sql, count_sql, params = qb.build_relation_query(entity_cfg, r_cfg, c_cfg, pk, search, page, per_page)
                rows = await db.execute(sql, params)
                count_row = await db.execute(count_sql, params)
                total = count_row.scalar() or 0
                data = _rows_to_list(rows)
                return {"data": data, "total": total, "page": page, "per_page": per_page, "pages": -(-total // per_page)}
            return list_related

        make_relation_endpoint(rel_cfg, child_cfg, child_view_dep)

    return router


def create_all_routers(app_config: dict, all_entities: dict) -> list[APIRouter]:
    return [create_entity_router(cfg, all_entities) for cfg in all_entities.values()]
