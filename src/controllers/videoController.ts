import type { Context } from "hono";
import type { AppBindings } from "../config/app";
import { writeFile, rename, unlink } from 'fs/promises';
import { env } from '../config/env';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { probe, choosePreferredVideoStream } from "../utils/transcode";
import { createVideo } from "../models/videoModel";
import * as fileUtils from "../utils/file";
import type { ProbeResult, Video } from "../types/video";
import { getVideoById, getAllVideos } from "../models/videoModel";
import { ALLOWED_TYPES, MAX_FILE_SIZE, MAX_DURATION_SECONDS, SUPPORTED_CODECS, DEFAULT_QUALITY, ALLOWED_QUALITIES, type Quality } from "../types/video";

export async function uploadVideo(c: Context<{ Variables: AppBindings }>) {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const form = await c.req.parseBody();
    const originalName = form.originalName as string || '';
    const title = form.title as string || '';
    const description = form.description as string || '';
    const file = form.file as File || null;
    const type = form.type as string || '';
    const seconds = Number(form.seconds) || 0;

    if (!file || !type || !originalName) {
        return c.json({ error: 'No file, type or file name provided' }, 400);
    } else if (file.size > MAX_FILE_SIZE) {
        return c.json({ error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB` }, 400);
    } else if (!ALLOWED_TYPES.includes(type)) { // Add more later
        return c.json({ 
            error: 'Invalid file type',
            allowedTypes: ALLOWED_TYPES
        }, 400);
    } else if (seconds > MAX_DURATION_SECONDS) {
        return c.json({
            error: `Video duration exceeds ${MAX_DURATION_SECONDS} seconds`,
            maxDurationSeconds: MAX_DURATION_SECONDS
        }, 400);
    }

    const videoId = uuidv4();
	const subtype = type.split('/')[1]; // 'mp4' | 'quicktime'
	const ext = subtype === 'quicktime' ? 'mov' : subtype;
	const parsed = path.parse(originalName);
	const safeBase = parsed.name.replace(/[^\w.-]+/g, '_');
	const baseName = `${videoId}_${safeBase}`;
    const userUploadDir = path.join(env.uploadDir, user.sub);
    const originalsDir = path.join(userUploadDir, 'originals');
    const tempDir = path.join(userUploadDir, 'temp');
    
    await fileUtils.ensureDir(originalsDir);
    await fileUtils.ensureDir(tempDir);
    
    const videoPath = path.join(originalsDir, `${baseName}.${ext}`);
    const tempPath = path.join(tempDir, `${baseName}.${ext}`);

    try {
        await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));

        const meta: ProbeResult = await probe(tempPath);

        if (meta.durationSeconds > MAX_DURATION_SECONDS) {
            await unlink(tempPath);
            return c.json({
                error: `Video duration exceeds ${MAX_DURATION_SECONDS} seconds`,
                detectedDurationSeconds: meta.durationSeconds
            }, 400);
        }

        if (!meta.videoStreams.length) {
            await unlink(tempPath);
            return c.json({ error: 'No video stream detected' }, 400);
        }

        const preferred = choosePreferredVideoStream(meta.videoStreams, SUPPORTED_CODECS);
        if (!preferred) {
            await unlink(tempPath);
            return c.json({
                error: 'Unsupported video codec. Supported codecs',
                supported: SUPPORTED_CODECS
            }, 400);
        }

        if (preferred.height && !ALLOWED_QUALITIES.includes(`${preferred.height}p`)) {
            await unlink(tempPath);
            return c.json({
                error: 'Unsupported video resolution',
                supportedQualities: ALLOWED_QUALITIES
            }, 400);
        }

        // Move temp file to final destination
        await rename(tempPath, videoPath);

        const quality = preferred.height ? `${preferred.height}p` : DEFAULT_QUALITY;

        const video = await createVideo({
            ownerId: user.sub,
            originalFileName: safeBase,
            title,
            description,
            url: videoPath, // Will switch to URL in later stages
            quality: quality as Quality,
            durationSeconds: meta.durationSeconds,
            sizeBytes: meta.sizeBytes
        });

        return c.json({ video, analysis: {
            format: meta.formatName,
            videoStreams: meta.videoStreams,
            chosenStreamIndex: preferred.index
        }}, 201);
    } catch (error) {
        await unlink(tempPath);
        return c.json({ error: 'Failed to upload video' }, 500);
    }
}

export async function getVideo(c: Context<{ Variables: AppBindings }>) {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const videoId = c.req.param('id');
    if (!videoId) {
        return c.json({ error: 'Video ID is required' }, 400);
    }

    const video: Video | undefined = await getVideoById(videoId);

    if (!video) {
        return c.json({ error: 'Video not found' }, 404);
    }

    if (video.ownerId !== user.sub) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    return c.json({ videoData: video }, 200);
}

export async function listAllVideos(c: Context<{ Variables: AppBindings }>) {
    try {
        const user = c.get('user');
        if (!user) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        if (user.role !== 'admin') {
            return c.json({ error: 'Forbidden: Admin access required' }, 403);
        }

        const limit = Number(c.req.query('limit')) || 10;
        const offset = Number(c.req.query('offset')) || 0;
        const ownerId = c.req.query('ownerId');

        const { videos, total } = await getAllVideos({ limit, offset, ownerId: ownerId || '' });

        return c.json({ videos, total }, 200);
    } catch (error) {
        return c.json({ error: 'Failed to list videos' }, 500);
    }
}