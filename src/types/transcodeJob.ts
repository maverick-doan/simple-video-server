import type { Quality } from "./video";

export type TranscodeJob = {
    id: string;
    videoId: string; // Change to Video later -> Update cross validation in controller with user
    status: 'pending' | 'processing' | 'completed' | 'failed';
    requestedQualities: Quality[];
    outputMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface TranscodeRequest {
    videoId: string;
    qualities: Quality[];
}