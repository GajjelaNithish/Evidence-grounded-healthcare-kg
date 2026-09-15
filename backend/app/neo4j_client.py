from typing import Optional, Any, Dict, List
import logging
from neo4j import GraphDatabase, Driver, AsyncGraphDatabase, AsyncDriver
from app.config import settings

logger = logging.getLogger(__name__)

_driver: Optional[Driver] = None
_async_driver: Optional[AsyncDriver] = None

def get_neo4j_driver() -> Driver:
    """Returns synchronous Neo4j driver singleton (used for seed & workers)."""
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(
            settings.NEO4J_URL,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )
    return _driver

def get_async_neo4j_driver() -> AsyncDriver:
    """Returns async Neo4j driver singleton (used for FastAPI endpoints)."""
    global _async_driver
    if _async_driver is None:
        _async_driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URL,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )
    return _async_driver

def close_neo4j_driver():
    """Close synchronous driver on shutdown."""
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None

async def close_async_neo4j_driver():
    """Close async driver on shutdown."""
    global _async_driver
    if _async_driver is not None:
        await _async_driver.close()
        _async_driver = None

def verify_neo4j_connectivity() -> bool:
    """Verify Neo4j connectivity synchronously."""
    try:
        driver = get_neo4j_driver()
        with driver.session() as session:
            result = session.run("RETURN 1 AS connected")
            record = result.single()
            return record is not None and record["connected"] == 1
    except Exception as e:
        logger.warning(f"Neo4j connectivity check failed: {e}")
        return False

async def verify_async_neo4j_connectivity() -> bool:
    """Verify Neo4j connectivity asynchronously."""
    try:
        driver = get_async_neo4j_driver()
        async with driver.session() as session:
            result = await session.run("RETURN 1 AS connected")
            record = await result.single()
            return record is not None and record["connected"] == 1
    except Exception as e:
        logger.warning(f"Async Neo4j connectivity check failed: {e}")
        return False

def init_neo4j_constraints():
    """Run uniqueness constraints and indices at application startup."""
    driver = get_neo4j_driver()
    constraints_and_indexes = [
        "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Patient) REQUIRE p.patient_id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Condition) REQUIRE c.normalized_name IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (t:Treatment) REQUIRE t.normalized_name IS UNIQUE",
        "CREATE INDEX IF NOT EXISTS FOR (a:AdmissionEvent) ON (a.event_id)",
        "CREATE INDEX IF NOT EXISTS FOR (d:DocumentChunk) ON (d.chunk_id)"
    ]

    with driver.session() as session:
        for stmt in constraints_and_indexes:
            try:
                session.run(stmt)
            except Exception as e:
                logger.error(f"Error applying Neo4j schema constraint: {stmt} -> {e}")
