import os
import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.config import settings
from app.models.base import Base
import app.models  # Ensures all models including Encounter are registered

async def main():
    engine = create_async_engine(settings.POSTGRES_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print("Database schema migration for Milestone 3 (encounters table) completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
