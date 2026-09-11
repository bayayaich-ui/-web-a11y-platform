from types import SimpleNamespace
from uuid import uuid4

from app.services.report_service import build_report_content


def test_report_keeps_each_ai_correction_with_its_violation():
    first = SimpleNamespace(
        id=uuid4(),
        rule="image-alt",
        impact="serious",
        message="Missing alternative text",
        element="<img>",
        wcag_criteria=["1.1.1"],
        diagnostic={
            "explication_simple": "The image has no accessible name.",
            "recommandation": "Add a meaningful alt attribute.",
            "code_corrige": '<img alt="Company logo">',
        },
        fix=[],
    )
    second = SimpleNamespace(
        id=uuid4(),
        rule="color-contrast",
        impact="critical",
        message="Insufficient contrast",
        element="<button>",
        wcag_criteria=["1.4.3"],
        diagnostic={
            "explication_simple": "The text contrast is too low.",
            "recommandation": "Increase the foreground/background contrast.",
            "code_corrige": "color: #000; background: #fff;",
        },
        fix=[],
    )
    page = SimpleNamespace(url="https://example.test", violations=[first, second])
    scan = SimpleNamespace(
        id=uuid4(),
        site=SimpleNamespace(id=uuid4(), name="Example", url="https://example.test"),
        pages=[page],
        score_global=82,
        pages_scanned=1,
        pages_failed=0,
        scan_mode="single_page",
        started_at=None,
        violations_critical=1,
        violations_serious=1,
        violations_moderate=0,
        violations_minor=0,
    )

    content = build_report_content(scan)

    assert [item["rule"] for item in content["violations"]] == ["image-alt", "color-contrast"]
    assert "alt attribute" in content["violations"][0]["recommendation"]
    assert "contrast" in content["violations"][1]["recommendation"]
    assert "Company logo" in content["violations"][0]["recommendation"]
    assert "#000" in content["violations"][1]["recommendation"]


def test_report_keeps_violation_without_ai_correction():
    violation = SimpleNamespace(
        id=uuid4(),
        rule="region",
        impact="moderate",
        message="Missing landmark",
        element="<div>",
        wcag_criteria=[],
        diagnostic=None,
        fix=[],
    )
    scan = SimpleNamespace(
        id=uuid4(),
        site=SimpleNamespace(id=uuid4(), name="Example", url="https://example.test"),
        pages=[SimpleNamespace(url="https://example.test", violations=[violation])],
        score_global=99,
        pages_scanned=1,
        pages_failed=0,
        scan_mode="single_page",
        started_at=None,
        violations_critical=0,
        violations_serious=0,
        violations_moderate=1,
        violations_minor=0,
    )

    content = build_report_content(scan)

    assert len(content["violations"]) == 1
    assert content["violations"][0]["recommendation"] == "Correction IA non disponible pour cette violation."
