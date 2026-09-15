import logging
from typing import Optional
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

class LLMClient:
    def __init__(self):
        self.backend = settings.LLM_BACKEND.lower()
        self.gemini_model = settings.GEMINI_MODEL
        self.ollama_url = settings.OLLAMA_URL
        self.ollama_model = settings.OLLAMA_MODEL
        self._gemini_client = None

        if self.backend == "gemini":
            try:
                from google import genai
                if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
                    self._gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                else:
                    logger.warning("GEMINI_API_KEY is not set. Gemini calls will fail until configured.")
            except ImportError:
                logger.error("google-genai package not installed.")

    async def generate_response(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Generates grounded clinical response using Gemini or Ollama."""
        if self.backend == "gemini":
            return await self._generate_gemini(prompt, system_instruction)
        elif self.backend == "ollama":
            return await self._generate_ollama(prompt, system_instruction)
        else:
            raise ValueError(f"Unsupported LLM_BACKEND: {self.backend}")

    async def _generate_gemini(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        if not self._gemini_client:
            from google import genai
            if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here":
                self._gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            else:
                return (
                    "ClinicalKG LLM Notice: GEMINI_API_KEY is not configured in .env. "
                    "Please provide a valid Gemini API key to enable clinical synthesis."
                )

        from google.genai import types

        config = types.GenerateContentConfig(
            temperature=0.1,  # Low temperature for clinical factuality
            max_output_tokens=1500,
            system_instruction=system_instruction or (
                "You are ClinicalKG, an evidence-grounded clinical decision-support assistant. "
                "You MUST answer strictly using the provided structured graph and document evidence. "
                "Never extrapolate or hallucinate clinical claims. If evidence is lacking, state so explicitly."
            )
        )

        try:
            # Synchronous genai call wrapped in async executor or direct call
            response = self._gemini_client.models.generate_content(
                model=self.gemini_model,
                contents=prompt,
                config=config
            )
            return response.text or ""
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            raise RuntimeError(f"Gemini API request failed: {e}")

    async def _generate_ollama(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        url = f"{self.ollama_url.rstrip('/')}/api/generate"
        full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt

        payload = {
            "model": self.ollama_model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,
            }
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                res = await client.post(url, json=payload)
                res.raise_for_status()
                data = res.json()
                return data.get("response", "")
            except Exception as e:
                logger.error(f"Ollama generation error: {e}")
                raise RuntimeError(f"Ollama request failed at {url}: {e}")

_llm_client_instance: Optional[LLMClient] = None

def get_llm_client() -> LLMClient:
    global _llm_client_instance
    if _llm_client_instance is None:
        _llm_client_instance = LLMClient()
    return _llm_client_instance
