import type { Context, Next } from 'hono';
import { verifyJwt } from '../utils/jwt';
import type { AppBindings } from '../config/app';

export async function requireAuth(c: Context<{ Variables: AppBindings }>, next: Next) {
    const authHeader = c.req.header('Authorization') || c.req.header('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
    if (!token) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    try {
        const jwtUser = verifyJwt(token);
        c.set('user', jwtUser);
        await next();
    } catch {
        return c.json({ error: 'Unauthorized' }, 401);
    }
}