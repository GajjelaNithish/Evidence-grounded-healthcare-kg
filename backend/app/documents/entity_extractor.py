import re
import logging
from typing import List, Dict, Any, Optional
import spacy

logger = logging.getLogger(__name__)

_nlp = None

def get_clinical_nlp():
    """Singleton: loads SciSpacy en_core_sci_sm model."""
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_sci_sm")
            logger.info("Loaded SciSpacy en_core_sci_sm model.")
        except Exception as e:
            logger.warning(f"Could not load en_core_sci_sm: {e}. Falling back to standard spacy blank pipeline.")
            _nlp = spacy.blank("en")
    return _nlp

# Clinical regex patterns
CONDITION_PATTERNS = [
    r"(?:diagnosed with|history of|impression:|diagnosis:|suffering from)\s+([A-Za-z0-9\s\-]{3,40}?)(?:,|\.|\band\b|\n|$)",
    r"(?:condition:|primary diagnosis:)\s*([A-Za-z0-9\s\-]{3,40}?)(?:,|\.|\n|$)"
]

TREATMENT_PATTERNS = [
    r"(?:prescribed|administered|treated with|started on|underwent)\s+([A-Za-z0-9\s\-]{3,40}?)(?:,|\.|\band\b|\n|$)",
    r"(?:treatment:|procedure:|medication:)\s*([A-Za-z0-9\s\-]{3,40}?)(?:,|\.|\n|$)"
]

DOSAGE_PATTERN = re.compile(r"\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units|mg/dl)\b", re.IGNORECASE)
DATE_PATTERN = re.compile(r"\b(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b")

def extract_clinical_entities(text: str) -> List[Dict[str, Any]]:
    """
    Extracts clinical entities (Conditions, Treatments, Observations)
    using SciSpacy NER and rule-based regex patterns.
    """
    if not text or not text.strip():
        return []

    entities = []
    seen_normalized = set()

    # 1. Run SciSpacy NER
    nlp = get_clinical_nlp()
    doc = nlp(text)

    for ent in doc.ents:
        ent_text = ent.text.strip()
        if len(ent_text) < 3 or ent_text.lower() in ("patient", "history", "examination", "normal", "clinical"):
            continue

        norm = ent_text.lower()
        if norm not in seen_normalized:
            seen_normalized.add(norm)
            entities.append({
                "text": ent_text,
                "normalized_name": norm,
                "category": "BiomedicalEntity",
                "confidence": 0.85,
                "start": ent.start_char,
                "end": ent.end_char
            })

    # 2. Rule-based regex for Conditions
    for pattern in CONDITION_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            raw = match.group(1).strip()
            if len(raw) >= 3:
                norm = raw.lower()
                if norm not in seen_normalized:
                    seen_normalized.add(norm)
                    entities.append({
                        "text": raw,
                        "normalized_name": norm,
                        "category": "Condition",
                        "confidence": 0.95,
                        "start": match.start(1),
                        "end": match.end(1)
                    })

    # 3. Rule-based regex for Treatments
    for pattern in TREATMENT_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            raw = match.group(1).strip()
            if len(raw) >= 3:
                norm = raw.lower()
                if norm not in seen_normalized:
                    seen_normalized.add(norm)
                    entities.append({
                        "text": raw,
                        "normalized_name": norm,
                        "category": "Treatment",
                        "confidence": 0.95,
                        "start": match.start(1),
                        "end": match.end(1)
                    })

    return entities
