import type { Context, Next } from 'hono';
import type { AppBindings } from '../config/app';

export function requireRole(roles: Array<'admin' | 'user'>) {
  return async (c: Context<{ Variables: AppBindings }>, next: Next) => {
    const user = c.get('user');
    if (!user || !roles.includes(user.role)) return c.json({ error: 'Forbidden' }, 403);
    await next();
  };
}