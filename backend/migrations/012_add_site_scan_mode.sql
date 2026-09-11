-- Persist the scan mode on the site, independently from scan history.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS scan_mode text NOT NULL DEFAULT 'single_page';

-- Preserve the mode selected by existing sites from their most recent scan.
UPDATE sites AS s
SET scan_mode = latest.scan_mode
FROM (
    SELECT DISTINCT ON (site_id) site_id, scan_mode
    FROM scans
    WHERE scan_mode IN ('single_page', 'full_site')
    ORDER BY site_id, started_at DESC NULLS LAST
) AS latest
WHERE s.id = latest.site_id;

ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_scan_mode_check;
ALTER TABLE sites ADD CONSTRAINT sites_scan_mode_check CHECK (scan_mode IN ('single_page', 'full_site'));