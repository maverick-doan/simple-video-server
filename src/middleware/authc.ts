import type { Context, Next } from 'hono';
import { verifyJwt, verifyCognitoJwt } from '../utils/jwt';
import type { AppBindings } from '../config/app';
import jwt from 'jsonwebtoken';
import type { JwtUser } from '../types/user';

export async function requireAuth(c: Context<{ Variables: AppBindings }>, next: Next) {
    const authHeader = c.req.header('Authorization') || c.req.header('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : '';
    
    if (!token) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        // Decode token to check type without verification
        const decoded = jwt.decode(token) as any;
        
        if (!decoded) {
            return c.json({ error: 'Invalid token format' }, 401);
        }

        let jwtUser: JwtUser;

        if (decoded.token_use === 'access' || decoded.iss?.includes('cognito') || decoded.authProvider === 'cognito') {
            // Cognito token
            jwtUser = await verifyCognitoJwt(token);
        } else if (decoded.authProvider) {
            if (decoded.authProvider === 'local') {
                jwtUser = await verifyJwt(token);
            
            } else if (decoded.authProvider === 'cognito') {
                jwtUser = await verifyCognitoJwt(token);
            } else {
                return c.json({ error: 'Invalid token format' }, 401);
            }
        } else {
            // Fallback: try local JWT first
            try {
                jwtUser = await verifyJwt(token);
            } catch {
                // If local fails, try Cognito
                try {
                    jwtUser = await verifyCognitoJwt(token);
                } catch {
                    return c.json({ error: 'Invalid token format' }, 401);
                }
            }
        }
        
        c.set('user', jwtUser);
        await next();
    } catch (error) {
        console.error('Authentication error:', error);
        return c.json({ error: 'Unauthorized' }, 401);
    }
}