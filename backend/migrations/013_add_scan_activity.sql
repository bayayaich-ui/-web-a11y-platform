ALTER TABLE scans ADD COLUMN IF NOT EXISTS last_activity_at timestamp;

UPDATE scans
SET last_activity_at = COALESCE(last_activity_at, started_at)
WHERE last_activity_at IS NULL;