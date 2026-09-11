ALTER TABLE violations ADD COLUMN IF NOT EXISTS element text;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS source_file text;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS source_line integer;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS source_column integer;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS priority text;
ALTER TABLE violations ADD COLUMN IF NOT EXISTS diagnostic jsonb;