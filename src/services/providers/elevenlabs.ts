import type {
  AudioProvider,
  VoiceSettings,
  MusicSettings,
  SFXSettings,
  QuotaInfo,
} from './provider-interface.js';
import { ElevenLabsCommonApi } from './elevenlabs-common.js';
import { ElevenLabsDialogApi } from './elevenlabs-dialog.js';
import { ElevenLabsMusicApi } from './elevenlabs-music.js';
import { ElevenLabsSfxApi } from './elevenlabs-sfx.js';

/**
 * ElevenLabs API client
 * Implements the AudioProvider interface for ElevenLabs text-to-speech and sound generation
 * by composing smaller domain-specific APIs.
 */

export class ElevenLabsProvider implements AudioProvider {
  private common: ElevenLabsCommonApi;
  private dialogApi: ElevenLabsDialogApi;
  private musicApi: ElevenLabsMusicApi;
  private sfxApi: ElevenLabsSfxApi;

  constructor(apiKey: string, apiUrl?: string) {
    this.common = new ElevenLabsCommonApi({ apiKey, apiUrl });
    this.dialogApi = new ElevenLabsDialogApi(this.common);
    this.musicApi = new ElevenLabsMusicApi(this.common);
    this.sfxApi = new ElevenLabsSfxApi(this.common);
  }

  /**
   * Generate dialogue audio using ElevenLabs TTS
   */
  async generateDialogue(
    text: string,
    voiceId: string,
    settings?: VoiceSettings
  ): Promise<Buffer> {
    return this.dialogApi.generateDialogue(text, voiceId, settings);
  }

  /**
   * Generate music audio using ElevenLabs
   */
  async generateMusic(prompt: string, settings?: MusicSettings): Promise<Buffer> {
    return this.musicApi.generateMusic(prompt, settings);
  }

  /**
   * Generate SFX audio using ElevenLabs sound effects API
   */
  async generateSFX(prompt: string, settings?: SFXSettings): Promise<Buffer> {
    return this.sfxApi.generateSFX(prompt, settings);
  }

  /**
   * Get current quota information
   */
  async getQuota(): Promise<QuotaInfo> {
    return this.common.getQuota();
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<Array<{ voice_id: string; name: string; category?: string }>> {
    const data = await this.common.getJson<{ voices?: Array<{ voice_id: string; name: string; category?: string }> }>('/voices');
    return data.voices || [];
  }
}

/**
 * Create an ElevenLabs provider instance from config
 */
export function createElevenLabsProvider(apiKey: string, apiUrl?: string): AudioProvider {
  return new ElevenLabsProvider(apiKey, apiUrl);
}
