-- Migration: 004_create_pages
-- Description: Création de la table pages (une ligne par page visitée pendant un scan)

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
