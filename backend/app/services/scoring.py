from decimal import Decimal


def compute_score_from_scan(scan) -> int:
    """Return a bounded 0-100 score from the persisted violation counters."""
    penalties = (
        (getattr(scan, 'violations_critical', 0) or 0) * 10
        + (getattr(scan, 'violations_serious', 0) or 0) * 5
        + (getattr(scan, 'violations_moderate', 0) or 0) * 2
        + (getattr(scan, 'violations_minor', 0) or 0)
    )
    return max(0, min(100, int(Decimal(100) - Decimal(penalties))))
