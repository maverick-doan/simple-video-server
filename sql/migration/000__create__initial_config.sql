-- Migration: 000__create__database_initial_config.sql

-- UP Migration
BEGIN;

SET timezone = 'Australia/Brisbane';

CREATE OR REPLACE FUNCTION get_brisbane_timestamp()
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN CURRENT_TIMESTAMP AT TIME ZONE 'Australia/Brisbane';
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = get_brisbane_timestamp();
    RETURN NEW;
END;
$$ language 'plpgsql';

COMMIT;

-- DOWN Migration
-- BEGIN;
-- DROP FUNCTION IF EXISTS get_brisbane_timestamp();
-- COMMIT;