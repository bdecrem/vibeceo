/**
 * Hume EVI Client
 *
 * Handles WebSocket connection to Hume's Empathic Voice Interface (EVI)
 * for interactive voice Q&A after podcasts.
 *
 * Key features:
 * - Uses same voice as TTS podcasts for consistency
 * - Direct browser connection via access tokens (no proxy server needed)
 * - Audio capture, streaming, and playback
 */

import { Hume, HumeClient } from 'hume';

export interface HumeEVIConfig {
  /** Access token from /api/hume-token */
  accessToken: string;

  /** Optional EVI config ID (for pre-configured voice/prompt) */
  configId?: string;

  /** Optional voice specification */
  voice?: {
    id?: string;
    name?: string;
    provider?: 'HUME_AI' | 'CUSTOM_VOICE';
  };

  /** Initial system prompt / instructions */
  systemPrompt?: string;

  /** Callbacks */
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: Hume.empathicVoice.SubscribeEvent) => void;
  onTranscriptDelta?: (text: string) => void;
  onAudioDelta?: (audioData: ArrayBuffer) => void;
  onUserMessage?: (text: string) => void;
  onAssistantMessage?: (text: string) => void;
  onResponseStarted?: () => void;
  onResponseFinished?: () => void;
}

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful assistant answering questions about the podcast the user is listening to. Keep responses concise and relevant. If you reference the research papers provided in the session instructions, clearly cite the paper title in your answer.';

/**
 * Audio player for streaming EVI audio responses
 */
class EVIAudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private nextPlayTime = 0;
  private sampleRate: number;

  constructor(sampleRate = 48000) {
    this.sampleRate = sampleRate;
  }

  async prepare(): Promise<void> {
    await this.ensureAudioContext();
  }

  private async ensureAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate
      });
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('🎛️ Hume AudioContext resumed');
      } catch (error) {
        console.error('❌ Failed to resume AudioContext:', error);
      }
    }

    return this.audioContext;
  }

  /**
   * Add audio chunk (base64 encoded) and play
   */
  async addChunk(base64Audio: string): Promise<void> {
    const audioContext = await this.ensureAudioContext();
    if (!audioContext) return;

    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 to AudioBuffer
      const audioBuffer = await this.pcm16ToAudioBuffer(audioContext, bytes.buffer);
      this.audioQueue.push(audioBuffer);

      if (!this.isPlaying) {
        void this.playNext();
      }
    } catch (error) {
      console.error('❌ Error adding Hume audio chunk:', error);
    }
  }

  private async playNext(): Promise<void> {
    const audioContext = await this.ensureAudioContext();

    if (!audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    const startTime = Math.max(this.nextPlayTime, audioContext.currentTime);
    source.start(startTime);
    this.nextPlayTime = startTime + audioBuffer.duration;

    this.currentSource = source;

    source.onended = () => {
      this.currentSource = null;
      void this.playNext();
    };
  }

  private async pcm16ToAudioBuffer(audioContext: AudioContext, pcm16Data: ArrayBuffer): Promise<AudioBuffer> {
    const int16Array = new Int16Array(pcm16Data);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = audioContext.createBuffer(1, float32Array.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    return audioBuffer;
  }

  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
  }

  close(): void {
    this.stop();
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export class HumeEVIClient {
  private client: HumeClient | null = null;
  private socket: Hume.empathicVoice.chat.ChatSocket | null = null;
  private audioPlayer: EVIAudioPlayer;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isRecording = false;
  private config: HumeEVIConfig;
  private currentSystemPrompt: string;

  constructor(config: HumeEVIConfig) {
    this.config = config;
    this.audioPlayer = new EVIAudioPlayer();
    this.currentSystemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Connect to Hume EVI WebSocket
   */
  async connect(): Promise<void> {
    try {
      console.log('🔗 Connecting to Hume EVI...');

      // Create client with access token
      this.client = new HumeClient({
        accessToken: this.config.accessToken,
      });

      // Prepare audio player
      await this.audioPlayer.prepare();

      // Connect to EVI chat
      this.socket = await this.client.empathicVoice.chat.connect({
        configId: this.config.configId,
      });

      // Set up event handlers
      this.socket.on('open', () => {
        console.log('✅ Connected to Hume EVI');
        this.config.onConnected?.();

        // Send initial session settings if we have voice or system prompt
        if (this.config.voice || this.currentSystemPrompt) {
          void this.updateSessionSettings();
        }
      });

      this.socket.on('message', (message: Hume.empathicVoice.SubscribeEvent) => {
        this.handleMessage(message);
      });

      this.socket.on('error', (error: Error) => {
        console.error('❌ Hume EVI error:', error);
        this.config.onError?.(error);
      });

      this.socket.on('close', () => {
        console.log('🔌 Disconnected from Hume EVI');
        this.config.onDisconnected?.();
      });

    } catch (error) {
      console.error('❌ Failed to connect to Hume EVI:', error);
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Update session settings (voice, system prompt)
   */
  private async updateSessionSettings(): Promise<void> {
    if (!this.socket) return;

    try {
      // Build session settings - the type field is required by the SDK
      const settings = {
        type: 'session_settings' as const,
        systemPrompt: this.currentSystemPrompt || undefined,
        voice: this.config.voice || undefined,
      };

      await this.socket.sendSessionSettings(settings);
      console.log('⚙️ Hume EVI session settings updated');
    } catch (error) {
      console.error('❌ Failed to update session settings:', error);
    }
  }

  /**
   * Handle incoming messages from EVI
   */
  private handleMessage(message: Hume.empathicVoice.SubscribeEvent): void {
    console.log('📥 Hume EVI message:', message.type);
    this.config.onMessage?.(message);

    switch (message.type) {
      case 'audio_output':
        if (message.data) {
          console.log('🔊 Received Hume audio chunk');
          void this.audioPlayer.addChunk(message.data);
          // Also notify callback with decoded data if needed
          const binaryString = atob(message.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          this.config.onAudioDelta?.(bytes.buffer);
        }
        break;

      case 'user_message':
        if (message.message?.content) {
          console.log('🗣️ User said:', message.message.content);
          this.config.onUserMessage?.(message.message.content);
        }
        break;

      case 'assistant_message':
        if (message.message?.content) {
          console.log('🤖 Assistant:', message.message.content);
          this.config.onAssistantMessage?.(message.message.content);
          this.config.onTranscriptDelta?.(message.message.content);
        }
        break;

      case 'assistant_end':
        console.log('✅ Hume response complete');
        this.config.onResponseFinished?.();
        break;

      case 'error':
        console.error('❌ Hume EVI error:', message);
        this.config.onError?.(new Error((message as any).message || 'Unknown EVI error'));
        break;

      default:
        console.log('📨 Unhandled Hume message type:', message.type);
    }
  }

  /**
   * Start recording and streaming audio to EVI
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn('⚠️ Already recording');
      return;
    }

    try {
      console.log('🎤 Requesting microphone access for Hume EVI...');

      // Get audio stream with echo cancellation and noise suppression
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000, // Hume prefers 16kHz
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      console.log('✅ Microphone access granted');

      // Determine best MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      console.log('🎙️ Using MIME type:', mimeType);

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
      });

      // Send audio chunks to EVI
      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && this.socket && this.isRecording) {
          try {
            // Convert Blob to base64
            const arrayBuffer = await event.data.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(arrayBuffer)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            // Send to Hume EVI
            await this.socket.sendAudioInput({ data: base64 });
          } catch (error) {
            console.error('❌ Error sending audio to Hume:', error);
          }
        }
      };

      // Start recording with small timeslice for low latency
      this.mediaRecorder.start(100); // 100ms chunks
      this.isRecording = true;
      console.log('🎤 Recording started for Hume EVI');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    if (!this.isRecording) {
      console.warn('⚠️ Not currently recording');
      return;
    }

    console.log('🛑 Stopping recording...');
    this.isRecording = false;

    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Signal end of user turn
    if (this.socket) {
      try {
        // Hume EVI uses VAD to detect end of speech, but we can send a user interrupt
        // to signal we're done speaking
        console.log('📤 Signaling end of user input');
      } catch (error) {
        console.error('❌ Error signaling end of input:', error);
      }
    }

    console.log('✅ Recording stopped');
  }

  /**
   * Update system prompt / instructions
   */
  setInstructions(instructions: string): void {
    const normalized = instructions?.trim();
    if (!normalized) return;

    this.currentSystemPrompt = normalized;

    if (this.socket) {
      void this.updateSessionSettings();
    }
  }

  /**
   * Set additional context (e.g., paper content)
   */
  async setContext(context: string): Promise<void> {
    if (!this.socket || !context?.trim()) return;

    try {
      console.log('📤 Sending context to Hume EVI');
      // Send as a user message with context
      await this.socket.sendUserInput(context);
    } catch (error) {
      console.error('❌ Failed to send context:', error);
    }
  }

  /**
   * Disconnect from EVI
   */
  disconnect(): void {
    if (this.isRecording) {
      this.stopRecording();
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.audioPlayer.close();
    this.client = null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket !== null;
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Cancel current response
   */
  cancelResponse(): void {
    this.audioPlayer.stop();
    // EVI doesn't have explicit response cancel, but we can stop audio playback
  }
}

export default HumeEVIClient;
