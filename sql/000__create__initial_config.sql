-- Migration: 000__create__database_initial_config.sql

-- UP Migration
BEGIN;

SET timezone = 'Australia/Brisbane';

CREATE OR REPLACE FUNCTION s109.get_brisbane_timestamp()
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN CURRENT_TIMESTAMP AT TIME ZONE 'Australia/Brisbane';
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION s109.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = s109.get_brisbane_timestamp();
    RETURN NEW;
END;
$$ language 'plpgsql';

COMMIT;

-- DOWN Migration
-- BEGIN;
-- DROP FUNCTION IF EXISTS s109.get_brisbane_timestamp();
-- DROP FUNCTION IF EXISTS s109.update_updated_at_column();
-- DROP SCHEMA IF EXISTS s109;
-- COMMIT;