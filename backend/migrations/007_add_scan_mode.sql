-- Migration: 007_add_scan_mode
-- Description: Ajout de la colonne scan_mode à la table scans

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS scan_mode text NOT NULL DEFAULT 'single_page';
