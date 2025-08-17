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
    isMalicious: boolean;
    maliciousCount: number;
    totalVendors: number;
}

export async function checkFileWithVirusTotal(filePath: string, apiKey: string): Promise<VirusScanResult> {
    try {
        const fileBuffer = await readFile(filePath);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        const url = `${VT_API_FILE_URL}/${fileHash}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-apikey': apiKey,
            },
        });

        if (!response.ok) {
            console.error('Failed to check file with VirusTotal:', response.statusText);
            if (response.status === 404) {
                return {
                    isMalicious: false,
                    maliciousCount: 0,
                    totalVendors: 0,
                };
            }
        }

        const data = await response.json() as VirusTotalResponse;

        const lastAnalysisStats = data.data.attributes.last_analysis_stats;
        const isMalicious = lastAnalysisStats.malicious > 0;
        const maliciousCount = lastAnalysisStats.malicious;
        const totalVendors = lastAnalysisStats.malicious + lastAnalysisStats.suspicious + lastAnalysisStats.harmless + lastAnalysisStats.undetected + lastAnalysisStats.timeout;
        return {
            isMalicious,
            maliciousCount,
            totalVendors,
        };

    } catch (error) {
        console.error('Error checking file with VirusTotal:', error);
        return {
            isMalicious: false,
            maliciousCount: 0,
            totalVendors: 0
        };
    }
}