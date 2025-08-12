import * as ffmpeg from 'fluent-ffmpeg';
import ffmpegBinary from 'ffmpeg-static'; // precompiled ffmpeg binary
import type { Quality } from '../types/video';
import * as fileUtils from './file';
import * as path from 'path';

if (ffmpegBinary) {
    ffmpeg.setFfmpegPath(ffmpegBinary);
}

function qualityToHeight(quality: Quality): number {
    switch (quality) {
        case '1080p': return 1080;
        case '720p': return 720;
        case '480p': return 480;
        case '360p': return 360;
        case '240p': return 240;
        default: throw new Error(`Unknown quality: ${quality}`);
    }
}

// Get video duration
export function probe(inputPath: string): Promise<{ durationSeconds: number }> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, data) => {
            if (err) return reject(err);
            const seconds = Number(data.format.duration ?? 0);
            resolve({ durationSeconds: Math.round(seconds) });
        });
    });
}

export function transcodeToQuality(inputPath: string, outputPath: string, quality: Quality): Promise<void> {
    const height = qualityToHeight(quality);
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath).outputOptions([
            `-vf scale=-2:${height}`,
            '-c:v libx264',
            '-preset veryfast',
            '-crf 23',
            '-c:a aac',
            '-movflags +faststart'
            // Force single thread and slow preset to maximise CPU usage?
        ]).on('end', () => resolve()).on('error', (err) => reject()).save(outputPath);
    });
}

export async function transcodeMultipleQualities(inputPath: string, outputDir: string, qualities: Quality[], baseName: string): Promise<{ outputs: string[] }> {
    await fileUtils.ensureDir(outputDir);
    const outputs: string[] = [];
    for (const quality of qualities) {
        const outFile = path.join(outputDir, `${baseName}_${quality}.mp4`);
        await transcodeToQuality(inputPath, outFile, quality);
        outputs.push(outFile);
      }
    
      return { outputs };
}