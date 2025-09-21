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
    // AWS Configuration
    awsRegion: process.env.AWS_REGION || 'ap-southeast-2',
    
    // S3 Configuration
    s3BucketName: process.env.S3_BUCKET_NAME || '',
    s3Region: process.env.S3_REGION || 'ap-southeast-2',
    
    // Cognito Configuration
    cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || '',
    cognitoClientId: process.env.COGNITO_CLIENT_ID || '',
    cognitoClientSecret: process.env.COGNITO_CLIENT_SECRET || '',
    cognitoDomain: process.env.COGNITO_DOMAIN || '',
    cognitoCallbackUrl: process.env.COGNITO_CALLBACK_URL || 'http://localhost:3000/api/auth/cognito/google/callback',
};