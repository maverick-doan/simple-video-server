import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-2',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME

export class S3Service {
    static async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: contentType,
        });
    
        await s3Client.send(command);
        return `s3://${BUCKET_NAME}/${key}`;
    }

    static async generateUploadUrl(key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });
    
        return await getSignedUrl(s3Client, command, { expiresIn });
    }

    static async generateDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
  
        return await getSignedUrl(s3Client, command, { expiresIn });
    }

    static async deleteFile(key: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);
    }

    static async getFile(key: string): Promise<Buffer> {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        const response = await s3Client.send(command);
        const chunks: Uint8Array[] = [];

        if (response.Body) {
            for await (const chunk of response.Body as any) {
                chunks.push(chunk);
            }
        }

        return Buffer.concat(chunks);
    }
}