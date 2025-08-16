import { config } from 'dotenv';

config();

export const env = {
    port: parseInt(process.env.PORT || '3000', 10),
    dbUrl: process.env.DATABASE_URL!,
    redisUrl: process.env.REDIS_URL!,
    jwtSecret: process.env.JWT_SECRET!,
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    nodeEnv: process.env.NODE_ENV || 'production',
};