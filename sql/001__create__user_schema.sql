-- Migration: 001__create__user_schema.sql

-- UP Migration
BEGIN;

CREATE TYPE IF NOT EXISTS s901.user_role AS ENUM ('admin', 'user');
CREATE TYPE IF NOT EXISTS s901.auth_provider AS ENUM ('local', 'cognito');

CREATE TABLE IF NOT EXISTS s901.users (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    auth_provider s901.auth_provider NOT NULL,
    cognito_sub TEXT,
    role s901.user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT s901.get_brisbane_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT s901.get_brisbane_timestamp(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- No role table, just admin and user for simplicity as this is not actual focus of this application

CREATE INDEX IF NOT EXISTS idx_s901_users_username ON s901.users(username);
CREATE INDEX IF NOT EXISTS idx_s901_users_email ON s901.users(email);
CREATE INDEX IF NOT EXISTS idx_s901_users_created_at ON s901.users(created_at);
CREATE INDEX IF NOT EXISTS idx_s901_users_updated_at ON s901.users(updated_at);
CREATE INDEX IF NOT EXISTS idx_s901_users_is_deleted ON s901.users(is_deleted);
CREATE INDEX IF NOT EXISTS idx_s901_users_cognito_sub ON s901.users(cognito_sub);

CREATE OR REPLACE TRIGGER update_s901_users_updated_at 
    BEFORE UPDATE ON s901.users
    FOR EACH ROW EXECUTE FUNCTION s901.update_updated_at_column();

COMMIT;

-- DOWN Migration
-- BEGIN;
-- DROP TABLE IF EXISTS s901.users;
-- DROP INDEX IF EXISTS idx_s901_users_username;
-- DROP INDEX IF EXISTS idx_s901_users_email;
-- DROP INDEX IF EXISTS idx_s901_users_created_at;
-- DROP INDEX IF EXISTS idx_s901_users_updated_at;
-- DROP INDEX IF EXISTS idx_s901_users_is_deleted;
-- DROP INDEX IF EXISTS idx_s901_users_cognito_sub;
-- COMMIT;