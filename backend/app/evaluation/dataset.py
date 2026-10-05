from typing import List, Dict, Any

EVALUATION_DATASET: List[Dict[str, Any]] = [
    {
        "id": "eval-001",
        "question": "What is the patient's latest condition?",
        "intent": "LATEST",
        "domain": "Condition",
        "expected_keywords": ["latest", "condition", "diagnosis", "active"],
        "description": "Evaluates latest-event temporal KG condition retrieval."
    },
    {
        "id": "eval-002",
        "question": "What condition did the patient have in 2024?",
        "intent": "YEAR:2024",
        "domain": "Condition",
        "expected_keywords": ["2024", "hypertension", "diabetes", "condition"],
        "description": "Evaluates explicit year temporal filtering."
    },
    {
        "id": "eval-003",
        "question": "What treatment was given during the latest visit?",
        "intent": "LATEST",
        "domain": "Treatment",
        "expected_keywords": ["treatment", "procedure", "latest", "visit"],
        "description": "Evaluates latest visit treatment extraction."
    },
    {
        "id": "eval-004",
        "question": "What medication was prescribed during the previous visit?",
        "intent": "PREVIOUS",
        "domain": "Treatment",
        "expected_keywords": ["medication", "prescribed", "previous", "aspirin", "metformin"],
        "description": "Evaluates relative historical encounter retrieval."
    },
    {
        "id": "eval-005",
        "question": "What happened after the previous admission?",
        "intent": "PREVIOUS",
        "domain": "AdmissionEvent",
        "expected_keywords": ["admission", "discharge", "outcome", "hospital"],
        "description": "Evaluates admission sequence and outcome tracking."
    }
]
