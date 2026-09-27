import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect('postgresql://clinicalkg:clinicalkg_password@127.0.0.1:5432/clinicalkg')
    tables = await conn.fetch("SELECT tablename FROM pg_tables WHERE schemaname='public'")
    print('Tables found:', len(tables))
    for t in tables:
        print(' -', t['tablename'])
    await conn.close()

asyncio.run(check())
