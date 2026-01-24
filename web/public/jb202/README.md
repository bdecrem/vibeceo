# JB202 - Modular Bass Monosynth

A 2-oscillator bass synthesizer with custom DSP components that produce **identical output** across all platforms.

## Why JB202?

The JB200 uses Web Audio's built-in oscillators and filters, which behave differently across browsers and don't work in Node.js. The JB202 implements all DSP in pure JavaScript:

- **Cross-platform consistency**: Same audio output in Chrome, Firefox, Safari, and Node.js
- **Offline rendering**: Generate WAV files without a browser
- **Modular components**: Reusable oscillators, filters, envelopes, and effects

## Architecture

```
jb202/dist/
├── index.js                    # Main library export
├── dsp/                        # Modular DSP components
│   ├── oscillators/
│   │   ├── base.js            # Oscillator base class
│   │   ├── sawtooth.js        # Band-limited sawtooth (PolyBLEP)
│   │   ├── square.js          # Band-limited square/pulse
│   │   └── triangle.js        # Triangle wave
│   ├── filters/
│   │   ├── biquad.js          # Biquad filter (LP/HP/BP)
│   │   └── lowpass24.js       # 24dB/oct lowpass (2x cascaded)
│   ├── envelopes/
│   │   └── adsr.js            # ADSR envelope generator
│   ├── effects/
│   │   └── drive.js           # Soft-clip saturation
│   └── utils/
│       ├── math.js            # DSP math utilities
│       └── note.js            # MIDI/note conversion
└── machines/jb202/
    ├── engine.js              # Main synth engine
    └── sequencer.js           # 16-step sequencer
```

## Usage

### Browser (Web Audio)

```javascript
import { JB202Engine } from './jb202/dist/index.js';

// Create engine with Web Audio context
const synth = new JB202Engine({
  context: new AudioContext(),
  bpm: 128
});

// Configure sound
synth.setParameter('filterCutoff', 0.4);
synth.setParameter('filterResonance', 0.6);
synth.setParameter('drive', 0.5);
synth.setOsc1Waveform('sawtooth');
synth.setOsc2Waveform('square');

// Set pattern
synth.setPattern([
  { note: 'C2', gate: true, accent: true, slide: false },
  { note: 'C2', gate: false, accent: false, slide: false },
  { note: 'D#2', gate: true, accent: false, slide: false },
  // ... 16 steps total
]);

// Play
synth.startSequencer();

// Stop
synth.stopSequencer();
```

### Node.js (Offline Rendering)

```javascript
import { JB202Engine } from './jb202/dist/index.js';
import { writeFileSync } from 'fs';

const synth = new JB202Engine({ sampleRate: 44100, bpm: 130 });

// Configure and set pattern...
synth.setParameter('filterCutoff', 0.5);
synth.setPattern([...]);

// Render to buffer
const buffer = await synth.renderPattern({ bars: 4 });

// buffer.getChannelData(0) contains Float32Array of samples
// Convert to WAV and save...
```

### Using DSP Components Directly

```javascript
import {
  SawtoothOscillator,
  Lowpass24Filter,
  ADSREnvelope,
  Drive
} from './jb202/dist/dsp/index.js';

// Create a sawtooth oscillator
const osc = new SawtoothOscillator(44100);
osc.setFrequency(110); // A2

// Create a filter
const filter = new Lowpass24Filter(44100);
filter.setParameters(800, 60); // 800Hz cutoff, 60% resonance

// Create an envelope
const env = new ADSREnvelope(44100);
env.setParameters(0, 40, 20, 30); // Attack, Decay, Sustain, Release

// Create drive
const drive = new Drive(44100);
drive.setAmount(50);

// Process audio
const samples = new Float32Array(44100);
osc.process(samples);
filter.process(samples);
drive.process(samples);
```

## API (JB200 Compatible)

### Engine Methods

