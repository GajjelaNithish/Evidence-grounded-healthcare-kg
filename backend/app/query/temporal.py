import re
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional

def extract_temporal_filter(query: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Analyzes query text for temporal expressions.
    Returns (cypher_where_fragment, human_readable_description).
    """
    q = query.lower()
    now = datetime.now(timezone.utc)

    # 1. "current", "currently", "active", "ongoing"
    if any(w in q for w in ("current", "currently", "active", "ongoing", "presently")):
        return (
            "AND (r.valid_to IS NULL)",
            "Active / Current treatments and conditions only (valid_to is NULL)"
        )

    # 2. "past 30 days", "last 30 days", "last month"
    if "30 days" in q or "last month" in q or "past month" in q:
        cutoff = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        return (
            f"AND (r.valid_from >= date('{cutoff}') OR ae.admission_date >= date('{cutoff}'))",
            "Past 30 days"
        )

    # 3. "past year", "last year", "365 days"
    if "last year" in q or "past year" in q:
        cutoff = (now - timedelta(days=365)).strftime("%Y-%m-%d")
        return (
            f"AND (r.valid_from >= date('{cutoff}') OR ae.admission_date >= date('{cutoff}'))",
            "Past 1 year"
        )

    # 4. Explicit year extraction (e.g., "in 2023", "during 2022")
    year_match = re.search(r"\b(?:in|during|for)\s+(20\d{2})\b", q)
    if year_match:
        year = year_match.group(1)
        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31"
        return (
            f"AND ((r.valid_from >= date('{start_date}') AND r.valid_from <= date('{end_date}')) "
            f"OR (ae.admission_date >= date('{start_date}') AND ae.admission_date <= date('{end_date}')))",
            f"Year {year}"
        )

    # 5. "historical", "previous", "past", "prior"
    if any(w in q for w in ("previous", "prior", "historical", "resolved")):
        return (
            "AND (r.valid_to IS NOT NULL)",
            "Historical / Resolved conditions and treatments"
        )

    return None, None
