import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

page.on('console', msg => console.log(`[${msg.type()}]`, msg.text()));

console.log('Loading 909...');
await page.goto('http://localhost:3000/909/', { waitUntil: 'networkidle' });
await page.waitForSelector('#play-toggle', { timeout: 10000 });
console.log('Page loaded\n');

// Helper to check audio in detail - both frequency AND time domain
async function checkAudioDetailed(label) {
  const info = await page.evaluate(() => {
    const e = window.engine;
    if (!e) return { error: 'no engine' };

    const analyser = e.analyser;

    // Frequency domain analysis
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    const freqSum = freqData.reduce((a, b) => a + b, 0);
    const freqAvg = freqSum / freqData.length;

    // Find dominant frequency
    let maxVal = 0;
    let maxIdx = 0;
    for (let i = 0; i < freqData.length; i++) {
      if (freqData[i] > maxVal) {
        maxVal = freqData[i];
        maxIdx = i;
      }
    }
    const sampleRate = e.context.sampleRate;
    const dominantFreq = maxIdx * sampleRate / (2 * freqData.length);

    // TIME domain analysis (waveform) - crucial for DC offset detection
    const timeData = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(timeData);

    // Check for DC offset (average of waveform)
    let sum = 0;
    let maxAmp = 0;
    for (let i = 0; i < timeData.length; i++) {
      sum += timeData[i];
      if (Math.abs(timeData[i]) > maxAmp) maxAmp = Math.abs(timeData[i]);
    }
    const dcOffset = sum / timeData.length;

    // Check compressor state
    const compReduction = e.compressor?.reduction || 0;

    // Check master gain
    const masterGainVal = e.masterGain?.gain?.value || 0;

    return {
      isPlaying: e.isPlaying(),
      contextState: e.context?.state,
      freqLevel: freqAvg.toFixed(2),
      hasFreqAudio: freqAvg > 1,
      dominantFreq: Math.round(dominantFreq),
      maxFreqLevel: maxVal,
      dcOffset: dcOffset.toFixed(6),
      maxAmplitude: maxAmp.toFixed(4),
      compressorReduction: compReduction.toFixed(2),
      masterGain: masterGainVal.toFixed(2),
      // First few samples of waveform
      waveformSamples: Array.from(timeData.slice(0, 5)).map(v => v.toFixed(4)),
    };
  });
  console.log(`[${label}]`, JSON.stringify(info, null, 2));
  return info;
}

// Helper to check individual voice output nodes
async function checkVoices(label) {
  const info = await page.evaluate(() => {
    const e = window.engine;
    if (!e) return { error: 'no engine' };

    const voiceInfo = {};
    e.voices?.forEach((voice, id) => {
      voiceInfo[id] = {
        outputGain: voice.output?.gain?.value?.toFixed(4) || 'N/A',
        isConnected: voice.output?.numberOfOutputs > 0 || false,
      };
    });

    return voiceInfo;
  });
  console.log(`[${label}]`, JSON.stringify(info, null, 2));
  return info;
}

// Start clean
console.log('=== INITIAL STATE ===');
await checkAudioDetailed('INITIAL');

// Play briefly then stop
console.log('\n=== PLAY/STOP CYCLE ===');
await page.click('#play-toggle');
await page.waitForTimeout(500);
await checkAudioDetailed('PLAYING');

await page.click('#play-toggle');
await page.waitForTimeout(100);
await checkAudioDetailed('JUST STOPPED (100ms)');

await page.waitForTimeout(500);
await checkAudioDetailed('STOPPED (500ms)');

await page.waitForTimeout(2000);
await checkAudioDetailed('STOPPED (2.5s)');

// Now load Punchy kit (one of the problem kits)
console.log('\n=== LOAD PUNCHY KIT ===');
await page.selectOption('#kit-select', { label: 'Punchy' });
await page.waitForTimeout(500);
await checkAudioDetailed('AFTER PUNCHY LOAD');
await checkVoices('VOICES AFTER PUNCHY');

// Play with Punchy then stop
console.log('\n=== PLAY/STOP WITH PUNCHY ===');
await page.click('#play-toggle');
await page.waitForTimeout(500);
await checkAudioDetailed('PLAYING PUNCHY');

await page.click('#play-toggle');
await page.waitForTimeout(100);
const afterPunchyStop100 = await checkAudioDetailed('PUNCHY STOPPED (100ms)');

await page.waitForTimeout(500);
const afterPunchyStop500 = await checkAudioDetailed('PUNCHY STOPPED (500ms)');

await page.waitForTimeout(2000);
const afterPunchyStop2500 = await checkAudioDetailed('PUNCHY STOPPED (2.5s)');

// If we detected stuck audio, try to diagnose
if (afterPunchyStop2500.hasFreqAudio || Math.abs(parseFloat(afterPunchyStop2500.dcOffset)) > 0.001) {
  console.log('\n!!! STUCK AUDIO OR DC OFFSET DETECTED !!!');

  // Try muting master gain
  console.log('\n=== DIAGNOSTIC: MUTE MASTER GAIN ===');
  await page.evaluate(() => {
    window.engine.masterGain.gain.value = 0;
  });
  await page.waitForTimeout(100);
  await checkAudioDetailed('AFTER MUTE MASTER');

  // Restore and try disconnecting all voices
  await page.evaluate(() => {
    window.engine.masterGain.gain.value = 0.8;
  });

  console.log('\n=== DIAGNOSTIC: DISCONNECT ALL VOICES ===');
  await page.evaluate(() => {
    window.engine.voices.forEach((voice, id) => {
      try {
        voice.disconnect();
        console.log(`Disconnected ${id}`);
      } catch (e) {
        console.log(`Failed to disconnect ${id}:`, e.message);
      }
    });
  });
  await page.waitForTimeout(100);
  await checkAudioDetailed('AFTER DISCONNECT VOICES');

  // Try recreating the compressor
  console.log('\n=== DIAGNOSTIC: BYPASS COMPRESSOR ===');
  await page.evaluate(() => {
    const e = window.engine;
    // Store current connections
    e.compressor.disconnect();
    // Connect voices directly to analyser (bypass compressor)
    e.voices.forEach(v => {
      try { v.output.disconnect(); } catch(e) {}
      v.output.connect(e.analyser);
    });
  });
  await page.waitForTimeout(100);
  await checkAudioDetailed('AFTER BYPASS COMPRESSOR');
}

// Test with E1 kit for comparison
console.log('\n=== LOAD E1 CLASSIC (for comparison) ===');
await page.selectOption('#kit-select', { label: 'E1 Classic' });
await page.waitForTimeout(500);
await checkAudioDetailed('AFTER E1 CLASSIC LOAD');

await page.click('#play-toggle');
await page.waitForTimeout(500);
await page.click('#play-toggle');
await page.waitForTimeout(2000);
await checkAudioDetailed('E1 CLASSIC STOPPED (2s)');

console.log('\n--- Browser stays open. Ctrl+C to exit ---');
await page.waitForTimeout(60000);
await browser.close();
