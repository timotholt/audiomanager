import type { SFXSettings } from './provider-interface.js';
import { ElevenLabsCommonApi } from './elevenlabs-common.js';

export class ElevenLabsSfxApi {
  private common: ElevenLabsCommonApi;

  constructor(common: ElevenLabsCommonApi) {
    this.common = common;
  }

  async generateSFX(prompt: string, settings?: SFXSettings): Promise<Buffer> {
    const path = '/sound-generation';

    const body = {
      text: prompt,
      duration_seconds: settings?.duration_seconds || 5,
      prompt_influence: settings?.prompt_influence || 0.3,
    };

    return this.common.getAudio(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
