#!/usr/bin/env node

/**
 * External API Service Entry Point
 * 
 * This service handles external API integrations:
 * - VirusTotal file scanning
 * - Future external API integrations
 * - File validation services
 */

import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { checkFileWithVirusTotal } from "../utils/vtChecker";
import { env } from "../config/env";
import { writeFile, unlink } from 'fs/promises';
import * as path from 'path';

console.log('Starting External API Service...');
console.log('Environment:', process.env.NODE_ENV || 'development');

const app = new Hono();

// Health check endpoint
app.get("/health", (c) => {
    return c.json({ 
        status: "healthy", 
        service: "external-api-service",
        timestamp: new Date().toISOString(),
        version: "1.0.0"
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
            console.log('VirusTotal API key not configured - returning safe result');
            return c.json({ 
                scanned: false,
                isMalicious: false,
                maliciousCount: 0,
                totalVendors: 0,
                fileName: fileName,
                message: 'VirusTotal API key not configured'
            });
        }

        // Create temporary file
        const tempDir = '/tmp';
        const tempPath = path.join(tempDir, `scan_${Date.now()}_${fileName}`);
        
        try {
            const buff = Buffer.from(await file.arrayBuffer());
            await writeFile(tempPath, buff);

            console.log(`Scanning file: ${fileName} (${file.size} bytes)`);
            
            // Perform VirusTotal scan
            const scanResult = await checkFileWithVirusTotal(tempPath, env.virusTotalApiKey);

            console.log(`VirusTotal scan result for ${fileName}:`, scanResult);

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
            isMalicious: false,
            fileName: 'unknown'
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
        
        console.log(`File validation for ${fileName}: ${isValid ? 'valid' : 'invalid'}`);
        
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

// Service info endpoint
app.get("/info", (c) => {
    return c.json({
        service: "External API Service",
        version: "1.0.0",
        endpoints: [
            "GET /health - Health check",
            "POST /scan/virustotal - VirusTotal file scan",
            "POST /validate/file - Basic file validation",
            "GET /info - Service information"
        ],
        features: [
            "VirusTotal integration",
            "File validation",
            "Health monitoring"
        ]
    });
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
    console.log(`Service info: http://localhost:${info.port}/info`);
};

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    process.exit(0);
});

serve(options, listeningCallback);
