#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../web/public/909/dist/core/output.js
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const length = buffer.length;
  const interleavedLength = length * numChannels;
  const interleaved = new Float32Array(interleavedLength);
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      interleaved[i * numChannels + ch] = buffer.getChannelData(ch)[i];
    }
  }
  const dataLength = interleavedLength * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (let i = 0; i < interleavedLength; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    const int16 = sample < 0 ? sample * 32768 : sample * 32767;
    view.setInt16(offset, int16, true);
    offset += 2;
  }
  return wavBuffer;
}
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
var OutputManager;
var init_output = __esm({
  "../web/public/909/dist/core/output.js"() {
    "use strict";
    OutputManager = class {
      constructor(context, destination) {
        this.context = context;
        this.destination = destination ?? context.destination;
      }
      setDestination(node) {
        this.destination = node;
      }
      getDestination() {
        return this.destination;
      }
      renderOffline(duration, setupGraph, options = {}) {
        const sampleRate = options.sampleRate ?? this.context.sampleRate ?? 44100;
        const channels = options.numberOfChannels ?? 2;
        const frameCount = Math.ceil(duration * sampleRate);
        const offlineContext = new OfflineAudioContext(channels, frameCount, sampleRate);
        return Promise.resolve(setupGraph(offlineContext)).then(() => offlineContext.startRendering());
      }
      audioBufferToWav(buffer) {
        return audioBufferToWav(buffer);
      }
      async audioBufferToBlob(buffer) {
        const wavArray = this.audioBufferToWav(buffer);
        return new Blob([wavArray], { type: "audio/wav" });
      }
    };
  }
});

// ../web/public/909/dist/core/engine.js
var SynthEngine;
var init_engine = __esm({
  "../web/public/909/dist/core/engine.js"() {
    "use strict";
    init_output();
    SynthEngine = class {
      constructor(options = {}) {
        this.voices = /* @__PURE__ */ new Map();
        this.started = false;
        this.context = options.context ?? new AudioContext();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = options.masterVolume ?? 0.8;
        this.compressor = this.context.createDynamicsCompressor();
        this.analyser = this.context.createAnalyser();
        this.compressor.connect(this.analyser);
        this.analyser.connect(this.masterGain);
        this.masterGain.connect(this.context.destination);
        this.outputManager = new OutputManager(this.context, this.masterGain);
      }
      registerVoice(id, voice) {
        voice.connect(this.compressor);
        this.voices.set(id, voice);
      }
      getVoices() {
        return [...this.voices.keys()];
      }
      getVoiceParameterDescriptors() {
        const descriptors = {};
        for (const [id, voice] of this.voices.entries()) {
          descriptors[id] = voice.parameterDescriptors;
        }
        return descriptors;
      }
      async start() {
        if (this.context.state === "suspended") {
          await this.context.resume();
        }
        this.started = true;
      }
      stop() {
        this.started = false;
      }
      isRunning() {
        return this.started;
      }
      trigger(voiceId, velocity = 1, time) {
        const voice = this.voices.get(voiceId);
        if (!voice) {
          throw new Error(`Unknown voice "${voiceId}"`);
        }
        const when = time ?? this.context.currentTime;
        voice.trigger(when, velocity);
      }
      setVoiceParameter(voiceId, parameterId, value) {
        const voice = this.voices.get(voiceId);
        if (!voice) {
          throw new Error(`Unknown voice "${voiceId}"`);
        }
        voice.setParameter(parameterId, value);
      }
      connectOutput(destination) {
        this.masterGain.disconnect();
        this.masterGain.connect(destination);
        this.outputManager.setDestination(destination);
      }
      audioBufferToWav(buffer) {
        return this.outputManager.audioBufferToWav(buffer);
      }
      audioBufferToBlob(buffer) {
        return this.outputManager.audioBufferToBlob(buffer);
      }
      async renderToBuffer(options) {
        return this.outputManager.renderOffline(options.duration, (offlineContext) => this.prepareOfflineRender(offlineContext, options), {
          sampleRate: options.sampleRate,
          numberOfChannels: options.numberOfChannels
        });
      }
    };
  }
});

// ../web/public/909/dist/core/sequencer.js
var StepSequencer;
var init_sequencer = __esm({
  "../web/public/909/dist/core/sequencer.js"() {
    "use strict";
    StepSequencer = class {
      constructor(options = {}) {
        this.patterns = /* @__PURE__ */ new Map();
        this.currentStep = 0;
        this.running = false;
        this.steps = options.steps ?? 16;
        this.bpm = options.bpm ?? 120;
        this.swing = options.swing ?? 0;
      }
      setBpm(bpm) {
        this.bpm = bpm;
        if (this.running) {
          this.restart();
        }
      }
      setSwing(amount) {
        this.swing = Math.max(0, Math.min(1, amount));
      }
      getSwing() {
        return this.swing;
      }
      getBpm() {
        return this.bpm;
      }
      setSteps(steps) {
        this.steps = Math.max(1, Math.floor(steps));
        this.currentStep = 0;
      }
      addPattern(id, pattern) {
        this.patterns.set(id, pattern);
        if (!this.currentPatternId) {
          this.loadPattern(id);
        }
      }
      loadPattern(id) {
        const pattern = this.patterns.get(id);
        if (!pattern) {
          throw new Error(`Pattern "${id}" not found`);
        }
        this.currentPatternId = id;
        this.currentPattern = pattern;
        this.currentStep = 0;
      }
      start() {
        if (!this.currentPattern) {
          throw new Error("No pattern selected for sequencer");
        }
        if (this.running) {
          return;
        }
        this.running = true;
        this.scheduleNextStep();
      }
      stop() {
        this.running = false;
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = void 0;
        }
        this.currentStep = 0;
      }
      isRunning() {
        return this.running;
      }
      getCurrentStep() {
        return this.currentStep;
      }
      getCurrentPatternId() {
        return this.currentPatternId;
      }
      getCurrentPattern() {
        return this.currentPattern;
      }
      chain(patternIds) {
        patternIds.forEach((id) => {
          if (!this.patterns.has(id)) {
            throw new Error(`Cannot chain missing pattern "${id}"`);
          }
        });
        patternIds.forEach((id, index) => {
          const pattern = this.patterns.get(id);
          this.patterns.delete(id);
          this.patterns.set(`${index}-${id}`, pattern);
        });
      }
      restart() {
        this.stop();
        this.start();
      }
      scheduleNextStep() {
        if (!this.running) {
          return;
        }
        const intervalMs = this.computeIntervalMs(this.currentStep);
        this.timer = setTimeout(() => {
          const events = this.collectEventsForStep(this.currentStep);
          this.onStep?.(this.currentStep, events);
          this.currentStep = (this.currentStep + 1) % this.steps;
          this.scheduleNextStep();
        }, intervalMs);
      }
      computeIntervalMs(step) {
        const base = 60 / this.bpm / 4 * 1e3;
        if (this.swing <= 1e-4) {
          return base;
        }
        const swingFactor = this.swing * 0.5;
        const isOddStep = step % 2 === 1;
        return base * (isOddStep ? 1 + swingFactor : 1 - swingFactor);
      }
      collectEventsForStep(step) {
        if (!this.currentPattern) {
          return [];
        }
        const events = [];
        for (const [voiceId, track] of Object.entries(this.currentPattern)) {
          const patternStep = this.getPatternStep(track, step);
          if (!patternStep)
            continue;
          if (typeof patternStep.probability === "number" && Math.random() > patternStep.probability) {
            continue;
          }
          events.push({
            voice: voiceId,
            step,
            velocity: patternStep.velocity,
            accent: patternStep.accent
          });
        }
        return events;
      }
      getPatternStep(track, step) {
        const normalizedIndex = step % track.length;
        const data = track[normalizedIndex];
        if (!data || data.velocity <= 0) {
          return void 0;
        }
        return data;
      }
    };
  }
});

// ../web/public/909/dist/core/noise.js
var LFSRNoise;
var init_noise = __esm({
  "../web/public/909/dist/core/noise.js"() {
    "use strict";
    LFSRNoise = class {
      constructor(context, options = {}) {
        this.context = context;
        this.sampleRate = options.sampleRate ?? context.sampleRate ?? 44100;
        this.register = options.seed ?? 2147483647;
      }
      reset(seed) {
        this.register = seed ?? 2147483647;
      }
      createBuffer(durationSeconds) {
        const frameCount = Math.ceil(durationSeconds * this.sampleRate);
        const buffer = this.context.createBuffer(1, frameCount, this.sampleRate);
        const channel = buffer.getChannelData(0);
        for (let i = 0; i < frameCount; i += 1) {
          channel[i] = this.nextValue();
        }
        return buffer;
      }
      /**
       * Returns an AudioBufferSourceNode that loops the generated noise.
       */
      createNode(durationSeconds = 1) {
        const node = this.context.createBufferSource();
        node.buffer = this.createBuffer(durationSeconds);
        node.loop = true;
        return node;
      }
      /**
       * Generate an arbitrary length Float32Array of noise values.
       */
      generate(length) {
        const values = new Float32Array(length);
        for (let i = 0; i < length; i += 1) {
          values[i] = this.nextValue();
        }
        return values;
      }
      nextValue() {
        const bit = (this.register >> 30 ^ this.register >> 27 ^ this.register >> 1 ^ this.register) & 1;
        this.register = (this.register << 1 | bit) & 2147483647;
        return this.register / 2147483647 * 2 - 1;
      }
    };
  }
});

