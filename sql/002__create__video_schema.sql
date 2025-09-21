-- Migration: 002__create__video_schema.sql

-- UP Migration
BEGIN;

CREATE TYPE n11562773_video_app.video_quality AS ENUM ('1080p', '720p', '480p', '360p', '240p');
CREATE TYPE n11562773_video_app.job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS n11562773_video_app.videos (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES n11562773_video_app.users(id),
    original_file_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    quality n11562773_video_app.video_quality NOT NULL,
    duration_seconds INTEGER NOT NULL,
    size_bytes BIGINT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT n11562773_video_app.get_brisbane_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT n11562773_video_app.get_brisbane_timestamp()
);

CREATE TABLE IF NOT EXISTS n11562773_video_app.transcode_jobs (
    id UUID PRIMARY KEY,
    video_id UUID NOT NULL REFERENCES n11562773_video_app.videos(id),
    status n11562773_video_app.job_status NOT NULL DEFAULT 'pending',
    requested_qualities n11562773_video_app.video_quality[] NOT NULL,
    output_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT n11562773_video_app.get_brisbane_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT n11562773_video_app.get_brisbane_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_n11562773_video_app_videos_owner ON n11562773_video_app.videos(owner_id);
CREATE INDEX IF NOT EXISTS idx_n11562773_video_app_videos_created_at ON n11562773_video_app.videos(created_at);
CREATE INDEX IF NOT EXISTS idx_n11562773_video_app_transcode_jobs_video ON n11562773_video_app.transcode_jobs(video_id);
CREATE INDEX IF NOT EXISTS idx_n11562773_video_app_transcode_jobs_status ON n11562773_video_app.transcode_jobs(status);

CREATE OR REPLACE TRIGGER update_n11562773_video_app_videos_updated_at 
    BEFORE UPDATE ON n11562773_video_app.videos
    FOR EACH ROW EXECUTE FUNCTION n11562773_video_app.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_n11562773_video_app_transcode_jobs_updated_at 
    BEFORE UPDATE ON n11562773_video_app.transcode_jobs
    FOR EACH ROW EXECUTE FUNCTION n11562773_video_app.update_updated_at_column();

COMMIT;

-- DOWN Migration
-- BEGIN;
-- DROP TABLE IF EXISTS n11562773_video_app.videos;
-- DROP TABLE IF EXISTS n11562773_video_app.transcode_jobs;
-- DROP INDEX IF EXISTS idx_n11562773_video_app_videos_owner;
-- DROP INDEX IF EXISTS idx_n11562773_video_app_videos_created_at;
-- DROP INDEX IF EXISTS idx_n11562773_video_app_transcode_jobs_video;
-- DROP INDEX IF EXISTS idx_n11562773_video_app_transcode_jobs_status;
-- DROP TRIGGER IF EXISTS update_n11562773_video_app_videos_updated_at;
-- DROP TRIGGER IF EXISTS update_n11562773_video_app_transcode_jobs_updated_at;
-- COMMIT;