import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const AWS_REGION = "ap-southeast-2";
const PARAMETER_PREFIX = "/n11659831/video-app/prod";
const SECRET_NAME = "assignment2-secrets";

const ssmClient = new SSMClient({ region: AWS_REGION });
const secretsClient = new SecretsManagerClient({ region: AWS_REGION });

let parameterCache: Record<string, string> = {};
let secretsCache: Record<string, string> = {};

export class AWSConfigService {
    /**
     * Get parameter from AWS Systems Manager Parameter Store
     */
    static async getParameter(parameterName: string): Promise<string> {
        // Check cache first
        if (parameterCache[parameterName]) {
            return parameterCache[parameterName];
        }

        try {
            const fullParameterName = `${PARAMETER_PREFIX}/${parameterName}`;
            const response = await ssmClient.send(
                new GetParameterCommand({
                    Name: fullParameterName,
                    WithDecryption: true 
                })
            );

            const value = response.Parameter?.Value || '';
            parameterCache[parameterName] = value;
            return value;
        } catch (error) {
            console.error(`Failed to get parameter ${parameterName}:`, error);
            throw error;
        }
    }

    /**
     * Get secret from AWS Secrets Manager
     */
    static async getSecret(secretKey: string): Promise<string> {
        // Check cache first
        if (secretsCache[secretKey]) {
            return secretsCache[secretKey];
        }

        try {
            const response = await secretsClient.send(
                new GetSecretValueCommand({
                    SecretId: SECRET_NAME,
                    VersionStage: "AWSCURRENT"
                })
            );

            if (!response.SecretString) {
                throw new Error(`Secret ${SECRET_NAME} has no SecretString`);
            }

            const secrets = JSON.parse(response.SecretString);
            const value = secrets[secretKey] || '';
            
            // Cache all secrets at once
            secretsCache = secrets;
            
            return value;
        } catch (error) {
            console.error(`Failed to get secret ${secretKey}:`, error);
            throw error;
        }
    }

    /**
     * Initialize all configuration from AWS services
     */
    static async initializeConfig(): Promise<Record<string, any>> {
        try {
            console.log('Initializing AWS configuration...');

            // Get all parameters in parallel
            const [
                cognitoClientId,
                cognitoDomain,
                cognitoUserPoolId,
                databaseUrl,
                redisUrl,
                s3Region,
                s3BucketName,
                awsRegion,
                sharedDbHost,
                sharedDbName,
                sharedDbPort,
                sharedDbUser,
                sharedDbSsl
            ] = await Promise.all([
                this.getParameter('COGNITO_CLIENT_ID'),
                this.getParameter('COGNITO_DOMAIN'),
                this.getParameter('COGNITO_USER_POOL_ID'),
                this.getParameter('DATABASE_URL'),
                this.getParameter('REDIS_URL'),
                this.getParameter('S3_REGION'),
                this.getParameter('S3_BUCKET_NAME'),
                this.getParameter('AWS_REGION'),
                this.getParameter('SHARED_DB_HOST'),
                this.getParameter('SHARED_DB_NAME'),
                this.getParameter('SHARED_DB_PORT'),
                this.getParameter('SHARED_DB_USER'),
                this.getParameter('SHARED_DB_SSL')
            ]);

            // Get all secrets in parallel
            const [
                jwtSecret,
                cognitoClientSecret,
                sharedDbPassword,
                virusTotalApiKey
            ] = await Promise.all([
                this.getSecret('JWT_SECRET'),
                this.getSecret('COGNITO_CLIENT_SECRET'),
                this.getSecret('SHARED_DB_PASSWORD'),
                this.getSecret('VIRUS_TOTAL_API_KEY')
            ]);

            const config = {
                // Basic config
                port: parseInt(process.env.PORT || '3000', 10),
                uploadDir: process.env.UPLOAD_DIR || './uploads',
                nodeEnv: process.env.NODE_ENV || 'production',
                virusTotalApiKey: virusTotalApiKey,
                
                // AWS Configuration
                awsRegion: awsRegion,
                
                // Database Configuration
                dbUrl: databaseUrl,
                redisUrl: redisUrl,
                jwtSecret: jwtSecret,
                
                // S3 Configuration
                s3BucketName: s3BucketName,
                s3Region: s3Region,
                
                // Cognito Configuration
                cognitoUserPoolId: cognitoUserPoolId,
                cognitoClientId: cognitoClientId,
                cognitoClientSecret: cognitoClientSecret,
                cognitoDomain: cognitoDomain,
                cognitoCallbackUrl: process.env.COGNITO_CALLBACK_URL || 'http://localhost:3000/api/auth/cognito/google/callback',

                // Shared DB Configuration
                sharedDbHost: sharedDbHost,
                sharedDbPort: parseInt(sharedDbPort),
                sharedDbName: sharedDbName,
                sharedDbUser: sharedDbUser,
                sharedDbPassword: sharedDbPassword,
                sharedDbSsl: sharedDbSsl === 'true' || true,
            };

            console.log('AWS configuration loaded successfully');
            return config;
        } catch (error) {
            console.error('Failed to initialize AWS configuration:', error);
            throw error;
        }
    }

    static clearCache(): void {
        parameterCache = {};
        secretsCache = {};
    }
}

// Initialize configuration and export individual values
const config = await AWSConfigService.initializeConfig();

export const {
    port,
    dbUrl,
    redisUrl,
    jwtSecret,
    uploadDir,
    nodeEnv,
    virusTotalApiKey,
    awsRegion,
    s3BucketName,
    s3Region,
    cognitoUserPoolId,
    cognitoClientId,
    cognitoClientSecret,
    cognitoDomain,
    cognitoCallbackUrl,
    sharedDbHost,
    sharedDbPort,
    sharedDbName,
    sharedDbUser,
    sharedDbPassword,
    sharedDbSsl
} = config;