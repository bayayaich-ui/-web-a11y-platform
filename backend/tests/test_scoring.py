from app.services.scoring import compute_score_from_counters, compute_score_from_scan


def test_score_no_violations_is_100():
    assert compute_score_from_counters(0, 0, 0, 0) == 100


def test_score_some_violations():
    # moderate=2 -> penalty 2 => 98
    assert compute_score_from_counters(0, 0, 2, 0) == 98
    # serious=1 -> penalty 3 => 97
    assert compute_score_from_counters(0, 1, 0, 0) == 97
    # critical=1, moderate=2 -> penalty 5+2=7 => 93
    assert compute_score_from_counters(1, 0, 2, 0) == 93


def test_score_clamps_to_zero():
    # many criticals -> penalty > 100
    assert compute_score_from_counters(100, 0, 0, 0) == 0


def test_compute_score_from_scan_object_like():
    class FakeScan:
        def __init__(self):
            self.violations_critical = 0
            self.violations_serious = 2
            self.violations_moderate = 1
            self.violations_minor = 0

    scan = FakeScan()
    assert compute_score_from_scan(scan) == compute_score_from_counters(0, 2, 1, 0)


def test_enis_contact_single_page_score_is_87():
    # Exact live regression from the ENIS contact page: 1 critical, 2 serious, 2 moderate
    score = compute_score_from_counters(
        violations_critical=1,
        violations_serious=2,
        violations_moderate=2,
        violations_minor=0,
    )

    assert score == 87
