import { env } from '../config/env';

export interface VirusScanResult {
    scanned: boolean;
    isMalicious: boolean;
    maliciousCount: number;
    totalVendors: number;
    fileName: string;
    message?: string;
}

export interface FileValidationResult {
    valid: boolean;
    fileName: string;
    size: number;
    type: string;
}

export class ExternalApiClient {
    private static readonly EXTERNAL_API_BASE_URL = env.externalApiUrl || 'http://localhost:3001';

    /**
     * Scan a file using VirusTotal via external API service
     */
    static async scanFileWithVirusTotal(fileBuffer: Buffer, fileName: string): Promise<VirusScanResult> {
        const apiUrl = `${this.EXTERNAL_API_BASE_URL}/scan/virustotal`;
        console.log(`[ExternalAPIClient] Sending scan request to: ${apiUrl}`);
        console.log(`[ExternalAPIClient] File: ${fileName}, Size: ${fileBuffer.length} bytes`);
        
        try {
            const formData = new FormData();
            const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
            formData.append('file', blob, fileName);
            formData.append('fileName', fileName);

            console.log(`[ExternalAPIClient] FormData prepared, sending request...`);

            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            console.log(`[ExternalAPIClient] Response status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[ExternalAPIClient] External API error response:`, errorText);
                throw new Error(`External API service error: ${response.statusText}`);
            }

            const result = await response.json();
            console.log(`[ExternalAPIClient] Scan result received:`, result);
            
            return result as VirusScanResult;

        } catch (error) {
            console.error(`[ExternalAPIClient] Failed to scan file with external API service:`, error);
            if (error instanceof Error) {
                console.error(`[ExternalAPIClient] Error details:`, {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
            }
            
            // Check if it's a network error
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error(`[ExternalAPIClient] Network error - External API service may be unreachable`);
                console.error(`[ExternalAPIClient] Check if external-api service is running at: ${this.EXTERNAL_API_BASE_URL}`);
            }
            
            return {
                scanned: false,
                isMalicious: false,
                maliciousCount: 0,
                totalVendors: 0,
                fileName: fileName,
                message: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Validate a file using external API service
     */
    static async validateFile(fileBuffer: Buffer, fileName: string, fileType: string): Promise<FileValidationResult> {
        try {
            const formData = new FormData();
            const blob = new Blob([fileBuffer], { type: fileType });
            formData.append('file', blob, fileName);
            formData.append('fileName', fileName);

            const response = await fetch(`${this.EXTERNAL_API_BASE_URL}/validate/file`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`External API service error: ${response.statusText}`);
            }

            const result = await response.json();
            return result as FileValidationResult;

        } catch (error) {
            console.error('Failed to validate file with external API service:', error);
            return {
                valid: false,
                fileName: fileName,
                size: fileBuffer.length,
                type: fileType
            };
        }
    }

    /**
     * Check if external API service is healthy
     */
    static async checkHealth(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${this.EXTERNAL_API_BASE_URL}/health`, {
                method: 'GET',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            console.error('External API service health check failed:', error);
            return false;
        }
    }

    /**
     * Get service information
     */
    static async getServiceInfo(): Promise<any> {
        try {
            const response = await fetch(`${this.EXTERNAL_API_BASE_URL}/info`, {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error(`External API service error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get service info:', error);
            return null;
        }
    }
}
