import { SQSService, type TranscodingJobMessage } from '../services/sqs';
import { updateTranscodeJob } from '../models/transcodeJobModel';
import { redisService } from '../cache/redis';
import { S3Service } from '../services/s3';
import { transcodeMultipleQualities } from '../utils/transcode';
import { writeFile, readFile, unlink } from 'fs/promises';
import * as path from 'path';
import { env } from '../config/env';
import * as fileUtils from '../utils/file';

export class TranscodingWorker {
    private isProcessing = false;
    private shouldStop = false;
    private workerId: string;

    constructor() {
        this.workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Transcoding worker ${this.workerId} initialised`);
    }

    async start(): Promise<void> {
        console.log(`Transcoding worker ${this.workerId} started`);
        
        while (!this.shouldStop) {
            try {
                if (this.isProcessing) {
                    // If already processing, wait a bit before checking again
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                // Poll for messages from SQS
                const messages = await SQSService.receiveTranscodingJobs(1);
                
                if (messages.length === 0) {
                    // No messages available, wait before polling again
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }

                const message = messages[0];
                await this.processJob(message);
                
            } catch (error) {
                console.error(`Worker ${this.workerId} error:`, error);
                // Wait longer on error before retrying
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
        
        console.log(`Transcoding worker ${this.workerId} stopped`);
    }

    private async processJob(message: any): Promise<void> {
        this.isProcessing = true;
        let jobData: TranscodingJobMessage | null = null;
        
        try {
            // Parse and validate the message
            jobData = SQSService.parseTranscodingJobMessage(message);
            console.log(`Worker ${this.workerId} processing job ${jobData.jobId}`);

            // Update status to processing
            await updateTranscodeJob({ id: jobData.jobId, status: 'processing' });
            await redisService.createJobStats(jobData.jobId, 'processing');

            // Perform the actual transcoding
            await this.performTranscoding(jobData);

            // Mark as completed
            await updateTranscodeJob({ 
                id: jobData.jobId, 
                status: 'completed',
                outputMessage: `Transcoding completed successfully by worker ${this.workerId}`
            });
            await redisService.createJobStats(jobData.jobId, 'completed');

            // Delete message from queue to prevent reprocessing
            await SQSService.deleteMessage(message.ReceiptHandle);
            
            console.log(`Worker ${this.workerId} completed job ${jobData.jobId} successfully`);

        } catch (error) {
            console.error(`Worker ${this.workerId} failed to process job:`, error);
            
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            // Update status to failed
            await updateTranscodeJob({
                id: jobData?.jobId || 'unknown',
                status: 'failed',
                outputMessage: `Transcoding failed: ${errorMessage}`
            });
            
            if (jobData?.jobId) {
                await redisService.createJobStats(jobData.jobId, 'failed');
            }

            // Don't delete the message - let it go to DLQ after max retries
            // The message will automatically become visible again after visibility timeout
        } finally {
            this.isProcessing = false;
        }
    }

    private async performTranscoding(jobData: TranscodingJobMessage): Promise<void> {
        const { jobId, videoId, qualities, s3Key, ownerId } = jobData;

        // Prepare temp workspace
        const userTempDir = path.join(env.uploadDir, ownerId, 'temp', jobId);
        const outputDir = path.join(env.uploadDir, ownerId, 'derived', videoId);
        
        await fileUtils.ensureDir(userTempDir);
        await fileUtils.ensureDir(outputDir);

        // Download original from S3 to temp file
        const inputExt = path.extname(s3Key) || '.mp4';
        const tempInputPath = path.join(userTempDir, `input_${videoId}${inputExt}`);
        
        console.log(`Worker ${this.workerId} downloading ${s3Key} from S3`);
        const s3Buff = await S3Service.getFile(s3Key);
        await writeFile(tempInputPath, s3Buff);

        // Transcode from the temp input to local outputDir
        const baseName = `output_${jobId}`;
        console.log(`Worker ${this.workerId} starting transcoding to qualities: ${qualities.join(', ')}`);
        
        const { outputs } = await transcodeMultipleQualities(
            path.resolve(tempInputPath), 
            outputDir, 
            qualities as any[], 
            baseName
        );

        // Upload each derived file back to S3
        const uploadedKeys: string[] = [];
        for (const outPath of outputs) {
            const key = `${ownerId}/derived/${videoId}/${path.basename(outPath)}`;
            const fileBuf = await readFile(outPath);
            const contentType = path.extname(outPath).toLowerCase() === '.mp4' ? 'video/mp4' : 'application/octet-stream';
            
            console.log(`Worker ${this.workerId} uploading ${key} to S3`);
            await S3Service.uploadFile(key, fileBuf, contentType);
            uploadedKeys.push(key);
        }

        // Cleanup temp files
        try { 
            await unlink(tempInputPath); 
            console.log(`Worker ${this.workerId} cleaned up temp file: ${tempInputPath}`);
        } catch (cleanupError) {
            console.warn(`Worker ${this.workerId} failed to cleanup temp file:`, cleanupError);
        }

        console.log(`Worker ${this.workerId} transcoding completed. Generated S3 objects: ${uploadedKeys.join(', ')}`);
    }

    stop(): void {
        console.log(`Stopping transcoding worker ${this.workerId}`);
        this.shouldStop = true;
    }

    getStatus(): { workerId: string; isProcessing: boolean; shouldStop: boolean } {
        return {
            workerId: this.workerId,
            isProcessing: this.isProcessing,
            shouldStop: this.shouldStop
        };
    }
}

// Worker entry point
if (require.main === module) {
    const worker = new TranscodingWorker();
    
    // Graceful shutdown handling
    process.on('SIGTERM', () => {
        console.log('Received SIGTERM, shutting down gracefully');
        worker.stop();
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log('Received SIGINT, shutting down gracefully');
        worker.stop();
        process.exit(0);
    });

    process.on('uncaughtException', (error) => {
        console.error('Uncaught exception:', error);
        worker.stop();
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled rejection at:', promise, 'reason:', reason);
        worker.stop();
        process.exit(1);
    });

    // Start the worker
    worker.start().catch((error) => {
        console.error('Worker failed to start:', error);
        process.exit(1);
    });
}
