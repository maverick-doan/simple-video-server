import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtUser } from '../types/user';
import type { Secret, SignOptions } from 'jsonwebtoken';

export function signJwt(user: JwtUser, expiresIn: string = '1h') {
    return jwt.sign(user, env.jwtSecret as Secret, { expiresIn } as SignOptions);
}

export function verifyJwt(token: string): JwtUser {
    return jwt.verify(token, env.jwtSecret as Secret) as JwtUser;
}