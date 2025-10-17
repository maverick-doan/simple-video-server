// One of the requirements in scope is to interact with external APIs
// In fact this also checks if the instance you are running the API can make outbound internet connections
// This is a very simple implementation just for the above two purposes

import { readFile } from 'fs/promises';
import * as crypto from 'crypto';

const VT_API_FILE_URL = 'https://www.virustotal.com/api/v3/files';

interface VirusTotalResponse {
    data: {
        attributes: {
            last_analysis_stats: {
                malicious: number,
                suspicious: number,
                harmless: number,
                undetected: number,
                timeout: number
            }
        }
    }
}

export interface VirusScanResult {
    isMalicious: boolean,
    scanned: boolean,
    maliciousCount: number,
    totalVendors: number
}

export async function checkFileWithVirusTotal(filePath: string, apiKey: string): Promise<VirusScanResult> {
    console.log(`[VirusTotal] Starting scan for file: ${filePath}`);
    
    try {
        // Read and hash the file
        const fileBuffer = await readFile(filePath);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        console.log(`[VirusTotal] File hash (SHA256): ${fileHash}`);
        console.log(`[VirusTotal] File size: ${fileBuffer.length} bytes`);
        
        const url = `${VT_API_FILE_URL}/${fileHash}`;
        console.log(`[VirusTotal] Querying API: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-apikey': apiKey,
            },
        });

        console.log(`[VirusTotal] API Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            if (response.status === 404) {
                console.log(`[VirusTotal] File not found in VirusTotal database (404)`);
                console.log(`[VirusTotal] This is normal for new/unique files - treating as safe`);
                return {
                    isMalicious: false,
                    scanned: false,
                    maliciousCount: 0,
                    totalVendors: 0,
                };
            } else if (response.status === 401) {
                console.error(`[VirusTotal] Authentication failed - check API key`);
                return {
                    isMalicious: false,
                    scanned: false,
                    maliciousCount: 0,
                    totalVendors: 0,
                };
            } else if (response.status === 429) {
                console.error(`[VirusTotal] Rate limit exceeded`);
                return {
                    isMalicious: false,
                    scanned: false,
                    maliciousCount: 0,
                    totalVendors: 0,
                };
            } else {
                console.error(`[VirusTotal] Unexpected error: ${response.status} ${response.statusText}`);
                const errorText = await response.text();
                console.error(`[VirusTotal] Error details: ${errorText}`);
                return {
                    isMalicious: false,
                    scanned: false,
                    maliciousCount: 0,
                    totalVendors: 0,
                };
            }
        }

        const data = await response.json() as VirusTotalResponse;
        console.log(`[VirusTotal] Successfully retrieved scan results`);

        const lastAnalysisStats = data.data.attributes.last_analysis_stats;
        const isMalicious = lastAnalysisStats.malicious > 0;
        const maliciousCount = lastAnalysisStats.malicious;
        const totalVendors = lastAnalysisStats.malicious + lastAnalysisStats.suspicious + 
                            lastAnalysisStats.harmless + lastAnalysisStats.undetected + 
                            lastAnalysisStats.timeout;
        
        console.log(`[VirusTotal] Scan Results:`);
        console.log(`  - Malicious: ${lastAnalysisStats.malicious}`);
        console.log(`  - Suspicious: ${lastAnalysisStats.suspicious}`);
        console.log(`  - Harmless: ${lastAnalysisStats.harmless}`);
        console.log(`  - Undetected: ${lastAnalysisStats.undetected}`);
        console.log(`  - Total Vendors: ${totalVendors}`);
        console.log(`  - Is Malicious: ${isMalicious}`);
        
        return {
            isMalicious,
            scanned: true,
            maliciousCount,
            totalVendors,
        };

    } catch (error) {
        console.error(`[VirusTotal] Exception occurred:`, error);
        if (error instanceof Error) {
            console.error(`[VirusTotal] Error name: ${error.name}`);
            console.error(`[VirusTotal] Error message: ${error.message}`);
            console.error(`[VirusTotal] Error stack: ${error.stack}`);
        }
        return {
            isMalicious: false,
            scanned: false,
            maliciousCount: 0,
            totalVendors: 0
        };
    }
}