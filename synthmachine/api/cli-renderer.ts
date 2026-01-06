/**
 * CLI-specific offline renderer for Node.js environments.
 * Pure JavaScript implementation - no Web Audio API required.
 */

import type { Pattern, PatternStep } from '../core/types.js';

export interface RenderOptions {
  bpm?: number;
  bars?: number;
  sampleRate?: number;
}

type VoiceId = string;

/**
 * Simple voice trigger function type - returns samples to mix in
 */
type VoiceSynthFn = (sampleRate: number, velocity: number) => Float32Array;

/**
 * Create kick drum voice
 */
function createKickSynth(): VoiceSynthFn {
  return (sampleRate, velocity) => {
    const duration = 0.5;
    const length = Math.floor(duration * sampleRate);
    const samples = new Float32Array(length);
    const peak = velocity * 0.9;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;

      // Main body: sine with pitch sweep 160Hz -> 30Hz
      const freqMain = 30 + 130 * Math.exp(-t * 20);
      const phaseMain = 2 * Math.PI * freqMain * t;
      const envMain = Math.exp(-t * 5);
      const main = Math.sin(phaseMain) * envMain;

      // Sub layer: sine 50Hz -> 35Hz
      const freqSub = 35 + 15 * Math.exp(-t * 10);
      const phaseSub = 2 * Math.PI * freqSub * t;
      const envSub = Math.exp(-t * 4);
      const sub = Math.sin(phaseSub) * envSub * 0.7;

      // Click transient
      const click = t < 0.01 ? (Math.random() * 2 - 1) * Math.exp(-t * 500) * 0.3 : 0;

      samples[i] = (main + sub + click) * peak;
    }

    return samples;
  };
}

/**
 * Create snare drum voice
 */
function createSnareSynth(): VoiceSynthFn {
  return (sampleRate, velocity) => {
    const duration = 0.3;
    const length = Math.floor(duration * sampleRate);
    const samples = new Float32Array(length);
    const peak = velocity * 0.8;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;

      // Body tone with pitch sweep
      const freq = 120 + 130 * Math.exp(-t * 50);
      const phase = 2 * Math.PI * freq * t;
      const envTone = Math.exp(-t * 20);
      const tone = Math.sin(phase) * envTone * 0.5;

      // Noise component
      const envNoise = Math.exp(-t * 12);
      const noise = (Math.random() * 2 - 1) * envNoise;

      samples[i] = (tone + noise) * peak;
    }

    return samples;
  };
}

/**
 * Create clap voice
 */
function createClapSynth(): VoiceSynthFn {
  return (sampleRate, velocity) => {
    const duration = 0.2;
    const length = Math.floor(duration * sampleRate);
    const samples = new Float32Array(length);
    const peak = velocity * 0.7;

    // Multiple bursts for clap character
    const burstTimes = [0, 0.01, 0.02, 0.03];

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      burstTimes.forEach((bt, idx) => {
        if (t >= bt && t < bt + 0.1) {
          const localT = t - bt;
          const env = Math.exp(-localT * 30) * (idx === burstTimes.length - 1 ? 1 : 0.5);
          sample += (Math.random() * 2 - 1) * env;
        }
      });

      samples[i] = sample * peak;
    }

    return samples;
  };
}

/**
 * Create hi-hat voice
 */
function createHiHatSynth(type: 'closed' | 'open'): VoiceSynthFn {
  const duration = type === 'closed' ? 0.1 : 0.4;
  const decay = type === 'closed' ? 50 : 10;

  return (sampleRate, velocity) => {
    const length = Math.floor(duration * sampleRate);
    const samples = new Float32Array(length);
    const peak = velocity * 0.5;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * decay);
      // High-frequency noise
      const noise = Math.random() * 2 - 1;
      samples[i] = noise * env * peak;
    }

    return samples;
  };
}

/**
 * Create tom voice
 */
function createTomSynth(pitch: 'low' | 'mid' | 'high'): VoiceSynthFn {
  const freqMap = { low: 80, mid: 120, high: 180 };
  const baseFreq = freqMap[pitch];

  return (sampleRate, velocity) => {
    const duration = 0.4;
    const length = Math.floor(duration * sampleRate);
    const samples = new Float32Array(length);
    const peak = velocity * 0.7;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = baseFreq + baseFreq * 0.5 * Math.exp(-t * 30);
      const phase = 2 * Math.PI * freq * t;
      const env = Math.exp(-t * 8);
      samples[i] = Math.sin(phase) * env * peak;
    }

    return samples;
  };
}

