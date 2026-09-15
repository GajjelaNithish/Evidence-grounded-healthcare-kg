from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import List
import os

class Settings(BaseSettings):
    # PostgreSQL
    POSTGRES_URL: str = Field(
        default="postgresql+asyncpg://clinicalkg:clinicalkg_password@localhost:5432/clinicalkg",
        description="Async PostgreSQL connection URL"
    )
    POSTGRES_PASSWORD: str = Field(default="clinicalkg_password")

    # Neo4j
    NEO4J_URL: str = Field(default="bolt://localhost:7687")
    NEO4J_USER: str = Field(default="neo4j")
    NEO4J_PASSWORD: str = Field(default="clinicalkg_password")

    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # JWT Authentication
    JWT_SECRET: str = Field(default="super_secret_clinicalkg_jwt_token_key_change_in_production_32chars")
    JWT_EXPIRY_SECONDS: int = Field(default=3600)
    JWT_ALGORITHM: str = Field(default="HS256")

    # LLM Settings
    LLM_BACKEND: str = Field(default="gemini", description="'gemini' or 'ollama'")
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash", description="Configurable Gemini model name")
    GEMINI_API_KEY: str = Field(default="")
    OLLAMA_URL: str = Field(default="http://localhost:11434")
    OLLAMA_MODEL: str = Field(default="biomistral:latest")

    # Storage Paths
    UPLOAD_DIR: str = Field(default="data/uploads")
    FAISS_DIR: str = Field(default="data/faiss")
    MAX_UPLOAD_SIZE_MB: int = Field(default=10)

    # Retrieval & Evidence Fusion
    EVIDENCE_MIN_SCORE: float = Field(default=0.45, description="Deterministic gate: minimum fused score")
    GRAPH_WEIGHT: float = Field(default=0.6, description="Fusion weight alpha (0.6 graph, 0.4 document)")

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = Field(default=60)

    # Environment
    ENVIRONMENT: str = Field(default="development")
    CORS_ORIGINS: str = Field(default="http://localhost:3000,http://localhost:5173")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
