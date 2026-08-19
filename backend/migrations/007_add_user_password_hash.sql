-- Migration: 007_add_user_password_hash
-- Description: Ajout du stockage du hash de mot de passe pour l'authentification

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;