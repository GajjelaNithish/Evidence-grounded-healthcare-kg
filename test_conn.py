import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath("backend"))

from app.config import settings
from app.database import engine
from sqlalchemy import text
import redis.asyncio as aioredis
from app.neo4j_client import verify_async_neo4j_connectivity

async def main():
    print(f"Checking PostgreSQL at {settings.POSTGRES_URL}...")
    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT 1"))
            print(f"  -> PostgreSQL Connected! (result={res.scalar()})")
    except Exception as e:
        print(f"  -> PostgreSQL Error: {e}")

    print(f"Checking Redis at {settings.REDIS_URL}...")
    try:
        r = aioredis.from_url(settings.REDIS_URL)
        pong = await r.ping()
        print(f"  -> Redis Connected! (ping={pong})")
        await r.close()
    except Exception as e:
        print(f"  -> Redis Error: {e}")

    print(f"Checking Neo4j at {settings.NEO4J_URL}...")
    try:
        neo_ok = await verify_async_neo4j_connectivity()
        print(f"  -> Neo4j Connected! (status={neo_ok})")
    except Exception as e:
        print(f"  -> Neo4j Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
