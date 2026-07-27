-- Scores de conformité et compteurs sur la table scans
ALTER TABLE scans ADD COLUMN max_depth INTEGER;
ALTER TABLE scans ADD COLUMN pages_scanned INTEGER DEFAULT 0;
ALTER TABLE scans ADD COLUMN score_global NUMERIC(5,2);
ALTER TABLE scans ADD COLUMN score_perceivable NUMERIC(5,2);
ALTER TABLE scans ADD COLUMN score_operable NUMERIC(5,2);
ALTER TABLE scans ADD COLUMN score_understandable NUMERIC(5,2);
ALTER TABLE scans ADD COLUMN score_robust NUMERIC(5,2);
ALTER TABLE scans ADD COLUMN violations_critical INTEGER DEFAULT 0;
ALTER TABLE scans ADD COLUMN violations_serious INTEGER DEFAULT 0;
ALTER TABLE scans ADD COLUMN violations_moderate INTEGER DEFAULT 0;
ALTER TABLE scans ADD COLUMN violations_minor INTEGER DEFAULT 0;

-- Diagnostic IA et priorité sur la table violations
ALTER TABLE violations ADD COLUMN element TEXT;
ALTER TABLE violations ADD COLUMN message TEXT;
ALTER TABLE violations ADD COLUMN priority TEXT;
ALTER TABLE violations ADD COLUMN diagnostic JSON;