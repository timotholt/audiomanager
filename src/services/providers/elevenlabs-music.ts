import type { MusicSettings } from './provider-interface.js';
import { ElevenLabsCommonApi } from './elevenlabs-common.js';

export class ElevenLabsMusicApi {
  private common: ElevenLabsCommonApi;

  constructor(common: ElevenLabsCommonApi) {
    this.common = common;
  }

  async generateMusic(prompt: string, settings?: MusicSettings): Promise<Buffer> {
    // ElevenLabs music compose endpoint
    // https://elevenlabs.io/docs/api-reference/music/compose
    const path = '/music/compose';

    const durationSeconds = settings?.duration_seconds ?? 60; // default 60s if not specified
    const musicLengthMs = Math.min(Math.max(durationSeconds * 1000, 10000), 300000); // 10–300s bounds

    const body: Record<string, unknown> = {
      prompt,
      music_length_ms: musicLengthMs,
      model_id: 'music_v1',
    };

    // In the future we can map additional settings like force_instrumental here.

    return this.common.getAudio(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
