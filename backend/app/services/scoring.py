from decimal import Decimal


def compute_score_from_counters(
    violations_critical: int = 0,
    violations_serious: int = 0,
    violations_moderate: int = 0,
    violations_minor: int = 0,
) -> int:
    penalties = (
        (violations_critical or 0) * 5
        + (violations_serious or 0) * 3
        + (violations_moderate or 0)
        + (violations_minor or 0)
    )
    return max(0, min(100, int(Decimal(100) - Decimal(penalties))))


def compute_score_from_scan(scan) -> int:
    """Return a bounded 0-100 score from persisted violation counters."""
    return compute_score_from_counters(
        violations_critical=getattr(scan, 'violations_critical', 0),
        violations_serious=getattr(scan, 'violations_serious', 0),
        violations_moderate=getattr(scan, 'violations_moderate', 0),
        violations_minor=getattr(scan, 'violations_minor', 0),
    )
