import { createClient } from 'redis';
import { env } from '../config/env';

const client = createClient({
    url: env.redisUrl
});

client.on('error', (err) => console.error('Redis Client Error:', err));
client.on('connect', () => console.log('Redis Client Connected'));

client.connect().catch((err) => {
    console.error('Redis Client Error:', err);
    throw new Error('Failed to connect to Redis');
});

export const redisService = {
    async blacklistToken(token: string, expiresIn: number): Promise<void> {
        await client.setEx(`blacklist:${token}`, expiresIn, '1');
    },
    async isTokenBlacklisted(token: string): Promise<boolean> {
        const result = await client.exists(`blacklist:${token}`);
        return result === 1;
    },
    async createJobStats(jobId: string, status: 'pending' | 'processing' | 'completed' | 'failed', ttl: number = 300): Promise<void> {
        await client.setEx(`job:${jobId}`, ttl, status);
    },
    async getJobStats(jobId: string): Promise<string | null> {
        return await client.get(`job:${jobId}`);
    },
    async deleteJobStats(jobId: string): Promise<void> {
        await client.del(`job:${jobId}`);
    },
    async close(): Promise<void> {
        await client.quit();
    }
};