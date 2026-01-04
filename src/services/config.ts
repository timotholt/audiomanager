import fs from 'fs-extra';
import { getProjectPaths } from '../utils/paths.js';

// Minimal shape for .moo/config.json used by M2.5
export interface ElevenLabsProviderConfig {
    api_key: string;
    api_url?: string;
}

export interface MooConfig {
    providers?: {
        elevenlabs?: ElevenLabsProviderConfig;
    };
}

export async function loadConfig(projectRoot: string): Promise<MooConfig> {
    const paths = getProjectPaths(projectRoot);
    const configPath = paths.moo.config;

    if (!(await fs.pathExists(configPath))) {
        return {};
    }

    const data = await fs.readJson(configPath);
    // We keep validation light here; JSON Schema could be added later if needed
    return data as MooConfig;
}

export async function saveConfig(projectRoot: string, config: MooConfig): Promise<void> {
    const paths = getProjectPaths(projectRoot);
    await fs.ensureDir(paths.moo.dir);
    await fs.writeJson(paths.moo.config, config, { spaces: 2 });
}
