import ffmpeg from 'fluent-ffmpeg';
import ffmpegBinary from 'ffmpeg-static'; // precompiled ffmpeg binary
import type { Quality, ProbeResult, VideoStreamInfo } from '../types/video';
import { SUPPORTED_CODECS } from '../types/video';
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
export async function probe(inputPath: string): Promise<ProbeResult> {
    const [sizeStat, probeData] = await Promise.all([
		fileUtils.fileSizeBytes(inputPath),
		new Promise<any>((resolve, reject) => {
			ffmpeg.ffprobe(inputPath, (err, data) => (err ? reject(err) : resolve(data)));
		}),
	]);

	const durationSeconds = Math.round(Number(probeData?.format?.duration ?? 0));
	const formatName = probeData?.format?.format_name;

	const videoStreams: VideoStreamInfo[] = (probeData?.streams ?? [])
		.filter((s: any) => s.codec_type === 'video')
		.map((s: any) => ({
			index: s.index,
			codecName: s.codec_name,
			width: s.width,
			height: s.height,
			bitRate: s.bit_rate ? Number(s.bit_rate) : undefined,
			isDefault: !!(s?.disposition?.default),
		}));

	const audioStreams = (probeData?.streams ?? [])
		.filter((s: any) => s.codec_type === 'audio')
		.map((s: any) => ({
			index: s.index,
			codecName: s.codec_name,
		}));

	return {
		durationSeconds,
		sizeBytes: sizeStat,
		formatName,
		videoStreams,
		audioStreams,
	};
}

function transcodeToQuality(inputPath: string, outputPath: string, quality: Quality): Promise<void> {
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

export function choosePreferredVideoStream(
	streams: VideoStreamInfo[],
	supportedCodecs: string[] = SUPPORTED_CODECS
): VideoStreamInfo | undefined {
	const supported = streams.filter(s => s.codecName && supportedCodecs.includes(s.codecName));
	if (!supported.length) return undefined;

	const defaultStream = supported.find(s => s.isDefault);
	if (defaultStream) return defaultStream;

	const byResolution = [...supported].sort((a, b) => (b.height ?? 0) - (a.height ?? 0));
	return byResolution[0] ?? supported[0];
}