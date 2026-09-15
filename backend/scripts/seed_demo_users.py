import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from app.database import async_session_factory
from app.models.user import User
from app.models.assignment import DoctorPatientAssignment
from app.auth.service import get_password_hash

async def seed_users():
    users_data = [
        {
            "username": "admin",
            "email": "admin@hospital.org",
            "password": "admin123",
            "role": "admin",
            "full_name": "Chief Medical Admin",
            "clinical_patient_id": None
        },
        {
            "username": "dr_smith",
            "email": "dr_smith@hospital.org",
            "password": "doctor123",
            "role": "doctor",
            "full_name": "Dr. Sarah Smith, MD",
            "clinical_patient_id": None
        },
        {
            "username": "patient_rajesh",
            "email": "rajesh@example.com",
            "password": "patient123",
            "role": "patient",
            "full_name": "Rajesh Kumar",
            "clinical_patient_id": "1"
        }
    ]

    async with async_session_factory() as session:
        created_users = {}
        for u in users_data:
            stmt = select(User).where(User.username == u["username"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if existing:
                existing.password_hash = get_password_hash(u["password"])
                existing.role = u["role"]
                existing.email = u["email"]
                existing.full_name = u["full_name"]
                existing.clinical_patient_id = u["clinical_patient_id"]
                existing.is_active = True
                created_users[u["username"]] = existing
                print(f"Updated existing user: {u['username']} ({u['role']})")
            else:
                new_u = User(
                    username=u["username"],
                    email=u["email"],
                    password_hash=get_password_hash(u["password"]),
                    role=u["role"],
                    full_name=u["full_name"],
                    clinical_patient_id=u["clinical_patient_id"],
                    is_active=True
                )
                session.add(new_u)
                created_users[u["username"]] = new_u
                print(f"Created user: {u['username']} ({u['role']})")

        await session.commit()

        # Fetch doctor ID
        doc_stmt = select(User).where(User.username == "dr_smith")
        doc_res = await session.execute(doc_stmt)
        doc = doc_res.scalar_one_or_none()

        if doc:
            # Assign sample patients to dr_smith (e.g. 1, 2, 3, 4, 5)
            sample_pids = ["1", "2", "3", "4", "5"]
            for pid in sample_pids:
                stmt = select(DoctorPatientAssignment).where(
                    DoctorPatientAssignment.doctor_id == doc.id,
                    DoctorPatientAssignment.clinical_patient_id == pid
                )
                res = await session.execute(stmt)
                if not res.scalar_one_or_none():
                    assignment = DoctorPatientAssignment(
                        doctor_id=doc.id,
                        clinical_patient_id=pid
                    )
                    session.add(assignment)
                    print(f"Assigned patient {pid} to {doc.username}")

            await session.commit()
            print("Demo users and assignments seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_users())
