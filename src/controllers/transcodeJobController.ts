import type { Context } from "hono";
import type { AppBindings } from "../config/app";
import { createTranscodeJob, getTranscodeJobById, updateTranscodeJob } from "../models/transcodeJobModel";
import type { TranscodeRequest } from "../types/transcodeJob";
import { transcodeMultipleQualities } from "../utils/transcode";
import { getVideoById } from "../models/videoModel";
import type { Video } from "../types/video";
import * as path from 'path';
import { env } from "../config/env";
import * as fileUtils from '../utils/file';

export async function getTranscodeJob (c: Context<{ Variables: AppBindings }>) {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const jobId = c.req.param('id');
    if (!jobId) {
        return c.json({ error: 'Job ID is required' }, 400);
    }

    const job = await getTranscodeJobById(jobId);
    if (!job) {
        return c.json({ error: 'Job not found' }, 404);
    }

    return c.json({ transcodeJob: job }, 200);
}

function isValidTranscodeRequest (body: unknown): body is TranscodeRequest {
    if (!body || typeof body !== 'object') return false;
    const { videoId, qualities } = body as any;
    return (
        typeof videoId === 'string' &&
        Array.isArray(qualities) &&
        qualities.every((q: any) => typeof q === 'string')
    )
}

export async function requestTranscodeJob (c: Context<{ Variables: AppBindings }>) {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    if (!isValidTranscodeRequest(body)) {
        return c.json({ error: 'Invalid request body' }, 400);
    }

    const { videoId, qualities } = body as TranscodeRequest;

    const video: Video | undefined = await getVideoById(videoId);
    if (!video) {
        return c.json({ error: 'Video not found' }, 404);
    }

    if (video.ownerId !== user.sub) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const job = await createTranscodeJob({
        videoId: video.id,
        requestedQualities: qualities,
        status: 'pending',
    });

    setImmediate(async () => {
        try {
          await updateTranscodeJob({ id: job.id, status: 'processing' });
          const inputPath = path.join(env.uploadDir, video.ownerId, 'originals', video.originalFileName ? `${video.id}_${video.originalFileName}` : path.basename(video.url));
          const outputDir = path.join(env.uploadDir, video.ownerId, 'derived', video.id);
          await fileUtils.ensureDir(outputDir);
          const baseName = `output_${job.id}`;
          const { outputs } = await transcodeMultipleQualities(path.resolve(inputPath), outputDir, qualities, baseName);
    
          await updateTranscodeJob({
            id: job.id,
            status: 'completed',
            outputMessage: `Generated: ${outputs.map((o) => path.relative(process.cwd(), o)).join(', ')}`,
          });
        } catch (e: any) {
          await updateTranscodeJob({
            id: job.id,
            status: 'failed',
            outputMessage: e?.message ?? 'Transcode failed',
          });
          c.json({ error: e?.message ?? 'Transcode failed' }, 500);
        }
      });
    
    return c.json({ jobId: job.id }, 202);
}