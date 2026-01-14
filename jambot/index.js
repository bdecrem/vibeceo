// jambot/index.js - Milestone 1: Basic 909 session
// Create a session with 909 and render to WAV

import { OfflineAudioContext } from 'node-web-audio-api';
import { TR909Engine } from '../web/public/909/dist/machines/tr909/engine.js';
import { writeFileSync } from 'fs';

// Make OfflineAudioContext available globally (synths expect it)
globalThis.OfflineAudioContext = OfflineAudioContext;

async function test909() {
  console.log('Creating 909 session...');

  const bpm = 128;
  const bars = 2;
  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const stepDuration = 60 / bpm / 4; // seconds per step
  const totalDuration = totalSteps * stepDuration + 1; // +1 for tail
  const sampleRate = 44100;

  // Create offline context for rendering
  const context = new OfflineAudioContext(2, totalDuration * sampleRate, sampleRate);

  // Create 909
  const drums = new TR909Engine({ context });

  // Simple four-on-floor kick pattern
  const pattern = {
    kick: Array(16).fill(null).map((_, i) => ({ velocity: i % 4 === 0 ? 1 : 0 })),
    ch: Array(16).fill(null).map((_, i) => ({ velocity: i % 2 === 0 ? 0.7 : 0 })),
  };

  console.log('Pattern:', JSON.stringify(pattern.kick.map(s => s.velocity)));

  // Schedule the hits
  const kick = drums.voices.get('kick');
  const ch = drums.voices.get('ch');

  // Connect to destination
  kick.connect(context.destination);
  ch.connect(context.destination);

  for (let i = 0; i < totalSteps; i++) {
    const time = i * stepDuration;
    const step = i % 16;

    if (pattern.kick[step].velocity > 0) {
      kick.trigger(time, pattern.kick[step].velocity);
    }
    if (pattern.ch[step].velocity > 0) {
      ch.trigger(time, pattern.ch[step].velocity);
    }
  }

  console.log('Rendering...');
  const buffer = await context.startRendering();

  // Convert to WAV
  const wav = audioBufferToWav(buffer);
  writeFileSync('output.wav', Buffer.from(wav));

  console.log('✅ Rendered to output.wav');
}

// Simple WAV encoder
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const samples = buffer.length;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave and write samples
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

test909().catch(console.error);
