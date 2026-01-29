// jambot/index.js - Minimal test: Bart Deep kick + closed hats
// Just kick and ch, nothing else

import { OfflineAudioContext } from 'node-web-audio-api';
import { TR909Engine } from '../web/public/909/dist/machines/tr909/engine-v3.js';
import { writeFileSync } from 'fs';

globalThis.OfflineAudioContext = OfflineAudioContext;

async function test909() {
  console.log('Bart Deep kick + closed hats only...');

  const bpm = 128;
  const bars = 2;
  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const stepDuration = 60 / bpm / 4;
  const totalDuration = totalSteps * stepDuration + 2; // tail for kick decay
  const sampleRate = 44100;

  const context = new OfflineAudioContext(2, totalDuration * sampleRate, sampleRate);
  const drums = new TR909Engine({ context });

  // Bart Deep kit: E1 engine, decay 55 for deep sub
  drums.setEngine('E1');
  drums.setVoiceParam('kick', 'decay', 0.55);  // 55/100 = medium-long decay

  // Pattern: kick on 1-2-3-4, ch on every 8th
  const pattern = {
    kick: [0, 4, 8, 12],  // four-on-floor
    ch: [0, 2, 4, 6, 8, 10, 12, 14],  // 8th notes
  };

  const kick = drums.voices.get('kick');
  const ch = drums.voices.get('ch');

  // Connect ONLY kick and ch to output
  kick.connect(context.destination);
  ch.connect(context.destination);

  // Schedule hits
  for (let i = 0; i < totalSteps; i++) {
    const time = i * stepDuration;
    const step = i % 16;

    if (pattern.kick.includes(step)) {
      kick.trigger(time, 1);
    }
    if (pattern.ch.includes(step)) {
      ch.trigger(time, 0.7);
    }
  }

  console.log('Rendering...');
  const buffer = await context.startRendering();

  const wav = audioBufferToWav(buffer);
  writeFileSync('output.wav', Buffer.from(wav));

  console.log('✅ output.wav - kick + ch only');
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
