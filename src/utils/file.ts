import { mkdir, stat } from 'fs/promises';


export async function ensureDir(dirPath: string) {
    await mkdir(dirPath, { recursive: true });
}

export async function fileSizeBytes(filePath: string) {
    const stats = await stat(filePath);
    return stats.size;
}