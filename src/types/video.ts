export type Quality = "1080p" | "720p" | "480p" | "360p" | "240p";

// TODO: Add more later
export const ALLOWED_TYPES = ['video/mp4', 'video/quicktime'];
export const MAX_FILE_SIZE = 1024 * 1024 * 100; // 100MB
export const MAX_DURATION_SECONDS = 60 * 60; // 1 hour
export const SUPPORTED_CODECS = ['h264']
export const DEFAULT_QUALITY = '1080p';
export const ALLOWED_QUALITIES = ['1080p', '720p', '480p', '360p', '240p'];

export interface Video {
    id: string;
    ownerId: string;
    originalFileName: string;
    title: string;
    description?: string;
    url: string;
    quality: Quality;
    duration: number;
    sizeBytes: number;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface VideoStreamInfo {
    index: number;
	codecName?: string;
	width?: number;
	height?: number;
	bitRate?: number;
	isDefault?: boolean;
}

export type ProbeResult = {
	durationSeconds: number;
	sizeBytes: number;
	formatName?: string;
	videoStreams: VideoStreamInfo[];
	audioStreams: { index: number; codecName?: string }[];
};

export interface TranscodeRequest {
    videoId: string;
    qualities: Quality[];
}
