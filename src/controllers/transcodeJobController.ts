import type { Context } from "hono";
import type { AppBindings } from "../config/app";
import { createTranscodeJob, getTranscodeJobById, updateTranscodeJob } from "../models/transcodeJobModel";
import type { TranscodeRequest } from "../types/transcodeJob";
import { transcodeMultipleQualities } from "../utils/transcode";
import { getVideoById } from "../models/videoModel";
import  { type Video, ALLOWED_QUALITIES, type Quality } from "../types/video";
import * as path from 'path';
import { env } from "../config/env";
import * as fileUtils from '../utils/file';
import { redisService } from "../cache/redis";
import { S3Service } from "../services/s3";
import { writeFile, readFile, unlink } from 'fs/promises';

export async function getTranscodeJob (c: Context<{ Variables: AppBindings }>) {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const jobId = c.req.param('id');
    if (!jobId) {
        return c.json({ error: 'Job ID is required' }, 400);
    }

    const cacheStatus = await redisService.getJobStats(jobId);
    if (cacheStatus) {
        return c.json({ transcodeJob: { id: jobId, status: cacheStatus as 'pending' | 'processing' | 'completed' | 'failed' } }, 200);
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

    if (qualities.length === 1 && qualities[0] === video.quality) {
        return c.json({ error: 'Requested quality is already the same as the video quality' }, 400);
    }

    for (const quality of qualities) {
        if (!ALLOWED_QUALITIES.includes(quality as Quality)) {
            return c.json({ error: 'Invalid quality' }, 400);
        }
    }

    const job = await createTranscodeJob({
        videoId: video.id,
        requestedQualities: qualities,
        status: 'pending',
    });

    await redisService.createJobStats(job.id, 'pending');

    // TODO: Refactor this to use a queue system instead of setImmediate
    // Have a service running that will pick up jobs and allow only one job to be processed at a time per instance
    setImmediate(async () => {
        try {
            await updateTranscodeJob({ id: job.id, status: 'processing' });
            await redisService.createJobStats(job.id, 'processing');

            // Prepare temp workspace
            const userTempDir = path.join(env.uploadDir, video.ownerId, 'temp', job.id);
            const outputDir = path.join(env.uploadDir, video.ownerId, 'derived', video.id);
            await fileUtils.ensureDir(userTempDir);
            await fileUtils.ensureDir(outputDir);

            // Download original from S3 to temp file
            // video.url stores the S3 key (e.g. "<ownerId>/originals/<name>.ext")
            const originalKey = video.url;
            const inputExt = path.extname(originalKey) || '.mp4';
            const tempInputPath = path.join(userTempDir, `input_${video.id}${inputExt}`);
            const s3Buff = await S3Service.getFile(originalKey);
            await writeFile(tempInputPath, s3Buff);

            // Transcode from the temp input to local outputDir
            const baseName = `output_${job.id}`;
            const { outputs } = await transcodeMultipleQualities(path.resolve(tempInputPath), outputDir, qualities, baseName);

            // Upload each derived file back to S3 under "<ownerId>/derived/<videoId>/..."
            const uploadedKeys: string[] = [];
            for (const outPath of outputs) {
                const key = `${video.ownerId}/derived/${video.id}/${path.basename(outPath)}`;
                const fileBuf = await readFile(outPath);
                const contentType = path.extname(outPath).toLowerCase() === '.mp4' ? 'video/mp4' : 'application/octet-stream';
                await S3Service.uploadFile(key, fileBuf, contentType);
                uploadedKeys.push(key);
            }

            // Mark job completed and cache status
            await updateTranscodeJob({
                id: job.id,
                status: 'completed',
                outputMessage: `Generated S3 objects: ${uploadedKeys.join(', ')}`,
            });
            await redisService.createJobStats(job.id, 'completed');

            // Best-effort cleanup (ignore failures)
            try { await unlink(tempInputPath); } catch {}
        } catch (e: any) {
            console.error('Transcode error:', e);
            await updateTranscodeJob({
                id: job.id,
                status: 'failed',
                outputMessage: e?.message ?? 'Transcode failed',
            });
            await redisService.createJobStats(job.id, 'failed');
            return c.json({ error: e?.message ?? 'Transcode failed' }, 500);
        }
      });

    return c.json({ jobId: job.id }, 202);
}