from datetime import datetime


def _diagnostic_text(diagnostic, *keys):
    if not isinstance(diagnostic, dict):
        return None
    for key in keys:
        value = diagnostic.get(key)
        if value:
            return str(value)
    return None


def _ai_report_text(diagnostic, fix):
    correction = _diagnostic_text(diagnostic, "recommandation", "correction", "solution", "fix")
    explanation = _diagnostic_text(diagnostic, "explication_simple", "summary", "explication", "explanation")
    user_impact = _diagnostic_text(diagnostic, "impact_utilisateur", "impact", "user_impact")
    corrected_code = _diagnostic_text(diagnostic, "code_corrige", "corrected_code", "correctedCode")
    fix_code = getattr(fix, "code_diff", None) if fix else None

    sections = []
    if correction:
        sections.append(f"Correction proposee par l IA : {correction}")
    if explanation:
        sections.append(f"Explication : {explanation}")
    if user_impact:
        sections.append(f"Impact utilisateur : {user_impact}")
    if corrected_code:
        sections.append(f"Code corrige propose par l IA : {corrected_code}")
    if fix_code and fix_code != corrected_code:
        sections.append(f"Correctif technique : {fix_code}")
    return "\n".join(sections) or "Correction IA non disponible pour cette violation."


def build_report_content(scan) -> dict:
    violations = []
    for page in scan.pages:
        for violation in page.violations:
            diagnostic = violation.diagnostic if isinstance(violation.diagnostic, dict) else {}
            fix = violation.fix[0] if violation.fix else None
            violations.append({
                "id": str(violation.id),
                "page_url": page.url,
                "rule": violation.rule,
                "impact": violation.impact,
                "message": violation.message,
                "element": violation.element,
                "source_file": getattr(violation, "source_file", None),
                "source_line": getattr(violation, "source_line", None),
                "source_column": getattr(violation, "source_column", None),
                "wcag": violation.wcag_criteria,
                "diagnostic": diagnostic or None,
                "explanation": _diagnostic_text(diagnostic, "explication_simple", "summary", "explication", "explanation"),
                "recommendation": _ai_report_text(diagnostic, fix),
                "corrected_code": _diagnostic_text(diagnostic, "code_corrige", "corrected_code", "correctedCode"),
                "fix": {"id": str(fix.id), "method": fix.method, "code_diff": fix.code_diff} if fix else None,
            })

    return {
        "site_id": str(scan.site.id),
        "site_name": scan.site.name,
        "website_url": scan.site.url,
        "scan_id": str(scan.id),
        "scan_date": (scan.started_at or datetime.utcnow()).isoformat(),
        "generated_date": datetime.utcnow().isoformat(),
        "scan_mode": scan.scan_mode,
        "score": scan.score_global,
        "pages_scanned": scan.pages_scanned or 0,
        "pages_failed": scan.pages_failed or 0,
        "total": len(violations),
        "critical": scan.violations_critical or 0,
        "serious": scan.violations_serious or 0,
        "moderate": scan.violations_moderate or 0,
        "minor": scan.violations_minor or 0,
        "violations": violations,
    }