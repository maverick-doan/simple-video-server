import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtUser } from '../types/user';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { redisService } from '../cache/redis';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Create Cognito JWT verifier (should be created once and reused)
const cognitoJwtVerifier = CognitoJwtVerifier.create({
    userPoolId: env.cognitoUserPoolId,
    tokenUse: "access", 
    clientId: env.cognitoClientId,
});

// Hydrate the verifier on startup to cache JWKS
cognitoJwtVerifier.hydrate().catch((err) => {
    console.error('Failed to hydrate Cognito JWT verifier:', err);
});

export async function verifyCognitoJwt(token: string): Promise<JwtUser> {
    try {
        const isBlacklisted = await redisService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            throw new Error('Token is blacklisted');
        }
        const payload = await cognitoJwtVerifier.verify(token, { clientId: env.cognitoClientId });
        return {
            sub: payload.sub,
            username: payload['cognito:username'] as string || payload.username as string || payload.email as string,
            email: payload.email as string,
            role: payload['cognito:groups']?.includes('Admin') ? 'admin' : 'user',
            authProvider: 'cognito'
        };
    } catch (error) {
        console.error('Cognito JWT verification failed:', error);
        throw new Error('Invalid Cognito token');
    }
}

export function signJwt(user: JwtUser, expiresIn: number = 3600) {
    return jwt.sign(user, env.jwtSecret as Secret, { expiresIn } as SignOptions);
}

export async function verifyJwt(token: string): Promise<JwtUser> {
    const isBlacklisted = await redisService.isTokenBlacklisted(token);
    if (isBlacklisted) {
        throw new Error('Token is blacklisted');
    }

    try {
        return jwt.verify(token, env.jwtSecret as Secret) as JwtUser;
    } catch (error) {
        throw new Error('Invalid token');
    }
}