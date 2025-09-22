-- Migration: 000__create__database_initial_config.sql

-- UP Migration
BEGIN;

SET timezone = 'Australia/Brisbane';

CREATE SCHEMA IF NOT EXISTS n11562773_video_app;

CREATE OR REPLACE FUNCTION n11562773_video_app.get_brisbane_timestamp()
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN CURRENT_TIMESTAMP AT TIME ZONE 'Australia/Brisbane';
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION n11562773_video_app.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = n11562773_video_app.get_brisbane_timestamp();
    RETURN NEW;
END;
$$ language 'plpgsql';

COMMIT;

-- DOWN Migration
-- BEGIN;
-- DROP FUNCTION IF EXISTS n11562773_video_app.get_brisbane_timestamp();
-- DROP FUNCTION IF EXISTS n11562773_video_app.update_updated_at_column();
-- DROP SCHEMA IF EXISTS n11562773_video_app;
-- COMMIT;