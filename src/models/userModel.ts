import { pool } from '../db/pool';

export async function getUserByUsernameOrEmail(identifier: string) {
    const query = `SELECT id, username, email, password_hash, role::text AS role FROM n11562773_video_app.users WHERE username = $1 OR email = $1`;
    const result = await pool.query(query, [identifier]);
    return result.rows[0] as {
        id: string;
        username: string;
        email: string;
        password_hash: string;
        role: 'admin' | 'user';
    } | undefined; // Will move to a separated user type in later stage as user management is not yet in scope 
}