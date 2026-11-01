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

MONTHS = {
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12'
}

def parse_iso_date(raw: Optional[str]) -> Optional[str]:
    """Converts natural dates to standard ISO YYYY-MM-DD format."""
    if not raw:
        return None
    raw = raw.strip()
    m_iso = re.search(r"\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b", raw)
    if m_iso:
        return f"{int(m_iso.group(1)):04d}-{int(m_iso.group(2)):02d}-{int(m_iso.group(3)):02d}"
    m_dmy = re.search(r"\b(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})\b", raw)
    if m_dmy and m_dmy.group(2).lower() in MONTHS:
        return f"{int(m_dmy.group(3)):04d}-{MONTHS[m_dmy.group(2).lower()]}-{int(m_dmy.group(1)):02d}"
    m_mdy = re.search(r"\b([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})\b", raw)
    if m_mdy and m_mdy.group(1).lower() in MONTHS:
        return f"{int(m_mdy.group(3)):04d}-{MONTHS[m_mdy.group(1).lower()]}-{int(m_mdy.group(2)):02d}"
    m_slash = re.search(r"\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b", raw)
    if m_slash:
        a, b, y = int(m_slash.group(1)), int(m_slash.group(2)), int(m_slash.group(3))
        if a > 12:
            return f"{y:04d}-{b:02d}-{a:02d}"
        else:
            return f"{y:04d}-{a:02d}-{b:02d}"
    return None

# Known medication names and suffixes
KNOWN_MEDICATIONS = {
    "aspirin", "clopidogrel", "atorvastatin", "metoprolol", "ramipril",
    "metformin", "azithromycin", "insulin", "amoxicillin", "lisinopril",
    "levothyroxine", "paracetamol", "ibuprofen", "omeprazole", "amlodipine",
    "losartan", "pantoprazole", "warfarin", "heparin", "ceftriaxone",
    "ciprofloxacin", "furosemide", "hydrochlorothiazide", "albuterol",
    "prednisone", "gabapentin", "doxycycline", "amoxicillin-clavulanate"
}

KNOWN_CONDITIONS = {
    "acute myocardial infarction", "myocardial infarction", "heart attack",
    "type 2 diabetes mellitus", "type 2 diabetes", "diabetes mellitus", "diabetes",
    "hypertension", "high blood pressure", "hyperlipidemia", "high cholesterol",
    "sinusitis", "acute sinusitis", "asthma", "pneumonia", "bronchitis",
    "coronary artery disease", "heart failure", "atrial fibrillation",
    "fracture", "fractured arm", "appendicitis", "gastritis", "gerd",
    "chronic kidney disease", "stemi", "pulmonary oedema", "pulmonary edema"
}

KNOWN_PROCEDURES = {
    "percutaneous coronary intervention", "pci", "stent", "angioplasty",
    "coronary artery bypass graft", "cabg", "appendectomy", "cholecystectomy",
    "endoscopy", "colonoscopy", "biopsy", "intubation", "cardiac catheterization",
    "echocardiogram", "ecg", "electrocardiogram", "chest x-ray", "ct scan", "mri"
}

CONDITION_PATTERNS = [
    r"(?:diagnosed with|history of|impression:|diagnosis:|suffering from)\s+([A-Za-z0-9\s\-]{3,50}?)(?:,|\.|\band\b|\n|$)",
    r"(?:condition:|primary diagnosis:)\s*([A-Za-z0-9\s\-]{3,50}?)(?:,|\.|\n|$)",
    r"\bhas\s+([A-Za-z0-9\s\-]{3,40}?)\s+and\s+was\s+prescribed\b"
]

TREATMENT_PATTERNS = [
    r"(?:prescribed|administered|treated with|started on|underwent)\s+([A-Za-z0-9\s\-]{3,50}?)(?:,|\.|\band\b|\n|$)",
    r"(?:treatment:|procedure:|medication:)\s*([A-Za-z0-9\s\-]{3,50}?)(?:,|\.|\n|$)"
]

LAB_PATTERNS = [
    (r"\b(Troponin(?:\s+levels?)?)\b[^\d\n]*?(\d+(?:\.\d+)?)\s*(ng/mL|ng/l|ug/l)", "Troponin"),
    (r"\b(HbA1c|A1C)\b\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(%)", "HbA1c"),
    (r"\b(BP|Blood\s*Pressure)\b[^\d\n]*?(\d{2,3}/\d{2,3})\s*(mmHg)?", "Blood Pressure"),
    (r"\b(Fasting\s*Blood\s*Sugar|FBS|Blood\s*Glucose)\b\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(mg/dL|mmol/L)?", "Fasting Blood Sugar"),
    (r"\b(Serum\s*Creatinine|Creatinine)\b\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(mg/dL|umol/L)?", "Serum Creatinine"),
    (r"\b(LDL(?:\s*Cholesterol)?)\b\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(mg/dL|mmol/L)?", "LDL Cholesterol"),
    (r"\b(EF|Ejection\s*Fraction)\b\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(%)", "Ejection Fraction"),
    (r"\b(WBC)\b\s*[:=]?\s*([\d,]+(?:\.\d+)?)\s*(cells/uL|/uL|k/uL)?", "WBC"),
    (r"\b(Hb|Hemoglobin)\b\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(g/dL|g/L)?", "Hemoglobin"),
    (r"\b(Platelets)\b\s*[:=]?\s*([\d,]+(?:\.\d+)?)\s*(cells/uL|/uL)?", "Platelets"),
]