// ../web/public/909/dist/core/voice.js
var Voice;
var init_voice = __esm({
  "../web/public/909/dist/core/voice.js"() {
    "use strict";
    Voice = class {
      constructor(id, context, options = {}) {
        this.accentAmount = 1.1;
        this.voiceId = id;
        this.context = context;
        this.output = context.createGain();
        this.output.gain.value = options.outputGain ?? 1;
      }
      getAccentAmount() {
        return this.accentAmount;
      }
      setAccentAmount(amount) {
        this.accentAmount = Math.max(1, Math.min(2, amount));
      }
      get id() {
        return this.voiceId;
      }
      connect(destination) {
        this.output.connect(destination);
      }
      disconnect() {
        this.output.disconnect();
      }
      /**
       * Update any exposed parameter (tune, decay, etc.)
       * Base class handles 'accent' parameter.
       */
      setParameter(paramId, value) {
        if (paramId === "accent") {
          this.setAccentAmount(value);
        }
      }
      /**
       * Provide metadata so UIs/CLIs can expose available controls.
       * Includes base accent parameter.
       */
      get parameterDescriptors() {
        return [
          {
            id: "accent",
            label: "Accent",
            range: { min: 1, max: 2, step: 0.05 },
            defaultValue: 1.1
          }
        ];
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/kick-v3.js
var Kick909;
var init_kick_v3 = __esm({
  "../web/public/909/dist/machines/tr909/voices/kick-v3.js"() {
    "use strict";
    init_voice();
    Kick909 = class extends Voice {
      constructor(id, context) {
        super(id, context);
        this.tune = 0;
        this.decay = 0.8;
        this.attack = 0.5;
        this.sweep = 1;
        this.level = 1;
      }
      // Creates waveshaper curve: triangle → hexagonal → pseudo-sine
      // Real 909 uses back-to-back diodes that clip at ~0.5-0.6V
      createTriangleToSineCurve() {
        const samples = 8192;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = i * 2 / samples - 1;
          const threshold = 0.6;
          if (Math.abs(x) < threshold) {
            curve[i] = x;
          } else {
            const sign = x > 0 ? 1 : -1;
            const excess = Math.abs(x) - threshold;
            curve[i] = sign * (threshold + excess * 0.3);
          }
        }
        return curve;
      }
      trigger(time, velocity) {
        const peak = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        const mainOsc = this.context.createOscillator();
        mainOsc.type = "triangle";
        const baseFreq = 55 * tuneMultiplier;
        const sweepTime = 0.03 + (1 - this.attack) * 0.09;
        const sweepMultiplier = 1 + this.sweep;
        const peakFreq = baseFreq * sweepMultiplier;
        mainOsc.frequency.setValueAtTime(peakFreq, time);
        if (this.sweep > 0.01) {
          mainOsc.frequency.exponentialRampToValueAtTime(baseFreq, time + sweepTime);
        }
        const shaper = this.context.createWaveShaper();
        shaper.curve = this.createTriangleToSineCurve();
        shaper.oversample = "2x";
        const mainGain = this.context.createGain();
        const decayTime = 0.15 + this.decay * 0.85;
        mainGain.gain.setValueAtTime(peak, time);
        mainGain.gain.setTargetAtTime(0, time + 5e-3, decayTime * 0.2);
        mainOsc.connect(shaper);
        shaper.connect(mainGain);
        mainGain.connect(this.output);
        mainOsc.start(time);
        mainOsc.stop(time + decayTime + 0.5);
        const clickAmount = this.level;
        if (clickAmount > 0.1) {
          const impulseLength = 32;
          const impulseBuffer = this.context.createBuffer(1, impulseLength, this.context.sampleRate);
          const impulseData = impulseBuffer.getChannelData(0);
          for (let i = 0; i < impulseLength; i++) {
            impulseData[i] = (i < 8 ? 1 : 0) * Math.exp(-i / 6);
          }
          const impulseSource = this.context.createBufferSource();
          impulseSource.buffer = impulseBuffer;
          const impulseGain = this.context.createGain();
          impulseGain.gain.setValueAtTime(peak * clickAmount * 0.5, time);
          impulseSource.connect(impulseGain);
          impulseGain.connect(this.output);
          impulseSource.start(time);
          const noiseLength = 128;
          const noiseBuffer = this.context.createBuffer(1, noiseLength, this.context.sampleRate);
          const noiseData = noiseBuffer.getChannelData(0);
          for (let i = 0; i < noiseLength; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 20);
          }
          const noiseSource = this.context.createBufferSource();
          noiseSource.buffer = noiseBuffer;
          const noiseFilter = this.context.createBiquadFilter();
          noiseFilter.type = "lowpass";
          noiseFilter.frequency.value = 3e3;
          noiseFilter.Q.value = 0.7;
          const noiseGain = this.context.createGain();
          noiseGain.gain.setValueAtTime(peak * clickAmount * 0.3, time);
          noiseSource.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(this.output);
          noiseSource.start(time);
        }
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = value;
            break;
          case "decay":
            this.decay = Math.max(0.05, value);
            break;
          case "attack":
            this.attack = Math.max(0, Math.min(1, value));
            break;
          case "sweep":
            this.sweep = Math.max(0, Math.min(1, value));
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -1200, max: 1200, step: 10, unit: "cents" },
            defaultValue: 0
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.05, max: 2, step: 0.01, unit: "s" },
            defaultValue: 0.8
          },
          {
            id: "attack",
            label: "Attack",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "sweep",
            label: "Sweep",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/kick-e1.js
var Kick909E1;
var init_kick_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/kick-e1.js"() {
    "use strict";
    init_voice();
    Kick909E1 = class extends Voice {
      constructor(id, context) {
        super(id, context);
        this.tune = 0;
        this.decay = 0.8;
        this.attack = 0.5;
        this.sweep = 1;
        this.level = 1;
      }
      // Creates a soft-clip curve that shapes sawtooth into rounded pseudo-sine
      // This mimics the 909's sawtooth→waveshaper→sine circuit
      createSoftClipCurve() {
        const samples = 8192;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = i * 2 / samples - 1;
          curve[i] = Math.tanh(x * 1.5) * 0.9;
        }
        return curve;
      }
      trigger(time, velocity) {
        const peak = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        const mainOsc = this.context.createOscillator();
        mainOsc.type = "triangle";
        const baseFreq = 55 * tuneMultiplier;
        const sweepAmount = 1.5 + this.sweep * 2.5;
        const peakFreq = baseFreq * sweepAmount;
        mainOsc.frequency.setValueAtTime(peakFreq, time);
        mainOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.1, time + 0.025);
        mainOsc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.08);
        const shaper = this.context.createWaveShaper();
        shaper.curve = this.createSoftClipCurve();
        shaper.oversample = "2x";
        const driveGain = this.context.createGain();
        driveGain.gain.value = 2.5;
        const mainGain = this.context.createGain();
        const holdTime = 0.025 + this.decay * 0.12;
        const releaseTime = 0.06 + this.decay * 0.5;
        const totalTime = holdTime + releaseTime + 0.1;
        mainGain.gain.setValueAtTime(0, time);
        mainGain.gain.linearRampToValueAtTime(peak * 0.8, time + 2e-3);
        mainGain.gain.setValueAtTime(peak * 0.75, time + holdTime);
        mainGain.gain.exponentialRampToValueAtTime(1e-3, time + holdTime + releaseTime);
        mainOsc.connect(driveGain);
        driveGain.connect(shaper);
        shaper.connect(mainGain);
        mainGain.connect(this.output);
        mainOsc.start(time);
        mainOsc.stop(time + totalTime);
        if (this.attack > 0.01) {
          const noiseLength = 512;
          const noiseBuffer = this.context.createBuffer(1, noiseLength, this.context.sampleRate);
          const noiseData = noiseBuffer.getChannelData(0);
          for (let i = 0; i < noiseLength; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / 80);
          }
          const noiseSource = this.context.createBufferSource();
          noiseSource.buffer = noiseBuffer;
          const noiseFilter = this.context.createBiquadFilter();
          noiseFilter.type = "highpass";
          noiseFilter.frequency.value = 2e3;
          noiseFilter.Q.value = 0.7;
          const noiseGain = this.context.createGain();
          noiseGain.gain.setValueAtTime(peak * this.attack * 0.4, time);
          noiseSource.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(this.output);
          noiseSource.start(time);
          const clickOsc = this.context.createOscillator();
          clickOsc.type = "sine";
          const clickPeakFreq = 400 * tuneMultiplier;
          const clickBaseFreq = 100 * tuneMultiplier;
          clickOsc.frequency.setValueAtTime(clickPeakFreq, time);
          clickOsc.frequency.exponentialRampToValueAtTime(clickBaseFreq, time + 0.02);
          const clickGain = this.context.createGain();
          clickGain.gain.setValueAtTime(peak * this.attack * 0.5, time);
          clickGain.gain.exponentialRampToValueAtTime(1e-3, time + 0.04);
          clickOsc.connect(clickGain);
          clickGain.connect(this.output);
          clickOsc.start(time);
          clickOsc.stop(time + 0.1);
        }
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = value;
            break;
          case "decay":
            this.decay = Math.max(0.05, value);
            break;
          case "attack":
            this.attack = Math.max(0, Math.min(1, value));
            break;
          case "sweep":
            this.sweep = Math.max(0, Math.min(1, value));
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -1200, max: 1200, step: 10, unit: "cents" },
            defaultValue: 0
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.05, max: 2, step: 0.01, unit: "s" },
            defaultValue: 0.8
          },
          {
            id: "attack",
            label: "Attack",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "sweep",
            label: "Sweep",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/snare.js
var Snare909;
var init_snare = __esm({
  "../web/public/909/dist/machines/tr909/voices/snare.js"() {
    "use strict";
    init_voice();
    Snare909 = class extends Voice {
      constructor(id, context, noiseBuffer) {
        super(id, context);
        this.tone = 0.5;
        this.snappy = 0.5;
        this.tune = 0;
        this.level = 1;
        this.noiseBuffer = noiseBuffer;
      }
      trigger(time, velocity) {
        const peak = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = Math.pow(2, this.tune / 1200);
        const bodyMix = 1 - this.snappy * 0.5;
        const osc1 = this.context.createOscillator();
        osc1.type = "sine";
        const osc1BaseFreq = 180 * tuneMultiplier;
        osc1.frequency.setValueAtTime(osc1BaseFreq * 1.5, time);
        osc1.frequency.exponentialRampToValueAtTime(osc1BaseFreq, time + 0.03);
        const osc1Gain = this.context.createGain();
        osc1Gain.gain.setValueAtTime(peak * bodyMix * 0.8, time);
        osc1Gain.gain.exponentialRampToValueAtTime(1e-3, time + 0.15);
        osc1.connect(osc1Gain);
        osc1Gain.connect(this.output);
        osc1.start(time);
        osc1.stop(time + 0.25);
        const osc2 = this.context.createOscillator();
        osc2.type = "sine";
        const osc2BaseFreq = 330 * tuneMultiplier;
        osc2.frequency.setValueAtTime(osc2BaseFreq * 1.3, time);
        osc2.frequency.exponentialRampToValueAtTime(osc2BaseFreq, time + 0.02);
        const osc2Gain = this.context.createGain();
        osc2Gain.gain.setValueAtTime(peak * bodyMix * 0.5, time);
        osc2Gain.gain.exponentialRampToValueAtTime(1e-3, time + 0.08);
        osc2.connect(osc2Gain);
        osc2Gain.connect(this.output);
        osc2.start(time);
        osc2.stop(time + 0.18);
        const noiseSource = this.context.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        const highPass = this.context.createBiquadFilter();
        highPass.type = "highpass";
        highPass.frequency.value = 1500 + this.tone * 1500;
        const lowPass = this.context.createBiquadFilter();
        lowPass.type = "lowpass";
        lowPass.frequency.value = 4e3 + this.tone * 4e3;
        const noiseGain = this.context.createGain();
        const snappyLevel = peak * (0.3 + this.snappy * 0.7);
        const noiseDecay = 0.15 + this.snappy * 0.1;
        noiseGain.gain.setValueAtTime(snappyLevel, time);
        noiseGain.gain.exponentialRampToValueAtTime(1e-3, time + noiseDecay);
        noiseSource.connect(highPass);
        highPass.connect(lowPass);
        lowPass.connect(noiseGain);
        noiseGain.connect(this.output);
        noiseSource.start(time);
        noiseSource.stop(time + noiseDecay + 0.1);
      }
      setParameter(id, value) {
        switch (id) {
          case "tune":
            this.tune = value;
            break;
          case "tone":
            this.tone = Math.max(0, Math.min(1, value));
            break;
          case "snappy":
            this.snappy = Math.max(0, Math.min(1, value));
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -1200, max: 1200, step: 10, unit: "cents" },
            defaultValue: 0
          },
          {
            id: "tone",
            label: "Tone",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "snappy",
            label: "Snappy",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/snare-e1.js
var Snare909E1;
var init_snare_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/snare-e1.js"() {
    "use strict";
    init_voice();
    Snare909E1 = class extends Voice {
      constructor(id, context, noiseBuffer) {
        super(id, context);
        this.tone = 0.5;
        this.snappy = 0.5;
        this.level = 1;
        this.noiseBuffer = noiseBuffer;
      }
      trigger(time, velocity) {
        const bodyOsc = this.context.createOscillator();
        bodyOsc.type = "triangle";
        bodyOsc.frequency.setValueAtTime(180, time);
        bodyOsc.frequency.linearRampToValueAtTime(330, time + 0.02);
        const bodyGain = this.context.createGain();
        const bodyLevel = Math.max(0, Math.min(1, velocity * this.level * (1 - this.snappy)));
        bodyGain.gain.setValueAtTime(bodyLevel, time);
        bodyGain.gain.exponentialRampToValueAtTime(1e-4, time + 0.3);
        bodyOsc.connect(bodyGain);
        bodyGain.connect(this.output);
        bodyOsc.start(time);
        bodyOsc.stop(time + 0.4);
        const noiseSource = this.context.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        const highPass = this.context.createBiquadFilter();
        highPass.type = "highpass";
        highPass.frequency.value = 1200 + this.tone * 4e3;
        const noiseGain = this.context.createGain();
        const snappyLevel = Math.max(0, Math.min(1, velocity * this.level * this.snappy));
        noiseGain.gain.setValueAtTime(snappyLevel, time);
        noiseGain.gain.exponentialRampToValueAtTime(1e-4, time + 0.2);
        noiseSource.connect(highPass);
        highPass.connect(noiseGain);
        noiseGain.connect(this.output);
        noiseSource.start(time);
        noiseSource.stop(time + 0.3);
      }
      setParameter(id, value) {
        switch (id) {
          case "tone":
            this.tone = Math.max(0, Math.min(1, value));
            break;
          case "snappy":
            this.snappy = Math.max(0, Math.min(1, value));
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tone",
            label: "Tone",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "snappy",
            label: "Snappy",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/clap.js
var Clap909;
var init_clap = __esm({
  "../web/public/909/dist/machines/tr909/voices/clap.js"() {
    "use strict";
    init_voice();
    Clap909 = class extends Voice {
      constructor(id, context, noiseBuffer) {
        super(id, context);
        this.level = 1;
        this.tone = 0.5;
        this.decay = 0.5;
        this.noiseBuffer = noiseBuffer;
      }
      trigger(time, velocity) {
        const peak = Math.max(0, Math.min(1, velocity * this.level));
        const filterFreq = 300 + this.tone * 1700;
        const burstTimings = [0, 0.012, 0.024, 0.036];
        const burstGains = [0.8, 1, 0.7, 0.4];
        const burstDecays = [0.01, 0.01, 0.01, 0.04];
        for (let i = 0; i < 4; i++) {
          const burstSource = this.context.createBufferSource();
          burstSource.buffer = this.noiseBuffer;
          const bandPass = this.context.createBiquadFilter();
          bandPass.type = "bandpass";
          bandPass.frequency.value = filterFreq;
          bandPass.Q.value = 2;
          const burstGain = this.context.createGain();
          const t = time + burstTimings[i];
          burstGain.gain.setValueAtTime(peak * burstGains[i], t);
          burstGain.gain.exponentialRampToValueAtTime(1e-3, t + burstDecays[i]);
          burstSource.connect(bandPass);
          bandPass.connect(burstGain);
          burstGain.connect(this.output);
          burstSource.start(t);
          burstSource.stop(t + burstDecays[i] + 0.05);
        }
        const tailSource = this.context.createBufferSource();
        tailSource.buffer = this.noiseBuffer;
        const tailFilter = this.context.createBiquadFilter();
        tailFilter.type = "bandpass";
        tailFilter.frequency.value = 750;
        tailFilter.Q.value = 3;
        const tailGain = this.context.createGain();
        const tailTime = time + 0.044;
        const tailDecay = 0.03 + this.decay * 0.37;
        tailGain.gain.setValueAtTime(peak * 0.3, tailTime);
        tailGain.gain.exponentialRampToValueAtTime(1e-3, tailTime + tailDecay);
        tailSource.connect(tailFilter);
        tailFilter.connect(tailGain);
        tailGain.connect(this.output);
        tailSource.start(tailTime);
        tailSource.stop(tailTime + tailDecay + 0.1);
      }
      setParameter(id, value) {
        switch (id) {
          case "tone":
            this.tone = Math.max(0, Math.min(1, value));
            break;
          case "decay":
            this.decay = Math.max(0, Math.min(1, value));
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tone",
            label: "Tone",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/clap-e1.js
var Clap909E1;
var init_clap_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/clap-e1.js"() {
    "use strict";
    init_voice();
    Clap909E1 = class extends Voice {
      constructor(id, context, noiseBuffer) {
        super(id, context);
        this.level = 1;
        this.spread = 0.015;
        this.noiseBuffer = noiseBuffer;
      }
      trigger(time, velocity) {
        const noiseSource = this.context.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        const bandPass = this.context.createBiquadFilter();
        bandPass.type = "bandpass";
        bandPass.frequency.value = 1e3;
        bandPass.Q.value = 0.8;
        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const bursts = 4;
        const step = this.spread;
        for (let i = 0; i < bursts; i += 1) {
          const t = time + i * step;
          gain.gain.setValueAtTime(level, t);
          gain.gain.exponentialRampToValueAtTime(1e-4, t + 0.05);
        }
        noiseSource.connect(bandPass);
        bandPass.connect(gain);
        gain.connect(this.output);
        noiseSource.start(time);
        noiseSource.stop(time + bursts * step + 0.2);
      }
      setParameter(id, value) {
        if (id === "level") {
          this.level = Math.max(0, Math.min(1, value));
        } else if (id === "spread") {
          this.spread = Math.max(5e-3, Math.min(0.04, value));
        } else {
          super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          {
            id: "spread",
            label: "Spread",
            range: { min: 5e-3, max: 0.04, step: 1e-3, unit: "s" },
            defaultValue: 0.015
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/tom.js
var BASE_FREQUENCIES, FREQ_RATIOS, OSC_GAINS, Tom909;
var init_tom = __esm({
  "../web/public/909/dist/machines/tr909/voices/tom.js"() {
    "use strict";
    init_voice();
    BASE_FREQUENCIES = {
      low: 100,
      // ~100Hz for low tom
      mid: 150,
      // ~150Hz for mid tom
      high: 200
      // ~200Hz for high tom
    };
    FREQ_RATIOS = [1, 1.5, 2.77];
    OSC_GAINS = [1, 0.5, 0.25];
    Tom909 = class extends Voice {
      constructor(id, context, type) {
        super(id, context);
        this.type = type;
        this.tune = 0;
        this.decay = 0.5;
        this.level = 1;
      }
      trigger(time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const baseFreq = BASE_FREQUENCIES[this.type] * Math.pow(2, this.tune / 1200);
        const pitchMod = 0.6;
        const pitchEnvTime = 0.05;
        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.7;
        masterGain.connect(this.output);
        FREQ_RATIOS.forEach((ratio, i) => {
          const osc = this.context.createOscillator();
          osc.type = "sine";
          const targetFreq = baseFreq * ratio;
          const startFreq = targetFreq * (1 + pitchMod);
          osc.frequency.setValueAtTime(startFreq, time);
          osc.frequency.exponentialRampToValueAtTime(targetFreq, time + pitchEnvTime);
          const waveshaper = this.context.createWaveShaper();
          waveshaper.curve = this.createSoftClipCurve();
          waveshaper.oversample = "2x";
          const oscGain = this.context.createGain();
          oscGain.gain.setValueAtTime(OSC_GAINS[i], time);
          const decayTime = this.decay * (1 - i * 0.15);
          oscGain.gain.exponentialRampToValueAtTime(1e-3, time + decayTime);
          osc.connect(waveshaper);
          waveshaper.connect(oscGain);
          oscGain.connect(masterGain);
          osc.start(time);
          osc.stop(time + this.decay + 0.2);
        });
        const clickOsc = this.context.createOscillator();
        clickOsc.type = "sine";
        clickOsc.frequency.value = baseFreq * 4;
        const clickGain = this.context.createGain();
        clickGain.gain.setValueAtTime(0.15, time);
        clickGain.gain.exponentialRampToValueAtTime(1e-3, time + 0.01);
        clickOsc.connect(clickGain);
        clickGain.connect(masterGain);
        clickOsc.start(time);
        clickOsc.stop(time + 0.02);
      }
      createSoftClipCurve() {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = i * 2 / samples - 1;
          curve[i] = Math.tanh(x * 1.5);
        }
        return curve;
      }
      setParameter(id, value) {
        if (id === "tune") {
          this.tune = value;
        } else if (id === "decay") {
          this.decay = Math.max(0.1, Math.min(2, value));
        } else if (id === "level") {
          this.level = Math.max(0, Math.min(1, value));
        } else {
          super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -120, max: 120, step: 1, unit: "cents" },
            defaultValue: 0
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.1, max: 2, step: 0.01, unit: "s" },
            defaultValue: 0.5
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/tom-e1.js
var BASE_FREQUENCIES2, Tom909E1;
var init_tom_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/tom-e1.js"() {
    "use strict";
    init_voice();
    BASE_FREQUENCIES2 = {
      low: 110,
      mid: 164,
      high: 220
    };
    Tom909E1 = class extends Voice {
      constructor(id, context, type) {
        super(id, context);
        this.type = type;
        this.tune = 0;
        this.decay = 0.5;
        this.level = 1;
      }
      trigger(time, velocity) {
        const osc = this.context.createOscillator();
        osc.type = "sine";
        const frequency = BASE_FREQUENCIES2[this.type] * Math.pow(2, this.tune / 1200);
        osc.frequency.setValueAtTime(frequency * 1.4, time);
        osc.frequency.exponentialRampToValueAtTime(frequency, time + this.decay * 0.5);
        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        gain.gain.setValueAtTime(level, time);
        gain.gain.exponentialRampToValueAtTime(1e-4, time + this.decay);
        osc.connect(gain);
        gain.connect(this.output);
        osc.start(time);
        osc.stop(time + this.decay + 0.2);
      }
      setParameter(id, value) {
        if (id === "tune") {
          this.tune = value;
        } else if (id === "decay") {
          this.decay = Math.max(0.1, Math.min(2, value));
        } else if (id === "level") {
          this.level = Math.max(0, Math.min(1, value));
        } else {
          super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -120, max: 120, step: 1, unit: "cents" },
            defaultValue: 0
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.1, max: 2, step: 0.01, unit: "s" },
            defaultValue: 0.5
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/rimshot.js
var Rimshot909;
var init_rimshot = __esm({
  "../web/public/909/dist/machines/tr909/voices/rimshot.js"() {
    "use strict";
    init_voice();
    Rimshot909 = class extends Voice {
      constructor(id, context) {
        super(id, context);
        this.level = 1;
        this.tone = 0.5;
      }
      trigger(time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const frequencies = [220, 500, 1e3];
        const gains = [0.6, 1, 0.4];
        const decays = [0.05, 0.04, 0.03];
        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.7;
        masterGain.connect(this.output);
        frequencies.forEach((freq, i) => {
          const osc = this.context.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq * 1.2, time);
          osc.frequency.exponentialRampToValueAtTime(freq, time + 5e-3);
          const filter = this.context.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = freq;
          filter.Q.value = 15;
          const gain = this.context.createGain();
          gain.gain.setValueAtTime(gains[i], time);
          gain.gain.exponentialRampToValueAtTime(1e-3, time + decays[i]);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);
          osc.start(time);
          osc.stop(time + decays[i] + 0.01);
        });
        if (this.tone > 0) {
          const bufferSize = this.context.sampleRate * 0.01;
          const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = this.context.createBufferSource();
          noise.buffer = noiseBuffer;
          const noiseFilter = this.context.createBiquadFilter();
          noiseFilter.type = "highpass";
          noiseFilter.frequency.value = 2e3;
          const noiseGain = this.context.createGain();
          noiseGain.gain.setValueAtTime(this.tone * 0.3, time);
          noiseGain.gain.exponentialRampToValueAtTime(1e-3, time + 8e-3);
          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(masterGain);
          noise.start(time);
          noise.stop(time + 0.01);
        }
      }
      setParameter(id, value) {
        if (id === "level") {
          this.level = Math.max(0, Math.min(1, value));
        } else if (id === "tone") {
          this.tone = Math.max(0, Math.min(1, value));
        } else {
          super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          {
            id: "tone",
            label: "Tone",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/rimshot-e1.js
var Rimshot909E1;
var init_rimshot_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/rimshot-e1.js"() {
    "use strict";
    init_voice();
    Rimshot909E1 = class extends Voice {
      constructor(id, context) {
        super(id, context);
        this.level = 1;
      }
      trigger(time, velocity) {
        const osc = this.context.createOscillator();
        osc.type = "square";
        const base = 400;
        osc.frequency.setValueAtTime(base, time);
        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        gain.gain.setValueAtTime(level, time);
        gain.gain.exponentialRampToValueAtTime(1e-4, time + 0.1);
        const filter = this.context.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = base;
        filter.Q.value = 4;
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.output);
        osc.start(time);
        osc.stop(time + 0.15);
      }
      setParameter(id, value) {
        if (id === "level") {
          this.level = Math.max(0, Math.min(1, value));
        } else {
          super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/sample-voice.js
var SampleVoice;
var init_sample_voice = __esm({
  "../web/public/909/dist/machines/tr909/voices/sample-voice.js"() {
    "use strict";
    init_voice();
    init_noise();
    SampleVoice = class extends Voice {
      constructor(id, context, sampleLibrary, sampleId, options = {}) {
        super(id, context, options);
        this.sampleLibrary = sampleLibrary;
        this.sampleId = sampleId;
        this.tune = 0;
        this.level = 1;
        this.noise = new LFSRNoise(this.context);
        this._useSample = false;
      }
      get useSample() {
        return this._useSample;
      }
      setUseSample(value) {
        this._useSample = value;
      }
      trigger(time, velocity) {
        if (this._useSample) {
          const buffer = this.sampleLibrary.getBuffer(this.context, this.sampleId);
          if (buffer) {
            const source = this.context.createBufferSource();
            source.buffer = buffer;
            source.playbackRate.value = this.semitonesToPlaybackRate(this.tune);
            const gain = this.context.createGain();
            gain.gain.value = Math.max(0, Math.min(1, velocity * this.level));
            source.connect(gain);
            gain.connect(this.output);
            source.start(time);
            source.stop(time + buffer.duration / source.playbackRate.value);
            return;
          }
        }
        const fallbackBuffer = this.noise.createBuffer(0.5);
        const fallbackSource = this.context.createBufferSource();
        fallbackSource.buffer = fallbackBuffer;
        fallbackSource.loop = false;
        this.triggerSynthesis(fallbackSource, time, velocity);
      }
      setParameter(paramId, value) {
        if (paramId === "tune") {
          this.tune = value;
          return;
        }
        if (paramId === "level") {
          this.level = value;
          return;
        }
        super.setParameter(paramId, value);
      }
      get parameterDescriptors() {
        return [
          {
            id: "tune",
            label: "Tune",
            range: { min: -12, max: 12, step: 0.1, unit: "semitones" },
            defaultValue: 0
          },
          {
            id: "level",
            label: "Level",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1
          },
          ...super.parameterDescriptors
        ];
      }
      semitonesToPlaybackRate(semitones) {
        return Math.pow(2, semitones / 12);
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/hihat.js
var HIHAT_FREQUENCIES, HiHat909;
var init_hihat = __esm({
  "../web/public/909/dist/machines/tr909/voices/hihat.js"() {
    "use strict";
    init_sample_voice();
    HIHAT_FREQUENCIES = [
      205.3,
      // Fundamental
      304.4,
      // Inharmonic
      369.6,
      // Inharmonic
      522.7,
      // Roughly 2.5x fundamental
      800,
      // High metallic
      1204.4
      // Highest component
    ];
    HiHat909 = class extends SampleVoice {
      constructor(id, context, library, type) {
        super(id, context, library, type === "closed" ? "closed-hat" : "open-hat");
        this.type = type;
        this.decay = type === "closed" ? 0.08 : 0.4;
        this.tone = 0.5;
      }
      setParameter(id, value) {
        if (id === "decay") {
          this.decay = Math.max(0.02, Math.min(2, value));
          return;
        }
        if (id === "tone") {
          this.tone = Math.max(0, Math.min(1, value));
          return;
        }
        super.setParameter(id, value);
      }
      get parameterDescriptors() {
        return [
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.02, max: 2, step: 0.01, unit: "s" },
            defaultValue: this.type === "closed" ? 0.08 : 0.4
          },
          {
            id: "tone",
            label: "Tone",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          ...super.parameterDescriptors
        ];
      }
      triggerSynthesis(source, time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = this.semitonesToPlaybackRate(this.tune);
        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.5;
        const bandpass = this.context.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.value = 8e3 + this.tone * 4e3;
        bandpass.Q.value = 1.5;
        const highpass = this.context.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = this.type === "closed" ? 7e3 : 5e3;
        const oscillatorGain = this.context.createGain();
        oscillatorGain.gain.value = 0.15;
        HIHAT_FREQUENCIES.forEach((freq, i) => {
          const osc = this.context.createOscillator();
          osc.type = "square";
          osc.frequency.value = freq * tuneMultiplier;
          const oscEnv = this.context.createGain();
          const oscDecay = this.decay * (1 - i * 0.05);
          oscEnv.gain.setValueAtTime(1, time);
          oscEnv.gain.exponentialRampToValueAtTime(1e-3, time + oscDecay);
          osc.connect(oscEnv);
          oscEnv.connect(oscillatorGain);
          osc.start(time);
          osc.stop(time + this.decay + 0.1);
        });
        const noiseGain = this.context.createGain();
        noiseGain.gain.setValueAtTime(0.3, time);
        noiseGain.gain.exponentialRampToValueAtTime(1e-3, time + this.decay * 0.5);
        source.connect(noiseGain);
        source.start(time);
        source.stop(time + this.decay + 0.1);
        oscillatorGain.connect(bandpass);
        noiseGain.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(masterGain);
        masterGain.connect(this.output);
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/hihat-e1.js
var HiHat909E1;
var init_hihat_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/hihat-e1.js"() {
    "use strict";
    init_sample_voice();
    HiHat909E1 = class extends SampleVoice {
      constructor(id, context, library, type) {
        super(id, context, library, type === "closed" ? "closed-hat" : "open-hat");
        this.type = type;
        this.decay = type === "closed" ? 0.2 : 0.6;
      }
      setParameter(id, value) {
        if (id === "decay") {
          this.decay = Math.max(0.05, Math.min(2, value));
          return;
        }
        super.setParameter(id, value);
      }
      get parameterDescriptors() {
        return [
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.05, max: 2, step: 0.01, unit: "s" },
            defaultValue: this.type === "closed" ? 0.2 : 0.6
          },
          ...super.parameterDescriptors
        ];
      }
      triggerSynthesis(source, time, velocity) {
        const highPass = this.context.createBiquadFilter();
        highPass.type = "highpass";
        highPass.frequency.value = this.type === "closed" ? 7e3 : 5e3;
        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        gain.gain.setValueAtTime(level, time);
        gain.gain.exponentialRampToValueAtTime(1e-4, time + this.decay);
        source.connect(highPass);
        highPass.connect(gain);
        gain.connect(this.output);
        source.start(time);
        source.stop(time + this.decay + 0.1);
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/cymbal.js
var CYMBAL_FREQUENCIES, Cymbal909;
var init_cymbal = __esm({
  "../web/public/909/dist/machines/tr909/voices/cymbal.js"() {
    "use strict";
    init_sample_voice();
    CYMBAL_FREQUENCIES = {
      crash: [
        245,
        // Low fundamental
        367.5,
        // Inharmonic
        489,
        // Inharmonic
        612.5,
        // Inharmonic
        857.5,
        // Mid metallic
        1225
        // High shimmer
      ],
      ride: [
        180,
        // Lower fundamental for darker tone
        270,
        // Inharmonic
        360,
        // Inharmonic
        480,
        // Inharmonic
        720,
        // Mid metallic
        1080
        // High shimmer
      ]
    };
    Cymbal909 = class extends SampleVoice {
      constructor(id, context, library, type) {
        super(id, context, library, type === "crash" ? "crash" : "ride");
        this.type = type;
        this.decay = type === "crash" ? 1.2 : 2;
        this.tone = 0.5;
      }
      setParameter(id, value) {
        if (id === "decay") {
          this.decay = Math.max(0.3, Math.min(4, value));
          return;
        }
        if (id === "tone") {
          this.tone = Math.max(0, Math.min(1, value));
          return;
        }
        super.setParameter(id, value);
      }
      get parameterDescriptors() {
        return [
          ...super.parameterDescriptors,
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.3, max: 4, step: 0.05, unit: "s" },
            defaultValue: this.decay
          },
          {
            id: "tone",
            label: "Tone",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          }
        ];
      }
      triggerSynthesis(source, time, velocity) {
        const level = Math.max(0, Math.min(1, velocity * this.level));
        const tuneMultiplier = this.semitonesToPlaybackRate(this.tune);
        const frequencies = CYMBAL_FREQUENCIES[this.type];
        const masterGain = this.context.createGain();
        masterGain.gain.value = level * 0.4;
        const bandpass = this.context.createBiquadFilter();
        bandpass.type = "bandpass";
        const baseFreq = this.type === "crash" ? 6e3 : 4e3;
        bandpass.frequency.value = baseFreq + this.tone * 4e3;
        bandpass.Q.value = 0.8;
        const highpass = this.context.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = this.type === "crash" ? 3e3 : 2e3;
        const oscillatorGain = this.context.createGain();
        oscillatorGain.gain.value = 0.12;
        frequencies.forEach((freq, i) => {
          const osc = this.context.createOscillator();
          osc.type = "square";
          osc.frequency.value = freq * tuneMultiplier;
          const oscEnv = this.context.createGain();
          const oscDecay = this.decay * (1 - i * 0.08);
          oscEnv.gain.setValueAtTime(1, time);
          oscEnv.gain.exponentialRampToValueAtTime(1e-3, time + oscDecay);
          osc.connect(oscEnv);
          oscEnv.connect(oscillatorGain);
          osc.start(time);
          osc.stop(time + this.decay + 0.2);
        });
        const noiseGain = this.context.createGain();
        const noiseLevel = this.type === "crash" ? 0.4 : 0.25;
        noiseGain.gain.setValueAtTime(noiseLevel, time);
        noiseGain.gain.exponentialRampToValueAtTime(1e-3, time + this.decay * 0.7);
        source.connect(noiseGain);
        source.start(time);
        source.stop(time + this.decay + 0.2);
        oscillatorGain.connect(bandpass);
        noiseGain.connect(bandpass);
        bandpass.connect(highpass);
        highpass.connect(masterGain);
        masterGain.connect(this.output);
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/voices/cymbal-e1.js
var Cymbal909E1;
var init_cymbal_e1 = __esm({
  "../web/public/909/dist/machines/tr909/voices/cymbal-e1.js"() {
    "use strict";
    init_sample_voice();
    Cymbal909E1 = class extends SampleVoice {
      constructor(id, context, library, type) {
        super(id, context, library, type === "crash" ? "crash" : "ride");
        this.type = type;
        this.decay = type === "crash" ? 1.5 : 2.5;
      }
      setParameter(id, value) {
        if (id === "decay") {
          this.decay = Math.max(0.3, Math.min(4, value));
          return;
        }
        super.setParameter(id, value);
      }
      get parameterDescriptors() {
        return [
          ...super.parameterDescriptors,
          {
            id: "decay",
            label: "Decay",
            range: { min: 0.3, max: 4, step: 0.05, unit: "s" },
            defaultValue: this.decay
          }
        ];
      }
      triggerSynthesis(source, time, velocity) {
        const bandPass = this.context.createBiquadFilter();
        bandPass.type = "bandpass";
        bandPass.frequency.value = this.type === "crash" ? 8e3 : 5e3;
        bandPass.Q.value = 0.6;
        const gain = this.context.createGain();
        const level = Math.max(0, Math.min(1, velocity * this.level));
        gain.gain.setValueAtTime(level, time);
        gain.gain.exponentialRampToValueAtTime(1e-4, time + this.decay);
        source.connect(bandPass);
        bandPass.connect(gain);
        gain.connect(this.output);
        source.start(time);
        source.stop(time + this.decay + 0.2);
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/samples/library.js
function createDefaultTr909SampleLibrary() {
  const library = new SampleLibrary();
  library.setFromData("closed-hat", createHatSample("closed"));
  library.setFromData("open-hat", createHatSample("open"));
  library.setFromData("crash", createCymbalSample("crash"));
  library.setFromData("ride", createCymbalSample("ride"));
  return library;
}
function createHatSample(type, sampleRate = 44100) {
  const duration = type === "closed" ? 0.3 : 0.9;
  const length = Math.floor(duration * sampleRate);
  const data = new Float32Array(length);
  const cutoff = type === "closed" ? 8e3 : 6e3;
  let lastValue = Math.random() * 2 - 1;
  for (let i = 0; i < length; i += 1) {
    const noise = Math.random() * 2 - 1;
    const filtered = noise - lastValue + 0.99 * (lastValue - noise / 2);
    lastValue = filtered;
    const envelope = Math.exp(-5 * i / length);
    const tone = Math.sin(2 * Math.PI * cutoff * i / sampleRate);
    data[i] = (filtered + tone * 0.2) * envelope * (type === "open" ? 0.6 : 1);
  }
  return { sampleRate, channels: [data] };
}
function createCymbalSample(type, sampleRate = 44100) {
  const duration = type === "crash" ? 1.6 : 2.8;
  const length = Math.floor(duration * sampleRate);
  const data = new Float32Array(length);
  const partials = type === "crash" ? [410, 620, 830, 1200] : [320, 480, 650];
  for (let i = 0; i < length; i += 1) {
    let sample = 0;
    partials.forEach((freq, idx) => {
      const phase = 2 * Math.PI * freq * i / sampleRate;
      sample += Math.sin(phase + idx * 0.2) * (1 / (idx + 1));
    });
    const envelope = Math.exp(-3 * i / length);
    data[i] = sample * envelope * 0.7;
  }
  return { sampleRate, channels: [data] };
}
var DEFAULT_909_SAMPLE_MANIFEST, SampleLibrary;
var init_library = __esm({
  "../web/public/909/dist/machines/tr909/samples/library.js"() {
    "use strict";
    DEFAULT_909_SAMPLE_MANIFEST = [
      { id: "closed-hat", url: "/909/samples/closed-hat.wav" },
      { id: "open-hat", url: "/909/samples/open-hat.wav" },
      { id: "crash", url: "/909/samples/crash.wav" },
      { id: "ride", url: "/909/samples/ride.wav" }
    ];
    SampleLibrary = class {
      constructor() {
        this.data = /* @__PURE__ */ new Map();
        this.bufferCache = /* @__PURE__ */ new WeakMap();
      }
      setFromBuffer(id, buffer) {
        const channels = [];
        for (let i = 0; i < buffer.numberOfChannels; i += 1) {
          const channelData = new Float32Array(buffer.length);
          buffer.copyFromChannel(channelData, i);
          channels.push(channelData);
        }
        this.data.set(id, { sampleRate: buffer.sampleRate, channels });
        this.bufferCache = /* @__PURE__ */ new WeakMap();
      }
      setFromData(id, sampleData) {
        this.data.set(id, sampleData);
        this.bufferCache = /* @__PURE__ */ new WeakMap();
      }
      async loadFromManifest(context, manifest) {
        if (typeof fetch === "undefined") {
          console.warn("Sample loading skipped: fetch API unavailable in this runtime");
          return;
        }
        await Promise.all(manifest.map(async (entry) => {
          const response = await fetch(entry.url.toString());
          if (!response.ok) {
            throw new Error(`Failed to fetch sample ${entry.id}: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
          this.setFromBuffer(entry.id, decoded);
        }));
      }
      has(id) {
        return this.data.has(id);
      }
      size() {
        return this.data.size;
      }
      getBuffer(context, id) {
        const sampleData = this.data.get(id);
        if (!sampleData) {
          return void 0;
        }
        let contextCache = this.bufferCache.get(context);
        if (!contextCache) {
          contextCache = /* @__PURE__ */ new Map();
          this.bufferCache.set(context, contextCache);
        }
        const cached = contextCache.get(id);
        if (cached) {
          return cached;
        }
        const buffer = context.createBuffer(sampleData.channels.length, sampleData.channels[0].length, sampleData.sampleRate);
        sampleData.channels.forEach((channel, index) => {
          const destination = buffer.getChannelData(index);
          destination.set(channel);
        });
        contextCache.set(id, buffer);
        return buffer;
      }
    };
  }
});

// ../web/public/909/dist/machines/tr909/engine-v3.js
var engine_v3_exports = {};
__export(engine_v3_exports, {
  TR909Engine: () => TR909Engine
});
var TR909Engine;
var init_engine_v3 = __esm({
  "../web/public/909/dist/machines/tr909/engine-v3.js"() {
    "use strict";
    init_engine();
    init_sequencer();
    init_noise();
    init_kick_v3();
    init_kick_e1();
    init_snare();
    init_snare_e1();
    init_clap();
    init_clap_e1();
    init_tom();
    init_tom_e1();
    init_rimshot();
    init_rimshot_e1();
    init_hihat();
    init_hihat_e1();
    init_cymbal();
    init_cymbal_e1();
    init_sample_voice();
    init_library();
    TR909Engine = class _TR909Engine extends SynthEngine {
      constructor(options = {}) {
        super(options);
        this.sequencer = new StepSequencer({ steps: 16, bpm: 125 });
        this.currentBpm = 125;
        this.swingAmount = 0;
        this.flamAmount = 0;
        this.activeOpenHat = null;
        this.sampleLibrary = createDefaultTr909SampleLibrary();
        this.currentEngine = "E2";
        this.voiceEngines = /* @__PURE__ */ new Map();
        _TR909Engine.ENGINE_CAPABLE_VOICES.forEach((id) => {
          this.voiceEngines.set(id, _TR909Engine.VOICE_DEFAULTS[id] ?? this.currentEngine);
        });
        this.voiceStates = /* @__PURE__ */ new Map();
        this.voiceParams = /* @__PURE__ */ new Map();
        this.setupVoices();
        this.sequencer.onStep = (step, events) => {
          this.onStepChange?.(step);
          events.forEach((event) => {
            if (!this.shouldVoicePlay(event.voice)) {
              return;
            }
            const voice = this.voices.get(event.voice);
            const globalAccentMult = event.globalAccent ?? 1;
            const accentMultiplier = event.accent && voice ? 1 + (voice.getAccentAmount() - 1) * globalAccentMult : 1;
            const velocity = Math.min(1, event.velocity * accentMultiplier);
            if (event.voice === "ch" && this.activeOpenHat) {
              this.chokeOpenHat();
            }
            if (this.flamAmount > 0 && velocity > 0.5) {
              const flamDelay = this.flamAmount * 0.03;
              this.trigger(event.voice, velocity * 0.4);
              setTimeout(() => {
                this.trigger(event.voice, velocity);
              }, flamDelay * 1e3);
            } else {
              this.trigger(event.voice, velocity);
            }
          });
        };
      }
      chokeOpenHat() {
        if (this.activeOpenHat) {
          const { gain } = this.activeOpenHat;
          const now = this.context.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.exponentialRampToValueAtTime(1e-3, now + 0.02);
          this.activeOpenHat = null;
        }
      }
      // Called by HiHat909 to register active open hat for choke
      registerOpenHat(source, gain) {
        this.activeOpenHat = { source, gain };
      }
      clearOpenHat() {
        this.activeOpenHat = null;
      }
      // Set a voice parameter that persists through render
      setVoiceParam(voiceId, paramId, value) {
        if (!this.voiceParams.has(voiceId)) {
          this.voiceParams.set(voiceId, /* @__PURE__ */ new Map());
        }
        this.voiceParams.get(voiceId).set(paramId, value);
        const voice = this.voices.get(voiceId);
        if (voice) {
          voice[paramId] = value;
        }
      }
      setupVoices() {
        const voices = this.createVoiceMap(this.context);
        voices.forEach((voice, id) => this.registerVoice(id, voice));
      }
      async loadSamples(manifest) {
        if (!manifest?.length) {
          return;
        }
        await this.sampleLibrary.loadFromManifest(this.context, manifest);
      }
      /**
       * Load real 909 samples (hi-hats and cymbals) from the default location.
       * This replaces the synthesized versions with authentic samples from a real TR-909.
       * Call this before starting playback if you want the real samples.
       */
      async loadRealSamples() {
        await this.sampleLibrary.loadFromManifest(this.context, DEFAULT_909_SAMPLE_MANIFEST);
      }
      setPattern(id, pattern) {
        this.sequencer.addPattern(id, pattern);
        this.sequencer.loadPattern(id);
      }
      startSequencer() {
        void this.start();
        this.sequencer.start();
      }
      stopSequencer() {
        this.sequencer.stop();
        this.stop();
        this.onStepChange?.(-1);
        this.activeOpenHat = null;
      }
      /**
       * Get voice state: 'normal', 'muted', or 'solo'
       */
      getVoiceState(voiceId) {
        return this.voiceStates.get(voiceId) ?? "normal";
      }
      /**
       * Cycle voice state: normal → muted → solo → normal
       * Returns the new state
       */
      cycleVoiceState(voiceId) {
        const current = this.getVoiceState(voiceId);
        let next;
        if (current === "normal") {
          next = "muted";
        } else if (current === "muted") {
          this.voiceStates.forEach((_, id) => {
            if (this.voiceStates.get(id) === "solo") {
              this.voiceStates.set(id, "normal");
            }
          });
          next = "solo";
        } else {
          next = "normal";
        }
        this.voiceStates.set(voiceId, next);
        this.onVoiceStateChange?.(voiceId, next);
        return next;
      }
      /**
       * Check if a voice should play based on mute/solo state
       */
      shouldVoicePlay(voiceId) {
        const state = this.getVoiceState(voiceId);
        if (state === "muted") return false;
        const hasSolo = [...this.voiceStates.values()].includes("solo");
        if (hasSolo) {
          return state === "solo";
        }
        return true;
      }
      /**
       * Clear all mute/solo states
       */
      clearVoiceStates() {
        this.voiceStates.clear();
      }
      setBpm(bpm) {
        this.currentBpm = bpm;
        this.sequencer.setBpm(bpm);
      }
      setSwing(amount) {
        this.swingAmount = Math.max(0, Math.min(1, amount));
        this.sequencer.setSwing(this.swingAmount);
      }
      getSwing() {
        return this.swingAmount;
      }
      setFlam(amount) {
        this.flamAmount = Math.max(0, Math.min(1, amount));
      }
      getFlam() {
        return this.flamAmount;
      }
      // Pattern length: 1-16 steps
      setPatternLength(length) {
        this.sequencer.setPatternLength(length);
      }
      getPatternLength() {
        return this.sequencer.getPatternLength();
      }
      // Scale mode: '16th', '8th-triplet', '16th-triplet', '32nd'
      setScale(scale) {
        this.sequencer.setScale(scale);
      }
      getScale() {
        return this.sequencer.getScale();
      }
      getScaleModes() {
        return this.sequencer.getScaleModes();
      }
      // Global accent: 0-1 multiplier for all accented steps
      setGlobalAccent(amount) {
        this.sequencer.setGlobalAccent(amount);
      }
      getGlobalAccent() {
        return this.sequencer.getGlobalAccent();
      }
      /**
       * Get the current engine version
       */
      getEngine() {
        return this.currentEngine;
      }
      /**
       * Get available engine versions
       */
      getEngineVersions() {
        return _TR909Engine.ENGINE_VERSIONS;
      }
      /**
       * Check if a voice supports engine toggle
       */
      isEngineCapable(voiceId) {
        return _TR909Engine.ENGINE_CAPABLE_VOICES.includes(voiceId);
      }
      /**
       * Get engine version for a specific voice
       */
      getVoiceEngine(voiceId) {
        return this.voiceEngines.get(voiceId) ?? _TR909Engine.VOICE_DEFAULTS[voiceId] ?? this.currentEngine;
      }
      /**
       * Get the default engine for a voice (used when presets don't specify)
       */
      getVoiceDefaultEngine(voiceId) {
        return _TR909Engine.VOICE_DEFAULTS[voiceId] ?? "E2";
      }
      /**
       * Reset a voice to its default engine
       */
      resetVoiceEngine(voiceId) {
        const defaultEngine = this.getVoiceDefaultEngine(voiceId);
        this.setVoiceEngine(voiceId, defaultEngine);
      }
      /**
       * Reset all voices to their default engines
       */
      resetAllVoiceEngines() {
        _TR909Engine.ENGINE_CAPABLE_VOICES.forEach((id) => {
          this.resetVoiceEngine(id);
        });
      }
      /**
       * Set engine version for a specific voice
       */
      setVoiceEngine(voiceId, version) {
        if (!_TR909Engine.ENGINE_CAPABLE_VOICES.includes(voiceId)) {
          return;
        }
        if (!_TR909Engine.ENGINE_VERSIONS.includes(version)) {
          return;
        }
        const currentVersion = this.voiceEngines.get(voiceId);
        if (currentVersion === version) {
          return;
        }
        this.voiceEngines.set(voiceId, version);
        const noiseBuffer = new LFSRNoise(this.context).createBuffer(1);
        const oldVoice = this.voices.get(voiceId);
        if (oldVoice) oldVoice.disconnect();
        let newVoice;
        switch (voiceId) {
          case "kick":
            newVoice = version === "E1" ? new Kick909E1("kick", this.context) : new Kick909("kick", this.context);
            break;
          case "snare":
            newVoice = version === "E1" ? new Snare909E1("snare", this.context, noiseBuffer) : new Snare909("snare", this.context, noiseBuffer);
            break;
          case "clap":
            newVoice = version === "E1" ? new Clap909E1("clap", this.context, noiseBuffer) : new Clap909("clap", this.context, noiseBuffer);
            break;
          case "rimshot":
            newVoice = version === "E1" ? new Rimshot909E1("rimshot", this.context) : new Rimshot909("rimshot", this.context);
            break;
          case "ltom":
            newVoice = version === "E1" ? new Tom909E1("ltom", this.context, "low") : new Tom909("ltom", this.context, "low");
            break;
          case "mtom":
            newVoice = version === "E1" ? new Tom909E1("mtom", this.context, "mid") : new Tom909("mtom", this.context, "mid");
            break;
          case "htom":
            newVoice = version === "E1" ? new Tom909E1("htom", this.context, "high") : new Tom909("htom", this.context, "high");
            break;
          case "ch":
            newVoice = version === "E1" ? new HiHat909E1("ch", this.context, this.sampleLibrary, "closed") : new HiHat909("ch", this.context, this.sampleLibrary, "closed");
            break;
          case "oh":
            newVoice = version === "E1" ? new HiHat909E1("oh", this.context, this.sampleLibrary, "open") : new HiHat909("oh", this.context, this.sampleLibrary, "open");
            break;
          case "crash":
            newVoice = version === "E1" ? new Cymbal909E1("crash", this.context, this.sampleLibrary, "crash") : new Cymbal909("crash", this.context, this.sampleLibrary, "crash");
            break;
          case "ride":
            newVoice = version === "E1" ? new Cymbal909E1("ride", this.context, this.sampleLibrary, "ride") : new Cymbal909("ride", this.context, this.sampleLibrary, "ride");
            break;
        }
        if (newVoice) {
          this.registerVoice(voiceId, newVoice);
        }
      }
      /**
       * Switch engine version for kick, snare, and clap
       * E1: Original voices (simpler synthesis)
       * E2: Research-based voices (authentic 909 circuit emulation)
       */
      setEngine(version) {
        if (!_TR909Engine.ENGINE_VERSIONS.includes(version)) {
          console.warn(`Unknown engine version: ${version}`);
          return;
        }
        if (version === this.currentEngine) {
          return;
        }
        this.currentEngine = version;
        const noiseBuffer = new LFSRNoise(this.context).createBuffer(1);
        const oldKick = this.voices.get("kick");
        if (oldKick) oldKick.disconnect();
        const KickClass = version === "E1" ? Kick909E1 : Kick909;
        this.registerVoice("kick", new KickClass("kick", this.context));
        const oldSnare = this.voices.get("snare");
        if (oldSnare) oldSnare.disconnect();
        const SnareClass = version === "E1" ? Snare909E1 : Snare909;
        this.registerVoice("snare", new SnareClass("snare", this.context, noiseBuffer));
        const oldClap = this.voices.get("clap");
        if (oldClap) oldClap.disconnect();
        const ClapClass = version === "E1" ? Clap909E1 : Clap909;
        this.registerVoice("clap", new ClapClass("clap", this.context, noiseBuffer));
        const oldRimshot = this.voices.get("rimshot");
        if (oldRimshot) oldRimshot.disconnect();
        const RimshotClass = version === "E1" ? Rimshot909E1 : Rimshot909;
        this.registerVoice("rimshot", new RimshotClass("rimshot", this.context));
        const TomClass = version === "E1" ? Tom909E1 : Tom909;
        ["ltom", "mtom", "htom"].forEach((tomId, i) => {
          const types = ["low", "mid", "high"];
          const oldTom = this.voices.get(tomId);
          if (oldTom) oldTom.disconnect();
          this.registerVoice(tomId, new TomClass(tomId, this.context, types[i]));
        });
        const HiHatClass = version === "E1" ? HiHat909E1 : HiHat909;
        const oldCH = this.voices.get("ch");
        if (oldCH) oldCH.disconnect();
        this.registerVoice("ch", new HiHatClass("ch", this.context, this.sampleLibrary, "closed"));
        const oldOH = this.voices.get("oh");
        if (oldOH) oldOH.disconnect();
        this.registerVoice("oh", new HiHatClass("oh", this.context, this.sampleLibrary, "open"));
        const CymbalClass = version === "E1" ? Cymbal909E1 : Cymbal909;
        const oldCrash = this.voices.get("crash");
        if (oldCrash) oldCrash.disconnect();
        this.registerVoice("crash", new CymbalClass("crash", this.context, this.sampleLibrary, "crash"));
        const oldRide = this.voices.get("ride");
        if (oldRide) oldRide.disconnect();
        this.registerVoice("ride", new CymbalClass("ride", this.context, this.sampleLibrary, "ride"));
      }
      /**
       * Check if a voice supports sample mode toggle
       */
      isSampleCapable(voiceId) {
        return _TR909Engine.SAMPLE_CAPABLE_VOICES.includes(voiceId);
      }
      /**
       * Toggle between sample and synthesis mode for a voice
       */
      setVoiceUseSample(voiceId, useSample) {
        const voice = this.voices.get(voiceId);
        if (voice && voice instanceof SampleVoice) {
          voice.setUseSample(useSample);
        }
      }
      /**
       * Get whether a voice is using samples
       */
      getVoiceUseSample(voiceId) {
        const voice = this.voices.get(voiceId);
        if (voice && voice instanceof SampleVoice) {
          return voice.useSample;
        }
        return false;
      }
      getCurrentStep() {
        return this.sequencer.getCurrentStep();
      }
      isPlaying() {
        return this.sequencer.isRunning();
      }
      /**
       * Render a pattern to an AudioBuffer.
       * Supports two signatures for Session API compatibility:
       *   renderPattern({ bars, bpm })           - uses stored pattern
       *   renderPattern(pattern, { bars, bpm })  - explicit pattern
       */
      async renderPattern(patternOrOptions = {}, options = {}) {
        let pattern;
        let opts;
        if (patternOrOptions && ("bars" in patternOrOptions || "bpm" in patternOrOptions || Object.keys(patternOrOptions).length === 0)) {
          const storedPattern = this.sequencer.getCurrentPattern();
          if (!storedPattern) {
            throw new Error("No pattern available. Call setPattern() first or pass pattern as argument.");
          }
          pattern = storedPattern;
          opts = patternOrOptions;
        } else {
          pattern = patternOrOptions;
          opts = options;
        }
        const bpm = opts.bpm ?? this.currentBpm;
        const bars = opts.bars ?? 1;
        const stepsPerBar = _TR909Engine.STEPS_PER_BAR;
        const totalSteps = stepsPerBar * bars;
        const baseStepDuration = 60 / bpm / 4;
        const duration = baseStepDuration * totalSteps;
        return this.outputManager.renderOffline(duration, (offlineContext) => {
          this.schedulePatternInContext({
            context: offlineContext,
            pattern,
            bpm,
            bars,
            stepsPerBar,
            swing: opts.swing ?? this.swingAmount
          });
        }, {
          sampleRate: opts.sampleRate,
          numberOfChannels: opts.numberOfChannels
        });
      }
      createVoiceMap(context) {
        const noiseBuffer = new LFSRNoise(context).createBuffer(1);
        const getEngine = (id) => this.voiceEngines.get(id) ?? _TR909Engine.VOICE_DEFAULTS[id] ?? "E2";
        const KickClass = getEngine("kick") === "E1" ? Kick909E1 : Kick909;
        const SnareClass = getEngine("snare") === "E1" ? Snare909E1 : Snare909;
        const ClapClass = getEngine("clap") === "E1" ? Clap909E1 : Clap909;
        const RimshotClass = getEngine("rimshot") === "E1" ? Rimshot909E1 : Rimshot909;
        const LTomClass = getEngine("ltom") === "E1" ? Tom909E1 : Tom909;
        const MTomClass = getEngine("mtom") === "E1" ? Tom909E1 : Tom909;
        const HTomClass = getEngine("htom") === "E1" ? Tom909E1 : Tom909;
        const CHClass = getEngine("ch") === "E1" ? HiHat909E1 : HiHat909;
        const OHClass = getEngine("oh") === "E1" ? HiHat909E1 : HiHat909;
        const CrashClass = getEngine("crash") === "E1" ? Cymbal909E1 : Cymbal909;
        const RideClass = getEngine("ride") === "E1" ? Cymbal909E1 : Cymbal909;
        const voices = /* @__PURE__ */ new Map([
          ["kick", new KickClass("kick", context)],
          ["snare", new SnareClass("snare", context, noiseBuffer)],
          ["clap", new ClapClass("clap", context, noiseBuffer)],
          ["rimshot", new RimshotClass("rimshot", context)],
          ["ltom", new LTomClass("ltom", context, "low")],
          ["mtom", new MTomClass("mtom", context, "mid")],
          ["htom", new HTomClass("htom", context, "high")],
          ["ch", new CHClass("ch", context, this.sampleLibrary, "closed")],
          ["oh", new OHClass("oh", context, this.sampleLibrary, "open")],
          ["crash", new CrashClass("crash", context, this.sampleLibrary, "crash")],
          ["ride", new RideClass("ride", context, this.sampleLibrary, "ride")]
        ]);
        this.voiceParams.forEach((params, voiceId) => {
          const voice = voices.get(voiceId);
          if (voice) {
            params.forEach((value, paramId) => {
              voice[paramId] = value;
            });
          }
        });
        return voices;
      }
      schedulePatternInContext({ context, pattern, bpm, bars, stepsPerBar, swing }) {
        const voices = this.createVoiceMap(context);
        const compressor = context.createDynamicsCompressor();
        const masterGain = context.createGain();
        masterGain.gain.value = 0.9;
        voices.forEach((voice) => voice.connect(compressor));
        compressor.connect(masterGain);
        masterGain.connect(context.destination);
        const baseStepDuration = 60 / bpm / 4;
        const swingFactor = swing * 0.5;
        let currentTime = 0;
        const totalSteps = bars * stepsPerBar;
        for (let step = 0; step < totalSteps; step += 1) {
          const events = this.collectEventsForStep(pattern, step);
          events.forEach((event) => {
            const voice = voices.get(event.voice);
            if (!voice)
              return;
            const velocity = Math.min(1, event.velocity * (event.accent ? 1.1 : 1));
            voice.trigger(currentTime, velocity);
          });
          const interval = swing > 0 ? baseStepDuration * (step % 2 === 1 ? 1 + swingFactor : 1 - swingFactor) : baseStepDuration;
          currentTime += interval;
        }
      }
      collectEventsForStep(pattern, step) {
        const events = [];
        for (const [voiceId, track] of Object.entries(pattern)) {
          const patternStep = this.getPatternStep(track, step);
          if (!patternStep)
            continue;
          events.push({
            voice: voiceId,
            step,
            velocity: patternStep.velocity,
            accent: patternStep.accent
          });
        }
        return events;
      }
      getPatternStep(track, step) {
        if (!track.length) {
          return void 0;
        }
        const normalizedIndex = step % track.length;
        const data = track[normalizedIndex];
        if (!data || data.velocity <= 0) {
          return void 0;
        }
        return data;
      }
      prepareOfflineRender() {
        throw new Error("Use TR909Engine.renderPattern() to export audio for this machine.");
      }
    };
    TR909Engine.STEPS_PER_BAR = 16;
    TR909Engine.SAMPLE_CAPABLE_VOICES = ["ch", "oh", "crash", "ride"];
    TR909Engine.ENGINE_CAPABLE_VOICES = ["kick", "snare", "clap", "rimshot", "ltom", "mtom", "htom", "ch", "oh", "crash", "ride"];
    TR909Engine.ENGINE_VERSIONS = ["E1", "E2"];
    TR909Engine.VOICE_DEFAULTS = {
      kick: "E1",
      snare: "E2",
      clap: "E1",
      rimshot: "E2",
      ltom: "E2",
      mtom: "E2",
      htom: "E2",
      ch: "E1",
      oh: "E1",
      crash: "E2",
      ride: "E2"
    };
  }
});

// ../web/public/303/dist/core/output.js
function audioBufferToWav2(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const length = buffer.length;
  const interleavedLength = length * numChannels;
  const interleaved = new Float32Array(interleavedLength);
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      interleaved[i * numChannels + ch] = buffer.getChannelData(ch)[i];
    }
  }
  const dataLength = interleavedLength * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);
  writeString2(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString2(view, 8, "WAVE");
  writeString2(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString2(view, 36, "data");
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (let i = 0; i < interleavedLength; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    const int16 = sample < 0 ? sample * 32768 : sample * 32767;
    view.setInt16(offset, int16, true);
    offset += 2;
  }
  return wavBuffer;
}
function writeString2(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
var OutputManager2;
var init_output2 = __esm({
  "../web/public/303/dist/core/output.js"() {
    "use strict";
    OutputManager2 = class {
      constructor(context, destination) {
        this.context = context;
        this.destination = destination ?? context.destination;
      }
      setDestination(node) {
        this.destination = node;
      }
      getDestination() {
        return this.destination;
      }
      renderOffline(duration, setupGraph, options = {}) {
        const sampleRate = options.sampleRate ?? this.context.sampleRate ?? 44100;
        const channels = options.numberOfChannels ?? 2;
        const frameCount = Math.ceil(duration * sampleRate);
        const offlineContext = new OfflineAudioContext(channels, frameCount, sampleRate);
        return Promise.resolve(setupGraph(offlineContext)).then(() => offlineContext.startRendering());
      }
      audioBufferToWav(buffer) {
        return audioBufferToWav2(buffer);
      }
      async audioBufferToBlob(buffer) {
        const wavArray = this.audioBufferToWav(buffer);
        return new Blob([wavArray], { type: "audio/wav" });
      }
    };
  }
});

// ../web/public/303/dist/core/engine.js
var SynthEngine2;
var init_engine2 = __esm({
  "../web/public/303/dist/core/engine.js"() {
    "use strict";
    init_output2();
    SynthEngine2 = class {
      constructor(options = {}) {
        this.voices = /* @__PURE__ */ new Map();
        this.started = false;
        this.context = options.context ?? new AudioContext();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = options.masterVolume ?? 0.8;
        this.compressor = this.context.createDynamicsCompressor();
        this.analyser = this.context.createAnalyser();
        this.compressor.connect(this.analyser);
        this.analyser.connect(this.masterGain);
        this.masterGain.connect(this.context.destination);
        this.outputManager = new OutputManager2(this.context, this.masterGain);
      }
      registerVoice(id, voice) {
        voice.connect(this.compressor);
        this.voices.set(id, voice);
      }
      getVoices() {
        return [...this.voices.keys()];
      }
      getVoiceParameterDescriptors() {
        const descriptors = {};
        for (const [id, voice] of this.voices.entries()) {
          descriptors[id] = voice.parameterDescriptors;
        }
        return descriptors;
      }
      async start() {
        if (this.context.state === "suspended") {
          await this.context.resume();
        }
        this.started = true;
      }
      stop() {
        this.started = false;
      }
      isRunning() {
        return this.started;
      }
      trigger(voiceId, velocity = 1, time) {
        const voice = this.voices.get(voiceId);
        if (!voice) {
          throw new Error(`Unknown voice "${voiceId}"`);
        }
        const when = time ?? this.context.currentTime;
        voice.trigger(when, velocity);
      }
      setVoiceParameter(voiceId, parameterId, value) {
        const voice = this.voices.get(voiceId);
        if (!voice) {
          throw new Error(`Unknown voice "${voiceId}"`);
        }
        voice.setParameter(parameterId, value);
      }
      connectOutput(destination) {
        this.masterGain.disconnect();
        this.masterGain.connect(destination);
        this.outputManager.setDestination(destination);
      }
      audioBufferToWav(buffer) {
        return this.outputManager.audioBufferToWav(buffer);
      }
      audioBufferToBlob(buffer) {
        return this.outputManager.audioBufferToBlob(buffer);
      }
      async renderToBuffer(options) {
        return this.outputManager.renderOffline(
          options.duration,
          (offlineContext) => this.prepareOfflineRender(offlineContext, options),
          {
            sampleRate: options.sampleRate,
            numberOfChannels: options.numberOfChannels
          }
        );
      }
    };
  }
});

// ../web/public/303/dist/machines/tb303/sequencer.js
function noteToMidi(noteName) {
  const match = noteName.match(/^([A-G]#?)(\d)$/);
  if (!match) return 48;
  const [, note, octave] = match;
  const noteIndex = NOTES.indexOf(note);
  return (parseInt(octave) + 1) * 12 + noteIndex;
}
function midiToNote(midi) {
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTES[noteIndex]}${octave}`;
}
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
var NOTES, TB303Sequencer;
var init_sequencer2 = __esm({
  "../web/public/303/dist/machines/tb303/sequencer.js"() {
    "use strict";
    NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    TB303Sequencer = class {
      constructor(options = {}) {
        this.steps = options.steps ?? 16;
        this.bpm = options.bpm ?? 130;
        this.running = false;
        this.currentStep = -1;
        this.nextStepTime = 0;
        this.scheduleAheadTime = 0.1;
        this.lookahead = 25;
        this.pattern = this.createEmptyPattern();
        this.onStep = null;
        this.timerID = null;
        this.audioContext = null;
      }
      createEmptyPattern() {
        const pattern = [];
        for (let i = 0; i < this.steps; i++) {
          pattern.push({
            note: "C2",
            gate: i === 0,
            // First step on by default
            accent: false,
            slide: false
          });
        }
        return pattern;
      }
      setContext(context) {
        this.audioContext = context;
      }
      setBpm(bpm) {
        this.bpm = Math.max(30, Math.min(300, bpm));
      }
      getBpm() {
        return this.bpm;
      }
      getStepDuration() {
        return 60 / this.bpm / 4;
      }
      setPattern(pattern) {
        if (Array.isArray(pattern) && pattern.length === this.steps) {
          this.pattern = pattern.map((step) => ({
            note: step.note ?? "C2",
            gate: step.gate ?? false,
            accent: step.accent ?? false,
            slide: step.slide ?? false
          }));
        }
      }
      getPattern() {
        return this.pattern.map((step) => ({ ...step }));
      }
      setStep(index, data) {
        if (index >= 0 && index < this.steps) {
          Object.assign(this.pattern[index], data);
        }
      }
      getStep(index) {
        if (index >= 0 && index < this.steps) {
          return { ...this.pattern[index] };
        }
        return null;
      }
      start() {
        if (this.running) return;
        if (!this.audioContext) {
          console.warn("TB303Sequencer: No audio context set");
          return;
        }
        this.running = true;
        this.currentStep = -1;
        this.nextStepTime = this.audioContext.currentTime;
        this.scheduler();
      }
      stop() {
        this.running = false;
        if (this.timerID) {
          clearTimeout(this.timerID);
          this.timerID = null;
        }
        this.currentStep = -1;
        this.onStep?.(-1, null, null);
      }
      isRunning() {
        return this.running;
      }
      getCurrentStep() {
        return this.currentStep;
      }
      scheduler() {
        if (!this.running) return;
        const currentTime = this.audioContext.currentTime;
        while (this.nextStepTime < currentTime + this.scheduleAheadTime) {
          this.scheduleStep(this.nextStepTime);
          this.advanceStep();
        }
        this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
      }
      scheduleStep(time) {
        const step = (this.currentStep + 1) % this.steps;
        const stepData = this.pattern[step];
        const nextStep = (step + 1) % this.steps;
        const nextStepData = this.pattern[nextStep];
        if (this.onStep && stepData.gate) {
          this.onStep(step, {
            ...stepData,
            midi: noteToMidi(stepData.note),
            frequency: midiToFreq(noteToMidi(stepData.note)),
            time,
            duration: this.getStepDuration()
          }, {
            ...nextStepData,
            midi: noteToMidi(nextStepData.note),
            frequency: midiToFreq(noteToMidi(nextStepData.note))
          });
        }
        this.onStepChange?.(step);
      }
      advanceStep() {
        this.currentStep = (this.currentStep + 1) % this.steps;
        this.nextStepTime += this.getStepDuration();
      }
      // Get next note for a cycle (used by UI)
      static cycleNote(currentNote, direction = 1) {
        const midi = noteToMidi(currentNote);
        const minMidi = 36;
        const maxMidi = 60;
        let newMidi = midi + direction;
        if (newMidi > maxMidi) newMidi = minMidi;
        if (newMidi < minMidi) newMidi = maxMidi;
        return midiToNote(newMidi);
      }
    };
  }
});

// ../web/public/303/dist/core/voice.js
var Voice2;
var init_voice2 = __esm({
  "../web/public/303/dist/core/voice.js"() {
    "use strict";
    Voice2 = class {
      constructor(id, context, options = {}) {
        this.accentAmount = 1.1;
        this.voiceId = id;
        this.context = context;
        this.output = context.createGain();
        this.output.gain.value = options.outputGain ?? 1;
      }
      getAccentAmount() {
        return this.accentAmount;
      }
      setAccentAmount(amount) {
        this.accentAmount = Math.max(1, Math.min(2, amount));
      }
      get id() {
        return this.voiceId;
      }
      connect(destination) {
        this.output.connect(destination);
      }
      disconnect() {
        this.output.disconnect();
      }
      /**
       * Update any exposed parameter (tune, decay, etc.)
       * Base class handles 'accent' parameter.
       */
      setParameter(paramId, value) {
        if (paramId === "accent") {
          this.setAccentAmount(value);
        }
      }
      /**
       * Provide metadata so UIs/CLIs can expose available controls.
       * Includes base accent parameter.
       */
      get parameterDescriptors() {
        return [
          {
            id: "accent",
            label: "Accent",
            range: { min: 1, max: 2, step: 0.05 },
            defaultValue: 1.1
          }
        ];
      }
    };
  }
});

// ../web/public/303/dist/machines/tb303/voices/bass-e1.js
var Bass303E1;
var init_bass_e1 = __esm({
  "../web/public/303/dist/machines/tb303/voices/bass-e1.js"() {
    "use strict";
    init_voice2();
    Bass303E1 = class extends Voice2 {
      constructor(id, context) {
        super(id, context);
        this.waveform = "sawtooth";
        this.cutoff = 0.5;
        this.resonance = 0.5;
        this.envMod = 0.5;
        this.decay = 0.5;
        this.accent = 0.8;
        this.level = 1;
        this.currentFrequency = 130.81;
        this.activeOsc = null;
        this.activeFilter = null;
        this.activeGain = null;
        this.activeEnvGain = null;
      }
      trigger(time, velocity, frequency, accent = false, slide = false, nextFrequency = null) {
        const when = time ?? this.context.currentTime;
        const freq = frequency ?? this.currentFrequency;
        this.currentFrequency = freq;
        if (slide && this.activeOsc && nextFrequency) {
          this.slideToFrequency(when, nextFrequency);
          return;
        }
        this.stopVoice(when);
        const osc = this.context.createOscillator();
        osc.type = this.waveform;
        osc.frequency.setValueAtTime(freq, when);
        const filter = this.context.createBiquadFilter();
        filter.type = "lowpass";
        const minFreq = 60;
        const maxFreq = 8e3;
        const baseFilterFreq = minFreq * Math.pow(maxFreq / minFreq, this.cutoff);
        const envModRange = this.envMod * 4e3;
        filter.Q.setValueAtTime(this.resonance * 20, when);
        const accentMult = accent ? 1.3 : 1;
        filter.frequency.setValueAtTime(baseFilterFreq + envModRange * accentMult, when);
        const decayTime = 0.1 + this.decay * 1.9;
        filter.frequency.exponentialRampToValueAtTime(
          Math.max(baseFilterFreq, 30),
          when + decayTime
        );
        const envGain = this.context.createGain();
        const mainGain = this.context.createGain();
        const accentLevel = accent ? 1 + this.accent * 0.5 : 1;
        const peakLevel = velocity * this.level * accentLevel;
        envGain.gain.setValueAtTime(1e-3, when);
        envGain.gain.exponentialRampToValueAtTime(peakLevel, when + 5e-3);
        envGain.gain.exponentialRampToValueAtTime(peakLevel * 0.7, when + decayTime * 0.5);
        envGain.gain.exponentialRampToValueAtTime(1e-3, when + decayTime + 0.1);
        mainGain.gain.setValueAtTime(0.6, when);
        osc.connect(filter);
        filter.connect(envGain);
        envGain.connect(mainGain);
        mainGain.connect(this.output);
        osc.start(when);
        osc.stop(when + decayTime + 0.2);
        this.activeOsc = osc;
        this.activeFilter = filter;
        this.activeGain = mainGain;
        this.activeEnvGain = envGain;
        osc.onended = () => {
          if (this.activeOsc === osc) {
            this.activeOsc = null;
            this.activeFilter = null;
            this.activeGain = null;
            this.activeEnvGain = null;
          }
        };
      }
      slideToFrequency(time, targetFreq) {
        if (!this.activeOsc) return;
        const glideTime = 0.06;
        this.activeOsc.frequency.exponentialRampToValueAtTime(targetFreq, time + glideTime);
        this.currentFrequency = targetFreq;
      }
      stopVoice(time) {
        if (this.activeOsc) {
          try {
            this.activeOsc.stop(time);
          } catch (e) {
          }
          this.activeOsc = null;
        }
      }
      setWaveform(type) {
        if (type === "sawtooth" || type === "square") {
          this.waveform = type;
          if (this.activeOsc) {
            this.activeOsc.type = type;
          }
        }
      }
      setParameter(id, value) {
        switch (id) {
          case "waveform":
            this.setWaveform(value);
            break;
          case "cutoff":
            this.cutoff = Math.max(0, Math.min(1, value));
            break;
          case "resonance":
            this.resonance = Math.max(0, Math.min(1, value));
            break;
          case "envMod":
            this.envMod = Math.max(0, Math.min(1, value));
            break;
          case "decay":
            this.decay = Math.max(0, Math.min(1, value));
            break;
          case "accent":
            this.accent = Math.max(0, Math.min(1, value));
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "cutoff",
            label: "Cutoff",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "resonance",
            label: "Reso",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "envMod",
            label: "Env Mod",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "accent",
            label: "Accent",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.8
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/303/dist/machines/tb303/filter/diode-ladder.js
var DiodeLadderFilter;
var init_diode_ladder = __esm({
  "../web/public/303/dist/machines/tb303/filter/diode-ladder.js"() {
    "use strict";
    DiodeLadderFilter = class {
      constructor(context) {
        this.context = context;
        this.filters = [];
        for (let i = 0; i < 3; i++) {
          const filter = context.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 1e3;
          filter.Q.value = 0.5;
          this.filters.push(filter);
        }
        this.inputGain = context.createGain();
        this.inputGain.gain.value = 1;
        this.feedbackGain = context.createGain();
        this.feedbackGain.gain.value = 0;
        this.waveshaper = context.createWaveShaper();
        this.waveshaper.curve = this.createSaturationCurve(1.5);
        this.waveshaper.oversample = "2x";
        this.outputGain = context.createGain();
        this.outputGain.gain.value = 1;
        this.inputGain.connect(this.filters[0]);
        for (let i = 0; i < this.filters.length - 1; i++) {
          this.filters[i].connect(this.filters[i + 1]);
        }
        this.filters[this.filters.length - 1].connect(this.waveshaper);
        this.waveshaper.connect(this.outputGain);
        this.outputGain.connect(this.feedbackGain);
        this.feedbackGain.connect(this.inputGain);
        this._frequency = 1e3;
        this._resonance = 0;
      }
      createSaturationCurve(amount) {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = i * 2 / samples - 1;
          curve[i] = Math.tanh(x * amount);
        }
        return curve;
      }
      get input() {
        return this.inputGain;
      }
      get output() {
        return this.outputGain;
      }
      connect(destination) {
        this.outputGain.connect(destination);
        return destination;
      }
      disconnect() {
        this.outputGain.disconnect();
      }
      setFrequency(value, time) {
        const when = time ?? this.context.currentTime;
        const freq = Math.max(20, Math.min(2e4, value));
        this._frequency = freq;
        this.filters.forEach((filter, i) => {
          const detune = 1 + (i - 1) * 0.02;
          filter.frequency.setValueAtTime(freq * detune, when);
        });
      }
      setFrequencyAtTime(value, time) {
        this.setFrequency(value, time);
      }
      exponentialRampToFrequency(value, time) {
        const freq = Math.max(20, Math.min(2e4, value));
        this._frequency = freq;
        this.filters.forEach((filter, i) => {
          const detune = 1 + (i - 1) * 0.02;
          filter.frequency.exponentialRampToValueAtTime(freq * detune, time);
        });
      }
      setResonance(value) {
        this._resonance = Math.max(0, Math.min(1, value));
        const q = 0.5 + this._resonance * 4.25;
        this.filters.forEach((filter) => {
          filter.Q.value = q;
        });
        const feedback = this._resonance * 0.23;
        this.feedbackGain.gain.value = feedback;
        this.outputGain.gain.value = 1 - this._resonance * 0.1;
      }
      getFrequency() {
        return this._frequency;
      }
      getResonance() {
        return this._resonance;
      }
    };
  }
});

// ../web/public/303/dist/machines/tb303/voices/bass.js
var Bass303;
var init_bass = __esm({
  "../web/public/303/dist/machines/tb303/voices/bass.js"() {
    "use strict";
    init_voice2();
    init_diode_ladder();
    Bass303 = class extends Voice2 {
      constructor(id, context) {
        super(id, context);
        this.waveform = "sawtooth";
        this.cutoff = 0.5;
        this.resonance = 0.5;
        this.envMod = 0.5;
        this.decay = 0.5;
        this.accent = 0.8;
        this.level = 1;
        this.currentFrequency = 130.81;
        this.targetFrequency = 130.81;
        this.activeOsc = null;
        this.activeFilter = null;
        this.activeEnvGain = null;
        this.activeOutputGain = null;
        this.isSliding = false;
        this.slideTimeout = null;
      }
      trigger(time, velocity, frequency, accent = false, slide = false, nextFrequency = null) {
        const when = time ?? this.context.currentTime;
        const freq = frequency ?? this.currentFrequency;
        if (slide && this.activeOsc && nextFrequency) {
          this.handleSlide(when, nextFrequency, accent);
          return;
        }
        if (!this.isSliding) {
          this.stopVoice(when);
        }
        this.isSliding = false;
        this.currentFrequency = freq;
        const osc = this.context.createOscillator();
        osc.type = this.waveform;
        osc.frequency.setValueAtTime(freq, when);
        const filter = new DiodeLadderFilter(this.context);
        filter.setResonance(this.resonance);
        const minFreq = 80;
        const maxFreq = 1e4;
        const baseFilterFreq = minFreq * Math.pow(maxFreq / minFreq, this.cutoff);
        const accentMult = accent ? 1.5 + this.accent * 0.5 : 1;
        const envModAmount = this.envMod * 6e3 * accentMult;
        const peakFilterFreq = Math.min(baseFilterFreq + envModAmount, 12e3);
        const baseDecay = 0.1 + this.decay * 1.5;
        const decayTime = accent ? baseDecay * 0.8 : baseDecay;
        filter.setFrequency(peakFilterFreq, when);
        filter.exponentialRampToFrequency(Math.max(baseFilterFreq, 40), when + decayTime);
        const envGain = this.context.createGain();
        const accentLevel = accent ? 1 + this.accent * 0.7 : 1;
        const peakLevel = velocity * this.level * accentLevel * 0.7;
        envGain.gain.setValueAtTime(1e-3, when);
        envGain.gain.exponentialRampToValueAtTime(peakLevel, when + 3e-3);
        envGain.gain.setValueAtTime(peakLevel, when + 3e-3);
        envGain.gain.exponentialRampToValueAtTime(peakLevel * 0.6, when + decayTime * 0.4);
        envGain.gain.exponentialRampToValueAtTime(1e-3, when + decayTime + 0.15);
        const outputGain = this.context.createGain();
        outputGain.gain.setValueAtTime(0.8, when);
        osc.connect(filter.input);
        filter.connect(envGain);
        envGain.connect(outputGain);
        outputGain.connect(this.output);
        osc.start(when);
        osc.stop(when + decayTime + 0.25);
        this.activeOsc = osc;
        this.activeFilter = filter;
        this.activeEnvGain = envGain;
        this.activeOutputGain = outputGain;
        osc.onended = () => {
          if (this.activeOsc === osc) {
            this.cleanup();
          }
        };
      }
      handleSlide(time, targetFreq, accent) {
        if (!this.activeOsc) return;
        this.isSliding = true;
        this.targetFrequency = targetFreq;
        const glideTime = 0.06;
        this.activeOsc.frequency.exponentialRampToValueAtTime(targetFreq, time + glideTime);
        if (accent && this.activeFilter) {
          const boost = this.cutoff * 1e4 * 0.2;
          const currentFreq = this.activeFilter.getFrequency();
          this.activeFilter.setFrequency(currentFreq + boost, time);
          this.activeFilter.exponentialRampToFrequency(currentFreq, time + 0.1);
        }
        this.currentFrequency = targetFreq;
        if (this.slideTimeout) clearTimeout(this.slideTimeout);
        this.slideTimeout = setTimeout(() => {
          this.isSliding = false;
        }, glideTime * 1e3 + 10);
      }
      stopVoice(time) {
        if (this.activeOsc) {
          try {
            const when = time ?? this.context.currentTime;
            if (this.activeEnvGain) {
              this.activeEnvGain.gain.cancelScheduledValues(when);
              this.activeEnvGain.gain.setValueAtTime(this.activeEnvGain.gain.value, when);
              this.activeEnvGain.gain.exponentialRampToValueAtTime(1e-3, when + 0.01);
            }
            this.activeOsc.stop(when + 0.02);
          } catch (e) {
          }
        }
        this.cleanup();
      }
      cleanup() {
        if (this.activeFilter) {
          this.activeFilter.disconnect();
        }
        this.activeOsc = null;
        this.activeFilter = null;
        this.activeEnvGain = null;
        this.activeOutputGain = null;
      }
      setWaveform(type) {
        if (type === "sawtooth" || type === "square") {
          this.waveform = type;
          if (this.activeOsc) {
            this.activeOsc.type = type;
          }
        }
      }
      setParameter(id, value) {
        switch (id) {
          case "waveform":
            this.setWaveform(value);
            break;
          case "cutoff":
            this.cutoff = Math.max(0, Math.min(1, value));
            break;
          case "resonance":
            this.resonance = Math.max(0, Math.min(1, value));
            if (this.activeFilter) {
              this.activeFilter.setResonance(this.resonance);
            }
            break;
          case "envMod":
            this.envMod = Math.max(0, Math.min(1, value));
            break;
          case "decay":
            this.decay = Math.max(0, Math.min(1, value));
            break;
          case "accent":
            this.accent = Math.max(0, Math.min(1, value));
            break;
          case "level":
            this.level = Math.max(0, Math.min(1, value));
            break;
          default:
            super.setParameter(id, value);
        }
      }
      get parameterDescriptors() {
        return [
          {
            id: "cutoff",
            label: "Cutoff",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "resonance",
            label: "Reso",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "envMod",
            label: "Env Mod",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "decay",
            label: "Decay",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.5
          },
          {
            id: "accent",
            label: "Accent",
            range: { min: 0, max: 1, step: 0.01 },
            defaultValue: 0.8
          },
          ...super.parameterDescriptors
        ];
      }
    };
  }
});

// ../web/public/303/dist/machines/tb303/engine.js
var engine_exports = {};
__export(engine_exports, {
  TB303Engine: () => TB303Engine,
  default: () => engine_default
});
var TB303Engine, engine_default;
var init_engine3 = __esm({
  "../web/public/303/dist/machines/tb303/engine.js"() {
    "use strict";
    init_engine2();
    init_sequencer2();
    init_bass_e1();
    init_bass();
    TB303Engine = class _TB303Engine extends SynthEngine2 {
      constructor(options = {}) {
        super(options);
        this.sequencer = new TB303Sequencer({ steps: 16, bpm: 130 });
        this.sequencer.setContext(this.context);
        this.currentBpm = 130;
        this.currentEngine = options.engine ?? "E1";
        this.currentWaveform = "sawtooth";
        this.parameters = {
          cutoff: 0.5,
          resonance: 0.5,
          envMod: 0.5,
          decay: 0.5,
          accent: 0.8,
          level: 1
        };
        this.setupVoice();
        this.sequencer.onStep = (step, stepData, nextStepData) => {
          this.handleSequencerStep(step, stepData, nextStepData);
        };
        this.sequencer.onStepChange = (step) => {
          this.onStepChange?.(step);
        };
      }
      setupVoice() {
        const VoiceClass = this.currentEngine === "E1" ? Bass303E1 : Bass303;
        const voice = new VoiceClass("bass", this.context);
        voice.setWaveform(this.currentWaveform);
        Object.entries(this.parameters).forEach(([id, value]) => {
          voice.setParameter(id, value);
        });
        this.registerVoice("bass", voice);
      }
      handleSequencerStep(step, stepData, nextStepData) {
        if (!stepData) return;
        const voice = this.voices.get("bass");
        if (!voice) return;
        const shouldSlide = stepData.slide && nextStepData?.gate;
        const nextFreq = shouldSlide ? nextStepData.frequency : null;
        voice.trigger(
          stepData.time,
          0.8,
          // base velocity
          stepData.frequency,
          stepData.accent,
          shouldSlide,
          nextFreq
        );
        this.onNote?.(step, stepData);
      }
      /**
       * Play a single note (for keyboard/preview)
       */
      playNote(note, accent = false) {
        const voice = this.voices.get("bass");
        if (!voice) return;
        const midi = typeof note === "string" ? noteToMidi(note) : note;
        const frequency = midiToFreq(midi);
        voice.trigger(this.context.currentTime, 0.8, frequency, accent, false, null);
      }
      /**
       * Get the current engine version
       */
      getEngine() {
        return this.currentEngine;
      }
      /**
       * Set engine version (E1 or E2)
       */
      setEngine(version) {
        if (!_TB303Engine.ENGINE_VERSIONS.includes(version)) {
          console.warn(`Unknown engine version: ${version}`);
          return;
        }
        if (version === this.currentEngine) return;
        this.currentEngine = version;
        const oldVoice = this.voices.get("bass");
        if (oldVoice) {
          oldVoice.disconnect?.();
        }
        this.setupVoice();
      }
      /**
       * Get available engine versions
       */
      getEngineVersions() {
        return _TB303Engine.ENGINE_VERSIONS;
      }
      /**
       * Get current waveform
       */
      getWaveform() {
        return this.currentWaveform;
      }
      /**
       * Set waveform (sawtooth or square)
       */
      setWaveform(type) {
        if (type !== "sawtooth" && type !== "square") return;
        this.currentWaveform = type;
        const voice = this.voices.get("bass");
        if (voice) {
          voice.setWaveform(type);
        }
      }
      /**
       * Toggle waveform
       */
      toggleWaveform() {
        const next = this.currentWaveform === "sawtooth" ? "square" : "sawtooth";
        this.setWaveform(next);
        return next;
      }
      /**
       * Set a synth parameter
       */
      setParameter(id, value) {
        const clamped = Math.max(0, Math.min(1, value));
        this.parameters[id] = clamped;
        const voice = this.voices.get("bass");
        if (voice) {
          voice.setParameter(id, clamped);
        }
      }
      /**
       * Get a synth parameter
       */
      getParameter(id) {
        return this.parameters[id] ?? 0;
      }
      /**
       * Get all parameters
       */
      getParameters() {
        return { ...this.parameters };
      }
      /**
       * Set BPM
       */
      setBpm(bpm) {
        this.currentBpm = Math.max(30, Math.min(300, bpm));
        this.sequencer.setBpm(this.currentBpm);
      }
      /**
       * Get BPM
       */
      getBpm() {
        return this.currentBpm;
      }
      /**
       * Set pattern
       */
      setPattern(pattern) {
        this.sequencer.setPattern(pattern);
      }
      /**
       * Get pattern
       */
      getPattern() {
        return this.sequencer.getPattern();
      }
      /**
       * Set a single step
       */
      setStep(index, data) {
        this.sequencer.setStep(index, data);
      }
      /**
       * Get a single step
       */
      getStep(index) {
        return this.sequencer.getStep(index);
      }
      /**
       * Start sequencer
       */
      startSequencer() {
        void this.start();
        this.sequencer.start();
      }
      /**
       * Stop sequencer
       */
      stopSequencer() {
        this.sequencer.stop();
        this.stop();
        const voice = this.voices.get("bass");
        if (voice?.stopVoice) {
          voice.stopVoice();
        }
      }
      /**
       * Check if playing
       */
      isPlaying() {
        return this.sequencer.isRunning();
      }
      /**
       * Get current step
       */
      getCurrentStep() {
        return this.sequencer.getCurrentStep();
      }
      /**
       * Render pattern to audio buffer
       */
      async renderPattern(options = {}) {
        const bpm = options.bpm ?? this.currentBpm;
        const bars = options.bars ?? 1;
        const stepsPerBar = 16;
        const totalSteps = stepsPerBar * bars;
        const stepDuration = 60 / bpm / 4;
        const duration = stepDuration * totalSteps + 0.5;
        return this.outputManager.renderOffline(duration, (offlineContext) => {
          this.schedulePatternInContext({
            context: offlineContext,
            pattern: this.getPattern(),
            bpm,
            bars
          });
        }, {
          sampleRate: options.sampleRate ?? 44100,
          numberOfChannels: options.numberOfChannels ?? 2
        });
      }
      schedulePatternInContext({ context, pattern, bpm, bars }) {
        const VoiceClass = this.currentEngine === "E1" ? Bass303E1 : Bass303;
        const voice = new VoiceClass("bass", context);
        voice.setWaveform(this.currentWaveform);
        Object.entries(this.parameters).forEach(([id, value]) => {
          voice.setParameter(id, value);
        });
        const compressor = context.createDynamicsCompressor();
        const masterGain = context.createGain();
        masterGain.gain.value = 0.9;
        voice.connect(compressor);
        compressor.connect(masterGain);
        masterGain.connect(context.destination);
        const stepDuration = 60 / bpm / 4;
        const totalSteps = 16 * bars;
        for (let i = 0; i < totalSteps; i++) {
          const step = i % 16;
          const stepData = pattern[step];
          const nextStep = (step + 1) % 16;
          const nextStepData = pattern[nextStep];
          if (!stepData.gate) continue;
          const time = i * stepDuration;
          const midi = noteToMidi(stepData.note);
          const frequency = midiToFreq(midi);
          const shouldSlide = stepData.slide && nextStepData.gate;
          const nextFreq = shouldSlide ? midiToFreq(noteToMidi(nextStepData.note)) : null;
          voice.trigger(time, 0.8, frequency, stepData.accent, shouldSlide, nextFreq);
        }
      }
    };
    TB303Engine.ENGINE_VERSIONS = ["E1", "E2"];
    TB303Engine.WAVEFORMS = ["sawtooth", "square"];
    TB303Engine.ENGINE_INFO = {
      E1: {
        name: "E1 \u2014 Simple",
        description: "Standard Web Audio biquad filter. Clean, CPU-efficient. Good for layering.",
        characteristics: [
          "24dB/oct lowpass filter",
          "Linear filter envelope",
          "Basic slide implementation"
        ]
      },
      E2: {
        name: "E2 \u2014 Authentic",
        description: "Diode ladder filter emulation with saturation. The squelchy acid sound.",
        characteristics: [
          "18dB/oct diode ladder filter",
          "Self-oscillation at high resonance",
          "Soft saturation for warmth",
          "Authentic 60ms exponential slide",
          "Accent affects both VCA and VCF"
        ]
      }
    };
    engine_default = TB303Engine;
  }
});

// ../web/public/101/dist/core/output.js
function audioBufferToWav3(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const length = buffer.length;
  const interleavedLength = length * numChannels;
  const interleaved = new Float32Array(interleavedLength);
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      interleaved[i * numChannels + ch] = buffer.getChannelData(ch)[i];
    }
  }
  const dataLength = interleavedLength * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);
  writeString3(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString3(view, 8, "WAVE");
  writeString3(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString3(view, 36, "data");
  view.setUint32(40, dataLength, true);
  let offset = 44;
  for (let i = 0; i < interleavedLength; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    const int16 = sample < 0 ? sample * 32768 : sample * 32767;
    view.setInt16(offset, int16, true);
    offset += 2;
  }
  return wavBuffer;
}
function writeString3(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
var OutputManager3;
var init_output3 = __esm({
  "../web/public/101/dist/core/output.js"() {
    "use strict";
    OutputManager3 = class {
      constructor(context, destination) {
        this.context = context;
        this.destination = destination ?? context.destination;
      }
      setDestination(node) {
        this.destination = node;
      }
      getDestination() {
        return this.destination;
      }
      renderOffline(duration, setupGraph, options = {}) {
        const sampleRate = options.sampleRate ?? this.context.sampleRate ?? 44100;
        const channels = options.numberOfChannels ?? 2;
        const frameCount = Math.ceil(duration * sampleRate);
        const offlineContext = new OfflineAudioContext(channels, frameCount, sampleRate);
        return Promise.resolve(setupGraph(offlineContext)).then(() => offlineContext.startRendering());
      }
      audioBufferToWav(buffer) {
        return audioBufferToWav3(buffer);
      }
      async audioBufferToBlob(buffer) {
        const wavArray = this.audioBufferToWav(buffer);
        return new Blob([wavArray], { type: "audio/wav" });
      }
    };
  }
});

// ../web/public/101/dist/core/engine.js
var SynthEngine3;
var init_engine4 = __esm({
  "../web/public/101/dist/core/engine.js"() {
    "use strict";
    init_output3();
    SynthEngine3 = class {
      constructor(options = {}) {
        this.voices = /* @__PURE__ */ new Map();
        this.started = false;
        this.context = options.context ?? new AudioContext();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = options.masterVolume ?? 0.8;
        this.compressor = this.context.createDynamicsCompressor();
        this.analyser = this.context.createAnalyser();
        this.compressor.connect(this.analyser);
        this.analyser.connect(this.masterGain);
        this.masterGain.connect(this.context.destination);
        this.outputManager = new OutputManager3(this.context, this.masterGain);
      }
      registerVoice(id, voice) {
        voice.connect(this.compressor);
        this.voices.set(id, voice);
      }
      getVoices() {
        return [...this.voices.keys()];
      }
      getVoiceParameterDescriptors() {
        const descriptors = {};
        for (const [id, voice] of this.voices.entries()) {
          descriptors[id] = voice.parameterDescriptors;
        }
        return descriptors;
      }
      async start() {
        if (this.context.state === "suspended") {
          await this.context.resume();
        }
        this.started = true;
      }
      stop() {
        this.started = false;
      }
      isRunning() {
        return this.started;
      }
      trigger(voiceId, velocity = 1, time) {
        const voice = this.voices.get(voiceId);
        if (!voice) {
          throw new Error(`Unknown voice "${voiceId}"`);
        }
        const when = time ?? this.context.currentTime;
        voice.trigger(when, velocity);
      }
      setVoiceParameter(voiceId, parameterId, value) {
        const voice = this.voices.get(voiceId);
        if (!voice) {
          throw new Error(`Unknown voice "${voiceId}"`);
        }
        voice.setParameter(parameterId, value);
      }
      connectOutput(destination) {
        this.masterGain.disconnect();
        this.masterGain.connect(destination);
        this.outputManager.setDestination(destination);
      }
      audioBufferToWav(buffer) {
        return this.outputManager.audioBufferToWav(buffer);
      }
      audioBufferToBlob(buffer) {
        return this.outputManager.audioBufferToBlob(buffer);
      }
      async renderToBuffer(options) {
        return this.outputManager.renderOffline(
          options.duration,
          (offlineContext) => this.prepareOfflineRender(offlineContext, options),
          {
            sampleRate: options.sampleRate,
            numberOfChannels: options.numberOfChannels
          }
        );
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/oscillator.js
var Oscillator;
var init_oscillator = __esm({
  "../web/public/101/dist/machines/sh101/oscillator.js"() {
    "use strict";
    Oscillator = class {
      constructor(context) {
        this.context = context;
        this.sawOsc = context.createOscillator();
        this.sawOsc.type = "sawtooth";
        this.pulseOsc = context.createOscillator();
        this.pulseOsc.type = "sawtooth";
        this.pulseShaper = context.createWaveShaper();
        this.pulseWidth = 0.5;
        this.updatePulseWidth();
        this.sawGain = context.createGain();
        this.sawGain.gain.value = 0.5;
        this.pulseGain = context.createGain();
        this.pulseGain.gain.value = 0.5;
        this.output = context.createGain();
        this.output.gain.value = 1;
        this.sawOsc.connect(this.sawGain);
        this.sawGain.connect(this.output);
        this.pulseOsc.connect(this.pulseShaper);
        this.pulseShaper.connect(this.pulseGain);
        this.pulseGain.connect(this.output);
        this.baseFrequency = 261.63;
        this.octaveShift = 0;
        this.pwmDepth = 0;
        this.pwmLfoGain = context.createGain();
        this.pwmLfoGain.gain.value = 0;
        this.sawOsc.start();
        this.pulseOsc.start();
        this.updateFrequency();
      }
      /**
       * Update pulse width waveshaper curve
       * Converts sawtooth (-1 to 1) to pulse based on width
       */
      updatePulseWidth() {
        const samples = 256;
        const curve = new Float32Array(samples);
        const threshold = this.pulseWidth * 2 - 1;
        for (let i = 0; i < samples; i++) {
          const x = i / (samples - 1) * 2 - 1;
          curve[i] = x > threshold ? 1 : -1;
        }
        this.pulseShaper.curve = curve;
      }
      /**
       * Set the base note frequency
       */
      setFrequency(freq, time) {
        this.baseFrequency = freq;
        this.updateFrequency(time);
      }
      /**
       * Set frequency from MIDI note number
       */
      setNote(noteNumber, time) {
        const freq = 440 * Math.pow(2, (noteNumber - 69) / 12);
        this.setFrequency(freq, time);
      }
      /**
       * Set frequency from note name (e.g., 'C4', 'F#3')
       */
      setNoteName(noteName, time) {
        const noteNumber = this.noteNameToMidi(noteName);
        this.setNote(noteNumber, time);
      }
      /**
       * Convert note name to MIDI number
       */
      noteNameToMidi(noteName) {
        const noteMap = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
        const match = noteName.match(/^([A-G])([#b]?)(\d+)$/);
        if (!match) return 60;
        let note = noteMap[match[1]];
        if (match[2] === "#") note += 1;
        if (match[2] === "b") note -= 1;
        const octave = parseInt(match[3]);
        return note + (octave + 1) * 12;
      }
      /**
       * Update oscillator frequencies based on base freq and octave
       */
      updateFrequency(time) {
        const when = time ?? this.context.currentTime;
        const octaveMultiplier = Math.pow(2, this.octaveShift);
        const freq = this.baseFrequency * octaveMultiplier;
        this.sawOsc.frequency.setValueAtTime(freq, when);
        this.pulseOsc.frequency.setValueAtTime(freq, when);
      }
      /**
       * Set octave range
       * @param {string} range - '16', '8', '4', or '2'
       */
      setOctaveRange(range) {
        const shifts = { "16": -1, "8": 0, "4": 1, "2": 2 };
        this.octaveShift = shifts[range] ?? 0;
        this.updateFrequency();
      }
      /**
       * Set sawtooth level (0-1)
       */
      setSawLevel(level, time) {
        const when = time ?? this.context.currentTime;
        this.sawGain.gain.setValueAtTime(Math.max(0, Math.min(1, level)), when);
      }
      /**
       * Set pulse level (0-1)
       */
      setPulseLevel(level, time) {
        const when = time ?? this.context.currentTime;
        this.pulseGain.gain.setValueAtTime(Math.max(0, Math.min(1, level)), when);
      }
      /**
       * Set pulse width (0.05-0.95)
       * 0.5 = square wave
       */
      setPulseWidth(width, time) {
        this.pulseWidth = Math.max(0.05, Math.min(0.95, width));
        this.updatePulseWidth();
      }
      /**
       * Modulate pulse width from external source (LFO)
       * @param {number} depth - Modulation depth (0-1)
       */
      setPwmDepth(depth) {
        this.pwmDepth = Math.max(0, Math.min(1, depth));
      }
      /**
       * Apply pitch modulation (for LFO vibrato or pitch envelope)
       * @param {number} semitones - Pitch shift in semitones
       * @param {number} time - When to apply
       */
      modulatePitch(semitones, time) {
        const when = time ?? this.context.currentTime;
        const ratio = Math.pow(2, semitones / 12);
        const octaveMultiplier = Math.pow(2, this.octaveShift);
        const freq = this.baseFrequency * octaveMultiplier * ratio;
        this.sawOsc.frequency.setValueAtTime(freq, when);
        this.pulseOsc.frequency.setValueAtTime(freq, when);
      }
      /**
       * Glide to a new frequency
       */
      glideToFrequency(freq, duration, time) {
        const when = time ?? this.context.currentTime;
        const octaveMultiplier = Math.pow(2, this.octaveShift);
        const targetFreq = freq * octaveMultiplier;
        this.baseFrequency = freq;
        this.sawOsc.frequency.exponentialRampToValueAtTime(targetFreq, when + duration);
        this.pulseOsc.frequency.exponentialRampToValueAtTime(targetFreq, when + duration);
      }
      /**
       * Connect to destination
       */
      connect(destination) {
        this.output.connect(destination);
      }
      /**
       * Disconnect
       */
      disconnect() {
        this.output.disconnect();
      }
      /**
       * Get the frequency AudioParam for external modulation
       */
      get frequencyParam() {
        return this.sawOsc.frequency;
      }
      /**
       * Stop oscillators (cleanup)
       */
      stop() {
        this.sawOsc.stop();
        this.pulseOsc.stop();
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/sub-oscillator.js
var SubOscillator;
var init_sub_oscillator = __esm({
  "../web/public/101/dist/machines/sh101/sub-oscillator.js"() {
    "use strict";
    SubOscillator = class {
      constructor(context) {
        this.context = context;
        this.subOsc1 = context.createOscillator();
        this.subOsc1.type = "square";
        this.subOsc2 = context.createOscillator();
        this.subOsc2.type = "square";
        this.subOsc3Saw = context.createOscillator();
        this.subOsc3Saw.type = "sawtooth";
        this.pulseShaper = context.createWaveShaper();
        this.createPulse25Curve();
        this.gain1 = context.createGain();
        this.gain1.gain.value = 0;
        this.gain2 = context.createGain();
        this.gain2.gain.value = 0;
        this.gain3 = context.createGain();
        this.gain3.gain.value = 0;
        this.levelGain = context.createGain();
        this.levelGain.gain.value = 0.5;
        this.output = context.createGain();
        this.output.gain.value = 1;
        this.subOsc1.connect(this.gain1);
        this.subOsc2.connect(this.gain2);
        this.subOsc3Saw.connect(this.pulseShaper);
        this.pulseShaper.connect(this.gain3);
        this.gain1.connect(this.levelGain);
        this.gain2.connect(this.levelGain);
        this.gain3.connect(this.levelGain);
        this.levelGain.connect(this.output);
        this.baseFrequency = 261.63;
        this.mode = 0;
        this.subOsc1.start();
        this.subOsc2.start();
        this.subOsc3Saw.start();
        this.updateFrequencies();
        this.updateMode();
      }
      /**
       * Create 25% pulse waveshaper curve
       * 25% duty cycle has strong 2nd harmonic, sounds like -1 octave
       */
      createPulse25Curve() {
        const samples = 256;
        const curve = new Float32Array(samples);
        const threshold = 0.5;
        for (let i = 0; i < samples; i++) {
          const x = i / (samples - 1) * 2 - 1;
          curve[i] = x > threshold ? 1 : -1;
        }
        this.pulseShaper.curve = curve;
      }
      /**
       * Set the base frequency (from main VCO)
       */
      setFrequency(freq, time) {
        this.baseFrequency = freq;
        this.updateFrequencies(time);
      }
      /**
       * Update all sub-oscillator frequencies
       */
      updateFrequencies(time) {
        const when = time ?? this.context.currentTime;
        this.subOsc1.frequency.setValueAtTime(this.baseFrequency / 2, when);
        this.subOsc2.frequency.setValueAtTime(this.baseFrequency / 4, when);
        this.subOsc3Saw.frequency.setValueAtTime(this.baseFrequency / 4, when);
      }
      /**
       * Set sub-oscillator mode
       * @param {number} mode - 0=off, 1=-1oct square, 2=-2oct square, 3=-2oct 25% pulse
       */
      setMode(mode) {
        this.mode = Math.max(0, Math.min(3, Math.floor(mode)));
        this.updateMode();
      }
      /**
       * Update gains based on mode
       */
      updateMode() {
        const time = this.context.currentTime;
        this.gain1.gain.setValueAtTime(this.mode === 1 ? 1 : 0, time);
        this.gain2.gain.setValueAtTime(this.mode === 2 ? 1 : 0, time);
        this.gain3.gain.setValueAtTime(this.mode === 3 ? 1 : 0, time);
      }
      /**
       * Set sub-oscillator level (0-1)
       */
      setLevel(level, time) {
        const when = time ?? this.context.currentTime;
        this.levelGain.gain.setValueAtTime(Math.max(0, Math.min(1, level)), when);
      }
      /**
       * Glide to a new frequency (synced with main VCO)
       */
      glideToFrequency(freq, duration, time) {
        const when = time ?? this.context.currentTime;
        this.baseFrequency = freq;
        this.subOsc1.frequency.exponentialRampToValueAtTime(freq / 2, when + duration);
        this.subOsc2.frequency.exponentialRampToValueAtTime(freq / 4, when + duration);
        this.subOsc3Saw.frequency.exponentialRampToValueAtTime(freq / 4, when + duration);
      }
      /**
       * Connect to destination
       */
      connect(destination) {
        this.output.connect(destination);
      }
      /**
       * Disconnect
       */
      disconnect() {
        this.output.disconnect();
      }
      /**
       * Stop oscillators (cleanup)
       */
      stop() {
        this.subOsc1.stop();
        this.subOsc2.stop();
        this.subOsc3Saw.stop();
      }
      /**
       * Get current mode
       */
      getMode() {
        return this.mode;
      }
      /**
       * Get mode name
       */
      getModeName() {
        const names = ["Off", "-1 Oct", "-2 Oct", "25% Pulse"];
        return names[this.mode] || "Off";
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/filter/ir3109.js
var IR3109Filter, IR3109FilterE1;
var init_ir3109 = __esm({
  "../web/public/101/dist/machines/sh101/filter/ir3109.js"() {
    "use strict";
    IR3109Filter = class {
      constructor(context) {
        this.context = context;
        this.stage1 = context.createBiquadFilter();
        this.stage1.type = "lowpass";
        this.stage1.frequency.value = 2e3;
        this.stage1.Q.value = 0.7071;
        this.stage2 = context.createBiquadFilter();
        this.stage2.type = "lowpass";
        this.stage2.frequency.value = 2e3;
        this.stage2.Q.value = 0.7071;
        this.feedbackGain = context.createGain();
        this.feedbackGain.gain.value = 0;
        this.saturator = context.createWaveShaper();
        this.createSaturationCurve();
        this.input = context.createGain();
        this.input.gain.value = 1;
        this.output = context.createGain();
        this.output.gain.value = 1;
        this.input.connect(this.saturator);
        this.saturator.connect(this.stage1);
        this.stage1.connect(this.stage2);
        this.stage2.connect(this.output);
        this.stage2.connect(this.feedbackGain);
        this.feedbackGain.connect(this.input);
        this.cutoffHz = 2e3;
        this.resonance = 0;
        this.keyboardTracking = 0;
        this.baseNote = 60;
        this.minFreq = 20;
        this.maxFreq = 2e4;
      }
      /**
       * Create soft saturation curve (tanh-like)
       * Adds warmth and prevents harsh clipping
       */
      createSaturationCurve() {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = i / (samples - 1) * 2 - 1;
          curve[i] = Math.tanh(x * 1.5) / Math.tanh(1.5);
        }
        this.saturator.curve = curve;
      }
      /**
       * Set cutoff frequency (normalized 0-1)
       * Uses exponential scaling for musical response
       */
      setCutoff(value, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, value));
        this.cutoffHz = this.minFreq * Math.pow(this.maxFreq / this.minFreq, normalized);
        this.updateFilterFrequency(when);
      }
      /**
       * Set cutoff frequency in Hz directly
       */
      setCutoffHz(hz, time) {
        const when = time ?? this.context.currentTime;
        this.cutoffHz = Math.max(this.minFreq, Math.min(this.maxFreq, hz));
        this.updateFilterFrequency(when);
      }
      /**
       * Update filter frequency with keyboard tracking
       */
      updateFilterFrequency(time) {
        const when = time ?? this.context.currentTime;
        let finalFreq = this.cutoffHz;
        if (this.keyboardTracking > 0) {
          const semitones = this.currentNote - this.baseNote;
          const trackingRatio = Math.pow(2, semitones * this.keyboardTracking / 12);
          finalFreq *= trackingRatio;
        }
        finalFreq = Math.max(this.minFreq, Math.min(this.maxFreq, finalFreq));
        this.stage1.frequency.setValueAtTime(finalFreq, when);
        this.stage2.frequency.setValueAtTime(finalFreq, when);
      }
      /**
       * Set resonance (0-1)
       * High values cause self-oscillation
       */
      setResonance(value, time) {
        const when = time ?? this.context.currentTime;
        this.resonance = Math.max(0, Math.min(1, value));
        const q = 0.7071 + this.resonance * 19;
        this.stage1.Q.setValueAtTime(q * 0.7, when);
        this.stage2.Q.setValueAtTime(q, when);
        const feedback = this.resonance > 0.8 ? (this.resonance - 0.8) * 2 : 0;
        this.feedbackGain.gain.setValueAtTime(feedback * 0.3, when);
      }
      /**
       * Set keyboard tracking amount (0-1)
       * 0 = filter doesn't follow pitch
       * 1 = filter tracks pitch 1:1
       */
      setKeyboardTracking(amount) {
        this.keyboardTracking = Math.max(0, Math.min(1, amount));
      }
      /**
       * Set current note for keyboard tracking
       */
      setNote(midiNote) {
        this.currentNote = midiNote;
        this.updateFilterFrequency();
      }
      /**
       * Modulate cutoff frequency (for envelope/LFO)
       * @param {number} amount - Modulation amount in octaves
       * @param {number} time - When to apply
       */
      modulateCutoff(amount, time) {
        const when = time ?? this.context.currentTime;
        const modFreq = this.cutoffHz * Math.pow(2, amount);
        const finalFreq = Math.max(this.minFreq, Math.min(this.maxFreq, modFreq));
        this.stage1.frequency.setValueAtTime(finalFreq, when);
        this.stage2.frequency.setValueAtTime(finalFreq, when);
      }
      /**
       * Ramp cutoff to new value (for envelope)
       */
      rampCutoff(targetValue, duration, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, targetValue));
        const targetHz = this.minFreq * Math.pow(this.maxFreq / this.minFreq, normalized);
        this.stage1.frequency.exponentialRampToValueAtTime(targetHz, when + duration);
        this.stage2.frequency.exponentialRampToValueAtTime(targetHz, when + duration);
        this.cutoffHz = targetHz;
      }
      /**
       * Get the frequency AudioParam for direct modulation
       */
      get frequencyParam() {
        return this.stage1.frequency;
      }
      /**
       * Connect input
       */
      connectInput(source) {
        source.connect(this.input);
      }
      /**
       * Connect output
       */
      connect(destination) {
        this.output.connect(destination);
      }
      /**
       * Disconnect
       */
      disconnect() {
        this.output.disconnect();
      }
    };
    IR3109FilterE1 = class {
      constructor(context) {
        this.context = context;
        this.filter = context.createBiquadFilter();
        this.filter.type = "lowpass";
        this.filter.frequency.value = 2e3;
        this.filter.Q.value = 1;
        this.input = this.filter;
        this.output = this.filter;
        this.cutoffHz = 2e3;
        this.resonance = 0;
        this.minFreq = 20;
        this.maxFreq = 2e4;
      }
      setCutoff(value, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, value));
        this.cutoffHz = this.minFreq * Math.pow(this.maxFreq / this.minFreq, normalized);
        this.filter.frequency.setValueAtTime(this.cutoffHz, when);
      }
      setCutoffHz(hz, time) {
        const when = time ?? this.context.currentTime;
        this.cutoffHz = Math.max(this.minFreq, Math.min(this.maxFreq, hz));
        this.filter.frequency.setValueAtTime(this.cutoffHz, when);
      }
      setResonance(value, time) {
        const when = time ?? this.context.currentTime;
        this.resonance = Math.max(0, Math.min(1, value));
        const q = 0.7071 + this.resonance * 15;
        this.filter.Q.setValueAtTime(q, when);
      }
      setKeyboardTracking(amount) {
      }
      setNote(midiNote) {
      }
      modulateCutoff(amount, time) {
        const when = time ?? this.context.currentTime;
        const modFreq = this.cutoffHz * Math.pow(2, amount);
        const finalFreq = Math.max(this.minFreq, Math.min(this.maxFreq, modFreq));
        this.filter.frequency.setValueAtTime(finalFreq, when);
      }
      rampCutoff(targetValue, duration, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, targetValue));
        const targetHz = this.minFreq * Math.pow(this.maxFreq / this.minFreq, normalized);
        this.filter.frequency.exponentialRampToValueAtTime(targetHz, when + duration);
        this.cutoffHz = targetHz;
      }
      get frequencyParam() {
        return this.filter.frequency;
      }
      connectInput(source) {
        source.connect(this.input);
      }
      connect(destination) {
        this.output.connect(destination);
      }
      disconnect() {
        this.output.disconnect();
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/envelope.js
var ADSREnvelope;
var init_envelope = __esm({
  "../web/public/101/dist/machines/sh101/envelope.js"() {
    "use strict";
    ADSREnvelope = class {
      constructor(context, options = {}) {
        this.context = context;
        this.envelope = context.createConstantSource();
        this.envelope.offset.value = 0;
        this.envelope.start();
        this.output = context.createGain();
        this.output.gain.value = 1;
        this.envelope.connect(this.output);
        this.attack = options.attack ?? 0.01;
        this.decay = options.decay ?? 0.3;
        this.sustain = options.sustain ?? 0.7;
        this.release = options.release ?? 0.3;
        this.isGateOn = false;
        this.currentValue = 0;
        this.gateOnTime = 0;
        this.minTime = 1e-3;
        this.maxTime = 10;
      }
      /**
       * Set attack time (0-1 normalized to time range)
       */
      setAttack(value) {
        const normalized = Math.max(0, Math.min(1, value));
        this.attack = this.minTime * Math.pow(this.maxTime / this.minTime, normalized);
      }
      /**
       * Set decay time (0-1 normalized)
       */
      setDecay(value) {
        const normalized = Math.max(0, Math.min(1, value));
        this.decay = this.minTime * Math.pow(this.maxTime / this.minTime, normalized);
      }
      /**
       * Set sustain level (0-1)
       */
      setSustain(value) {
        this.sustain = Math.max(0, Math.min(1, value));
      }
      /**
       * Set release time (0-1 normalized)
       */
      setRelease(value) {
        const normalized = Math.max(0, Math.min(1, value));
        this.release = this.minTime * Math.pow(this.maxTime / this.minTime, normalized);
      }
      /**
       * Set all ADSR values at once (normalized 0-1)
       */
      setADSR(a, d, s, r) {
        this.setAttack(a);
        this.setDecay(d);
        this.setSustain(s);
        this.setRelease(r);
      }
      /**
       * Trigger the envelope (gate on)
       * @param {number} time - Start time (defaults to now)
       * @param {boolean} retrigger - Force retrigger from 0
       */
      trigger(time, retrigger = true) {
        const when = time ?? this.context.currentTime;
        this.isGateOn = true;
        this.gateOnTime = when;
        this.envelope.offset.cancelScheduledValues(when);
        if (retrigger) {
          this.envelope.offset.setValueAtTime(0, when);
        } else {
          this.envelope.offset.setValueAtTime(this.envelope.offset.value, when);
        }
        this.envelope.offset.setTargetAtTime(1, when, this.attack / 3);
        const decayStart = when + this.attack;
        this.envelope.offset.setTargetAtTime(this.sustain, decayStart, this.decay / 3);
      }
      /**
       * Release the envelope (gate off)
       * @param {number} time - Release start time
       */
      release(time) {
        if (!this.isGateOn) return;
        const when = time ?? this.context.currentTime;
        this.isGateOn = false;
        this.envelope.offset.cancelScheduledValues(when);
        const currentVal = this.getCurrentValue(when);
        this.envelope.offset.setValueAtTime(currentVal, when);
        this.envelope.offset.setTargetAtTime(0, when, this.release / 3);
      }
      /**
       * Get approximate current envelope value
       */
      getCurrentValue(time) {
        const when = time ?? this.context.currentTime;
        if (!this.isGateOn) {
          return Math.max(0, this.envelope.offset.value);
        }
        const elapsed = when - this.gateOnTime;
        if (elapsed < this.attack) {
          const progress = elapsed / this.attack;
          return 1 - Math.exp(-3 * progress);
        } else {
          const decayElapsed = elapsed - this.attack;
          const decayProgress = decayElapsed / this.decay;
          const decayed = (1 - this.sustain) * Math.exp(-3 * decayProgress);
          return this.sustain + decayed;
        }
      }
      /**
       * Connect envelope output to a parameter
       * @param {AudioParam} param - The parameter to modulate
       * @param {number} amount - Modulation depth
       */
      connect(param, amount = 1) {
        if (amount === 1) {
          this.output.connect(param);
        } else {
          const scaler = this.context.createGain();
          scaler.gain.value = amount;
          this.output.connect(scaler);
          scaler.connect(param);
        }
      }
      /**
       * Get the envelope's constant source for direct connection
       */
      get source() {
        return this.envelope;
      }
      /**
       * Disconnect all
       */
      disconnect() {
        this.output.disconnect();
      }
      /**
       * Stop (cleanup)
       */
      stop() {
        this.envelope.stop();
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/lfo.js
var LFO;
var init_lfo = __esm({
  "../web/public/101/dist/machines/sh101/lfo.js"() {
    "use strict";
    LFO = class {
      constructor(context) {
        this.context = context;
        this.oscillator = context.createOscillator();
        this.oscillator.type = "triangle";
        this.oscillator.frequency.value = 5;
        this.noiseBuffer = this.createNoiseBuffer();
        this.noiseSource = null;
        this.triangleOutput = context.createGain();
        this.triangleOutput.gain.value = 1;
        this.squareShaper = context.createWaveShaper();
        this.createSquareCurve();
        this.squareOutput = context.createGain();
        this.squareOutput.gain.value = 0;
        this.shOutput = context.createGain();
        this.shOutput.gain.value = 0;
        this.shValue = 0;
        this.shInterval = null;
        this.mixer = context.createGain();
        this.mixer.gain.value = 1;
        this.depthGain = context.createGain();
        this.depthGain.gain.value = 0.5;
        this.pitchOutput = context.createGain();
        this.pitchOutput.gain.value = 0;
        this.filterOutput = context.createGain();
        this.filterOutput.gain.value = 0;
        this.pwmOutput = context.createGain();
        this.pwmOutput.gain.value = 0;
        this.oscillator.connect(this.triangleOutput);
        this.oscillator.connect(this.squareShaper);
        this.squareShaper.connect(this.squareOutput);
        this.triangleOutput.connect(this.mixer);
        this.squareOutput.connect(this.mixer);
        this.shOutput.connect(this.mixer);
        this.mixer.connect(this.depthGain);
        this.depthGain.connect(this.pitchOutput);
        this.depthGain.connect(this.filterOutput);
        this.depthGain.connect(this.pwmOutput);
        this.waveform = "triangle";
        this.rate = 5;
        this.oscillator.start();
      }
      /**
       * Create noise buffer for S&H
       */
      createNoiseBuffer() {
        const bufferSize = this.context.sampleRate * 2;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        return buffer;
      }
      /**
       * Create square wave shaper curve
       */
      createSquareCurve() {
        const samples = 256;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
          const x = i / (samples - 1) * 2 - 1;
          curve[i] = x >= 0 ? 1 : -1;
        }
        this.squareShaper.curve = curve;
      }
      /**
       * Set LFO rate (0-1 normalized to 0.1-30 Hz)
       */
      setRate(value, time) {
        const when = time ?? this.context.currentTime;
        const normalized = Math.max(0, Math.min(1, value));
        this.rate = 0.1 * Math.pow(300, normalized);
        this.oscillator.frequency.setValueAtTime(this.rate, when);
        if (this.waveform === "sh" && this.shInterval) {
          this.stopSH();
          this.startSH();
        }
      }
      /**
       * Set LFO waveform
       * @param {string} type - 'triangle', 'square', or 'sh'
       */
      setWaveform(type) {
        const time = this.context.currentTime;
        this.triangleOutput.gain.setValueAtTime(0, time);
        this.squareOutput.gain.setValueAtTime(0, time);
        this.shOutput.gain.setValueAtTime(0, time);
        if (this.shInterval) {
          this.stopSH();
        }
        this.waveform = type;
        switch (type) {
          case "triangle":
            this.triangleOutput.gain.setValueAtTime(1, time);
            break;
          case "square":
            this.squareOutput.gain.setValueAtTime(1, time);
            break;
          case "sh":
            this.shOutput.gain.setValueAtTime(1, time);
            this.startSH();
            break;
        }
      }
      /**
       * Start Sample & Hold
       */
      startSH() {
        const intervalMs = 1e3 / this.rate;
        this.shInterval = setInterval(() => {
          this.shValue = Math.random() * 2 - 1;
          const time = this.context.currentTime;
          this.shOutput.gain.setValueAtTime(this.shValue, time);
        }, intervalMs);
      }
      /**
       * Stop Sample & Hold
       */
      stopSH() {
        if (this.shInterval) {
          clearInterval(this.shInterval);
          this.shInterval = null;
        }
      }
      /**
       * Set modulation depth for pitch (in semitones)
       */
      setPitchDepth(semitones) {
        this.pitchOutput.gain.value = semitones;
      }
      /**
       * Set modulation depth for filter (in octaves)
       */
      setFilterDepth(octaves) {
        this.filterOutput.gain.value = octaves;
      }
      /**
       * Set modulation depth for PWM (0-1 range)
       */
      setPwmDepth(depth) {
        this.pwmOutput.gain.value = Math.max(0, Math.min(0.45, depth));
      }
      /**
       * Get pitch modulation output
       */
      getPitchOutput() {
        return this.pitchOutput;
      }
      /**
       * Get filter modulation output
       */
      getFilterOutput() {
        return this.filterOutput;
      }
      /**
       * Get PWM output
       */
      getPwmOutput() {
        return this.pwmOutput;
      }
      /**
       * Connect pitch modulation to a frequency param
       */
      connectToPitch(oscillatorFreq) {
        return this.pitchOutput;
      }
      /**
       * Connect filter modulation
       */
      connectToFilter(filterFreq) {
        return this.filterOutput;
      }
      /**
       * Disconnect all
       */
      disconnect() {
        this.pitchOutput.disconnect();
        this.filterOutput.disconnect();
        this.pwmOutput.disconnect();
      }
      /**
       * Stop LFO (cleanup)
       */
      stop() {
        this.oscillator.stop();
        this.stopSH();
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/vca.js
var VCA;
var init_vca = __esm({
  "../web/public/101/dist/machines/sh101/vca.js"() {
    "use strict";
    VCA = class {
      constructor(context) {
        this.context = context;
        this.amplifier = context.createGain();
        this.amplifier.gain.value = 0;
        this.masterGain = context.createGain();
        this.masterGain.gain.value = 0.8;
        this.amplifier.connect(this.masterGain);
        this.input = this.amplifier;
        this.output = this.masterGain;
      }
      /**
       * Get the gain AudioParam for envelope connection
       */
      get gainParam() {
        return this.amplifier.gain;
      }
      /**
       * Set master volume (0-1)
       */
      setVolume(value, time) {
        const when = time ?? this.context.currentTime;
        this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, value)), when);
      }
      /**
       * Set gain directly (for manual control)
       */
      setGain(value, time) {
        const when = time ?? this.context.currentTime;
        this.amplifier.gain.setValueAtTime(Math.max(0, Math.min(1, value)), when);
      }
      /**
       * Ramp gain (for envelope-like control)
       */
      rampGain(value, duration, time) {
        const when = time ?? this.context.currentTime;
        this.amplifier.gain.linearRampToValueAtTime(
          Math.max(0, Math.min(1, value)),
          when + duration
        );
      }
      /**
       * Connect input source to VCA
       */
      connectInput(source) {
        source.connect(this.input);
      }
      /**
       * Connect VCA output to destination
       */
      connect(destination) {
        this.output.connect(destination);
      }
      /**
       * Disconnect
       */
      disconnect() {
        this.output.disconnect();
      }
    };
  }
});

// ../web/public/101/dist/machines/sh101/engine.js
var engine_exports2 = {};
__export(engine_exports2, {
  SH101Engine: () => SH101Engine,
  default: () => engine_default2
});
var SH101Engine, engine_default2;
var init_engine5 = __esm({
  "../web/public/101/dist/machines/sh101/engine.js"() {
    "use strict";
    init_engine4();
    init_oscillator();
    init_sub_oscillator();
    init_ir3109();
    init_envelope();
    init_lfo();
    init_vca();
    SH101Engine = class _SH101Engine extends SynthEngine3 {
      constructor(options = {}) {
        super(options);
        this.engineVersion = options.engine ?? "E1";
        this.initializeVoice();
        this.pattern = this.createEmptyPattern();
        this.currentStep = 0;
        this.bpm = 120;
        this.playing = false;
        this.sequencerInterval = null;
        this.arpMode = "off";
        this.arpHold = false;
        this.arpNotes = [];
        this.arpIndex = 0;
        this.arpDirection = 1;
        this.arpOctaves = 1;
        this.onStepChange = null;
        this.onNote = null;
        this.currentNote = null;
        this.glideTime = 0.05;
      }
      /**
       * Initialize voice components
       */
      initializeVoice() {
        this.vco = new Oscillator(this.context);
        this.subOsc = new SubOscillator(this.context);
        this.mixer = this.context.createGain();
        this.mixer.gain.value = 1;
        this.vco.connect(this.mixer);
        this.subOsc.connect(this.mixer);
        if (this.engineVersion === "E2") {
          this.filter = new IR3109Filter(this.context);
        } else {
          this.filter = new IR3109FilterE1(this.context);
        }
        this.mixer.connect(this.filter.input);
        this.ampEnvelope = new ADSREnvelope(this.context, {
          attack: 0.01,
          decay: 0.3,
          sustain: 0.7,
          release: 0.3
        });
        this.filterEnvelope = new ADSREnvelope(this.context, {
          attack: 0.01,
          decay: 0.3,
          sustain: 0.3,
          release: 0.3
        });
        this.lfo = new LFO(this.context);
        this.vca = new VCA(this.context);
        this.filter.connect(this.vca.input);
        this.vca.connect(this.compressor);
        this.filterEnvAmount = 0.5;
        this.params = {
          vcoSaw: 0.5,
          vcoPulse: 0.5,
          pulseWidth: 0.5,
          subLevel: 0.3,
          subMode: 0,
          cutoff: 0.5,
          resonance: 0.3,
          envMod: 0.5,
          attack: 0.01,
          decay: 0.3,
          sustain: 0.7,
          release: 0.3,
          lfoRate: 0.3,
          lfoWaveform: "triangle",
          lfoToPitch: 0,
          lfoToFilter: 0,
          lfoToPW: 0,
          volume: 0.8
        };
        this.applyAllParameters();
      }
      /**
       * Apply all parameters to voice
       */
      applyAllParameters() {
        Object.entries(this.params).forEach(([key, value]) => {
          this.setParameter(key, value);
        });
      }
      /**
       * Set a synth parameter
       */
      setParameter(id, value) {
        this.params[id] = value;
        switch (id) {
          case "vcoSaw":
            this.vco.setSawLevel(value);
            break;
          case "vcoPulse":
            this.vco.setPulseLevel(value);
            break;
          case "pulseWidth":
            this.vco.setPulseWidth(value);
            break;
          case "subLevel":
            this.subOsc.setLevel(value);
            break;
          case "subMode":
            this.subOsc.setMode(value);
            break;
          case "cutoff":
            this.filter.setCutoff(value);
            break;
          case "resonance":
            this.filter.setResonance(value);
            break;
          case "envMod":
            this.filterEnvAmount = value;
            break;
          case "attack":
            this.ampEnvelope.setAttack(value);
            this.filterEnvelope.setAttack(value);
            break;
          case "decay":
            this.ampEnvelope.setDecay(value);
            this.filterEnvelope.setDecay(value);
            break;
          case "sustain":
            this.ampEnvelope.setSustain(value);
            this.filterEnvelope.setSustain(value * 0.5);
            break;
          case "release":
            this.ampEnvelope.setRelease(value);
            this.filterEnvelope.setRelease(value);
            break;
          case "lfoRate":
            this.lfo.setRate(value);
            break;
          case "lfoWaveform":
            this.lfo.setWaveform(value);
            break;
          case "lfoToPitch":
            this.lfo.setPitchDepth(value * 2);
            break;
          case "lfoToFilter":
            this.lfo.setFilterDepth(value * 2);
            break;
          case "lfoToPW":
            this.lfo.setPwmDepth(value * 0.4);
            break;
          case "volume":
            this.vca.setVolume(value);
            break;
        }
      }
      /**
       * Get current parameter value
       */
      getParameter(id) {
        return this.params[id];
      }
      /**
       * Get all parameters
       */
      getParameters() {
        return { ...this.params };
      }
      /**
       * Play a note
       */
      playNote(note, velocity = 1, time) {
        const when = time ?? this.context.currentTime;
        if (this.context.state === "suspended") {
          this.context.resume();
        }
        let midiNote = note;
        if (typeof note === "string") {
          midiNote = this.noteNameToMidi(note);
        }
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
        if (this.currentNote !== null) {
          this.vco.glideToFrequency(freq, this.glideTime, when);
          this.subOsc.glideToFrequency(freq, this.glideTime, when);
        } else {
          this.vco.setFrequency(freq, when);
          this.subOsc.setFrequency(freq, when);
        }
        this.currentNote = midiNote;
        this.ampEnvelope.trigger(when, true);
        this.filterEnvelope.trigger(when, true);
        this.applyAmpEnvelope(when);
        this.applyFilterEnvelope(when);
        if (this.filter.setNote) {
          this.filter.setNote(midiNote);
        }
      }
      /**
       * Apply amp envelope to VCA
       */
      applyAmpEnvelope(time) {
        const when = time ?? this.context.currentTime;
        const a = this.params.attack;
        const d = this.params.decay;
        const s = this.params.sustain;
        this.vca.amplifier.gain.cancelScheduledValues(when);
        this.vca.amplifier.gain.setValueAtTime(0, when);
        this.vca.amplifier.gain.linearRampToValueAtTime(1, when + a);
        this.vca.amplifier.gain.linearRampToValueAtTime(s, when + a + d);
      }
      /**
       * Apply filter envelope
       */
      applyFilterEnvelope(time) {
        const when = time ?? this.context.currentTime;
        const a = this.params.attack;
        const d = this.params.decay;
        const baseCutoff = this.params.cutoff;
        const amount = this.filterEnvAmount;
        const peakCutoff = Math.min(1, baseCutoff + amount);
        const sustainCutoff = baseCutoff + amount * this.params.sustain * 0.5;
        this.filter.setCutoff(baseCutoff, when);
        this.filter.rampCutoff(peakCutoff, a, when);
        setTimeout(() => {
          this.filter.rampCutoff(sustainCutoff, d);
        }, a * 1e3);
      }
      /**
       * Release note
       */
      noteOff(time) {
        const when = time ?? this.context.currentTime;
        const r = Math.max(0.05, this.params.release);
        try {
          this.ampEnvelope.release(when);
          this.filterEnvelope.release(when);
        } catch (e) {
          console.error("Envelope release error:", e);
        }
        try {
          this.vca.amplifier.gain.cancelScheduledValues(when);
          this.vca.amplifier.gain.setValueAtTime(this.vca.amplifier.gain.value || 0.5, when);
          this.vca.amplifier.gain.exponentialRampToValueAtTime(1e-4, when + r);
          this.vca.amplifier.gain.setValueAtTime(0, when + r + 0.01);
        } catch (e) {
          console.error("VCA release error:", e);
          this.vca.amplifier.gain.value = 0;
        }
        try {
          this.filter.rampCutoff(this.params.cutoff, r, when);
        } catch (e) {
          console.error("Filter release error:", e);
        }
        this.currentNote = null;
      }
      /**
       * Convert note name to MIDI number
       */
      noteNameToMidi(noteName) {
        const noteMap = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
        const match = noteName.match(/^([A-G])([#b]?)(\d+)$/);
        if (!match) return 60;
        let note = noteMap[match[1]];
        if (match[2] === "#") note += 1;
        if (match[2] === "b") note -= 1;
        const octave = parseInt(match[3]);
        return note + (octave + 1) * 12;
      }
      /**
       * Create empty 16-step pattern
       */
      createEmptyPattern() {
        return Array(16).fill(null).map(() => ({
          note: "C3",
          gate: false,
          accent: false,
          slide: false
        }));
      }
      /**
       * Set pattern
       */
      setPattern(pattern) {
        this.pattern = pattern;
      }
      /**
       * Get current pattern
       */
      getPattern() {
        return this.pattern;
      }
      /**
       * Set a single step
       */
      setStep(index, data) {
        if (index >= 0 && index < 16) {
          this.pattern[index] = { ...this.pattern[index], ...data };
        }
      }
      /**
       * Get a single step
       */
      getStep(index) {
        return this.pattern[index];
      }
      /**
       * Set BPM
       */
      setBpm(bpm) {
        this.bpm = Math.max(30, Math.min(300, bpm));
        if (this.playing) {
          this.stopSequencer();
          this.startSequencer();
        }
      }
      /**
       * Get BPM
       */
      getBpm() {
        return this.bpm;
      }
      /**
       * Start sequencer
       */
      startSequencer() {
        if (this.playing) return;
        if (this.context.state === "suspended") {
          this.context.resume();
        }
        this.playing = true;
        this.currentStep = 0;
        const stepDuration = 60 / this.bpm / 4;
        const stepMs = stepDuration * 1e3;
        this.triggerStep(this.currentStep);
        this.currentStep = (this.currentStep + 1) % 16;
        this.sequencerInterval = setInterval(() => {
          try {
            this.triggerStep(this.currentStep);
            this.currentStep = (this.currentStep + 1) % 16;
          } catch (e) {
            console.error("Sequencer step error:", e);
          }
        }, stepMs);
      }
      /**
       * Stop sequencer
       */
      stopSequencer() {
        if (!this.playing) return;
        this.playing = false;
        if (this.sequencerInterval) {
          clearInterval(this.sequencerInterval);
          this.sequencerInterval = null;
        }
        this.noteOff();
      }
      /**
       * Check if playing
       */
      isPlaying() {
        return this.playing;
      }
      /**
       * Trigger a sequencer step
       */
      triggerStep(stepIndex) {
        if (!this.pattern || !this.pattern[stepIndex]) {
          console.error("Invalid pattern or step:", stepIndex);
          return;
        }
        const step = this.pattern[stepIndex];
        const time = this.context.currentTime;
        if (this.onStepChange) {
          this.onStepChange(stepIndex);
        }
        if (step.gate) {
          const velocity = step.accent ? 1 : 0.7;
          if (step.slide && this.currentNote !== null) {
            const midiNote = this.noteNameToMidi(step.note);
            const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
            this.vco.glideToFrequency(freq, this.glideTime, time);
            this.subOsc.glideToFrequency(freq, this.glideTime, time);
            this.currentNote = midiNote;
          } else {
            this.playNote(step.note, velocity, time);
          }
          if (this.onNote) {
            this.onNote(stepIndex, step);
          }
        } else if (this.currentNote !== null) {
          const nextStep = this.pattern[(stepIndex + 1) % 16];
          if (!nextStep || !nextStep.slide) {
            this.noteOff(time);
          }
        }
      }
      /**
       * Set engine version (E1 or E2)
       */
      setEngine(version) {
        if (version === this.engineVersion) return;
        const savedParams = this.getParameters();
        this.mixer.disconnect();
        this.filter.disconnect();
        this.engineVersion = version;
        if (version === "E2") {
          this.filter = new IR3109Filter(this.context);
        } else {
          this.filter = new IR3109FilterE1(this.context);
        }
        this.mixer.connect(this.filter.input);
        this.filter.connect(this.vca.input);
        Object.entries(savedParams).forEach(([key, value]) => {
          this.setParameter(key, value);
        });
      }
      /**
       * Get current engine version
       */
      getEngine() {
        return this.engineVersion;
      }
      // --- Arpeggiator Methods ---
      /**
       * Set arpeggiator mode
       */
      setArpMode(mode) {
        this.arpMode = mode;
        this.arpIndex = 0;
        this.arpDirection = 1;
      }
      /**
       * Set arpeggiator hold
       */
      setArpHold(hold) {
        this.arpHold = hold;
        if (!hold) {
          this.arpNotes = [];
        }
      }
      /**
       * Add note to arpeggiator
       */
      addArpNote(note) {
        const midiNote = typeof note === "string" ? this.noteNameToMidi(note) : note;
        if (!this.arpNotes.includes(midiNote)) {
          this.arpNotes.push(midiNote);
          this.arpNotes.sort((a, b) => a - b);
        }
      }
      /**
       * Remove note from arpeggiator
       */
      removeArpNote(note) {
        if (this.arpHold) return;
        const midiNote = typeof note === "string" ? this.noteNameToMidi(note) : note;
        this.arpNotes = this.arpNotes.filter((n) => n !== midiNote);
      }
      /**
       * Clear all arp notes
       */
      clearArpNotes() {
        this.arpNotes = [];
      }
      /**
       * Set arp octave range
       */
      setArpOctaves(octaves) {
        this.arpOctaves = Math.max(1, Math.min(3, octaves));
      }
      /**
       * Get next arp note
       */
      getNextArpNote() {
        if (this.arpNotes.length === 0) return null;
        const fullNotes = [];
        for (let oct = 0; oct < this.arpOctaves; oct++) {
          this.arpNotes.forEach((note2) => {
            fullNotes.push(note2 + oct * 12);
          });
        }
        let note;
        switch (this.arpMode) {
          case "up":
            note = fullNotes[this.arpIndex % fullNotes.length];
            this.arpIndex = (this.arpIndex + 1) % fullNotes.length;
            break;
          case "down":
            const downIndex = fullNotes.length - 1 - this.arpIndex % fullNotes.length;
            note = fullNotes[downIndex];
            this.arpIndex = (this.arpIndex + 1) % fullNotes.length;
            break;
          case "updown":
            note = fullNotes[this.arpIndex];
            this.arpIndex += this.arpDirection;
            if (this.arpIndex >= fullNotes.length - 1) {
              this.arpDirection = -1;
              this.arpIndex = fullNotes.length - 1;
            } else if (this.arpIndex <= 0) {
              this.arpDirection = 1;
              this.arpIndex = 0;
            }
            break;
          default:
            return null;
        }
        return note;
      }
      // --- Render Methods ---
      /**
       * Render pattern to AudioBuffer
       */
      async renderPattern(options = {}) {
        const bars = options.bars ?? 1;
        const bpm = options.bpm ?? this.bpm;
        const stepsPerBar = 16;
        const totalSteps = bars * stepsPerBar;
        const stepDuration = 60 / bpm / 4;
        const totalDuration = totalSteps * stepDuration + 1;
        const offlineContext = new OfflineAudioContext(
          2,
          Math.ceil(totalDuration * 44100),
          44100
        );
        const offlineEngine = new _SH101Engine({
          context: offlineContext,
          engine: this.engineVersion
        });
        Object.entries(this.params).forEach(([key, value]) => {
          offlineEngine.setParameter(key, value);
        });
        offlineEngine.setPattern([...this.pattern]);
        for (let step = 0; step < totalSteps; step++) {
          const patternStep = step % 16;
          const stepData = this.pattern[patternStep];
          const stepTime = step * stepDuration;
          if (stepData.gate) {
            const velocity = stepData.accent ? 1 : 0.7;
            offlineEngine.playNote(stepData.note, velocity, stepTime);
            const nextPatternStep = (patternStep + 1) % 16;
            const nextStepData = this.pattern[nextPatternStep];
            if (!nextStepData.slide) {
              offlineEngine.noteOff(stepTime + stepDuration * 0.9);
            }
          }
        }
        const buffer = await offlineContext.startRendering();
        return buffer;
      }
      /**
       * Convert AudioBuffer to WAV ArrayBuffer
       */
      audioBufferToWav(buffer) {
        return this.outputManager.audioBufferToWav(buffer);
      }
      /**
       * Convert AudioBuffer to Blob
       */
      audioBufferToBlob(buffer) {
        return this.outputManager.audioBufferToBlob(buffer);
      }
    };
    engine_default2 = SH101Engine;
  }
});

// ui.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { render, Box, Text, useInput, useApp, useStdout } from "ink";
import TextInput from "ink-text-input";

// jambot.js
init_engine_v3();
init_engine3();
init_engine5();
import Anthropic from "@anthropic-ai/sdk";
import { OfflineAudioContext as OfflineAudioContext2 } from "node-web-audio-api";
import { writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { execSync } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { homedir } from "os";

// kit-loader.js
function getAvailableKits() {
  return [];
}
function loadKit(kitId) {
  return null;
}
function ensureUserKitsDir() {
}
function getKitPaths() {
  return { system: "", user: "" };
}

// sample-voice.js
var SampleVoice2 = class {
  constructor(id, context) {
    this.id = id;
    this.context = context;
    this.output = context.createGain();
  }
  connect(destination) {
    this.output.connect(destination);
  }
  trigger(time, velocity) {
  }
  setParameter(id, value) {
  }
};

// jambot.js
var __dirname = dirname(fileURLToPath(import.meta.url));
var JAMBOT_CONFIG_DIR = join(homedir(), ".jambot");
var JAMBOT_ENV_FILE = join(JAMBOT_CONFIG_DIR, ".env");
function loadEnvFile(path) {
  try {
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...rest] = trimmed.split("=");
        process.env[key] = rest.join("=");
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}
function getApiKey() {
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }
  if (existsSync(JAMBOT_ENV_FILE)) {
    loadEnvFile(JAMBOT_ENV_FILE);
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  }
  const localEnv = join(process.cwd(), ".env");
  if (existsSync(localEnv)) {
    loadEnvFile(localEnv);
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  }
  const devEnv = join(__dirname, "..", "sms-bot", ".env.local");
  if (existsSync(devEnv)) {
    loadEnvFile(devEnv);
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  }
  return null;
}
function saveApiKey(key) {
  if (!existsSync(JAMBOT_CONFIG_DIR)) {
    mkdirSync(JAMBOT_CONFIG_DIR, { recursive: true });
  }
  writeFileSync(JAMBOT_ENV_FILE, `ANTHROPIC_API_KEY=${key}
`);
  process.env.ANTHROPIC_API_KEY = key;
}
function getApiKeyPath() {
  return JAMBOT_ENV_FILE;
}
var GENRES = {};
try {
  const genresPath = join(__dirname, "genres.json");
  GENRES = JSON.parse(readFileSync(genresPath, "utf-8"));
} catch (e) {
  console.warn("Could not load genres.json:", e.message);
}
var GENRE_ALIASES = {
  // Classic / Old School House
  "classic house": "classic_house",
  "old school house": "classic_house",
  "oldschool house": "classic_house",
  "old school": "classic_house",
  // Detroit Techno
  "detroit techno": "detroit_techno",
  "detroit": "detroit_techno",
  // Berlin Techno
  "berlin techno": "berlin_techno",
  "berlin": "berlin_techno",
  "berghain": "berlin_techno",
  // Industrial Techno
  "industrial techno": "industrial_techno",
  "industrial": "industrial_techno",
  // Chicago House
  "chicago house": "chicago_house",
  "chicago": "chicago_house",
  // Deep House
  "deep house": "deep_house",
  "deep": "deep_house",
  // Tech House
  "tech house": "tech_house",
  "tech-house": "tech_house",
  // Acid House
  "acid house": "acid_house",
  // Acid Techno
  "acid techno": "acid_techno",
  // Generic acid -> acid house (more common)
  "acid": "acid_house",
  // Electro
  "electro": "electro",
  "electro funk": "electro",
  // Drum and Bass
  "drum and bass": "drum_and_bass",
  "drum & bass": "drum_and_bass",
  "dnb": "drum_and_bass",
  "d&b": "drum_and_bass",
  "drumnbass": "drum_and_bass",
  // Jungle
  "jungle": "jungle",
  // Trance
  "trance": "trance",
  // Minimal
  "minimal techno": "minimal_techno",
  "minimal": "minimal_techno",
  // Breakbeat
  "breakbeat": "breakbeat",
  "breaks": "breakbeat",
  "big beat": "breakbeat",
  // Ambient
  "ambient": "ambient",
  // IDM
  "idm": "idm",
  "intelligent dance": "idm",
  // Generic terms -> sensible defaults
  "techno": "berlin_techno",
  "house": "classic_house"
};
function detectGenres(text) {
  const lower = text.toLowerCase();
  const found = /* @__PURE__ */ new Set();
  const sortedAliases = Object.keys(GENRE_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of sortedAliases) {
    if (lower.includes(alias)) {
      found.add(GENRE_ALIASES[alias]);
    }
  }
  return Array.from(found);
}
function buildGenreContext(genreKeys) {
  if (!genreKeys.length) return "";
  const sections = genreKeys.map((key) => {
    const g = GENRES[key];
    if (!g) return "";
    return `
=== ${g.name.toUpperCase()} ===
BPM: ${g.bpm[0]}-${g.bpm[1]} | Keys: ${g.keys.join(", ")} | Swing: ${g.swing}%

${g.description}

${g.production}

Reference settings:
- Drums: ${JSON.stringify(g.drums)}
- Bass: ${JSON.stringify(g.bass)}
- Classic tracks: ${g.references.join(", ")}
`;
  }).filter(Boolean);
  if (!sections.length) return "";
  return `

GENRE KNOWLEDGE (use this to guide your choices):
${sections.join("\n")}`;
}
globalThis.OfflineAudioContext = OfflineAudioContext2;
getApiKey();
var _client = null;
function getClient() {
  if (!_client) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("No API key configured");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}
function createSession() {
  ensureUserKitsDir();
  return {
    bpm: 128,
    bars: 2,
    swing: 0,
    // R9D9 (drums)
    drumPattern: {},
    drumParams: {},
    // R3D3 (bass)
    bassPattern: createEmptyBassPattern(),
    bassParams: {
      waveform: "sawtooth",
      cutoff: 0.5,
      resonance: 0.5,
      envMod: 0.5,
      decay: 0.5,
      accent: 0.8
    },
    // R1D1 (lead)
    leadPattern: createEmptyLeadPattern(),
    leadParams: {
      vcoSaw: 0.5,
      vcoPulse: 0.5,
      pulseWidth: 0.5,
      subLevel: 0.3,
      cutoff: 0.5,
      resonance: 0.3,
      envMod: 0.5,
      attack: 0.01,
      decay: 0.3,
      sustain: 0.7,
      release: 0.3
    },
    // R9DS (sampler)
    samplerKit: null,
    // Currently loaded kit { id, name, slots }
    samplerPattern: {},
    // { s1: [{step, vel}, ...], s2: [...], ... }
    samplerParams: {}
    // { s1: { level, tune, attack, decay, filter, pan }, ... }
  };
}
function createEmptyBassPattern() {
  return Array(16).fill(null).map(() => ({
    note: "C2",
    gate: false,
    accent: false,
    slide: false
  }));
}
function createEmptyLeadPattern() {
  return Array(16).fill(null).map(() => ({
    note: "C3",
    gate: false,
    accent: false,
    slide: false
  }));
}
var TOOLS = [
  {
    name: "create_session",
    description: "Create a new music session with a specific BPM",
    input_schema: {
      type: "object",
      properties: {
        bpm: { type: "number", description: "Beats per minute (60-200)" }
      },
      required: ["bpm"]
    }
  },
  {
    name: "add_drums",
    description: "Add a drum pattern. For simple patterns, use step arrays like [0,4,8,12]. For detailed velocity control, use objects like [{step:0,vel:1},{step:4,vel:0.5}]. Available voices: kick, snare, clap, ch (closed hat), oh (open hat), ltom, mtom, htom, rimshot, crash, ride.",
    input_schema: {
      type: "object",
      properties: {
        kick: { type: "array", description: "Steps for kick. Simple: [0,4,8,12] or detailed: [{step:0,vel:1},{step:8,vel:0.7}]" },
        snare: { type: "array", description: "Steps for snare" },
        clap: { type: "array", description: "Steps for clap" },
        ch: { type: "array", description: "Steps for closed hi-hat" },
        oh: { type: "array", description: "Steps for open hi-hat" },
        ltom: { type: "array", description: "Steps for low tom" },
        mtom: { type: "array", description: "Steps for mid tom" },
        htom: { type: "array", description: "Steps for high tom" },
        rimshot: { type: "array", description: "Steps for rimshot" },
        crash: { type: "array", description: "Steps for crash cymbal" },
        ride: { type: "array", description: "Steps for ride cymbal" }
      },
      required: []
    }
  },
  {
    name: "set_swing",
    description: "Set the swing amount to push off-beat notes (steps 1,3,5,7,9,11,13,15) later for groove",
    input_schema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Swing amount 0-100. 0=straight, 50=medium groove, 70+=heavy shuffle" }
      },
      required: ["amount"]
    }
  },
  {
    name: "tweak_drums",
    description: "Adjust drum voice parameters like decay, tune, tone, and level. Use this to shape the sound.",
    input_schema: {
      type: "object",
      properties: {
        voice: {
          type: "string",
          enum: ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"],
          description: "Which drum voice to tweak"
        },
        decay: { type: "number", description: "Decay/length (0.1-1.0). Lower = shorter, punchier. Higher = longer, boomy." },
        tune: { type: "number", description: "Pitch tuning (-12 to +12 semitones). Lower = deeper." },
        tone: { type: "number", description: "Brightness (0-1). Lower = darker. (snare only)" },
        level: { type: "number", description: "Volume (0-1)" }
      },
      required: ["voice"]
    }
  },
  {
    name: "render",
    description: "Render the current session to a WAV file",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Output filename (without .wav extension)" },
        bars: { type: "number", description: "Number of bars to render (default: 2)" }
      },
      required: ["filename"]
    }
  },
  // R3D3 (TB-303 acid bass)
  {
    name: "add_bass",
    description: "Add a bass line pattern using R3D3 (TB-303 acid synth). Provide an array of 16 steps. Each step has: note (C2, D#2, etc), gate (true/false), accent (true/false), slide (true/false for glide to next note).",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C2', gate: true, accent: false, slide: false}. Use gate:false for rests.",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C2, D#2, E2, etc). Bass range: C1-C3" },
              gate: { type: "boolean", description: "true = play note, false = rest" },
              accent: { type: "boolean", description: "Accent for extra punch" },
              slide: { type: "boolean", description: "Glide/portamento to next note" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_bass",
    description: "Adjust R3D3 bass synth parameters. All values 0-1 except waveform.",
    input_schema: {
      type: "object",
      properties: {
        waveform: { type: "string", enum: ["sawtooth", "square"], description: "Oscillator waveform" },
        cutoff: { type: "number", description: "Filter cutoff (0-1). Lower = darker, muffled. Higher = brighter." },
        resonance: { type: "number", description: "Filter resonance (0-1). Higher = more squelch/acid sound." },
        envMod: { type: "number", description: "Envelope modulation depth (0-1). How much filter opens on each note." },
        decay: { type: "number", description: "Envelope decay (0-1). How quickly filter closes after opening." },
        accent: { type: "number", description: "Accent intensity (0-1). How much accented notes pop." }
      },
      required: []
    }
  },
  // R1D1 (SH-101 lead synth)
  {
    name: "add_lead",
    description: "Add a lead/synth pattern using R1D1 (SH-101 synth). Provide an array of 16 steps. Each step has: note, gate, accent, slide.",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "array",
          description: "Array of 16 steps. Each step: {note: 'C3', gate: true, accent: false, slide: false}. Lead range: C2-C5",
          items: {
            type: "object",
            properties: {
              note: { type: "string", description: "Note name (C3, D#3, E4, etc)" },
              gate: { type: "boolean", description: "true = play note, false = rest" },
              accent: { type: "boolean", description: "Accent for extra emphasis" },
              slide: { type: "boolean", description: "Glide/portamento to next note" }
            }
          }
        }
      },
      required: ["pattern"]
    }
  },
  {
    name: "tweak_lead",
    description: "Adjust R1D1 lead synth parameters. All values 0-1.",
    input_schema: {
      type: "object",
      properties: {
        vcoSaw: { type: "number", description: "Sawtooth level (0-1)" },
        vcoPulse: { type: "number", description: "Pulse/square level (0-1)" },
        pulseWidth: { type: "number", description: "Pulse width (0-1). 0.5 = square wave" },
        subLevel: { type: "number", description: "Sub-oscillator level (0-1). Adds low-end beef." },
        cutoff: { type: "number", description: "Filter cutoff (0-1)" },
        resonance: { type: "number", description: "Filter resonance (0-1)" },
        envMod: { type: "number", description: "Filter envelope depth (0-1)" },
        attack: { type: "number", description: "Envelope attack (0-1). 0=instant, 1=slow fade in" },
        decay: { type: "number", description: "Envelope decay (0-1)" },
        sustain: { type: "number", description: "Envelope sustain level (0-1)" },
        release: { type: "number", description: "Envelope release (0-1). How long note tails after release" }
      },
      required: []
    }
  },
  {
    name: "rename_project",
    description: "Rename the current project. Use when user says 'rename to X' or 'call this X'.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "New name for the project" }
      },
      required: ["name"]
    }
  },
  // R9DS Sampler tools
  {
    name: "list_kits",
    description: "List all available sample kits (bundled + user kits from ~/Documents/Jambot/kits/)",
    input_schema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "load_kit",
    description: "Load a sample kit for R9DS. Use list_kits first to see available kits.",
    input_schema: {
      type: "object",
      properties: {
        kit: { type: "string", description: "Kit ID to load (e.g., '808', 'amber')" }
      },
      required: ["kit"]
    }
  },
  {
    name: "add_samples",
    description: "Add sample patterns to R9DS. Must load_kit first. Slots are s1-s10. For simple patterns use step arrays [0,4,8,12]. For velocity control use [{step:0,vel:1},{step:4,vel:0.5}].",
    input_schema: {
      type: "object",
      properties: {
        s1: { type: "array", description: "Steps for slot 1 (usually kick)" },
        s2: { type: "array", description: "Steps for slot 2 (usually snare)" },
        s3: { type: "array", description: "Steps for slot 3 (usually clap)" },
        s4: { type: "array", description: "Steps for slot 4 (usually closed hat)" },
        s5: { type: "array", description: "Steps for slot 5 (usually open hat)" },
        s6: { type: "array", description: "Steps for slot 6" },
        s7: { type: "array", description: "Steps for slot 7" },
        s8: { type: "array", description: "Steps for slot 8" },
        s9: { type: "array", description: "Steps for slot 9" },
        s10: { type: "array", description: "Steps for slot 10" }
      },
      required: []
    }
  },
  {
    name: "tweak_samples",
    description: "Tweak R9DS sample parameters. Specify slot (s1-s10) and parameters.",
    input_schema: {
      type: "object",
      properties: {
        slot: { type: "string", description: "Which slot to tweak (s1-s10)" },
        level: { type: "number", description: "Volume (0-1)" },
        tune: { type: "number", description: "Pitch in semitones (-12 to +12)" },
        attack: { type: "number", description: "Fade in time (0-1, 0=instant)" },
        decay: { type: "number", description: "Sample length percentage (0-1, 1=full sample)" },
        filter: { type: "number", description: "Lowpass filter (0-1, 0=dark, 1=bright)" },
        pan: { type: "number", description: "Stereo position (-1=left, 0=center, 1=right)" }
      },
      required: ["slot"]
    }
  },
  {
    name: "create_kit",
    description: "Create a new sample kit from audio files in a folder. Scans the folder for WAV/AIFF/MP3 files and creates a kit in ~/Documents/Jambot/kits/. Returns the list of found files so you can ask the user what to name each slot.",
    input_schema: {
      type: "object",
      properties: {
        source_folder: { type: "string", description: "Path to folder containing audio files" },
        kit_id: { type: "string", description: "ID for the new kit (lowercase, no spaces, e.g., 'my-drums')" },
        kit_name: { type: "string", description: "Display name for the kit (e.g., 'My Drums')" },
        slots: {
          type: "array",
          description: "Array of slot assignments. Each item: {file: 'original-filename.wav', name: 'Kick', short: 'KK'}. If not provided, tool returns found files for you to ask user.",
          items: {
            type: "object",
            properties: {
              file: { type: "string", description: "Original filename from source folder" },
              name: { type: "string", description: "Descriptive name for this sound" },
              short: { type: "string", description: "2-3 letter abbreviation" }
            }
          }
        }
      },
      required: ["source_folder", "kit_id", "kit_name"]
    }
  }
];
var SLASH_COMMANDS = [
  { name: "/new", description: "Start a new project" },
  { name: "/open", description: "Open an existing project" },
  { name: "/projects", description: "List all projects" },
  { name: "/r9d9", description: "R9D9 drum machine guide" },
  { name: "/r3d3", description: "R3D3 acid bass guide" },
  { name: "/r1d1", description: "R1D1 lead synth guide" },
  { name: "/r9ds", description: "R9DS sampler guide" },
  { name: "/kits", description: "List available sample kits" },
  { name: "/status", description: "Show current session state" },
  { name: "/clear", description: "Clear session (stay in project)" },
  { name: "/changelog", description: "Version history and release notes" },
  { name: "/export", description: "Export project (README, MIDI, WAV)" },
  { name: "/help", description: "Show available commands" },
  { name: "/exit", description: "Quit Jambot" }
];
function executeTool(name, input, session, context = {}) {
  if (name === "create_session") {
    session.bpm = input.bpm;
    session.swing = 0;
    session.drumPattern = {};
    session.drumParams = {};
    session.bassPattern = createEmptyBassPattern();
    session.bassParams = { waveform: "sawtooth", cutoff: 0.5, resonance: 0.5, envMod: 0.5, decay: 0.5, accent: 0.8 };
    session.leadPattern = createEmptyLeadPattern();
    session.leadParams = { vcoSaw: 0.5, vcoPulse: 0.5, pulseWidth: 0.5, subLevel: 0.3, cutoff: 0.5, resonance: 0.3, envMod: 0.5, attack: 0.01, decay: 0.3, sustain: 0.7, release: 0.3 };
    session.samplerPattern = {};
    session.samplerParams = {};
    return `Session created at ${input.bpm} BPM`;
  }
  if (name === "set_swing") {
    session.swing = Math.max(0, Math.min(100, input.amount));
    return `Swing set to ${session.swing}%`;
  }
  if (name === "add_drums") {
    const voices = ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"];
    const added = [];
    for (const voice of voices) {
      const steps = input[voice] || [];
      if (steps.length > 0) {
        session.drumPattern[voice] = Array(16).fill(null).map(() => ({ velocity: 0 }));
        const isDetailed = typeof steps[0] === "object";
        if (isDetailed) {
          for (const hit of steps) {
            const step = hit.step;
            const vel = hit.vel !== void 0 ? hit.vel : 1;
            if (step >= 0 && step < 16) {
              session.drumPattern[voice][step].velocity = vel;
            }
          }
          added.push(`${voice}:[${steps.map((h) => h.step).join(",")}]`);
        } else {
          const defaultVel = voice === "ch" || voice === "oh" ? 0.7 : 1;
          for (const step of steps) {
            if (step >= 0 && step < 16) {
              session.drumPattern[voice][step].velocity = defaultVel;
            }
          }
          added.push(`${voice}:[${steps.join(",")}]`);
        }
      }
    }
    return `R9D9 drums: ${added.join(", ")}`;
  }
  if (name === "tweak_drums") {
    const voice = input.voice;
    if (!session.drumParams[voice]) {
      session.drumParams[voice] = {};
    }
    const tweaks = [];
    if (input.decay !== void 0) {
      session.drumParams[voice].decay = input.decay;
      tweaks.push(`decay=${input.decay}`);
    }
    if (input.tune !== void 0) {
      session.drumParams[voice].tune = input.tune;
      tweaks.push(`tune=${input.tune}`);
    }
    if (input.tone !== void 0) {
      session.drumParams[voice].tone = input.tone;
      tweaks.push(`tone=${input.tone}`);
    }
    if (input.level !== void 0) {
      session.drumParams[voice].level = input.level;
      tweaks.push(`level=${input.level}`);
    }
    return `R9D9 ${voice}: ${tweaks.join(", ")}`;
  }
  if (name === "add_bass") {
    const pattern = input.pattern || [];
    session.bassPattern = Array(16).fill(null).map((_, i) => {
      const step = pattern[i] || {};
      return {
        note: step.note || "C2",
        gate: step.gate || false,
        accent: step.accent || false,
        slide: step.slide || false
      };
    });
    const activeSteps = session.bassPattern.filter((s) => s.gate).length;
    return `R3D3 bass: ${activeSteps} notes`;
  }
  if (name === "tweak_bass") {
    const tweaks = [];
    if (input.waveform !== void 0) {
      session.bassParams.waveform = input.waveform;
      tweaks.push(`waveform=${input.waveform}`);
    }
    if (input.cutoff !== void 0) {
      session.bassParams.cutoff = input.cutoff;
      tweaks.push(`cutoff=${input.cutoff}`);
    }
    if (input.resonance !== void 0) {
      session.bassParams.resonance = input.resonance;
      tweaks.push(`resonance=${input.resonance}`);
    }
    if (input.envMod !== void 0) {
      session.bassParams.envMod = input.envMod;
      tweaks.push(`envMod=${input.envMod}`);
    }
    if (input.decay !== void 0) {
      session.bassParams.decay = input.decay;
      tweaks.push(`decay=${input.decay}`);
    }
    if (input.accent !== void 0) {
      session.bassParams.accent = input.accent;
      tweaks.push(`accent=${input.accent}`);
    }
    return `R3D3 bass: ${tweaks.join(", ")}`;
  }
  if (name === "add_lead") {
    const pattern = input.pattern || [];
    session.leadPattern = Array(16).fill(null).map((_, i) => {
      const step = pattern[i] || {};
      return {
        note: step.note || "C3",
        gate: step.gate || false,
        accent: step.accent || false,
        slide: step.slide || false
      };
    });
    const activeSteps = session.leadPattern.filter((s) => s.gate).length;
    return `R1D1 lead: ${activeSteps} notes`;
  }
  if (name === "tweak_lead") {
    const tweaks = [];
    const params = ["vcoSaw", "vcoPulse", "pulseWidth", "subLevel", "cutoff", "resonance", "envMod", "attack", "decay", "sustain", "release"];
    for (const param of params) {
      if (input[param] !== void 0) {
        session.leadParams[param] = input[param];
        tweaks.push(`${param}=${input[param]}`);
      }
    }
    return `R1D1 lead: ${tweaks.join(", ")}`;
  }
  if (name === "render") {
    const bars = input.bars || 2;
    const filename = context.renderPath || `${input.filename}.wav`;
    return renderSession(session, bars, filename).then((result) => {
      context.onRender?.({ bars, bpm: session.bpm, filename });
      return result;
    });
  }
  if (name === "rename_project") {
    if (!context.onRename) {
      return "No project to rename. Create a beat first.";
    }
    const result = context.onRename(input.name);
    if (result.error) {
      return result.error;
    }
    return `Renamed project to "${result.newName}"`;
  }
  if (name === "list_kits") {
    const kits = getAvailableKits();
    const paths = getKitPaths();
    if (kits.length === 0) {
      return `No kits found.
Bundled: ${paths.bundled}
User: ${paths.user}`;
    }
    const kitList = kits.map((k) => `  ${k.id} - ${k.name} (${k.source})`).join("\n");
    return `Available kits:
${kitList}

User kits folder: ${paths.user}`;
  }
  if (name === "load_kit") {
    try {
      const kit = loadKit(input.kit);
      session.samplerKit = kit;
      for (const slot of kit.slots) {
        if (!session.samplerParams[slot.id]) {
          session.samplerParams[slot.id] = {
            level: 0.8,
            tune: 0,
            attack: 0,
            decay: 1,
            filter: 1,
            pan: 0
          };
        }
      }
      const slotNames = kit.slots.map((s) => `${s.id}:${s.short}`).join(", ");
      return `Loaded kit "${kit.name}"
Slots: ${slotNames}`;
    } catch (e) {
      return `Error loading kit: ${e.message}`;
    }
  }
  if (name === "add_samples") {
    if (!session.samplerKit) {
      return "No kit loaded. Use load_kit first.";
    }
    const slots = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"];
    const added = [];
    for (const slot of slots) {
      const steps = input[slot] || [];
      if (steps.length > 0) {
        session.samplerPattern[slot] = Array(16).fill(null).map(() => ({ velocity: 0 }));
        const isDetailed = typeof steps[0] === "object";
        if (isDetailed) {
          for (const hit of steps) {
            const step = hit.step;
            const vel = hit.vel !== void 0 ? hit.vel : 1;
            if (step >= 0 && step < 16) {
              session.samplerPattern[slot][step].velocity = vel;
            }
          }
          added.push(`${slot}:[${steps.map((h) => h.step).join(",")}]`);
        } else {
          for (const step of steps) {
            if (step >= 0 && step < 16) {
              session.samplerPattern[slot][step].velocity = 1;
            }
          }
          added.push(`${slot}:[${steps.join(",")}]`);
        }
      }
    }
    const slotInfo = added.map((a) => {
      const slotId = a.split(":")[0];
      const slotMeta = session.samplerKit.slots.find((s) => s.id === slotId);
      return slotMeta ? `${slotMeta.short}:${a.split(":")[1]}` : a;
    });
    return `R9DS samples: ${slotInfo.join(", ")}`;
  }
  if (name === "tweak_samples") {
    const slot = input.slot;
    if (!session.samplerParams[slot]) {
      session.samplerParams[slot] = { level: 0.8, tune: 0, attack: 0, decay: 1, filter: 1, pan: 0 };
    }
    const tweaks = [];
    if (input.level !== void 0) {
      session.samplerParams[slot].level = input.level;
      tweaks.push(`level=${input.level}`);
    }
    if (input.tune !== void 0) {
      session.samplerParams[slot].tune = input.tune;
      tweaks.push(`tune=${input.tune}`);
    }
    if (input.attack !== void 0) {
      session.samplerParams[slot].attack = input.attack;
      tweaks.push(`attack=${input.attack}`);
    }
    if (input.decay !== void 0) {
      session.samplerParams[slot].decay = input.decay;
      tweaks.push(`decay=${input.decay}`);
    }
    if (input.filter !== void 0) {
      session.samplerParams[slot].filter = input.filter;
      tweaks.push(`filter=${input.filter}`);
    }
    if (input.pan !== void 0) {
      session.samplerParams[slot].pan = input.pan;
      tweaks.push(`pan=${input.pan}`);
    }
    const slotMeta = session.samplerKit?.slots.find((s) => s.id === slot);
    const slotName = slotMeta ? slotMeta.name : slot;
    return `R9DS ${slotName}: ${tweaks.join(", ")}`;
  }
  if (name === "create_kit") {
    const { source_folder, kit_id, kit_name, slots } = input;
    const resolvePath = (p) => {
      if (p.startsWith("/")) return p;
      if (p.startsWith("~")) return p.replace("~", homedir());
      const candidates = [
        p,
        // As-is (cwd)
        join(homedir(), p),
        // ~/path
        join(homedir(), "Documents", p),
        // ~/Documents/path
        join(homedir(), "Documents", "Jambot", p),
        // ~/Documents/Jambot/path (default project location)
        join(homedir(), "Desktop", p),
        // ~/Desktop/path
        join(homedir(), "Downloads", p),
        // ~/Downloads/path
        join(homedir(), "Music", p)
        // ~/Music/path
      ];
      for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
      }
      return null;
    };
    const sourcePath = resolvePath(source_folder);
    if (!sourcePath) {
      const home = homedir();
      return `Error: Folder not found: ${source_folder}

Tried:
- ${source_folder}
- ~/${source_folder}
- ~/Documents/${source_folder}
- ~/Documents/Jambot/${source_folder}
- ~/Desktop/${source_folder}
- ~/Downloads/${source_folder}`;
    }
    const audioExtensions = [".wav", ".aiff", ".aif", ".mp3", ".m4a", ".flac"];
    const files = readdirSync(sourcePath).filter((f) => {
      const ext = f.toLowerCase().slice(f.lastIndexOf("."));
      return audioExtensions.includes(ext);
    }).sort();
    if (files.length === 0) {
      return `Error: No audio files found in ${source_folder}. Looking for: ${audioExtensions.join(", ")}`;
    }
    if (!slots || slots.length === 0) {
      const fileList = files.slice(0, 10).map((f, i) => `  ${i + 1}. ${f}`).join("\n");
      const extra = files.length > 10 ? `
  ... and ${files.length - 10} more` : "";
      return `Found ${files.length} audio files in ${source_folder}:
${fileList}${extra}

Ask the user what to name each sound (or use auto-naming based on filenames). Then call create_kit again with the slots array.`;
    }
    if (slots.length > 10) {
      return `Error: Maximum 10 slots per kit. You provided ${slots.length}.`;
    }
    const userKitsPath = join(homedir(), "Documents", "Jambot", "kits");
    const kitPath = join(userKitsPath, kit_id);
    const samplesPath = join(kitPath, "samples");
    if (existsSync(kitPath)) {
      return `Error: Kit "${kit_id}" already exists at ${kitPath}. Choose a different ID or delete the existing kit.`;
    }
    mkdirSync(samplesPath, { recursive: true });
    const kitSlots = [];
    const copied = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const slotId = `s${i + 1}`;
      const sourceFile = join(sourcePath, slot.file);
      if (!existsSync(sourceFile)) {
        return `Error: File not found: ${slot.file}`;
      }
      const destFile = join(samplesPath, `${slotId}.wav`);
      const ext = slot.file.toLowerCase().slice(slot.file.lastIndexOf("."));
      if (ext === ".wav") {
        copyFileSync(sourceFile, destFile);
      } else {
        let converted = false;
        if (process.platform === "darwin") {
          try {
            execSync(`afconvert -f WAVE -d LEI16@44100 "${sourceFile}" "${destFile}"`, {
              stdio: "pipe"
            });
            converted = true;
          } catch {
          }
        }
        if (!converted) {
          try {
            execSync(`"${ffmpegPath}" -y -i "${sourceFile}" -ar 44100 -ac 2 -sample_fmt s16 "${destFile}"`, {
              stdio: "pipe"
            });
            converted = true;
          } catch (e) {
            return `Error converting ${slot.file}: Could not convert with afconvert or ffmpeg. Try converting to WAV manually first.`;
          }
        }
      }
      kitSlots.push({
        id: slotId,
        name: slot.name,
        short: slot.short || slot.name.slice(0, 2).toUpperCase()
      });
      copied.push(`${slotId}: ${slot.name} (${slot.file})`);
    }
    const kitJson = {
      name: kit_name,
      slots: kitSlots
    };
    writeFileSync(join(kitPath, "kit.json"), JSON.stringify(kitJson, null, 2));
    const newKit = loadKit(kit_id);
    session.samplerKit = newKit;
    session.samplerPattern = {};
    for (const slot of newKit.slots) {
      session.samplerParams[slot.id] = {
        level: 0.8,
        tune: 0,
        attack: 0,
        decay: 1,
        filter: 1,
        pan: 0
      };
    }
    const slotSummary = newKit.slots.map((s) => `${s.id}: ${s.name} (${s.short})`).join("\n");
    return `Created and loaded kit "${kit_name}" (${kit_id})

Slots ready to use:
${slotSummary}

Use add_samples to program patterns. Example: add_samples with s1:[0,4,8,12] for kicks on beats.`;
  }
  return `Unknown tool: ${name}`;
}
async function renderSession(session, bars, filename) {
  const { TR909Engine: TR909Engine2 } = await Promise.resolve().then(() => (init_engine_v3(), engine_v3_exports));
  const TB303Mod = await Promise.resolve().then(() => (init_engine3(), engine_exports));
  const TB303Engine2 = TB303Mod.TB303Engine || TB303Mod.default;
  const SH101Mod = await Promise.resolve().then(() => (init_engine5(), engine_exports2));
  const SH101Engine2 = SH101Mod.SH101Engine || SH101Mod.default;
  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const stepDuration = 60 / session.bpm / 4;
  const totalDuration = totalSteps * stepDuration + 2;
  const sampleRate = 44100;
  const context = new OfflineAudioContext2(2, totalDuration * sampleRate, sampleRate);
  const originalCreateWaveShaper = context.createWaveShaper.bind(context);
  context.createWaveShaper = function() {
    const shaper = originalCreateWaveShaper();
    let curveSet = false;
    const originalCurve = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(shaper), "curve");
    Object.defineProperty(shaper, "curve", {
      get() {
        return originalCurve?.get?.call(this);
      },
      set(value) {
        if (!curveSet) {
          curveSet = true;
          originalCurve?.set?.call(this, value);
        }
      },
      configurable: true
    });
    return shaper;
  };
  const masterGain = context.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(context.destination);
  const drums = new TR909Engine2({ context });
  const voiceNames = ["kick", "snare", "clap", "ch", "oh", "ltom", "mtom", "htom", "rimshot", "crash", "ride"];
  for (const name of voiceNames) {
    const voice = drums.voices.get(name);
    if (voice) {
      voice.connect(masterGain);
      const params = session.drumParams[name];
      if (params) {
        if (params.decay !== void 0) voice.decay = params.decay;
        if (params.tune !== void 0) voice.tune = params.tune;
        if (params.tone !== void 0) voice.tone = params.tone;
        if (params.level !== void 0) voice.level = params.level;
      }
    }
  }
  const bass = new TB303Engine2({ context, engine: "E1" });
  const bassVoice = bass.voices.get("bass");
  if (bassVoice) {
    bassVoice.connect(masterGain);
    if (session.bassParams.waveform) {
      bass.setWaveform(session.bassParams.waveform);
    }
    Object.entries(session.bassParams).forEach(([key, value]) => {
      if (key !== "waveform") {
        bass.setParameter(key, value);
      }
    });
  }
  const lead = new SH101Engine2({ context, engine: "E1" });
  Object.entries(session.leadParams).forEach(([key, value]) => {
    lead.setParameter(key, value);
  });
  lead.masterGain.connect(masterGain);
  const samplerVoices = /* @__PURE__ */ new Map();
  if (session.samplerKit) {
    for (const slot of session.samplerKit.slots) {
      if (slot.buffer) {
        const voice = new SampleVoice2(slot.id, context);
        try {
          const audioBuffer = await context.decodeAudioData(slot.buffer.slice(0));
          voice.setBuffer(audioBuffer);
          voice.setMeta(slot.name, slot.short);
          const params = session.samplerParams[slot.id];
          if (params) {
            Object.entries(params).forEach(([key, value]) => {
              voice.setParameter(key, value);
            });
          }
          voice.connect(masterGain);
          samplerVoices.set(slot.id, voice);
        } catch (e) {
          console.warn(`Could not decode sample for ${slot.id}:`, e.message);
        }
      }
    }
  }
  const swingAmount = session.swing / 100;
  const maxSwingDelay = stepDuration * 0.5;
  const noteToFreq = (note) => {
    const noteMap = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
    const match = note.match(/^([A-G])([#b]?)(\d+)$/);
    if (!match) return 440;
    let n = noteMap[match[1]];
    if (match[2] === "#") n += 1;
    if (match[2] === "b") n -= 1;
    const octave = parseInt(match[3]);
    const midi = n + (octave + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  };
  for (let i = 0; i < totalSteps; i++) {
    let time = i * stepDuration;
    const step = i % 16;
    if (step % 2 === 1) {
      time += swingAmount * maxSwingDelay;
    }
    for (const name of voiceNames) {
      if (session.drumPattern[name]?.[step]?.velocity > 0) {
        const voice = drums.voices.get(name);
        if (voice) voice.trigger(time, session.drumPattern[name][step].velocity);
      }
    }
    const bassStep = session.bassPattern[step];
    if (bassStep?.gate && bassVoice) {
      const freq = noteToFreq(bassStep.note);
      const nextStep = session.bassPattern[(step + 1) % 16];
      const shouldSlide = bassStep.slide && nextStep?.gate;
      const nextFreq = shouldSlide ? noteToFreq(nextStep.note) : null;
      bassVoice.trigger(time, 0.8, freq, bassStep.accent, shouldSlide, nextFreq);
    }
    const leadStep = session.leadPattern[step];
    if (leadStep?.gate) {
      const velocity = leadStep.accent ? 1 : 0.7;
      lead.playNote(leadStep.note, velocity, time);
      const nextLeadStep = session.leadPattern[(step + 1) % 16];
      if (!nextLeadStep?.slide && !nextLeadStep?.gate) {
        lead.noteOff(time + stepDuration * 0.9);
      }
    }
    for (const [slotId, voice] of samplerVoices) {
      if (session.samplerPattern[slotId]?.[step]?.velocity > 0) {
        voice.trigger(time, session.samplerPattern[slotId][step].velocity);
      }
    }
  }
  const hasDrums = Object.keys(session.drumPattern).length > 0;
  const hasBass = session.bassPattern.some((s) => s.gate);
  const hasLead = session.leadPattern.some((s) => s.gate);
  const hasSamples = Object.keys(session.samplerPattern).length > 0 && session.samplerKit;
  const synths = [hasDrums && "R9D9", hasBass && "R3D3", hasLead && "R1D1", hasSamples && "R9DS"].filter(Boolean);
  return context.startRendering().then((buffer) => {
    const wav = audioBufferToWav4(buffer);
    writeFileSync(filename, Buffer.from(wav));
    return `Rendered ${bars} bars at ${session.bpm} BPM (${synths.join("+") || "empty"})`;
  });
}
function audioBufferToWav4(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const samples = buffer.length;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);
  writeString4(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString4(view, 8, "WAVE");
  writeString4(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString4(view, 36, "data");
  view.setUint32(40, dataSize, true);
  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      const int16 = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }
  return arrayBuffer;
}
function writeString4(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
function buildSessionContext(session) {
  const parts = [];
  if (session.bpm) {
    parts.push(`BPM: ${session.bpm}`);
  }
  if (session.swing > 0) {
    parts.push(`Swing: ${session.swing}%`);
  }
  if (session.samplerKit) {
    const slotList = session.samplerKit.slots.map((s) => `${s.id}=${s.name} (${s.short})`).join(", ");
    parts.push(`LOADED KIT: "${session.samplerKit.name}" with slots: ${slotList}`);
  }
  const hasDrums = Object.keys(session.drumPattern).some(
    (k) => session.drumPattern[k]?.some((s) => s.velocity > 0)
  );
  const hasBass = session.bassPattern?.some((s) => s.gate);
  const hasLead = session.leadPattern?.some((s) => s.gate);
  const hasSamples = Object.keys(session.samplerPattern).some(
    (k) => session.samplerPattern[k]?.some((s) => s.velocity > 0)
  );
  const programmed = [];
  if (hasDrums) programmed.push("R9D9 drums");
  if (hasBass) programmed.push("R3D3 bass");
  if (hasLead) programmed.push("R1D1 lead");
  if (hasSamples) programmed.push("R9DS samples");
  if (programmed.length > 0) {
    parts.push(`Programmed: ${programmed.join(", ")}`);
  }
  if (parts.length === 0) {
    return "";
  }
  return `

CURRENT SESSION STATE:
${parts.join("\n")}`;
}
async function runAgentLoop(task, session, messages, callbacks, context = {}) {
  callbacks.onStart?.(task);
  messages.push({ role: "user", content: task });
  const conversationText = messages.map((m) => typeof m.content === "string" ? m.content : "").join(" ");
  const detectedGenres = detectGenres(conversationText);
  const genreContext = buildGenreContext(detectedGenres);
  const baseSystemPrompt = `You are Jambot, an AI that creates music with classic synths. You know your gear and you're here to make tracks, not write essays.

SYNTHS:
- R9D9 (TR-909 drums) - when user says "909" they mean this
- R3D3 (TB-303 acid bass) - when user says "303" they mean this
- R1D1 (SH-101 lead synth) - when user says "101" they mean this
- R9DS (sampler) - sample-based drums/sounds. Use list_kits to see available kits, load_kit to load one, add_samples for patterns

WORKFLOW: Complete the full task - create session, add instruments, AND render. System handles filenames.
For R9DS: load_kit first, then add_samples with slot patterns (s1-s10).

CREATING KITS: If user wants to create a kit from their own samples, use create_kit. First call it without slots to scan the folder and see what files are there. Then ask the user what to name each sound. Finally call create_kit again with the full slots array - this AUTOMATICALLY LOADS the kit so it's ready to use immediately. After creating a kit, you can go straight to add_samples and render - no need to call load_kit.

IMPORTANT: When you create a kit, remember the slot names (s1, s2, etc.) and what sounds they contain. Use those exact slot IDs in add_samples. The kit stays loaded in the session.

PERSONALITY: You're a producer who knows these machines inside out. Confident, not cocky. Keep it brief but flavorful - describe what you made like you're proud of it. Use music language naturally (four-on-the-floor, groove, punch, snap, thump, squelch). No emoji. No exclamation marks. Let the beat speak.

Example response after render:
"128 BPM, four-on-the-floor. Kick's tuned down for chest thump, snare cracking on 2 and 4, hats locked tight. Classic warehouse energy."`;
  while (true) {
    const sessionContext = buildSessionContext(session);
    const systemPrompt = baseSystemPrompt + genreContext + sessionContext;
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages
    });
    if (response.stop_reason === "end_turn") {
      messages.push({ role: "assistant", content: response.content });
      for (const block of response.content) {
        if (block.type === "text") {
          callbacks.onResponse?.(block.text);
        }
      }
      callbacks.onEnd?.();
      break;
    }
    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          callbacks.onTool?.(block.name, block.input);
          let toolContext = { ...context };
          if (block.name === "render" && context.getRenderPath) {
            toolContext.renderPath = context.getRenderPath();
          }
          let result = executeTool(block.name, block.input, session, toolContext);
          if (result instanceof Promise) {
            result = await result;
          }
          callbacks.onToolResult?.(result);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result
          });
        }
      }
      messages.push({ role: "user", content: toolResults });
    }
  }
  return { session, messages };
}
var SPLASH = `
     \u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2557   \u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
     \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D
     \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2554\u2588\u2588\u2588\u2588\u2554\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551
\u2588\u2588   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551\u255A\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551   \u2588\u2588\u2551
\u255A\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551 \u255A\u2550\u255D \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D   \u2588\u2588\u2551
 \u255A\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D     \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u255D  \u255A\u2550\u2550\u2550\u2550\u2550\u255D    \u255A\u2550\u255D

    Your AI just learned to funk
 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  v0.0.2 \u2014 Producer Mode
  R9D9 drums \u2022 R3D3 acid bass \u2022 R1D1 lead synth
 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  "make me an acid track at 130"
  "add a squelchy 303 bass line"
  "layer in some synth stabs"
  "render it"
 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

  / for commands \u2022 github.com/bdecrem/jambot
`;
var HELP_TEXT = `
Slash Commands

  /new [name]   Start a new project
  /open <name>  Open an existing project
  /projects     List all projects
  /r9d9         R9D9 drum machine guide
  /r3d3         R3D3 acid bass guide
  /r1d1         R1D1 lead synth guide
  /r9ds         R9DS sampler guide
  /kits         List available sample kits
  /status       Show current session state
  /clear        Clear session (stay in project)
  /changelog    Version history
  /exit         Quit Jambot

Or just talk:
  > make me a techno beat at 128
  > add a 303 bass line
  > layer in a synth lead
  > load the 808 kit and make a boom bap beat
`;
var CHANGELOG_TEXT = `
Changelog

  v0.0.2 \u2014 Jan 15, 2026 \u2014 Producer Mode
  \u2022 Ink-based TUI with bottom-anchored input
  \u2022 First-run wizard for API key setup
  \u2022 Project system: ~/Documents/Jambot/projects/
  \u2022 /export command: MIDI files + README
  \u2022 Rename projects via natural language
  \u2022 Producer personality (confident, music-savvy)

  v0.1.0 \u2014 Jan 14, 2026 \u2014 The Droid Trio
  \u2022 R9D9 (TR-909) drums with all 11 voices
  \u2022 R3D3 (TB-303) acid bass with filter/resonance
  \u2022 R1D1 (SH-101) lead synth with VCO/filter/env
  \u2022 Multi-synth rendering in single WAV

  v0.0.1 \u2014 Jan 13, 2026 \u2014 Initial release
  \u2022 TR-909 with all 11 voices + parameters
  \u2022 Natural language beat creation
  \u2022 Velocity per step, swing for groove
  \u2022 WAV rendering, interactive CLI
`;
var R9D9_GUIDE = `
R9D9 \u2014 Drum Machine (TR-909)

  VOICES
  kick     Bass drum        snare    Snare drum
  clap     Handclap         ch       Closed hi-hat
  oh       Open hi-hat      ltom     Low tom
  mtom     Mid tom          htom     High tom
  rimshot  Rim click        crash    Crash cymbal
  ride     Ride cymbal

  PARAMETERS  "tweak the kick..."
  decay    Length (0.1-1). Low = punch, high = boom
  tune     Pitch (-12 to +12). Negative = deeper
  tone     Brightness (0-1). Snare only
  level    Volume (0-1)

  SWING    Pushes off-beats for groove
  > "add 50% swing"
  > "make it shuffle"

  EXAMPLES
  > "four on the floor with offbeat hats"
  > "ghost notes on the snare"
  > "tune the kick down, make it longer"
`;
var R3D3_GUIDE = `
R3D3 \u2014 Acid Bass (TB-303)

  PATTERN FORMAT
  16 steps, each with: note, gate, accent, slide
  Notes: C1-C3 range (bass territory)
  Gate: true = play, false = rest
  Accent: extra punch on that note
  Slide: portamento glide to next note

  PARAMETERS  "tweak the bass..."
  waveform   sawtooth or square
  cutoff     Filter brightness (0-1)
  resonance  Squelch/acid amount (0-1)
  envMod     Filter envelope depth (0-1)
  decay      How fast filter closes (0-1)
  accent     Accent intensity (0-1)

  THE ACID SOUND
  High resonance + envelope mod = classic squelch
  Slides between notes = that rubbery feel

  EXAMPLES
  > "add an acid bass line in A minor"
  > "make it more squelchy"
  > "add some slides between notes"
`;
var R1D1_GUIDE = `
R1D1 \u2014 Lead Synth (SH-101)

  PATTERN FORMAT
  16 steps, each with: note, gate, accent, slide
  Notes: C2-C5 range (lead territory)
  Gate: true = play, false = rest
  Accent: emphasized note
  Slide: glide to next note

  OSCILLATOR
  vcoSaw      Sawtooth level (0-1)
  vcoPulse    Pulse wave level (0-1)
  pulseWidth  PWM width (0-1, 0.5 = square)
  subLevel    Sub-oscillator beef (0-1)

  FILTER
  cutoff      Filter brightness (0-1)
  resonance   Filter emphasis (0-1)
  envMod      Envelope to filter (0-1)

  ENVELOPE
  attack      Note fade-in (0-1)
  decay       Initial decay (0-1)
  sustain     Held level (0-1)
  release     Note fade-out (0-1)

  EXAMPLES
  > "add a synth lead melody"
  > "make it more plucky with short decay"
  > "add some sub bass to fatten it up"
`;

// project.js
import { mkdirSync as mkdirSync2, writeFileSync as writeFileSync3, readFileSync as readFileSync2, readdirSync as readdirSync2, existsSync as existsSync2 } from "fs";
import { join as join2 } from "path";
import { homedir as homedir2 } from "os";
import { copyFileSync as copyFileSync2 } from "fs";

// midi.js
import { writeFileSync as writeFileSync2 } from "fs";
var HEADER_CHUNK = "MThd";
var TRACK_CHUNK = "MTrk";
var NOTE_ON = 144;
var NOTE_OFF = 128;
var END_OF_TRACK = [0, 255, 47, 0];
var GM_DRUM_MAP = {
  kick: 36,
  // Bass Drum 1
  snare: 38,
  // Acoustic Snare
  clap: 39,
  // Hand Clap
  ch: 42,
  // Closed Hi-Hat
  oh: 46,
  // Open Hi-Hat
  ltom: 45,
  // Low Tom
  mtom: 47,
  // Mid Tom
  htom: 50,
  // High Tom
  rimshot: 37,
  // Side Stick
  crash: 49,
  // Crash Cymbal 1
  ride: 51
  // Ride Cymbal 1
};
function writeVLQ(value) {
  if (value === 0) return [0];
  const bytes = [];
  let v = value;
  bytes.unshift(v & 127);
  v >>= 7;
  while (v > 0) {
    bytes.unshift(v & 127 | 128);
    v >>= 7;
  }
  return bytes;
}
function noteNameToMidi(note) {
  const noteMap = { "C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11 };
  const match = note.match(/^([A-G])([#b]?)(\d+)$/);
  if (!match) return 60;
  let n = noteMap[match[1]];
  if (match[2] === "#") n += 1;
  if (match[2] === "b") n -= 1;
  const octave = parseInt(match[3]);
  return n + (octave + 1) * 12;
}
function writeInt16(value) {
  return [value >> 8 & 255, value & 255];
}
function writeInt32(value) {
  return [
    value >> 24 & 255,
    value >> 16 & 255,
    value >> 8 & 255,
    value & 255
  ];
}
function generateHeader(format, numTracks, ppq = 96) {
  const data = [
    ...HEADER_CHUNK.split("").map((c) => c.charCodeAt(0)),
    ...writeInt32(6),
    // Header length
    ...writeInt16(format),
    // Format (0=single, 1=multi-track)
    ...writeInt16(numTracks),
    // Number of tracks
    ...writeInt16(ppq)
    // Pulses per quarter note
  ];
  return data;
}
function tempoEvent(bpm) {
  const uspb = Math.round(6e7 / bpm);
  return [
    0,
    // Delta time
    255,
    81,
    3,
    // Tempo meta event
    uspb >> 16 & 255,
    uspb >> 8 & 255,
    uspb & 255
  ];
}
function trackNameEvent(name) {
  const nameBytes = name.split("").map((c) => c.charCodeAt(0));
  return [
    0,
    // Delta time
    255,
    3,
    // Track name meta event
    nameBytes.length,
    ...nameBytes
  ];
}
function generateTrack(events) {
  const trackData = [...events, ...END_OF_TRACK];
  const length = trackData.length;
  return [
    ...TRACK_CHUNK.split("").map((c) => c.charCodeAt(0)),
    ...writeInt32(length),
    ...trackData
  ];
}
function drumPatternToMidi(drumPattern, bars = 2, ppq = 96) {
  const events = [];
  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const ticksPerStep = ppq / 4;
  const hits = [];
  for (let i = 0; i < totalSteps; i++) {
    const step = i % 16;
    for (const [voice, pattern] of Object.entries(drumPattern)) {
      if (pattern[step]?.velocity > 0) {
        const midiNote = GM_DRUM_MAP[voice] || 36;
        const velocity = Math.round(pattern[step].velocity * 127);
        hits.push({
          tick: i * ticksPerStep,
          note: midiNote,
          velocity,
          duration: ticksPerStep / 2
          // Short duration for drums
        });
      }
    }
  }
  hits.sort((a, b) => a.tick - b.tick);
  let lastTick = 0;
  for (const hit of hits) {
    const delta = hit.tick - lastTick;
    events.push(...writeVLQ(delta));
    events.push(153, hit.note, hit.velocity);
    events.push(...writeVLQ(hit.duration));
    events.push(137, hit.note, 0);
    lastTick = hit.tick + hit.duration;
  }
  return events;
}
function melodicPatternToMidi(pattern, channel = 0, bars = 2, ppq = 96) {
  const events = [];
  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const ticksPerStep = ppq / 4;
  const hits = [];
  for (let i = 0; i < totalSteps; i++) {
    const step = i % 16;
    const stepData = pattern[step];
    if (stepData?.gate) {
      const midiNote = noteNameToMidi(stepData.note);
      const velocity = stepData.accent ? 120 : 90;
      let duration = ticksPerStep;
      if (stepData.slide) {
        for (let j = step + 1; j < 16; j++) {
          if (!pattern[j]?.gate) break;
          duration += ticksPerStep;
          if (!pattern[j]?.slide) break;
        }
      }
      hits.push({
        tick: i * ticksPerStep,
        note: midiNote,
        velocity,
        duration
      });
    }
  }
  let lastTick = 0;
  for (const hit of hits) {
    const delta = hit.tick - lastTick;
    events.push(...writeVLQ(delta));
    events.push(NOTE_ON | channel, hit.note, hit.velocity);
    events.push(...writeVLQ(hit.duration));
    events.push(NOTE_OFF | channel, hit.note, 0);
    lastTick = hit.tick + hit.duration;
  }
  return events;
}
function generateDrumsMidi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;
  const trackEvents = [
    ...trackNameEvent("R9D9 Drums"),
    ...tempoEvent(session.bpm),
    ...drumPatternToMidi(session.drumPattern || {}, bars, ppq)
  ];
  const midiData = [
    ...generateHeader(0, 1, ppq),
    ...generateTrack(trackEvents)
  ];
  writeFileSync2(outputPath, Buffer.from(midiData));
  return outputPath;
}
function generateBassMidi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;
  const trackEvents = [
    ...trackNameEvent("R3D3 Bass"),
    ...tempoEvent(session.bpm),
    ...melodicPatternToMidi(session.bassPattern || [], 0, bars, ppq)
  ];
  const midiData = [
    ...generateHeader(0, 1, ppq),
    ...generateTrack(trackEvents)
  ];
  writeFileSync2(outputPath, Buffer.from(midiData));
  return outputPath;
}
function generateLeadMidi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;
  const trackEvents = [
    ...trackNameEvent("R1D1 Lead"),
    ...tempoEvent(session.bpm),
    ...melodicPatternToMidi(session.leadPattern || [], 1, bars, ppq)
  ];
  const midiData = [
    ...generateHeader(0, 1, ppq),
    ...generateTrack(trackEvents)
  ];
  writeFileSync2(outputPath, Buffer.from(midiData));
  return outputPath;
}
function generateFullMidi(session, outputPath) {
  const bars = session.bars || 2;
  const ppq = 96;
  const tempoTrack = [
    ...trackNameEvent(session.name || "Jambot Export"),
    ...tempoEvent(session.bpm)
  ];
  const drumTrack = [
    ...trackNameEvent("R9D9 Drums"),
    ...drumPatternToMidi(session.drumPattern || {}, bars, ppq)
  ];
  const bassTrack = [
    ...trackNameEvent("R3D3 Bass"),
    ...melodicPatternToMidi(session.bassPattern || [], 0, bars, ppq)
  ];
  const leadTrack = [
    ...trackNameEvent("R1D1 Lead"),
    ...melodicPatternToMidi(session.leadPattern || [], 1, bars, ppq)
  ];
  const midiData = [
    ...generateHeader(1, 4, ppq),
    // Format 1, 4 tracks
    ...generateTrack(tempoTrack),
    ...generateTrack(drumTrack),
    ...generateTrack(bassTrack),
    ...generateTrack(leadTrack)
  ];
  writeFileSync2(outputPath, Buffer.from(midiData));
  return outputPath;
}
function hasContent(session) {
  const hasDrums = Object.keys(session.drumPattern || {}).length > 0;
  const hasBass = (session.bassPattern || []).some((s) => s?.gate);
  const hasLead = (session.leadPattern || []).some((s) => s?.gate);
  return { hasDrums, hasBass, hasLead, any: hasDrums || hasBass || hasLead };
}

// project.js
var JAMBOT_HOME = join2(homedir2(), "Documents", "Jambot");
var PROJECTS_DIR = join2(JAMBOT_HOME, "projects");
function ensureDirectories() {
  if (!existsSync2(JAMBOT_HOME)) {
    mkdirSync2(JAMBOT_HOME, { recursive: true });
  }
  if (!existsSync2(PROJECTS_DIR)) {
    mkdirSync2(PROJECTS_DIR, { recursive: true });
  }
}
function extractProjectName(prompt, bpm) {
  const keywords = [
    "techno",
    "house",
    "trance",
    "dnb",
    "drum and bass",
    "dubstep",
    "hip hop",
    "hiphop",
    "trap",
    "lofi",
    "lo-fi",
    "ambient",
    "funk",
    "funky",
    "disco",
    "acid",
    "minimal",
    "deep",
    "hard",
    "industrial",
    "breakbeat",
    "garage",
    "uk garage",
    "jungle",
    "electro",
    "synth",
    "wave",
    "pop",
    "rock",
    "jazz",
    "latin",
    "afro",
    "tribal",
    "world"
  ];
  const lower = prompt.toLowerCase();
  const found = [];
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      found.push(kw.replace(/\s+/g, "-"));
    }
  }
  if (found.length > 0) {
    const nameWords = [...new Set(found)].slice(0, 2);
    return `${nameWords.join("-")}-${bpm}`;
  }
  return `beat-${bpm}`;
}
function generateProjectFolderName(baseName) {
  ensureDirectories();
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
  let folderName = `${baseName}-${date}`;
  let fullPath = join2(PROJECTS_DIR, folderName);
  let counter = 2;
  while (existsSync2(fullPath)) {
    folderName = `${baseName}-${date}-${counter}`;
    fullPath = join2(PROJECTS_DIR, folderName);
    counter++;
  }
  return folderName;
}
function createProject(name, session, initialPrompt = null) {
  ensureDirectories();
  const folderName = generateProjectFolderName(name);
  const projectPath = join2(PROJECTS_DIR, folderName);
  mkdirSync2(projectPath, { recursive: true });
  mkdirSync2(join2(projectPath, "_source", "midi"), { recursive: true });
  mkdirSync2(join2(projectPath, "_source", "samples"), { recursive: true });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const project = {
    name,
    folderName,
    created: now,
    modified: now,
    session: {
      bpm: session.bpm,
      bars: session.bars,
      swing: session.swing,
      pattern: session.pattern,
      voiceParams: session.voiceParams
    },
    renders: [],
    history: initialPrompt ? [{ prompt: initialPrompt, timestamp: now }] : []
  };
  saveProject(project);
  return project;
}
function saveProject(project) {
  const projectPath = join2(PROJECTS_DIR, project.folderName);
  const projectFile = join2(projectPath, "project.json");
  project.modified = (/* @__PURE__ */ new Date()).toISOString();
  writeFileSync3(projectFile, JSON.stringify(project, null, 2));
  return project;
}
function renameProject(project, newName) {
  const oldName = project.name;
  project.name = newName;
  saveProject(project);
  return { oldName, newName };
}
function loadProject(folderName) {
  const projectFile = join2(PROJECTS_DIR, folderName, "project.json");
  if (!existsSync2(projectFile)) {
    throw new Error(`Project not found: ${folderName}`);
  }
  const content = readFileSync2(projectFile, "utf-8");
  return JSON.parse(content);
}
function listProjects() {
  ensureDirectories();
  const folders = readdirSync2(PROJECTS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const projects = [];
  for (const folder of folders) {
    try {
      const project = loadProject(folder);
      projects.push({
        folderName: folder,
        name: project.name,
        created: project.created,
        modified: project.modified,
        bpm: project.session?.bpm,
        renderCount: project.renders?.length || 0
      });
    } catch (e) {
    }
  }
  projects.sort((a, b) => new Date(b.modified) - new Date(a.modified));
  return projects;
}
function getNextRenderVersion(project) {
  return (project.renders?.length || 0) + 1;
}
function getRenderPath(project) {
  const version = getNextRenderVersion(project);
  const filename = `v${version}.wav`;
  return {
    version,
    filename,
    fullPath: join2(PROJECTS_DIR, project.folderName, filename),
    relativePath: filename
  };
}
function recordRender(project, renderInfo) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  project.renders.push({
    version: renderInfo.version,
    file: renderInfo.relativePath,
    bars: renderInfo.bars,
    bpm: renderInfo.bpm,
    timestamp: now
  });
  saveProject(project);
  return project;
}
function addToHistory(project, prompt) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  project.history.push({ prompt, timestamp: now });
  saveProject(project);
  return project;
}
function updateSession(project, session) {
  project.session = {
    bpm: session.bpm,
    bars: session.bars,
    swing: session.swing,
    // R9D9 (drums)
    drumPattern: session.drumPattern,
    drumParams: session.drumParams,
    // R3D3 (bass)
    bassPattern: session.bassPattern,
    bassParams: session.bassParams,
    // R1D1 (lead)
    leadPattern: session.leadPattern,
    leadParams: session.leadParams
  };
  saveProject(project);
  return project;
}
function restoreSession(project) {
  return {
    bpm: project.session?.bpm || 128,
    bars: project.session?.bars || 2,
    swing: project.session?.swing || 0,
    // R9D9 (drums)
    drumPattern: project.session?.drumPattern || {},
    drumParams: project.session?.drumParams || {},
    // R3D3 (bass)
    bassPattern: project.session?.bassPattern || [],
    bassParams: project.session?.bassParams || {},
    // R1D1 (lead)
    leadPattern: project.session?.leadPattern || [],
    leadParams: project.session?.leadParams || {}
  };
}
function generateReadme(project, session) {
  const lines = [];
  const { hasDrums, hasBass, hasLead } = hasContent(session);
  lines.push(`# ${project.name}`);
  lines.push("");
  lines.push(`Created with [Jambot](https://github.com/bdecrem/jambot)`);
  lines.push("");
  lines.push("## Session");
  lines.push(`- **BPM**: ${session.bpm}`);
  lines.push(`- **Swing**: ${session.swing}%`);
  lines.push(`- **Bars**: ${session.bars || 2}`);
  lines.push("");
  lines.push("## Instruments");
  lines.push("");
  lines.push("### R9D9 (Drums)");
  if (hasDrums) {
    const drumPattern = session.drumPattern || {};
    for (const [voice, pattern] of Object.entries(drumPattern)) {
      const steps = pattern.map((s, i) => s?.velocity > 0 ? i : null).filter((i) => i !== null);
      if (steps.length > 0) {
        lines.push(`- ${voice}: steps ${steps.join(", ")}`);
      }
    }
    const drumParams = session.drumParams || {};
    for (const [voice, params] of Object.entries(drumParams)) {
      const tweaks = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(", ");
      if (tweaks) {
        lines.push(`- ${voice} tweaks: ${tweaks}`);
      }
    }
  } else {
    lines.push("- (not used)");
  }
  lines.push("");
  lines.push("### R3D3 (Bass)");
  if (hasBass) {
    const bassPattern = session.bassPattern || [];
    const activeNotes = bassPattern.filter((s) => s?.gate);
    const notes = activeNotes.map((s) => s.note);
    const uniqueNotes = [...new Set(notes)];
    lines.push(`- ${activeNotes.length} notes`);
    lines.push(`- Notes used: ${uniqueNotes.join(", ")}`);
    const bassParams = session.bassParams || {};
    const paramStr = Object.entries(bassParams).map(([k, v]) => `${k}=${v}`).join(", ");
    if (paramStr) {
      lines.push(`- Settings: ${paramStr}`);
    }
  } else {
    lines.push("- (not used)");
  }
  lines.push("");
  lines.push("### R1D1 (Lead)");
  if (hasLead) {
    const leadPattern = session.leadPattern || [];
    const activeNotes = leadPattern.filter((s) => s?.gate);
    const notes = activeNotes.map((s) => s.note);
    const uniqueNotes = [...new Set(notes)];
    lines.push(`- ${activeNotes.length} notes`);
    lines.push(`- Notes used: ${uniqueNotes.join(", ")}`);
    const leadParams = session.leadParams || {};
    const paramStr = Object.entries(leadParams).map(([k, v]) => `${k}=${v}`).join(", ");
    if (paramStr) {
      lines.push(`- Settings: ${paramStr}`);
    }
  } else {
    lines.push("- (not used)");
  }
  lines.push("");
  if (project.history && project.history.length > 0) {
    lines.push("## History");
    project.history.forEach((h, i) => {
      lines.push(`${i + 1}. "${h.prompt}"`);
    });
    lines.push("");
  }
  lines.push("## Files");
  lines.push(`- \`${project.name}.mid\` \u2014 Full arrangement (import into any DAW)`);
  if (hasDrums) lines.push("- `drums.mid` \u2014 Drum pattern only");
  if (hasBass) lines.push("- `bass.mid` \u2014 Bass pattern only");
  if (hasLead) lines.push("- `lead.mid` \u2014 Lead pattern only");
  lines.push("- `latest.wav` \u2014 Rendered mix");
  lines.push("");
  return lines.join("\n");
}
function exportProject(project, session) {
  const projectPath = join2(PROJECTS_DIR, project.folderName);
  const exportPath = join2(projectPath, "_source", "export");
  if (!existsSync2(exportPath)) {
    mkdirSync2(exportPath, { recursive: true });
  }
  const { hasDrums, hasBass, hasLead, any } = hasContent(session);
  const files = [];
  const readmePath = join2(exportPath, "README.md");
  writeFileSync3(readmePath, generateReadme(project, session));
  files.push("README.md");
  const exportSession = { ...session, name: project.name };
  if (any) {
    const fullMidiPath = join2(exportPath, `${project.name}.mid`);
    generateFullMidi(exportSession, fullMidiPath);
    files.push(`${project.name}.mid`);
  }
  if (hasDrums) {
    const drumsMidiPath = join2(exportPath, "drums.mid");
    generateDrumsMidi(exportSession, drumsMidiPath);
    files.push("drums.mid");
  }
  if (hasBass) {
    const bassMidiPath = join2(exportPath, "bass.mid");
    generateBassMidi(exportSession, bassMidiPath);
    files.push("bass.mid");
  }
  if (hasLead) {
    const leadMidiPath = join2(exportPath, "lead.mid");
    generateLeadMidi(exportSession, leadMidiPath);
    files.push("lead.mid");
  }
  const renders = project.renders || [];
  if (renders.length > 0) {
    const latestRender = renders[renders.length - 1];
    const srcPath = join2(projectPath, latestRender.file);
    const dstPath = join2(exportPath, "latest.wav");
    if (existsSync2(srcPath)) {
      copyFileSync2(srcPath, dstPath);
      files.push("latest.wav");
    }
  }
  return {
    path: exportPath,
    files
  };
}

// ui.tsx
function Splash() {
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column" }, /* @__PURE__ */ React.createElement(Text, null, SPLASH));
}
function SetupWizard({ onComplete }) {
  const [apiKey, setApiKey] = useState("");
  const [step, setStep] = useState("input");
  const [error, setError] = useState("");
  const handleSubmit = useCallback((value) => {
    const trimmed = value.trim();
    if (!trimmed.startsWith("sk-ant-")) {
      setError("Key should start with sk-ant-");
      return;
    }
    if (trimmed.length < 20) {
      setError("Key seems too short");
      return;
    }
    setApiKey(trimmed);
    setStep("confirm");
  }, []);
  const handleConfirm = useCallback((save) => {
    if (save) {
      saveApiKey(apiKey);
    } else {
      process.env.ANTHROPIC_API_KEY = apiKey;
    }
    onComplete();
  }, [apiKey, onComplete]);
  useInput((input, key) => {
    if (step === "confirm") {
      if (input.toLowerCase() === "y") {
        handleConfirm(true);
      } else if (input.toLowerCase() === "n") {
        handleConfirm(false);
      }
    }
  });
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", padding: 1 }, /* @__PURE__ */ React.createElement(Box, { borderStyle: "round", borderColor: "cyan", paddingX: 2, paddingY: 1, flexDirection: "column" }, /* @__PURE__ */ React.createElement(Text, { bold: true, color: "cyan" }, "Welcome to Jambot"), /* @__PURE__ */ React.createElement(Text, null, " "), step === "input" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Text, null, "To make beats, you need an Anthropic API key."), /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "Get one at: console.anthropic.com"), /* @__PURE__ */ React.createElement(Text, null, " "), error && /* @__PURE__ */ React.createElement(Text, { color: "red" }, error), /* @__PURE__ */ React.createElement(Box, null, /* @__PURE__ */ React.createElement(Text, null, "Paste your key: "), /* @__PURE__ */ React.createElement(
    TextInput,
    {
      value: apiKey,
      onChange: setApiKey,
      onSubmit: handleSubmit,
      mask: "*"
    }
  ))), step === "confirm" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Text, { color: "green" }, "Key accepted."), /* @__PURE__ */ React.createElement(Text, null, " "), /* @__PURE__ */ React.createElement(Text, null, "Save to ", getApiKeyPath(), " so you don't have to enter it again?"), /* @__PURE__ */ React.createElement(Text, null, " "), /* @__PURE__ */ React.createElement(Text, { bold: true }, "(y/n) "))));
}
function Messages({ messages, maxHeight }) {
  const visibleMessages = messages.slice(-maxHeight);
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", flexGrow: 1 }, visibleMessages.map((msg, i) => /* @__PURE__ */ React.createElement(MessageLine, { key: i, message: msg })));
}
function MessageLine({ message }) {
  switch (message.type) {
    case "user":
      return /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "> ", message.text);
    case "tool":
      return /* @__PURE__ */ React.createElement(Text, { color: "cyan" }, "  ", message.text);
    case "result":
      return /* @__PURE__ */ React.createElement(Text, { color: "gray" }, "     ", message.text);
    case "response":
      return /* @__PURE__ */ React.createElement(Text, null, message.text);
    case "info":
      return /* @__PURE__ */ React.createElement(Text, null, message.text);
    case "system":
      return /* @__PURE__ */ React.createElement(Text, { color: "yellow" }, message.text);
    case "project":
      return /* @__PURE__ */ React.createElement(Text, { color: "green" }, message.text);
    default:
      return /* @__PURE__ */ React.createElement(Text, null, message.text);
  }
}
function Autocomplete({ suggestions, selectedIndex }) {
  if (suggestions.length === 0) return null;
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", marginBottom: 1 }, suggestions.map((cmd, i) => /* @__PURE__ */ React.createElement(Box, { key: cmd.name }, /* @__PURE__ */ React.createElement(Text, { inverse: i === selectedIndex }, `  ${cmd.name.padEnd(12)} ${cmd.description}`))));
}
function InputBar({ value, onChange, onSubmit, isProcessing, suggestions, selectedIndex, onSelectSuggestion }) {
  useInput((input, key) => {
    if (isProcessing) return;
    if (key.tab && suggestions.length > 0) {
      onSelectSuggestion(suggestions[selectedIndex].name);
    }
  });
  return /* @__PURE__ */ React.createElement(Box, null, /* @__PURE__ */ React.createElement(Text, { color: "green" }, "> "), isProcessing ? /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "thinking...") : /* @__PURE__ */ React.createElement(
    TextInput,
    {
      value,
      onChange,
      onSubmit,
      placeholder: ""
    }
  ));
}
function StatusBar({ session, project }) {
  const voices = Object.keys(session?.pattern || {});
  const voiceList = voices.length > 0 ? voices.join(",") : "empty";
  const swing = session?.swing > 0 ? ` swing ${session.swing}%` : "";
  const version = project ? ` v${(project.renders?.length || 0) + 1}` : "";
  const projectName = project ? project.name : "(no project)";
  const bpm = session?.bpm || 128;
  return /* @__PURE__ */ React.createElement(Box, null, /* @__PURE__ */ React.createElement(Text, { dimColor: true }, projectName, version, " | ", bpm, " BPM ", voiceList, swing));
}
function SlashMenu({ onSelect, onCancel, selectedIndex }) {
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", borderStyle: "single", paddingX: 1 }, /* @__PURE__ */ React.createElement(Text, { bold: true }, "Commands"), /* @__PURE__ */ React.createElement(Text, null, " "), SLASH_COMMANDS.map((cmd, i) => /* @__PURE__ */ React.createElement(Box, { key: cmd.name }, /* @__PURE__ */ React.createElement(Text, { inverse: i === selectedIndex }, `  ${cmd.name.padEnd(12)} ${cmd.description}`))), /* @__PURE__ */ React.createElement(Text, null, " "), /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "  Enter to select, Esc to cancel"));
}
function ProjectList({ projects, selectedIndex, onSelect, onCancel }) {
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });
  if (projects.length === 0) {
    return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", borderStyle: "single", paddingX: 1 }, /* @__PURE__ */ React.createElement(Text, { bold: true }, "Projects"), /* @__PURE__ */ React.createElement(Text, null, " "), /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "  No projects yet. Start making beats!"), /* @__PURE__ */ React.createElement(Text, null, " "), /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "  Press Esc to close"));
  }
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", borderStyle: "single", paddingX: 1 }, /* @__PURE__ */ React.createElement(Text, { bold: true }, "Projects"), /* @__PURE__ */ React.createElement(Text, null, " "), projects.slice(0, 10).map((p, i) => /* @__PURE__ */ React.createElement(Box, { key: p.folderName }, /* @__PURE__ */ React.createElement(Text, { inverse: i === selectedIndex }, `  ${p.name.padEnd(20)} ${p.bpm} BPM  ${p.renderCount} renders`))), /* @__PURE__ */ React.createElement(Text, null, " "), /* @__PURE__ */ React.createElement(Text, { dimColor: true }, "  Enter to open, Esc to cancel"));
}
function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [needsSetup, setNeedsSetup] = useState(() => !getApiKey());
  const [input, setInput] = useState("");
  const [session, setSession] = useState(createSession());
  const [agentMessages, setAgentMessages] = useState([]);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const [projectListIndex, setProjectListIndex] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [project, setProject] = useState(null);
  const [projectsList, setProjectsList] = useState([]);
  const firstPromptRef = useRef(null);
  const terminalHeight = stdout?.rows || 24;
  const reservedLines = 4;
  const maxMessageHeight = Math.max(5, terminalHeight - reservedLines);
  useEffect(() => {
    ensureDirectories();
  }, []);
  useEffect(() => {
    if (input.startsWith("/") && input.length > 1 && !showMenu && !showProjectList) {
      const parts = input.split(" ");
      const cmd = parts[0].toLowerCase();
      if (cmd === "/open" || cmd === "/new") {
        setSuggestions([]);
      } else {
        const matches = SLASH_COMMANDS.filter(
          (c) => c.name.toLowerCase().startsWith(input.toLowerCase())
        );
        setSuggestions(matches);
        setSuggestionIndex(0);
      }
    } else {
      setSuggestions([]);
    }
  }, [input, showMenu, showProjectList]);
  useInput((char, key) => {
    if (isProcessing) return;
    if (showProjectList) {
      if (key.upArrow) {
        setProjectListIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setProjectListIndex((i) => Math.min(projectsList.length - 1, i + 1));
      } else if (key.return && projectsList.length > 0) {
        openProject(projectsList[projectListIndex].folderName);
        setShowProjectList(false);
      } else if (key.escape) {
        setShowProjectList(false);
      }
      return;
    }
    if (showMenu) {
      if (key.upArrow) {
        setMenuIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow) {
        setMenuIndex((i) => Math.min(SLASH_COMMANDS.length - 1, i + 1));
      } else if (key.return) {
        handleSlashCommand(SLASH_COMMANDS[menuIndex].name);
        setShowMenu(false);
      } else if (key.escape) {
        setShowMenu(false);
      }
      return;
    }
    if (suggestions.length > 0) {
      if (key.upArrow) {
        setSuggestionIndex((i) => Math.max(0, i - 1));
        return;
      } else if (key.downArrow) {
        setSuggestionIndex((i) => Math.min(suggestions.length - 1, i + 1));
        return;
      } else if (key.escape) {
        setSuggestions([]);
        return;
      }
    }
    if (key.ctrl && char === "c") {
      exit();
    }
  });
  const addMessage = useCallback((type, text) => {
    setDisplayMessages((prev) => [...prev, { type, text }]);
  }, []);
  const startNewProject = useCallback((name = null) => {
    if (name) {
      const newProject = createProject(name, session);
      setProject(newProject);
      addMessage("project", `Created project: ${newProject.name}`);
      addMessage("project", `  ${JAMBOT_HOME}/projects/${newProject.folderName}`);
    } else {
      setProject(null);
      firstPromptRef.current = null;
    }
    const newSession = createSession();
    setSession(newSession);
    setAgentMessages([]);
  }, [session, addMessage]);
  const openProject = useCallback((folderName) => {
    try {
      const loadedProject = loadProject(folderName);
      setProject(loadedProject);
      const restoredSession = restoreSession(loadedProject);
      setSession(restoredSession);
      setAgentMessages([]);
      addMessage("project", `Opened project: ${loadedProject.name}`);
      const renderCount = loadedProject.renders?.length || 0;
      if (renderCount > 0) {
        addMessage("project", `  ${renderCount} render${renderCount !== 1 ? "s" : ""}, last: v${renderCount}.wav`);
      }
    } catch (err) {
      addMessage("system", `Error opening project: ${err.message}`);
    }
  }, [addMessage]);
  const showProjects = useCallback(() => {
    const projects = listProjects();
    setProjectsList(projects);
    setProjectListIndex(0);
    setShowProjectList(true);
  }, []);
  const ensureProject = useCallback((prompt, currentSession) => {
    if (project) return project;
    const bpm = currentSession?.bpm || session.bpm;
    const name = extractProjectName(prompt, bpm);
    const newProject = createProject(name, currentSession || session, prompt);
    setProject(newProject);
    addMessage("project", `New project: ${newProject.name}`);
    addMessage("project", `  ~/Documents/Jambot/projects/${newProject.folderName}/`);
    return newProject;
  }, [project, session, addMessage]);
  const handleSlashCommand = useCallback((cmd, args = "") => {
    setShowSplash(false);
    setSuggestions([]);
    switch (cmd) {
      case "/exit":
        if (project) {
          updateSession(project, session);
        }
        exit();
        break;
      case "/new":
        startNewProject(args || null);
        if (!args) {
          addMessage("system", "New session started. Project will be created on first render.");
        }
        break;
      case "/open":
        if (args) {
          const projects = listProjects();
          const found = projects.find(
            (p) => p.folderName.toLowerCase().includes(args.toLowerCase()) || p.name.toLowerCase().includes(args.toLowerCase())
          );
          if (found) {
            openProject(found.folderName);
          } else {
            addMessage("system", `Project not found: ${args}`);
          }
        } else {
          showProjects();
        }
        break;
      case "/projects":
        showProjects();
        break;
      case "/clear":
        const newSession = createSession();
        setSession(newSession);
        setAgentMessages([]);
        setDisplayMessages([]);
        if (project) {
          addMessage("system", `Session cleared (project: ${project.name})`);
        } else {
          addMessage("system", "Session cleared");
        }
        break;
      case "/status":
        const voices = Object.keys(session.pattern);
        const voiceList = voices.length > 0 ? voices.join(", ") : "(empty)";
        const tweaks = Object.keys(session.voiceParams);
        let statusText = "";
        if (project) {
          statusText += `Project: ${project.name}
`;
          statusText += `  ${JAMBOT_HOME}/projects/${project.folderName}
`;
          statusText += `  Renders: ${project.renders?.length || 0}
`;
        } else {
          statusText += `Project: (none - will create on first render)
`;
        }
        statusText += `Session: ${session.bpm} BPM`;
        if (session.swing > 0) statusText += `, swing ${session.swing}%`;
        statusText += `
Drums: ${voiceList}`;
        if (tweaks.length > 0) {
          statusText += `
Tweaks: ${tweaks.map((v) => `${v}(${Object.keys(session.voiceParams[v]).join(",")})`).join(", ")}`;
        }
        addMessage("info", statusText);
        break;
      case "/help":
        addMessage("info", HELP_TEXT);
        break;
      case "/changelog":
        addMessage("info", CHANGELOG_TEXT);
        break;
      case "/r9d9":
      case "/909":
        addMessage("info", R9D9_GUIDE);
        break;
      case "/r3d3":
      case "/303":
        addMessage("info", R3D3_GUIDE);
        break;
      case "/r1d1":
      case "/101":
        addMessage("info", R1D1_GUIDE);
        break;
      case "/export":
        if (!project) {
          addMessage("system", "No project to export. Create a beat first!");
          break;
        }
        if (!project.renders || project.renders.length === 0) {
          addMessage("system", "No renders yet. Make a beat and render it first!");
          break;
        }
        try {
          const exportResult = exportProject(project, session);
          addMessage("project", `Exported to ${project.folderName}/_source/export/`);
          for (const file of exportResult.files) {
            addMessage("project", `  ${file}`);
          }
          addMessage("system", `Open folder: ${exportResult.path}`);
        } catch (err) {
          addMessage("system", `Export failed: ${err.message}`);
        }
        break;
      default:
        addMessage("system", `Unknown command: ${cmd}`);
    }
  }, [session, project, exit, addMessage, startNewProject, openProject, showProjects]);
  const handleSubmit = useCallback(async (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setInput("");
    setShowSplash(false);
    setSuggestions([]);
    if (trimmed === "/") {
      setShowMenu(true);
      setMenuIndex(0);
      return;
    }
    if (trimmed.startsWith("/")) {
      const parts = trimmed.split(" ");
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(" ");
      if (cmd === "/new" || cmd === "/open") {
        handleSlashCommand(cmd, args);
        return;
      }
      if (suggestions.length > 0) {
        handleSlashCommand(suggestions[suggestionIndex].name);
      } else {
        const cmdMatch = SLASH_COMMANDS.find((c) => c.name === cmd);
        if (cmdMatch) {
          handleSlashCommand(cmdMatch.name);
        } else {
          addMessage("system", `Unknown command: ${trimmed}`);
        }
      }
      return;
    }
    if (!project && !firstPromptRef.current) {
      firstPromptRef.current = trimmed;
    }
    addMessage("user", trimmed);
    setIsProcessing(true);
    let currentProject = project;
    let renderInfo = null;
    try {
      await runAgentLoop(
        trimmed,
        session,
        agentMessages,
        {
          onTool: (name, input2) => {
            addMessage("tool", `${name}`);
          },
          onToolResult: (result) => {
            addMessage("result", result);
          },
          onResponse: (text) => {
            addMessage("response", text);
          }
        },
        {
          // Called before render to get the path
          getRenderPath: () => {
            currentProject = ensureProject(firstPromptRef.current || trimmed, session);
            renderInfo = getRenderPath(currentProject);
            return renderInfo.fullPath;
          },
          // Called after render completes
          onRender: (info) => {
            if (currentProject && renderInfo) {
              recordRender(currentProject, {
                ...renderInfo,
                bars: info.bars,
                bpm: info.bpm
              });
              setProject({ ...currentProject });
              addMessage("project", `  Saved as v${renderInfo.version}.wav`);
            }
          },
          // Called to rename project
          onRename: (newName) => {
            if (!currentProject && !project) {
              return { error: "No project to rename. Create a beat first." };
            }
            const targetProject = currentProject || project;
            const result = renameProject(targetProject, newName);
            setProject({ ...targetProject });
            addMessage("project", `  Renamed to "${newName}"`);
            return result;
          }
        }
      );
      if (currentProject) {
        addToHistory(currentProject, trimmed);
        updateSession(currentProject, session);
        setProject({ ...currentProject });
      }
      setSession({ ...session });
    } catch (err) {
      addMessage("system", `Error: ${err.message}`);
    }
    setIsProcessing(false);
  }, [session, agentMessages, project, suggestions, suggestionIndex, handleSlashCommand, addMessage, ensureProject]);
  const handleSelectSuggestion = useCallback((name) => {
    setInput(name);
    setSuggestions([]);
  }, []);
  if (needsSetup) {
    return /* @__PURE__ */ React.createElement(SetupWizard, { onComplete: () => setNeedsSetup(false) });
  }
  return /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", height: terminalHeight }, /* @__PURE__ */ React.createElement(Box, { flexDirection: "column", flexGrow: 1 }, showSplash ? /* @__PURE__ */ React.createElement(Splash, null) : showProjectList ? /* @__PURE__ */ React.createElement(
    ProjectList,
    {
      projects: projectsList,
      selectedIndex: projectListIndex,
      onSelect: openProject,
      onCancel: () => setShowProjectList(false)
    }
  ) : showMenu ? /* @__PURE__ */ React.createElement(
    SlashMenu,
    {
      onSelect: handleSlashCommand,
      onCancel: () => setShowMenu(false),
      selectedIndex: menuIndex
    }
  ) : /* @__PURE__ */ React.createElement(Messages, { messages: displayMessages, maxHeight: maxMessageHeight })), /* @__PURE__ */ React.createElement(
    Autocomplete,
    {
      suggestions,
      selectedIndex: suggestionIndex
    }
  ), /* @__PURE__ */ React.createElement(
    InputBar,
    {
      value: input,
      onChange: setInput,
      onSubmit: handleSubmit,
      isProcessing,
      suggestions,
      selectedIndex: suggestionIndex,
      onSelectSuggestion: handleSelectSuggestion
    }
  ), /* @__PURE__ */ React.createElement(StatusBar, { session, project }));
}
render(/* @__PURE__ */ React.createElement(App, null));
