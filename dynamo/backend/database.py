from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from config import settings

engine = create_async_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=20,
    echo=False,
    connect_args={
        "ssl": False,
        "server_settings": {"search_path": settings.db_search_path},
    },
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db():
    async with AsyncSessionLocal() as session:
        await session.execute(text(f"SET search_path TO {settings.db_search_path}"))
        yield session
