import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtUser } from '../types/user';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { redisService } from '../cache/redis';

export function signJwt(user: JwtUser, expiresIn: number = 3600) {
    return jwt.sign(user, env.jwtSecret as Secret, { expiresIn } as SignOptions);
}

export async function verifyJwt(token: string): Promise<JwtUser> {
    const isBlacklisted = await redisService.isTokenBlacklisted(token);
    if (isBlacklisted) {
        throw new Error('Token is blacklisted');
    }
    return jwt.verify(token, env.jwtSecret as Secret) as JwtUser;
}