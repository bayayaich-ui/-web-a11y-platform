ALTER TABLE scans ADD COLUMN IF NOT EXISTS pages_failed integer NOT NULL DEFAULT 0;
ALTER TABLE scans DROP CONSTRAINT IF EXISTS scans_status_check;
ALTER TABLE scans ADD CONSTRAINT scans_status_check
	CHECK (status IN ('pending', 'running', 'completed', 'completed_with_errors', 'failed'));