-- Migration: 001_create_users
-- Description: Création de la table users

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email       text NOT NULL UNIQUE,
    name        text,
    created_at  timestamp NOT NULL DEFAULT now()
);
