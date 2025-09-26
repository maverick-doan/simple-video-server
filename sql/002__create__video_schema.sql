-- Migration: 002__create__video_schema.sql

-- UP Migration
BEGIN;

CREATE TYPE s109.video_quality AS ENUM ('1080p', '720p', '480p', '360p', '240p');
CREATE TYPE s109.job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS s109.videos (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES s109.users(id),
    original_file_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    quality s109.video_quality NOT NULL,
    duration_seconds INTEGER NOT NULL,
    size_bytes BIGINT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT s109.get_brisbane_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT s109.get_brisbane_timestamp()
);

CREATE TABLE IF NOT EXISTS s109.transcode_jobs (
    id UUID PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES s109.videos(id),
    status s109.job_status NOT NULL DEFAULT 'pending',
    requested_qualities s109.video_quality[] NOT NULL,
    output_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT s109.get_brisbane_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT s109.get_brisbane_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_s109_videos_owner ON s109.videos(owner_id);
CREATE INDEX IF NOT EXISTS idx_s109_videos_created_at ON s109.videos(created_at);
CREATE INDEX IF NOT EXISTS idx_s109_transcode_jobs_video ON s109.transcode_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_s109_transcode_jobs_status ON s109.transcode_jobs(status);

CREATE OR REPLACE TRIGGER update_s109_videos_updated_at
    BEFORE UPDATE ON s109.videos
    FOR EACH ROW EXECUTE FUNCTION s109.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_s109_transcode_jobs_updated_at
    BEFORE UPDATE ON s109.transcode_jobs
    FOR EACH ROW EXECUTE FUNCTION s109.update_updated_at_column();

COMMIT;

-- DOWN Migration
-- BEGIN;
-- DROP TABLE IF EXISTS s109.videos;
-- DROP TABLE IF EXISTS s109.transcode_jobs;
-- DROP INDEX IF EXISTS idx_s109_videos_owner;
-- DROP INDEX IF EXISTS idx_s109_videos_created_at;
-- DROP INDEX IF EXISTS idx_s109_transcode_jobs_video;
-- DROP INDEX IF EXISTS idx_s109_transcode_jobs_status;
-- DROP TRIGGER IF EXISTS update_s109_videos_updated_at;
-- DROP TRIGGER IF EXISTS update_s109_transcode_jobs_updated_at;
-- COMMIT;