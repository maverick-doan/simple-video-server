import { 
    CognitoIdentityProviderClient, 
    AdminCreateUserCommand,
    AdminSetUserPasswordCommand,
    AdminAddUserToGroupCommand,
    AdminGetUserCommand,
    AdminListGroupsForUserCommand,
    InitiateAuthCommand,
    RespondToAuthChallengeCommand,
    AssociateSoftwareTokenCommand,
    VerifySoftwareTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { env } from '../config/env';

const cognitoClient = new CognitoIdentityProviderClient({
    region: env.awsRegion || 'ap-southeast-2',
});

export class CognitoService {
    // Create user in Cognito
    static async createUser(email: string, username: string, temporaryPassword: string) {
        const command = new AdminCreateUserCommand({
            UserPoolId: env.cognitoUserPoolId,
            Username: username,
            UserAttributes: [
                { Name: 'email', Value: email },
                { Name: 'email_verified', Value: 'true' },
            ],
            TemporaryPassword: temporaryPassword,
            MessageAction: 'SUPPRESS', // No welcome email
        });

        return await cognitoClient.send(command);
    }

    // Set user password
    static async setUserPassword(username: string, password: string) {
        const command = new AdminSetUserPasswordCommand({
            UserPoolId: env.cognitoUserPoolId,
            Username: username,
            Password: password,
            Permanent: true,
        });
    
        return await cognitoClient.send(command);
    }

    // Add user to group
    static async addUserToGroup(username: string, groupName: string) {
        const command = new AdminAddUserToGroupCommand({
            UserPoolId: env.cognitoUserPoolId,
            Username: username,
            GroupName: groupName,
        });

        return await cognitoClient.send(command);
    }

    // Get user details
    static async getUser(username: string) {
        const command = new AdminGetUserCommand({
            UserPoolId: env.cognitoUserPoolId,
            Username: username,
        }); 

        return await cognitoClient.send(command);
    }

    // Get user groups
    static async getUserGroups(username: string) {
        const command = new AdminListGroupsForUserCommand({
            UserPoolId: env.cognitoUserPoolId,
            Username: username,
        });

        return await cognitoClient.send(command);
    }

    // Authenticate user
    static async authenticateUser(username: string, password: string) {
        const command = new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: env.cognitoClientId,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
                SECRET_HASH: this.calculateSecretHash(username),
            },
        });

        return await cognitoClient.send(command);
    }

    // Respond to MFA challenge
    static async respondToMFAChallenge(session: string, mfaCode: string) {
        const command = new RespondToAuthChallengeCommand({
            ClientId: env.cognitoClientId,
            ChallengeName: 'SOFTWARE_TOKEN_MFA',
            Session: session,
            ChallengeResponses: {
                SOFTWARE_TOKEN_MFA_CODE: mfaCode,
                USERNAME: '', // Will be set by the calling function
            },
        });

        return await cognitoClient.send(command);
    }

    // Setup MFA for user
    static async setupMFA(accessToken: string) {
        const command = new AssociateSoftwareTokenCommand({
            AccessToken: accessToken,
        });

        return await cognitoClient.send(command);
    }

    // Verify MFA setup
    static async verifyMFA(accessToken: string, userCode: string) {
        const command = new VerifySoftwareTokenCommand({
            AccessToken: accessToken,
            UserCode: userCode,
            FriendlyDeviceName: 'Video App MFA Device',
        });

        return await cognitoClient.send(command);
    }

    // Calculate secret hash for Cognito
    private static calculateSecretHash(username: string): string {
        const crypto = require('crypto');
        return crypto
            .createHmac('SHA256', env.cognitoClientSecret)
            .update(username + env.cognitoClientId)
            .digest('base64');
    }

    // Get Google OAuth URL
    static getGoogleAuthUrl(): string {
        const domain = env.cognitoDomain;
        const clientId = env.cognitoClientId;
        const redirectUri = `${env.cognitoCallbackUrl}`;
        
        return `https://${env.cognitoDomain}.auth.${env.awsRegion}.amazoncognito.com/oauth2/authorize?` +
            `response_type=code&` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=openid+email+profile&` +
            `identity_provider=Google`;
    }

   // Exchange authorisation code for tokens
    static async exchangeCodeForTokens(code: string) {
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: env.cognitoClientId,
            client_secret: env.cognitoClientSecret,
            code: code,
            redirect_uri: env.cognitoCallbackUrl,
        });

        const response = await fetch(`https://${env.cognitoDomain}.auth.${env.awsRegion}.amazoncognito.com/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        return await response.json();
    }

    // Get user info from Google token
    static async getUserInfo(accessToken: string) {
        const response = await fetch(`https://${env.cognitoDomain}.auth.${env.awsRegion}.amazoncognito.com/oauth2/userInfo`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        return await response.json();
    }
}