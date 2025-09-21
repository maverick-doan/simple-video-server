import type { Context } from "hono";
import { getUserByUsernameOrEmail } from "../models/userModel";
import * as bcrypt from 'bcrypt';
import { signJwt } from "../utils/jwt";
import type { AppBindings } from "../config/app";
import type { LoginRequest } from "../types/user";
import { redisService } from "../cache/redis";

function isValidLoginRequest(body: unknown): body is LoginRequest {
    if (!body || typeof body !== 'object') return false;
    const { username, password } = body as any;
    return (
        typeof username === 'string' &&
        typeof password === 'string' &&
        username.length > 0 &&
        password.length > 0
    );
}

export async function login(c: Context<{ Variables: AppBindings }>) {
    try {
        const body = await c.req.json();
        if (!isValidLoginRequest(body)) {
            return c.json({ error: 'Invalid request body' }, 400);
        }

        const username = body.username.trim();
        const password = body.password.trim();
        
        const user = await getUserByUsernameOrEmail(username);
        if (!user) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        const pwdMatched = await bcrypt.compare(password, user.password_hash);

        if (!pwdMatched) {
            return c.json({ error: 'Invalid credentials' }, 401);
        }

        const token = signJwt({ 
            sub: user.id, 
            username: user.username, 
            email: user.email, 
            role: user.role,
            authProvider: user.auth_provider
          });

        return c.json({ token }, 200);

    } catch (err) {
        console.error('Login error:', err);
        if (err instanceof Error) {
            return c.json({
                error: "Bad request"
            }, 400);
        }
        return c.json({
            error: "Internal server error"
        }, 500);
    }
}

export async function me(c: Context<{ Variables: AppBindings }>) {
    try {
        const user = c.get('user');
        if (!user) {
            return c.json({ error: 'Unauthorized' }, 401);
        }
        return c.json({ user });
    } catch (err) {
        console.error('Me endpoint error:', err);
        return c.json({ error: 'Internal server error' }, 500);
    }
}

export async function logout(c: Context<{ Variables: AppBindings }>) {
    try {
        const user = c.get('user');
        if (!user) {
            return c.json({
                errror: "Unauthorized"
            }, 401);
        }

        const token = c.req.header('Authorization')?.split(' ')[1];
        if (!token) {
            return c.json({
                error: "Unauthorized"
            }, 401);
        }

        const isBlacklisted = await redisService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            return c.json({
                error: "Unauthorized"
            }, 401);
        }

        await redisService.blacklistToken(token, 3600);
        return c.json({
            message: "Logged out successfully"
        }, 200);
    } catch (err) {
        console.error('Logout error:', err);
        return c.json({
            error: "Internal server error"
        }, 500);
    }
}