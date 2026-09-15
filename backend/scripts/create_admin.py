import asyncio
import argparse
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from passlib.context import CryptContext
from sqlalchemy import select
from app.database import async_session_factory
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_or_update_admin(username: str, password: str, email: str, full_name: str = "System Administrator"):
    hashed_password = pwd_context.hash(password)
    async with async_session_factory() as session:
        stmt = select(User).where(User.username == username)
        result = await session.execute(stmt)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            existing_user.password_hash = hashed_password
            existing_user.email = email
            existing_user.role = "admin"
            existing_user.is_active = True
            existing_user.full_name = full_name
            await session.commit()
            print(f"Admin user '{username}' already exists. Password and status updated successfully.")
        else:
            new_admin = User(
                username=username,
                email=email,
                password_hash=hashed_password,
                role="admin",
                full_name=full_name,
                is_active=True
            )
            session.add(new_admin)
            await session.commit()
            print(f"Admin user '{username}' created successfully.")

def main():
    parser = argparse.ArgumentParser(description="Create or update an admin user.")
    parser.add_argument("--username", default="admin", help="Admin username")
    parser.add_argument("--password", default="admin123", help="Admin password")
    parser.add_argument("--email", default="admin@hospital.com", help="Admin email")
    parser.add_argument("--name", default="System Administrator", help="Admin full name")

    args = parser.parse_args()
    asyncio.run(create_or_update_admin(args.username, args.password, args.email, args.name))

if __name__ == "__main__":
    main()
