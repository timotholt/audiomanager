import type { VoiceSettings } from './provider-interface.js';
import { ElevenLabsCommonApi } from './elevenlabs-common.js';

export class ElevenLabsDialogApi {
  private common: ElevenLabsCommonApi;

  constructor(common: ElevenLabsCommonApi) {
    this.common = common;
  }

  async generateDialogue(
    text: string,
    voiceId: string,
    settings?: VoiceSettings
  ): Promise<Buffer> {
    const path = `/text-to-speech/${voiceId}`;

    const body = {
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: settings || {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    };

    return this.common.getAudio(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
