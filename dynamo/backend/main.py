from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import engine
from auth import get_authed_db, get_current_user
from auth_utils import do_login
from app_config import APP_CONFIG
from engine.loader import load_entities
from engine.router_factory import create_all_routers
from engine.schema_factory import entity_to_schema


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        async with engine.connect() as conn:
            await conn.execute(text(f"SET search_path TO {settings.db_search_path}"))
            r = await conn.execute(text("SELECT current_setting('search_path'), COUNT(*) FROM ts_client"))
            row = r.fetchone()
            print(f"✓ BD ok | search_path={row[0]} | ts_client rows={row[1]}")
    except Exception as e:
        print(f"⚠ BD indisponível no arranque: {e}")
    yield
    await engine.dispose()


app = FastAPI(
    title="AINTAR Dynamo API",
    description="Motor de CRUD dinâmico gerado a partir de entity configs",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Carregar entidades e gerar routers ────────────────────────────────────────
all_entities = load_entities(APP_CONFIG)

for router in create_all_routers(APP_CONFIG, all_entities):
    app.include_router(router, prefix="/api")


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/auth/login")
async def login(body: dict):
    """Login via fs_login() — devolve JWT com session_id e permissões."""
    username = (body.get("username") or "").strip()
    password = body.get("password") or ""
    if not username or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Credenciais em falta")

    try:
        user_data = await do_login(username, password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"[dev] {e}")

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    token = jwt.encode(
        {
            "sub": str(user_data["session_id"]),
            "exp": expire,
            "session_id": user_data["session_id"],
            "user_id": user_data["user_id"],
            "user_name": user_data["user_name"],
            "profil": user_data["profil"],
            "permissions": user_data["permissions"],
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "name": user_data["user_name"],
        "permissions": user_data["permissions"],
    }


# ── Rotas de sistema ──────────────────────────────────────────────────────────

@app.get("/api/meta")
async def get_meta(db: AsyncSession = Depends(get_authed_db)):
    """Devolve todos os lookups/metadados de uma só vez (cache no frontend).
    Requer a view vw_metadata na BD; devolve {} se não existir."""
    try:
        result = await db.execute(text("SELECT * FROM vw_metadata ORDER BY 1"))
        rows = result.mappings().all()
        meta: dict = {}
        for row in rows:
            r = dict(row)
            key = r.get("type") or r.get("meta_type") or r.get("category")
            if key:
                meta.setdefault(key, []).append(r)
        return meta
    except Exception:
        return {}


@app.get("/api/schema/{entity_key}")
async def get_schema(entity_key: str, _user: dict = Depends(get_current_user)):
    """Devolve o schema de uma entidade (útil para debug e introspect do frontend)."""
    cfg = all_entities.get(entity_key)
    if not cfg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entidade não encontrada")
    return entity_to_schema(cfg)


@app.get("/api/config")
async def get_config(_user: dict = Depends(get_current_user)):
    """Devolve a estrutura de módulos + schemas de todas as entidades."""
    return {
        "modules": APP_CONFIG["modules"],
        "entities": {k: entity_to_schema(v) for k, v in all_entities.items()},
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
