import asyncio
import asyncpg
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset():
    conn = await asyncpg.connect('postgresql://clinicalkg:clinicalkg_password@127.0.0.1:5432/clinicalkg')
    
    users = [
        ("admin", "admin123"),
        ("dr_smith", "doctor123"),
        ("patient_rajesh", "patient123"),
    ]
    
    for username, password in users:
        hashed = pwd_context.hash(password)
        await conn.execute(
            "UPDATE users SET password_hash = $1 WHERE username = $2",
            hashed, username
        )
        print(f"Reset password for {username}")
    
    await conn.close()
    print("Done.")

asyncio.run(reset())
