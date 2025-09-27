import { config } from 'dotenv';
import {
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
} from '../services/awsConfig';

config();

export const env = {
    port,
    dbUrl,
    redisUrl,
    jwtSecret,
    uploadDir,
    nodeEnv,
    virusTotalApiKey,
    // AWS Configuration
    awsRegion,
    
    // S3 Configuration
    s3BucketName,
    s3Region,
    
    // Cognito Configuration
    cognitoUserPoolId,
    cognitoClientId,
    cognitoClientSecret,
    cognitoDomain,
    cognitoCallbackUrl,

    // Shared DB Configuration
    sharedDbHost,
    sharedDbPort,
    sharedDbName,
    sharedDbUser,
    sharedDbPassword,
    sharedDbSsl
};