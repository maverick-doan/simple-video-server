export type Quality = "1080p" | "720p" | "480p" | "360p" | "240p";

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

export interface TranscodeRequest {
    videoId: string;
    qualities: Quality[];
}
