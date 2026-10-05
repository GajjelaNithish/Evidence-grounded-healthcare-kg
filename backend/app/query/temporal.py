import re
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional

def extract_temporal_filter(query: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Analyzes query text for temporal expressions.
    Returns (temporal_tag_or_cypher, human_readable_description).
    Supported patterns: latest, historical/previous, as-of-date, before, after, during/in year.
    """
    q = query.lower()
    now = datetime.now(timezone.utc)

    # 1. "latest", "most recent", "latest visit", "latest admission"
    if any(w in q for w in ("latest", "most recent", "newest", "last visit")):
        return (
            "LATEST",
            "Latest clinical visit / most recent temporal record"
        )

    # 2. "as of YYYY-MM-DD" or "as of YYYY"
    as_of_match = re.search(r"\bas\s+of\s+(\d{4}-\d{2}-\d{2}|\d{4})\b", q)
    if as_of_match:
        target_date = as_of_match.group(1)
        if len(target_date) == 4:
            target_date = f"{target_date}-12-31"
        return (
            f"AS_OF:{target_date}",
            f"As-of date {target_date}"
        )

    # 3. "before YYYY-MM-DD" or "before YYYY"
    before_match = re.search(r"\bbefore\s+(\d{4}-\d{2}-\d{2}|\d{4})\b", q)
    if before_match:
        target_date = before_match.group(1)
        if len(target_date) == 4:
            target_date = f"{target_date}-01-01"
        return (
            f"BEFORE:{target_date}",
            f"Events prior to {target_date}"
        )

    # 4. "after YYYY-MM-DD" or "after YYYY"
    after_match = re.search(r"\bafter\s+(\d{4}-\d{2}-\d{2}|\d{4})\b", q)
    if after_match:
        target_date = after_match.group(1)
        if len(target_date) == 4:
            target_date = f"{target_date}-12-31"
        return (
            f"AFTER:{target_date}",
            f"Events after {target_date}"
        )

    # 5. "current", "currently", "active", "ongoing", "presently"
    if any(w in q for w in ("current", "currently", "active", "ongoing", "presently")):
        return (
            "AND (r.valid_to IS NULL)",
            "Active / Current treatments and conditions only (valid_to is NULL)"
        )

    # 6. Explicit year extraction (e.g., "in 2024", "during 2024")
    year_match = re.search(r"\b(?:in|during|for)\s+(20\d{2})\b", q)
    if year_match:
        year = year_match.group(1)
        start_date = f"{year}-01-01"
        end_date = f"{year}-12-31"
        return (
            f"YEAR:{year}",
            f"Clinical events during year {year}"
        )

    # 7. "past 30 days", "last 30 days", "last month"
    if "30 days" in q or "last month" in q or "past month" in q:
        cutoff = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        return (
            f"AFTER:{cutoff}",
            "Past 30 days"
        )

    # 8. "past year", "last year"
    if "last year" in q or "past year" in q:
        cutoff = (now - timedelta(days=365)).strftime("%Y-%m-%d")
        return (
            f"AFTER:{cutoff}",
            "Past 1 year"
        )

    # 9. "historical", "previous", "past", "prior"
    if any(w in q for w in ("previous", "prior", "historical", "resolved")):
        return (
            "PREVIOUS",
            "Historical / Previous clinical visits and resolved conditions"
        )

    return None, None
