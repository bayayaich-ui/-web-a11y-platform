-- Migration: 005_create_violations
-- Description: Création de la table violations (coeur de la donnée - une ligne par problème détecté)

CREATE TABLE violations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    rule            text NOT NULL,             -- ex: 'color-contrast'
    wcag_criteria   text[],                    -- ex: ['1.4.3']
    impact          text NOT NULL
                    CHECK (impact IN ('critical', 'serious', 'moderate', 'minor')),
    element         text,                      -- ex: '.btn-primary'
    message         text,
    source_file     text,
    source_line     integer,
    source_column   integer,
    priority        text,
    diagnostic      jsonb,
    details         jsonb,                     -- ex: { "ratio": 2.1, "required": 4.5 }
    created_at      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_violations_page_id ON violations(page_id);
CREATE INDEX idx_violations_rule ON violations(rule);
CREATE INDEX idx_violations_impact ON violations(impact);
CREATE INDEX idx_violations_wcag_criteria ON violations USING GIN (wcag_criteria);
CREATE INDEX idx_violations_details ON violations USING GIN (details);
