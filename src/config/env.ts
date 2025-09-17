import { config } from 'dotenv';

config();

export const env = {
    port: parseInt(process.env.PORT || '3000', 10),
    dbUrl: process.env.DATABASE_URL!,
    redisUrl: process.env.REDIS_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    nodeEnv: process.env.NODE_ENV || 'production',
    virusTotalApiKey: process.env.VIRUS_TOTAL_API_KEY || '',
    awsRegion: process.env.AWS_REGION || 'ap-southeast-2',
    s3BucketName: process.env.S3_BUCKET_NAME || '',
};