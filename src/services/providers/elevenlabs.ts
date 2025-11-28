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
    settings?: VoiceSettings,
    modelId?: string
  ): Promise<Buffer> {
    return this.dialogApi.generateDialogue(text, voiceId, settings, modelId);
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
   * Get available voices (user's voices + shared library voices)
   */
  async getVoices(): Promise<Array<{ voice_id: string; name: string; category?: string; high_quality_base_model_ids?: string[] }>> {
    // Fetch user's own voices
    const userData = await this.common.getJson<{ voices?: Array<{ voice_id: string; name: string; category?: string; high_quality_base_model_ids?: string[] }> }>('/voices');
    const userVoices = userData.voices || [];
    
    // Fetch shared/library voices (these are curated v3 voices)
    // Using featured=true and page_size=100 to get quality voices
    let sharedVoices: Array<{ voice_id: string; name: string; category?: string; high_quality_base_model_ids?: string[] }> = [];
    try {
      const sharedData = await this.common.getJson<{ voices?: Array<{ voice_id: string; name: string; category?: string; high_quality_base_model_ids?: string[] }> }>('/shared-voices?page_size=100&featured=true');
      // Shared/featured voices are curated for v3 - mark them as v3 only
      // This way they only appear when v3 model is selected
      sharedVoices = (sharedData.voices || []).map(v => ({
        ...v,
        high_quality_base_model_ids: v.high_quality_base_model_ids || ['eleven_v3'],
        category: v.category || 'shared'
      }));
    } catch (err) {
      console.log('[ElevenLabs] Could not fetch shared voices:', err);
    }
    
    // Merge and dedupe by voice_id (user voices take priority)
    const voiceMap = new Map<string, { voice_id: string; name: string; category?: string; high_quality_base_model_ids?: string[] }>();
    for (const voice of sharedVoices) {
      voiceMap.set(voice.voice_id, voice);
    }
    for (const voice of userVoices) {
      voiceMap.set(voice.voice_id, voice); // User voices override shared
    }
    
    return Array.from(voiceMap.values());
  }
}

/**
 * Create an ElevenLabs provider instance from config
 */
export function createElevenLabsProvider(apiKey: string, apiUrl?: string): AudioProvider {
  return new ElevenLabsProvider(apiKey, apiUrl);
}
