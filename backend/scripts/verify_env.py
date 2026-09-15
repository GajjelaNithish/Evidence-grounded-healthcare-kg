import sys

modules = [
    ("FastAPI", "fastapi"),
    ("SQLAlchemy", "sqlalchemy"),
    ("Asyncpg", "asyncpg"),
    ("Neo4j", "neo4j"),
    ("Redis", "redis"),
    ("Celery", "celery"),
    ("Sentence Transformers", "sentence_transformers"),
    ("FAISS", "faiss"),
    ("PyMuPDF", "fitz"),
    ("SciSpacy", "scispacy"),
    ("Google GenAI", "google.genai"),
    ("Pydantic", "pydantic"),
    ("Alembic", "alembic"),
    ("Jose", "jose"),
    ("Passlib", "passlib"),
]

print(f"Testing Python {sys.version} imports:")
all_ok = True
for name, mod in modules:
    try:
        __import__(mod)
        print(f"  [OK] {name}")
    except Exception as e:
        print(f"  [FAIL] {name}: {e}")
        all_ok = False

if all_ok:
    print("\nSUCCESS: All dependencies are available!")
else:
    print("\nWARNING: Some dependencies failed to import.")
