import fs from 'fs-extra';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

export async function appendJsonl<T>(filePath: string, data: T): Promise<void> {
    const line = JSON.stringify(data) + '\n';
    await fs.appendFile(filePath, line, 'utf8');
}

export async function readJsonl<T>(filePath: string): Promise<T[]> {
    const results: T[] = [];
    if (!fs.existsSync(filePath)) return results;

    const fileStream = createReadStream(filePath);
    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    for await (const line of rl) {
        if (line.trim()) {
            try {
                results.push(JSON.parse(line));
            } catch {
                // Skip malformed lines or handle error?
                // Spec says "fix malformed JSONL lines manually", so we might want to warn.
                console.warn(`Warning: Malformed JSONL line in ${filePath}: ${line}`);
            }
        }
    }

    return results;
}

export async function ensureJsonlFile(filePath: string): Promise<void> {
    await fs.ensureFile(filePath);
}
