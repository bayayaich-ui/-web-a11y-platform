-- Migration: 003_create_scans
-- Description: Création de la table scans

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