def extract_document_metadata(text: str) -> Dict[str, Any]:
    """Extracts structured patient demographics, admission details, and clinical events from document text."""
    meta: Dict[str, Any] = {}
    if not text:
        return meta

    # Patient details
    pid_m = re.search(r"Patient\s*(?:ID|#)?\s*:\s*([^\n|]+)", text, re.I)
    if pid_m:
        meta["patient_id"] = pid_m.group(1).strip()

    name_m = re.search(r"(?:Full\s*Name|Patient\s*Name)\s*:\s*([^\n|]+)", text, re.I)
    if name_m:
        meta["full_name"] = name_m.group(1).strip()

    age_m = re.search(r"Age\s*:\s*(\d+)", text, re.I)
    if age_m:
        meta["age"] = int(age_m.group(1))

    gender_m = re.search(r"Gender\s*:\s*([A-Za-z]+)", text, re.I)
    if gender_m:
        meta["gender"] = gender_m.group(1).strip()

    state_m = re.search(r"State\s*:\s*([^\n|]+)", text, re.I)
    if state_m:
        meta["state"] = state_m.group(1).strip()

    # Dates
    adm_m = re.search(r"Date\s*of\s*Admission\s*:\s*([^\n|]+)", text, re.I)
    if adm_m:
        meta["admission_date"] = parse_iso_date(adm_m.group(1))

    dis_m = re.search(r"Date\s*of\s*Discharge\s*:\s*([^\n|]+)", text, re.I)
    if dis_m:
        meta["discharge_date"] = parse_iso_date(dis_m.group(1))

    los_m = re.search(r"Length\s*of\s*Stay\s*:\s*(\d+)", text, re.I)
    if los_m:
        meta["length_of_stay"] = int(los_m.group(1))

    doc_date_m = re.search(r"\bDate\s*:\s*([^\n|]+)", text, re.I)
    if doc_date_m:
        meta["document_date"] = parse_iso_date(doc_date_m.group(1))

    return meta

