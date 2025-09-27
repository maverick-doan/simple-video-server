import { pool } from '../db/pool';
import { v4 as uuid } from 'uuid';

export async function createUser(params: {
        username: string;
        email: string;
        authProvider: 'local' | 'cognito';
        cognitoSub?: string;
        role: 'admin' | 'user';
    }) {
        const id = uuid();
        const query = `
        INSERT INTO s109.users (id, username, email, auth_provider, cognito_sub, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, username, email, role, auth_provider, cognito_sub
        `;
        
        const values = [id, params.username, params.email, params.authProvider, params.cognitoSub, params.role];
        const result = await pool.query(query, values);
        return result.rows[0];
    }
    
export async function getUserByCognitoSub(cognitoSub: string) {
    const query = `SELECT id, username, email, role, auth_provider, cognito_sub FROM s109.users WHERE cognito_sub = $1`;
    const result = await pool.query(query, [cognitoSub]);
    return result.rows[0];
}

export async function getUserByUsernameOrEmail(identifier: string) {
    const query = `SELECT id, username, email, password_hash, role::text AS role FROM s109.users WHERE username = $1 OR email = $1`;
    const result = await pool.query(query, [identifier]);
    return result.rows[0] as {
        id: string;
        username: string;
        email: string;
        password_hash: string;
        role: 'admin' | 'user';
        auth_provider: 'local' | 'cognito';
    } | undefined; // Move to a separated user type in later stage
}

export async function getUserByEmail(email: string) {
    const query = `SELECT id, username, email, role::text AS role, auth_provider, cognito_sub FROM s109.users WHERE email = $1 AND is_deleted = FALSE`;
    const result = await pool.query(query, [email]);
    return result.rows[0] as {
        id: string;
        username: string;
        email: string;
        role: 'admin' | 'user';
        auth_provider: 'local' | 'cognito';
        cognito_sub?: string | null;
    } | undefined;
}

export async function getUserByUsername(username: string) {
    const query = `SELECT id, username, email, role::text AS role, auth_provider, cognito_sub FROM s109.users WHERE username = $1 AND is_deleted = FALSE`;
    const result = await pool.query(query, [username]);
    return result.rows[0] as {
        id: string;
        username: string;
        email: string;
        role: 'admin' | 'user';
        auth_provider: 'local' | 'cognito';
        cognito_sub?: string | null;
    } | undefined;
}