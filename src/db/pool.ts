import { Pool } from 'pg';
import { env } from '../config/env';

export const pool = new Pool({
    host: env.sharedDbHost,
    port: env.sharedDbPort,
    database: env.sharedDbName,
    user: env.sharedDbUser,
    password: env.sharedDbPassword,
    ssl: env.sharedDbSsl ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
});