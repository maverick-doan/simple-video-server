#!/usr/bin/env node

/**
 * Transcoding Worker Service Entry Point
 * 
 * This service runs independently from the main API service and is responsible for:
 * - Consuming transcoding jobs from SQS queue
 * - Processing one job at a time per worker instance
 * - Updating job status in database and Redis cache
 * - Uploading transcoded videos to S3
 */

import { TranscodingWorker } from './transcodingWorker';

console.log('Starting Video Transcoding Worker Service...');
console.log('Environment:', process.env.NODE_ENV || 'development');

// Create and start the worker
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
worker.start().catch((error: Error) => {
    console.error('Worker failed to start:', error);
    process.exit(1);
});
