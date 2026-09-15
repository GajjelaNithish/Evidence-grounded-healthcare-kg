import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
import redis.asyncio as aioredis

from app.config import settings
from app.database import engine, create_tables
from app.neo4j_client import (
    verify_async_neo4j_connectivity,
    close_neo4j_driver,
    close_async_neo4j_driver,
    init_neo4j_constraints
)
from app.auth.router import router as auth_router
from app.documents.router import router as documents_router
from app.query.router import router as query_router
from app.kg.router import router as kg_router
from app.admin.router import router as admin_router


# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "development" else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("clinickg")

# Setup rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Starting ClinicalKG API...")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.FAISS_DIR, exist_ok=True)
    
    # Try creating tables if PostgreSQL is available
    try:
        await create_tables()
        logger.info("PostgreSQL database tables initialized.")
    except Exception as e:
        logger.warning(f"Could not connect to PostgreSQL on startup: {e}")

    # Try applying Neo4j schema constraints if Neo4j is available
    try:
        init_neo4j_constraints()
        logger.info("Neo4j constraints and indices initialized.")
    except Exception as e:
        logger.warning(f"Could not connect to Neo4j on startup: {e}")

    yield

    # Shutdown actions
    logger.info("Shutting down ClinicalKG API...")
    close_neo4j_driver()
    await close_async_neo4j_driver()
    await engine.dispose()

app = FastAPI(
    title="ClinicalKG — Evidence-Grounded Patient Knowledge Graph Portal",
    version="1.0.0",
    description="Patient-centric clinical knowledge graph portal featuring hybrid RAG, temporal reasoning, and RBAC.",
    lifespan=lifespan
)

# Attach state and exception handler for rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(query_router, prefix="/api")
app.include_router(kg_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

# System Health Check endpoint
@app.get("/api/health", tags=["System"])
async def health_check():
    """Returns the operational status of all backing services."""
    pg_ok = False
    neo4j_ok = False
    redis_ok = False

    # Check PostgreSQL
    try:
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT 1"))
            val = res.scalar()
            pg_ok = (val == 1)
    except Exception as e:
        logger.debug(f"PostgreSQL health check failed: {e}")

    # Check Neo4j
    try:
        neo4j_ok = await verify_async_neo4j_connectivity()
    except Exception as e:
        logger.debug(f"Neo4j health check failed: {e}")

    # Check Redis
    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        ping_res = await r.ping()
        redis_ok = (ping_res is True)
        await r.close()
    except Exception as e:
        logger.debug(f"Redis health check failed: {e}")

    overall_status = "ok" if (pg_ok and neo4j_ok and redis_ok) else "degraded"
    return {
        "status": overall_status,
        "postgres": pg_ok,
        "neo4j": neo4j_ok,
        "redis": redis_ok
    }
