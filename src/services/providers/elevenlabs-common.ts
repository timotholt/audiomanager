import type { QuotaInfo } from './provider-interface.js';

const DEFAULT_API_URL = 'https://api.elevenlabs.io/v1';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface ElevenLabsConfig {
  apiKey: string;
  apiUrl?: string;
}

export class ElevenLabsCommonApi {
  private apiKey: string;
  private apiUrl: string;

  constructor(config: ElevenLabsConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || DEFAULT_API_URL;
  }

  get baseUrl() {
    return this.apiUrl;
  }

  async getJson<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`ElevenLabs API error ${response.status}: ${text || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async getAudio(path: string, init: RequestInit = {}): Promise<Buffer> {
    const url = `${this.apiUrl}${path}`;
    return this.fetchWithRetry(url, {
      ...init,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
  }

  async getQuota(): Promise<QuotaInfo> {
    return this.getJson<QuotaInfo>('/user/subscription');
  }

  private async fetchWithRetry(url: string, options: RequestInit): Promise<Buffer> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, options);

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        lastError = error as Error;
        console.error(`ElevenLabs request attempt ${attempt}/${MAX_RETRIES} failed:`, error);

        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY_MS * attempt);
        }
      }
    }

    throw new Error(`Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