/**
 * Create rimshot voice
 */
function createRimshotSynth(): VoiceSynthFn {
  return (sampleRate, velocity) => {
    const duration = 0.1;
    const length = Math.floor(duration * sampleRate);
    const samples = new Float32Array(length);
    const peak = velocity * 0.6;

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = 300 + 200 * Math.exp(-t * 100);
      const phase = 2 * Math.PI * freq * t;
      const env = Math.exp(-t * 50);
      // Triangle-ish wave
      const tri = Math.asin(Math.sin(phase)) / (Math.PI / 2);
      samples[i] = tri * env * peak;
    }

    return samples;
  };
}

/**
 * Create cymbal voice
 */
function createCymbalSynth(type: 'crash' | 'ride'): VoiceSynthFn {
  const duration = type === 'crash' ? 1.5 : 0.8;
  const decay = type === 'crash' ? 3 : 5;

  return (sampleRate, velocity) => {
    const length = Math.floor(duration * sampleRate);
    const samples = new Float32Array(length);
    const peak = velocity * 0.4;

    const partials = [410, 620, 830, 1200, 1800];

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * decay);

      let sample = (Math.random() * 2 - 1) * 0.3; // Noise base
      partials.forEach((freq, idx) => {
        sample += Math.sin(2 * Math.PI * freq * t + idx * 0.5) * (0.3 / (idx + 1));
      });

      samples[i] = sample * env * peak;
    }

    return samples;
  };
}

// Voice registry
const VOICES: Record<VoiceId, VoiceSynthFn> = {
  kick: createKickSynth(),
  snare: createSnareSynth(),
  clap: createClapSynth(),
  rimshot: createRimshotSynth(),
  ltom: createTomSynth('low'),
  mtom: createTomSynth('mid'),
  htom: createTomSynth('high'),
  ch: createHiHatSynth('closed'),
  oh: createHiHatSynth('open'),
  crash: createCymbalSynth('crash'),
  ride: createCymbalSynth('ride'),
};

/**
 * Create WAV file from samples
 */
function samplesToWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 2; // Stereo
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * numChannels * bytesPerSample;
  const fileSize = 44 + dataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write samples (mono to stereo)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const intSample = Math.floor(sample * 32767);
    // Left channel
    view.setInt16(offset, intSample, true);
    offset += 2;
    // Right channel (same as left for mono source)
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Render a pattern to a WAV ArrayBuffer
 */
export async function renderPatternOffline(
  pattern: Pattern,
  options: RenderOptions = {}
): Promise<ArrayBuffer> {
  const bpm = options.bpm ?? 128;
  const bars = options.bars ?? 2;
  const sampleRate = options.sampleRate ?? 44100;
  const stepsPerBar = 16;
  const totalSteps = stepsPerBar * bars;
  const stepDuration = 60 / bpm / 4;
  const duration = stepDuration * totalSteps + 2; // Extra time for tails

  // Create output buffer
  const totalSamples = Math.ceil(duration * sampleRate);
  const output = new Float32Array(totalSamples);

  // Schedule all events
  for (let step = 0; step < totalSteps; step++) {
    const startSample = Math.floor(step * stepDuration * sampleRate);

    for (const [voiceId, track] of Object.entries(pattern)) {
      if (!track || !Array.isArray(track)) continue;

      const normalizedIndex = step % track.length;
      const stepData = track[normalizedIndex] as PatternStep | undefined;

      if (!stepData || stepData.velocity <= 0) continue;

      const synthFn = VOICES[voiceId];
      if (synthFn) {
        const velocity = stepData.velocity * (stepData.accent ? 1.1 : 1);
        const voiceSamples = synthFn(sampleRate, Math.min(1, velocity));

        // Mix into output
        for (let i = 0; i < voiceSamples.length; i++) {
          const outIdx = startSample + i;
          if (outIdx < output.length) {
            output[outIdx] += voiceSamples[i];
          }
        }
      }
    }
  }

  // Normalize to prevent clipping
  let maxAbs = 0;
  for (let i = 0; i < output.length; i++) {
    maxAbs = Math.max(maxAbs, Math.abs(output[i]));
  }
  if (maxAbs > 0.95) {
    const scale = 0.95 / maxAbs;
    for (let i = 0; i < output.length; i++) {
      output[i] *= scale;
    }
  }

  return samplesToWav(output, sampleRate);
}
