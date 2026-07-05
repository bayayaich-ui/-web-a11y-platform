-- Migration: 006_create_fixes
-- Description: Création de la table fixes

CREATE TABLE fixes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_id    uuid NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
    method          text NOT NULL
                    CHECK (method IN ('widget_patch', 'pull_request')),
    code_diff       text,
    applied_at      timestamp,
    status          text NOT NULL DEFAULT 'suggested'
                    CHECK (status IN ('suggested', 'applied', 'rejected'))
);

CREATE INDEX idx_fixes_violation_id ON fixes(violation_id);
CREATE INDEX idx_fixes_status ON fixes(status);
