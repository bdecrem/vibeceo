/**
 * Realtime Audio Client
 * Handles WebSocket connection to OpenAI Realtime API via proxy server
 * Manages audio recording, playback, and transcription
 */

export interface RealtimeAudioConfig {
  wsUrl?: string;
  onTranscriptDelta?: (text: string) => void;
  onAudioDelta?: (audioData: ArrayBuffer) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onAudioCommitted?: () => void;
  onResponseStarted?: () => void;
  onResponseFinished?: () => void;
}

export class RealtimeAudioClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private isRecording = false;
  private config: RealtimeAudioConfig;
  private recordedAudioData: Float32Array[] = [];

  constructor(config: RealtimeAudioConfig = {}) {
    // Default to port 3001 for WebSocket server
    const defaultWsUrl = typeof window !== 'undefined'
      ? `ws://${window.location.hostname}:3001`
      : 'ws://localhost:3001';

    this.config = {
      wsUrl: config.wsUrl || defaultWsUrl,
      ...config,
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔗 Connecting to WebSocket:', this.config.wsUrl);
        this.ws = new WebSocket(this.config.wsUrl!);

        this.ws.onopen = () => {
          console.log('✅ Connected to Realtime Audio WebSocket');
          this.config.onConnected?.();

          // Configure session after connection
          console.log('⚙️ Configuring session...');
          this.configureSession();
          resolve();
        };

        this.ws.onmessage = async (event) => {
          try {
            const rawData = event.data;
            let textData: string | null = null;

            if (typeof rawData === 'string') {
              textData = rawData;
            } else if (rawData instanceof Blob) {
              textData = await rawData.text();
            } else if (rawData instanceof ArrayBuffer) {
              textData = new TextDecoder().decode(rawData);
            } else if (ArrayBuffer.isView(rawData)) {
              textData = new TextDecoder().decode(rawData as ArrayBufferView);
            } else if (rawData && typeof rawData === 'object' && 'data' in rawData) {
              const possibleBuffer = (rawData as { data: ArrayBuffer | ArrayBufferView }).data;
              if (possibleBuffer instanceof ArrayBuffer) {
                textData = new TextDecoder().decode(possibleBuffer);
              } else if (ArrayBuffer.isView(possibleBuffer)) {
                textData = new TextDecoder().decode(possibleBuffer as ArrayBufferView);
              }
            }

            if (!textData) {
              console.warn('⚠️ Received unsupported message format from WebSocket:', rawData);
              return;
            }

            this.handleMessage(textData);
          } catch (err) {
            console.error('❌ Error processing incoming WebSocket message:', err);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.config.onError?.(new Error('WebSocket connection error'));
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('🔌 Disconnected from Realtime Audio, code:', event.code, 'reason:', event.reason);
          this.config.onDisconnected?.();
        };
      } catch (error) {
        console.error('❌ Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.isRecording) {
      this.stopRecording();
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Configure Realtime API session
   */
  private configureSession(): void {
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are a helpful assistant answering questions about the podcast the user is listening to. Keep responses concise and relevant.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        }
      }
    };

    console.log('📤 Sending session config:', JSON.stringify(sessionConfig, null, 2));
    this.send(sessionConfig);
  }

  /**
   * Start recording audio from microphone
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn('⚠️ Already recording');
      return;
    }

    try {
      console.log('🎤 Requesting microphone access...');

      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 24000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      console.log('✅ Microphone access granted');

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });

      console.log('✅ Audio context created, sample rate:', this.audioContext.sampleRate);

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor for audio data
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      let chunkCount = 0;

      processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = this.floatTo16BitPCM(inputData);
        const base64Audio = this.arrayBufferToBase64(pcm16);

        chunkCount++;
        if (chunkCount % 10 === 0) {
          console.log(`📊 Sent ${chunkCount} audio chunks`);
        }

        // Send audio chunk to server
        this.send({
          type: 'input_audio_buffer.append',
          audio: base64Audio
        });
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log('🎤 Started recording - speak now!');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop recording audio
   */
  stopRecording(): void {
    if (!this.isRecording) {
      console.warn('⚠️ Not currently recording');
      return;
    }

    console.log('🛑 Stopping recording...');
    this.isRecording = false;

    // Commit audio buffer - this triggers AI response
    console.log('📤 Committing audio buffer to trigger AI response...');
    this.send({ type: 'input_audio_buffer.commit' });

    // Also explicitly request a response
    console.log('📤 Requesting response from AI...');
    this.send({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    });

    // Clean up audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    console.log('✅ Stopped recording and requested AI response');
  }

  /**
   * Send a message to the WebSocket server
   */
  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Log all messages except audio data (too verbose)
      if (data.type !== 'input_audio_buffer.append') {
        console.log('📤 Sending:', data.type, data);
      }
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('⚠️ Cannot send, WebSocket not open. State:', this.ws?.readyState);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      console.log('📥 Received message type:', message.type);

      switch (message.type) {
        case 'response.audio.delta':
        case 'response.output_audio.delta':
          console.log('🔊 Received audio delta, size:', message.delta?.length || 0);
          if (message.delta) {
            const audioData = this.base64ToArrayBuffer(message.delta);
            console.log('🔊 Decoded audio data, bytes:', audioData.byteLength);
            this.config.onAudioDelta?.(audioData);
          }
          break;

        case 'response.audio_transcript.delta':
        case 'response.output_audio_transcript.delta':
        case 'response.text.delta':
          console.log('📝 Received transcript delta:', message.delta);
          if (message.delta) {
            this.config.onTranscriptDelta?.(message.delta);
          }
          break;

        case 'response.audio_transcript.done':
        case 'response.output_audio_transcript.done':
          console.log('✅ Transcript complete:', message.transcript);
          break;

        case 'response.audio.done':
        case 'response.output_audio.done':
          console.log('✅ Audio complete');
          break;

        case 'response.done':
          console.log('✅ Response complete');
          this.config.onResponseFinished?.();
          break;

        case 'conversation.item.created':
          console.log('💬 Conversation item created:', message.item?.type);
          break;

        case 'response.created':
          console.log('🎬 Response started');
          this.config.onResponseStarted?.();
          break;

        case 'input_audio_buffer.committed':
          console.log('✅ Audio buffer committed');
          this.config.onAudioCommitted?.();
          break;

        case 'input_audio_buffer.speech_started':
          console.log('🗣️ Speech detected');
          this.config.onSpeechStart?.();
          break;

        case 'input_audio_buffer.speech_stopped':
          console.log('🤐 Speech stopped');
          this.config.onSpeechEnd?.();
          break;

        case 'error':
          console.error('❌ API Error:', message);
          this.config.onError?.(new Error(message.error?.message || 'Unknown error'));
          break;

        case 'session.created':
        case 'session.updated':
          console.log('✅ Session:', message.type);
          break;

        default:
          console.log('📨 Unhandled message type:', message.type, message);
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  }

  /**
   * Convert Float32Array to 16-bit PCM
   */
  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return buffer;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Create a response with custom instructions
   */
  createResponse(instructions: string): void {
    this.send({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        instructions
      }
    });
  }

  /**
   * Cancel the current response
   */
  cancelResponse(): void {
    this.send({ type: 'response.cancel' });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

/**
 * Audio Player for streaming PCM16 audio
 */
export class StreamingAudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private nextPlayTime = 0;

  constructor() {}

  /**
   * Ensure audio context exists and is running (required for autoplay policies)
   */
  async prepare(): Promise<void> {
    await this.ensureAudioContext();
  }

  private async ensureAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('🎛️ AudioContext resumed');
      } catch (error) {
        console.error('❌ Failed to resume AudioContext:', error);
      }
    }

    return this.audioContext;
  }

  /**
   * Add audio chunk to the queue and play
   */
  async addChunk(pcm16Data: ArrayBuffer): Promise<void> {
    const audioContext = await this.ensureAudioContext();
    if (!audioContext) {
      console.error('❌ No audio context available');
      return;
    }

    try {
      console.log('🎵 Adding audio chunk, bytes:', pcm16Data.byteLength);

      // Convert PCM16 to AudioBuffer
      const audioBuffer = await this.pcm16ToAudioBuffer(audioContext, pcm16Data);
      console.log('🎵 Converted to AudioBuffer, duration:', audioBuffer.duration, 'seconds');

      this.audioQueue.push(audioBuffer);
      console.log('🎵 Audio queue size:', this.audioQueue.length);

      if (!this.isPlaying) {
        console.log('▶️ Starting playback...');
        void this.playNext();
      }
    } catch (error) {
      console.error('❌ Error adding audio chunk:', error);
    }
  }

  /**
   * Play the next audio chunk in the queue
   */
  private async playNext(): Promise<void> {
    const audioContext = await this.ensureAudioContext();

    if (!audioContext || this.audioQueue.length === 0) {
      console.log('⏹️ Playback stopped - queue empty');
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    console.log('▶️ Playing audio chunk, duration:', audioBuffer.duration, 'seconds');

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    // Schedule playback
    const startTime = Math.max(this.nextPlayTime, audioContext.currentTime);
    console.log('⏰ Scheduled to play at:', startTime, 'current time:', audioContext.currentTime);
    source.start(startTime);
    this.nextPlayTime = startTime + audioBuffer.duration;

    this.currentSource = source;

    // Play next chunk when this one finishes
    source.onended = () => {
      console.log('✅ Audio chunk finished playing');
      this.currentSource = null;
      void this.playNext();
    };
  }

  /**
   * Convert PCM16 ArrayBuffer to AudioBuffer
   */
  private async pcm16ToAudioBuffer(audioContext: AudioContext, pcm16Data: ArrayBuffer): Promise<AudioBuffer> {
    const int16Array = new Int16Array(pcm16Data);
    const float32Array = new Float32Array(int16Array.length);

    // Convert Int16 to Float32 (-1.0 to 1.0)
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = audioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    return audioBuffer;
  }

  /**
   * Stop playback and clear queue
   */
  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }

    this.audioQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
  }

  /**
   * Close audio context
   */
  close(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
