import axios from 'axios';

interface ElevenLabsProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultVoice?: string;
  defaultModel?: string;
}

interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

interface SynthesizeOptions extends VoiceSettings {
  voice_id?: string;
  voice?: string;
  model?: string;
  model_id?: string;
}

export interface SynthesizeResult {
  audioBuffer: Buffer;
  format: 'mp3';
  duration: number;
  metadata: {
    voice: string;
    model: string;
    voiceSettings: VoiceSettings;
    charactersUsed: number;
  };
  provider: 'elevenlabs';
}

export default class ElevenLabsProvider {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly defaultVoice: string;
  private readonly defaultModel: string;
  private initialized = false;

  constructor(config: ElevenLabsProviderConfig = {}) {
    this.apiKey = config.apiKey || process.env.ELEVENLABS_API_KEY;
    this.baseUrl = config.baseUrl || 'https://api.elevenlabs.io/v1';
    this.defaultVoice = config.defaultVoice || 'MF3mGyEYCl7XYWbV9V6O';
    this.defaultModel = config.defaultModel || 'eleven_turbo_v2_5';
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  async initialize(): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('ElevenLabs API key not provided');
      this.initialized = false;
      return false;
    }

    try {
      await axios.get(`${this.baseUrl}/user`, {
        headers: { 'xi-api-key': this.apiKey },
        timeout: 30000,
      });
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('ElevenLabs initialization failed:', error instanceof Error ? error.message : error);
      this.initialized = false;
      return false;
    }
  }

  async synthesize(text: string, options: SynthesizeOptions = {}): Promise<SynthesizeResult> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key is not configured');
    }

    if (!this.initialized) {
      const ok = await this.initialize();
      if (!ok) {
        throw new Error('ElevenLabs provider failed to initialize');
      }
    }

    const voice = options.voice_id || options.voice || this.defaultVoice;
    const model = options.model || options.model_id || this.defaultModel;

    const voiceSettings: VoiceSettings = {
      stability: options.stability ?? 0.5,
      similarity_boost: options.similarity_boost ?? 0.5,
      style: options.style ?? 0,
      use_speaker_boost: options.use_speaker_boost ?? true,
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voice}`,
        {
          text,
          model_id: model,
          voice_settings: voiceSettings,
        },
        {
          headers: {
            Accept: 'audio/mpeg',
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 30000,
        }
      );

      const audioBuffer = Buffer.from(response.data);
      const duration = this.estimateDuration(text);

      return {
        audioBuffer,
        format: 'mp3',
        duration,
        metadata: {
          voice,
          model,
          voiceSettings,
          charactersUsed: text.length,
        },
        provider: 'elevenlabs',
      };
    } catch (error: any) {
      if (error?.response?.status === 401) {
        throw new Error('ElevenLabs API key is invalid');
      }

      if (error?.response?.status === 429) {
        throw new Error('ElevenLabs rate limit exceeded');
      }

      if (error?.response?.status === 422) {
        throw new Error(`ElevenLabs validation error: ${JSON.stringify(error.response.data)}`);
      }

      throw new Error(`ElevenLabs synthesis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private estimateDuration(text: string): number {
    const words = text.split(/\s+/).filter(Boolean).length;
    const wordsPerMinute = 150;
    return (words / wordsPerMinute) * 60;
  }
}
