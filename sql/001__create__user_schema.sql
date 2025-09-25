-- Migration: 001__create__user_schema.sql

-- UP Migration
BEGIN;

CREATE TYPE IF NOT EXISTS n11562773_video_app.user_role AS ENUM ('admin', 'user');
CREATE TYPE IF NOT EXISTS n11562773_video_app.auth_provider AS ENUM ('local', 'cognito');

CREATE TABLE IF NOT EXISTS n11562773_video_app.users (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    auth_provider n11562773_video_app.auth_provider NOT NULL,
    cognito_sub TEXT,
    role n11562773_video_app.user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT n11562773_video_app.get_brisbane_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT n11562773_video_app.get_brisbane_timestamp(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- No role table, just admin and user for simplicity as this is not actual focus of this application

CREATE INDEX IF NOT EXISTS idx_n11562773_video_app_users_username ON n11562773_video_app.users(username);
CREATE INDEX IF NOT EXISTS idx_n11562773_video_app_users_email ON n11562773_video_app.users(email);
CREATE INDEX IF NOT EXISTS idx_n11562773_video_app_users_created_at ON n11562773_video_app.users(created_at);
CREATE INDEX IF NOT EXISTS idx_n11562773_video_app_users_updated_at ON n11562773_video_app.users(updated_at);
CREATE INDEX IF NOT EXISTS idx_n11562773_video_app_users_is_deleted ON n11562773_video_app.users(is_deleted);
CREATE INDEX IF NOT EXISTS idx_n11562773_video_app_users_cognito_sub ON n11562773_video_app.users(cognito_sub);

CREATE OR REPLACE TRIGGER update_n11562773_video_app_users_updated_at 
    BEFORE UPDATE ON n11562773_video_app.users
    FOR EACH ROW EXECUTE FUNCTION n11562773_video_app.update_updated_at_column();

COMMIT;

-- DOWN Migration
-- BEGIN;
-- DROP TABLE IF EXISTS n11562773_video_app.users;
-- DROP INDEX IF EXISTS idx_n11562773_video_app_users_username;
-- DROP INDEX IF EXISTS idx_n11562773_video_app_users_email;
-- DROP INDEX IF EXISTS idx_n11562773_video_app_users_created_at;
-- DROP INDEX IF EXISTS idx_n11562773_video_app_users_updated_at;
-- DROP INDEX IF EXISTS idx_n11562773_video_app_users_is_deleted;
-- DROP INDEX IF EXISTS idx_n11562773_video_app_users_cognito_sub;
-- COMMIT;