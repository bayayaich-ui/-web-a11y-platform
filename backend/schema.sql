-- ============================================================
-- Web Accessibility Platform (WAP) - Schéma PostgreSQL
-- ============================================================

-- Extension nécessaire pour la génération d'UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Table: users
-- ============================================================
CREATE TABLE users (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email       text NOT NULL UNIQUE,
    name        text,
    password_hash text,
    created_at  timestamp NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: sites
-- ============================================================
CREATE TABLE sites (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url         text NOT NULL,
    name        text,
    created_at  timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_sites_user_id ON sites(user_id);

-- ============================================================
-- Table: scans
-- ============================================================
CREATE TABLE scans (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    max_pages   int,
    started_at  timestamp,
    finished_at timestamp
);

CREATE INDEX idx_scans_site_id ON scans(site_id);
CREATE INDEX idx_scans_status ON scans(status);

-- ============================================================
-- Table: pages (une ligne par page visitée pendant un scan)
-- ============================================================
CREATE TABLE pages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id         uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    url             text NOT NULL,
    screenshot_url  text,  -- pointe vers S3, ex: s3://bucket/scan_id/page.png
    scanned_at      timestamp,
    status          text NOT NULL DEFAULT 'success'
                    CHECK (status IN ('success', 'timeout', 'error'))
);

CREATE INDEX idx_pages_scan_id ON pages(scan_id);
CREATE INDEX idx_pages_status ON pages(status);

-- ============================================================
-- Table: violations (le coeur de la donnée - une ligne par problème détecté)
-- ============================================================
CREATE TABLE violations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    rule            text NOT NULL,             -- ex: 'color-contrast'
    wcag_criteria   text[],                    -- ex: ['1.4.3']
    impact          text NOT NULL
                    CHECK (impact IN ('critical', 'serious', 'moderate', 'minor')),
    selector        text,                      -- ex: '.btn-primary'
    details         jsonb,                     -- ex: { "ratio": 2.1, "required": 4.5 }
    created_at      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_violations_page_id ON violations(page_id);
CREATE INDEX idx_violations_rule ON violations(rule);
CREATE INDEX idx_violations_impact ON violations(impact);
CREATE INDEX idx_violations_wcag_criteria ON violations USING GIN (wcag_criteria);
CREATE INDEX idx_violations_details ON violations USING GIN (details);

-- ============================================================
-- Table: fixes
-- ============================================================
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

-- ============================================================
-- Fin du script
-- ============================================================
