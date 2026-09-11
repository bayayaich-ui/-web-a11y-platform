CREATE TABLE reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id uuid NOT NULL UNIQUE REFERENCES scans(id) ON DELETE CASCADE,
    pdf_path text NOT NULL,
    content jsonb NOT NULL,
    generated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_generated_at ON reports(generated_at DESC);