import { pool } from '../db/pool';
import type { Video, Quality } from '../types/video';
import { v4 as uuid } from 'uuid';

type DbVideoRow = {
  id: string;
  owner_id: string;
  original_file_name: string;
  title: string;
  description: string | null;
  url: string;
  quality: Quality;
  duration_seconds: number;
  size_bytes: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};

function toVideo(r: DbVideoRow): Video {
  return {
    id: r.id,
    ownerId: r.owner_id,
    originalFileName: r.original_file_name,
    title: r.title,
    description: r.description ?? '',
    url: r.url,
    quality: r.quality,
    duration: r.duration_seconds,
    sizeBytes: Number(r.size_bytes),
    isDeleted: r.is_deleted,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export async function createVideo(params: {
    id?: string;
    ownerId: string;
    originalFileName: string;
    title: string;
    description?: string;
    url: string;
    quality: Quality;
    durationSeconds: number;
    sizeBytes: number;
}): Promise<Video> {
    const id = params.id ?? uuid();
    const q = `
        INSERT INTO videos (id, owner_id, original_file_name, title, description, url, quality, duration_seconds, size_bytes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
    `;

    const values = [
        id, params.ownerId, params.originalFileName, params.title, params.description ?? null,
        params.url, params.quality, params.durationSeconds, params.sizeBytes
    ];

    const { rows } = await pool.query<DbVideoRow>(q, values);

    if (!rows[0]) {
        throw new Error('Failed to create video');
    }
    return toVideo(rows[0]);
}

export async function getVideoById(id: string): Promise<Video | undefined> {
    const q = `SELECT * FROM videos WHERE id=$1 AND is_deleted=FALSE`;
    const { rows } = await pool.query<DbVideoRow>(q, [id]);
    return rows[0] ? toVideo(rows[0]) : undefined;
}

