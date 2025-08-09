-- Migration: 001__create__user_schema.sql

-- UP Migration
BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT get_brisbane_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT get_brisbane_timestamp(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);
CREATE INDEX IF NOT EXISTS idx_users_is_deleted ON users(is_deleted);

CREATE OR REPLACE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- DOWN Migration
-- BEGIN;
-- DROP TABLE IF EXISTS users;
-- DROP INDEX IF EXISTS idx_users_username;
-- DROP INDEX IF EXISTS idx_users_email;
-- DROP INDEX IF EXISTS idx_users_created_at;
-- DROP INDEX IF EXISTS idx_users_updated_at;
-- DROP INDEX IF EXISTS idx_users_is_deleted;
-- COMMIT;