import type { Quality } from "./video";

export type TranscodeJob = {
    id: string;
    videoId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    requestedQualities: Quality[];
    outputMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}