def extract_clinical_entities(text: str) -> List[Dict[str, Any]]:
    """
    Extracts rich clinical entities (Conditions, Treatments, Procedures, Observations)
    using SciSpacy NER and comprehensive clinical regex & domain dictionaries.
    """
    if not text or not text.strip():
        return []

    entities: List[Dict[str, Any]] = []
    seen_normalized = set()
    doc_meta = extract_document_metadata(text)
    default_date = doc_meta.get("admission_date") or doc_meta.get("document_date")

    def _add_entity(raw_text: str, category: str, confidence: float = 0.95, **kwargs):
        clean_name = raw_text.strip().rstrip(".,;:- ")
        norm = clean_name.lower()
        if len(norm) < 3 or norm in ("patient", "history", "examination", "normal", "clinical", "department", "hospital"):
            return
        if norm not in seen_normalized:
            seen_normalized.add(norm)
            ent = {
                "text": clean_name,
                "normalized_name": norm,
                "category": category,
                "confidence": confidence,
                "valid_from": kwargs.get("valid_from") or default_date,
                "valid_to": kwargs.get("valid_to"),
                "status": kwargs.get("status", "active"),
                **kwargs
            }
            entities.append(ent)

    # 1. Structured section extractions: PRIMARY DIAGNOSIS
    prim_diag_match = re.search(r"(?:PRIMARY\s+DIAGNOSIS|CHIEF\s+DIAGNOSIS)\s*[:\n]\s*([^\n]+)", text, re.I)
    if prim_diag_match:
        diag = prim_diag_match.group(1).strip()
        # Clean trailing parentheses if any (e.g. "Acute Myocardial Infarction (Heart Attack)")
        base_diag = re.sub(r"\s*\([^)]*\)", "", diag).strip()
        _add_entity(base_diag or diag, "Condition", confidence=0.98, valid_from=default_date, status="active")

    # 2. Structured section extractions: SECONDARY DIAGNOSES
    sec_diag_match = re.search(r"SECONDARY\s+DIAGNOS(?:ES|IS)\s*[:\n]([\s\S]*?)(?=(?:INVESTIGATIONS|TREATMENT|LABS|MEDICATIONS|CLINICAL|$))", text, re.I)
    if sec_diag_match:
        sec_block = sec_diag_match.group(1)
        for line in sec_block.split("\n"):
            line = line.strip()
            if not line:
                continue
            # Strip numbering like "1. ", "2. "
            cleaned_line = re.sub(r"^\d+[\.\)]\s*", "", line)
            # Split before hyphens or colons with labs (e.g. "Type 2 Diabetes Mellitus - HbA1c: 8.1%")
            main_cond = re.split(r"[-–—:]", cleaned_line)[0].strip()
            if len(main_cond) >= 3:
                _add_entity(main_cond, "Condition", confidence=0.95, valid_from=default_date, status="active")

    # 3. Rule-based regex for Conditions
    for pattern in CONDITION_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            raw = match.group(1).strip()
            if len(raw) >= 3:
                _add_entity(raw, "Condition", confidence=0.95, valid_from=default_date)

    # 4. Known conditions direct dictionary match
    for cond in KNOWN_CONDITIONS:
        if re.search(r"\b" + re.escape(cond) + r"\b", text, re.IGNORECASE):
            _add_entity(cond.title(), "Condition", confidence=0.95, valid_from=default_date)

    # 5. Medications extraction (with dosage and frequency parsing)
    # Match lines like "1. Aspirin 325mg loading dose, then 75mg daily" or "Aspirin 75mg once daily"
    med_line_pattern = re.compile(
        r"(?:^|\n)\s*(?:\d+[\.\)]\s*)?([A-Za-z]{3,25})\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|units))\b([^\n]*)",
        re.IGNORECASE
    )
    for m in med_line_pattern.finditer(text):
        drug_name = m.group(1).strip()
        dosage = m.group(2).strip()
        extra = m.group(3).strip()
        
        # Check if drug name matches known medication or medication suffixes
        norm_drug = drug_name.lower()
        is_med = (
            norm_drug in KNOWN_MEDICATIONS or
            any(norm_drug.endswith(suf) for suf in ("pril", "statin", "olol", "sartan", "mycin", "cillin", "zole", "pine", "mide", "ide", "one", "line"))
        )
        if is_med:
            freq = "daily"
            if "twice daily" in extra.lower() or "bid" in extra.lower():
                freq = "twice daily"
            elif "once daily" in extra.lower():
                freq = "once daily"
            elif "night" in extra.lower():
                freq = "at night"

            _add_entity(
                drug_name.capitalize(),
                "Treatment",
                confidence=0.98,
                treatment_type="medication",
                dosage=dosage,
                frequency=freq,
                valid_from=default_date,
                status="active"
            )

    # 6. Rule-based regex for Treatments
    for pattern in TREATMENT_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            raw = match.group(1).strip()
            if len(raw) >= 3:
                # If it's a known procedure, categorize as Treatment (treatment_type='procedure')
                norm = raw.lower()
                is_proc = any(p in norm for p in KNOWN_PROCEDURES)
                _add_entity(
                    raw,
                    "Treatment",
                    confidence=0.95,
                    treatment_type="procedure" if is_proc else "treatment",
                    valid_from=default_date
                )

    # 7. Known Procedures direct dictionary match
    for proc in KNOWN_PROCEDURES:
        if re.search(r"\b" + re.escape(proc) + r"\b", text, re.IGNORECASE):
            _add_entity(
                proc.title(),
                "Treatment",
                confidence=0.95,
                treatment_type="procedure",
                valid_from=default_date
            )

    # 8. Laboratory & Investigation Results
    for pat, label in LAB_PATTERNS:
        for m in re.finditer(pat, text, re.IGNORECASE):
            val = m.group(2)
            unit = m.group(3) if len(m.groups()) >= 3 and m.group(3) else ""
            obs_name = f"{label}: {val} {unit}".strip()
            _add_entity(
                obs_name,
                "Observation",
                confidence=0.95,
                test_name=label,
                value=val,
                unit=unit,
                valid_from=default_date
            )

    # 9. Run SciSpacy NER for any remaining biomedical entities
    nlp = get_clinical_nlp()
    doc = nlp(text)

    for ent in doc.ents:
        ent_text = ent.text.strip()
        norm = ent_text.lower()
        if len(norm) < 3 or norm in seen_normalized:
            continue
        if norm in ("patient", "history", "examination", "normal", "clinical", "department", "hospital", "synthetic record"):
            continue

        # Classify based on clinical dictionary or keywords
        if any(c in norm for c in ("infarction", "diabetes", "hypertension", "sinusitis", "asthma", "pneumonia", "syndrome", "fracture", "disease", "disorder", "infection")):
            _add_entity(ent_text, "Condition", confidence=0.88, valid_from=default_date)
        elif any(m in norm for m in KNOWN_MEDICATIONS) or any(norm.endswith(suf) for suf in ("pril", "statin", "olol", "sartan", "mycin", "cillin")):
            _add_entity(ent_text, "Treatment", confidence=0.88, treatment_type="medication", valid_from=default_date)
        elif any(p in norm for p in KNOWN_PROCEDURES):
            _add_entity(ent_text, "Treatment", confidence=0.88, treatment_type="procedure", valid_from=default_date)
        else:
            # Add general biomedical entity
            _add_entity(ent_text, "BiomedicalEntity", confidence=0.80, valid_from=default_date)

    return entities
