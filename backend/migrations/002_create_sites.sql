-- Migration: 002_create_sites
-- Description: Création de la table sites

CREATE TABLE sites (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url         text NOT NULL,
    name        text,
    created_at  timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_sites_user_id ON sites(user_id);
