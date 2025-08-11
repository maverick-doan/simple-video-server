import { pool } from "../db/pool";
import type { Quality } from '../types/video';
import { v4 as uuid } from 'uuid';
import type { TranscodeJob } from '../types/transcodeJob';

type DbTranscodeJobRow = {
    id: string;
    video_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    requested_qualities: Quality[];
    output_message: string | null;
    created_at: string;
    updated_at: string;
}

function toTranscodeJob(r: DbTranscodeJobRow): TranscodeJob {
    return {
        id: r.id,
        videoId: r.video_id,
        status: r.status,
        requestedQualities: r.requested_qualities,
        outputMessage: r.output_message,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
    }
}

export async function createTranscodeJob(params: {
    videoId: string;
    requestedQualities: Quality[];
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    outputMessage?: string | null;
}) {
    const id = uuid();
    const q = `
      INSERT INTO transcode_jobs (id, video_id, status, requested_qualities, output_message)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, video_id AS "videoId", status::text AS status, requested_qualities::text[] AS "requestedQualities",
                output_message AS "outputMessage", created_at AS "createdAt", updated_at AS "updatedAt"
    `;

    const v = [id, params.videoId, params.status ?? 'pending', params.requestedQualities, params.outputMessage ?? null];
    const { rows } = await pool.query(q, v);

    if (!rows[0]) {
        throw new Error('Failed to create transcode job');
    }
    return toTranscodeJob(rows[0]);
}

