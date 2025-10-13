import type { Context } from "hono";
import type { AppBindings } from "../config/app";
import { createTranscodeJob, getTranscodeJobById, updateTranscodeJob } from "../models/transcodeJobModel";
import type { TranscodeRequest } from "../types/transcodeJob";
import { getVideoById } from "../models/videoModel";
import  { type Video, ALLOWED_QUALITIES, type Quality } from "../types/video";
import { redisService } from "../cache/redis";
import { SQSService } from "../services/sqs";

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

    // Send transcoding job to SQS queue for processing by worker service
    try {
        await SQSService.sendTranscodingJob({
            jobId: job.id,
            videoId: video.id,
            qualities: qualities,
            s3Key: video.url,
            ownerId: user.sub
        });
        console.log(`Transcoding job ${job.id} queued successfully`);
    } catch (error) {
        console.error('Failed to queue transcoding job:', error);
        // Update job status to failed if we can't queue it
        await updateTranscodeJob({
            id: job.id,
            status: 'failed',
            outputMessage: 'Failed to queue transcoding job',
        });
        await redisService.createJobStats(job.id, 'failed');
        return c.json({ error: 'Failed to queue transcoding job' }, 500);
    }

    return c.json({ jobId: job.id }, 202);
}