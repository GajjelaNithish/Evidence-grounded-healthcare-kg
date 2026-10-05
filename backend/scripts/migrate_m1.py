import os
import sys
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.config import settings

async def main():
    engine = create_async_engine(settings.POSTGRES_URL)
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE doctor_patient_assignments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' NOT NULL;"))
        await conn.execute(text("ALTER TABLE doctor_patient_assignments ADD COLUMN IF NOT EXISTS assignment_reason VARCHAR(500);"))
    await engine.dispose()
    print("Database schema migration for Milestone 1 completed successfully!")

if __name__ == "__main__":
    asyncio.run(main())
