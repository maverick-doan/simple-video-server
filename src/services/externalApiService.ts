import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { checkFileWithVirusTotal } from "../utils/vtChecker";
import { env } from "../config/env";
import { writeFile, unlink } from 'fs/promises';
import * as path from 'path';

const app = new Hono();

// Health check endpoint
app.get("/health", (c) => {
    return c.json({ 
        status: "healthy", 
        service: "external-api-service",
        timestamp: new Date().toISOString()
    });
});

// VirusTotal scan endpoint
app.post("/scan/virustotal", async (c) => {
    try {
        const form = await c.req.parseBody();
        const file = form.file as File;
        const fileName = form.fileName as string || 'unknown';

        if (!file) {
            return c.json({ error: 'No file provided' }, 400);
        }

        if (!env.virusTotalApiKey) {
            return c.json({ 
                error: 'VirusTotal API key not configured',
                scanned: false,
                isMalicious: false
            }, 400);
        }

        // Create temporary file
        const tempDir = '/tmp';
        const tempPath = path.join(tempDir, `scan_${Date.now()}_${fileName}`);
        
        try {
            const buff = Buffer.from(await file.arrayBuffer());
            await writeFile(tempPath, buff);

            // Perform VirusTotal scan
            const scanResult = await checkFileWithVirusTotal(tempPath, env.virusTotalApiKey);

            // Clean up temp file
            await unlink(tempPath);

            return c.json({
                scanned: scanResult.scanned,
                isMalicious: scanResult.isMalicious,
                maliciousCount: scanResult.maliciousCount,
                totalVendors: scanResult.totalVendors,
                fileName: fileName
            });

        } catch (error) {
            // Clean up temp file on error
            try { await unlink(tempPath); } catch {}
            throw error;
        }

    } catch (error) {
        console.error('VirusTotal scan error:', error);
        return c.json({ 
            error: 'Scan failed',
            scanned: false,
            isMalicious: false
        }, 500);
    }
});

// Simple file validation endpoint
app.post("/validate/file", async (c) => {
    try {
        const form = await c.req.parseBody();
        const file = form.file as File;
        const fileName = form.fileName as string || 'unknown';

        if (!file) {
            return c.json({ error: 'No file provided' }, 400);
        }

        // Basic file validation
        const isValid = file.size > 0 && file.size < 100 * 1024 * 1024; // 100MB limit
        
        return c.json({
            valid: isValid,
            fileName: fileName,
            size: file.size,
            type: file.type
        });

    } catch (error) {
        console.error('File validation error:', error);
        return c.json({ 
            error: 'Validation failed',
            valid: false
        }, 500);
    }
});

// Error handling
app.onError((err, c) => {
    console.error('External API Service Error:', err);
    return c.json({
        error: "Internal Server Error",
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    }, 500);
});

app.notFound((c) => {
    return c.json({
        error: "Not Found",
        message: "Endpoint not found"
    }, 404);
});

// Start the server
const port = parseInt(process.env.PORT || "3001");
const options = {
    fetch: app.fetch,
    port: port
};

const listeningCallback = (info: any) => {
    console.log(`External API Service running on port ${info.port}`);
    console.log(`Health check: http://localhost:${info.port}/health`);
    console.log(`VirusTotal scan: http://localhost:${info.port}/scan/virustotal`);
};

serve(options, listeningCallback);