| Method | Description |
|--------|-------------|
| `setParameter(id, value)` | Set parameter by ID |
| `getParameter(id)` | Get parameter value |
| `getParameters()` | Get all parameters |
| `setOsc1Waveform(type)` | Set oscillator 1 waveform |
| `setOsc2Waveform(type)` | Set oscillator 2 waveform |
| `setBpm(bpm)` | Set tempo |
| `getBpm()` | Get tempo |
| `setPattern(pattern)` | Set sequencer pattern |
| `getPattern()` | Get sequencer pattern |
| `startSequencer()` | Start real-time playback |
| `stopSequencer()` | Stop playback |
| `renderPattern(options)` | Render to buffer (async) |
| `playNote(note, accent, slide)` | Play single note |

### Parameters

| Parameter | Range (Engine) | Description |
|-----------|---------------|-------------|
| `osc1Waveform` | sawtooth/square/triangle | Oscillator 1 type |
| `osc1Octave` | -24 to +24 | Oscillator 1 octave (semitones) |
| `osc1Detune` | 0-1 (0.5 = center) | Oscillator 1 fine tune |
| `osc1Level` | 0-1 | Oscillator 1 volume |
| `osc2Waveform` | sawtooth/square/triangle | Oscillator 2 type |
| `osc2Octave` | -24 to +24 | Oscillator 2 octave |
| `osc2Detune` | 0-1 | Oscillator 2 fine tune |
| `osc2Level` | 0-1 | Oscillator 2 volume |
| `filterCutoff` | 0-1 (log, 20-16000Hz) | Filter frequency |
| `filterResonance` | 0-1 | Filter Q |
| `filterEnvAmount` | 0-1 (0.5 = center) | Envelope depth |
| `filterAttack` | 0-1 | Filter env attack |
| `filterDecay` | 0-1 | Filter env decay |
| `filterSustain` | 0-1 | Filter env sustain |
| `filterRelease` | 0-1 | Filter env release |
| `ampAttack` | 0-1 | Amp env attack |
| `ampDecay` | 0-1 | Amp env decay |
| `ampSustain` | 0-1 | Amp env sustain |
| `ampRelease` | 0-1 | Amp env release |
| `drive` | 0-1 | Saturation amount |
| `level` | 0-1 | Output volume |

## DSP Components

### Oscillators

All oscillators use **PolyBLEP** anti-aliasing for band-limited waveforms:

- `SawtoothOscillator` - Classic sawtooth
- `SquareOscillator` - Square/pulse (adjustable width)
- `TriangleOscillator` - Smooth triangle

### Filters

- `BiquadFilter` - Single-stage biquad (LP/HP/BP)
- `Lowpass24Filter` - 4-pole (24dB/oct) lowpass

### Envelopes

- `ADSREnvelope` - Standard ADSR with linear attack, exponential decay/release

### Effects

- `Drive` - Soft-clipping waveshaper with multiple modes (soft, hard, tube, foldback)

## Building New Synths

The DSP components are designed to be mixed and matched:

```javascript
import {
  SquareOscillator,
  BiquadFilter,
  ADSREnvelope,
  Drive
} from './jb202/dist/dsp/index.js';

class MySynth {
  constructor(sampleRate) {
    this.osc = new SquareOscillator(sampleRate);
    this.filter = new BiquadFilter(sampleRate);
    this.env = new ADSREnvelope(sampleRate);
    this.drive = new Drive(sampleRate);

    this.filter.setHighpass(200, 1);
    this.drive.setType('tube');
  }

  render(freq, duration, sampleRate) {
    const samples = Math.ceil(duration * sampleRate);
    const output = new Float32Array(samples);

    this.osc.setFrequency(freq);
    this.osc.reset();
    this.env.trigger(1);

    for (let i = 0; i < samples; i++) {
      let sample = this.osc._generateSample();
      this.osc._advancePhase();

      sample = this.filter.processSample(sample);
      sample *= this.env.processSample();
      sample = this.drive.processSample(sample);

      output[i] = sample;

      if (i === Math.floor(samples * 0.8)) {
        this.env.gateOff();
      }
    }

    return output;
  }
}
```
