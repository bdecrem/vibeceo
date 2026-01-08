# R9-DS Sampler

A sample-based drum machine with 10 slots, 6 parameters per slot, and a 16-step sequencer.

**Live demo:** `/90s/ui/r9ds/index.html`

## Features

- **10 sample slots** (s1-s10)
- **6 knobs per slot:** Level, Tune, Attack, Decay, Filter, Pan
- **Kit system:** Load different sample kits
- **16-step sequencer** with swing
- **Offline rendering:** Export patterns to WAV
- **API access** for programmatic control

---

## Adding a New Kit

Anyone can add a new kit by creating a folder with samples and metadata. No code changes required.

### Step 1: Create the kit folder

```
/90s/kits/
  mykit/
    kit.json
    samples/
      s1.wav
      s2.wav
      s3.wav
      s4.wav
      s5.wav
      s6.wav
      s7.wav
      s8.wav
      s9.wav
      s10.wav
```

### Step 2: Create kit.json

```json
{
  "name": "My Custom Kit",
  "slots": [
    { "id": "s1", "name": "Kick", "short": "KK" },
    { "id": "s2", "name": "Snare", "short": "SN" },
    { "id": "s3", "name": "Clap", "short": "CP" },
    { "id": "s4", "name": "Closed Hat", "short": "CH" },
    { "id": "s5", "name": "Open Hat", "short": "OH" },
    { "id": "s6", "name": "Tom Low", "short": "TL" },
    { "id": "s7", "name": "Tom Mid", "short": "TM" },
    { "id": "s8", "name": "Crash", "short": "CR" },
    { "id": "s9", "name": "Ride", "short": "RD" },
    { "id": "s10", "name": "Cowbell", "short": "CB" }
  ]
}
```

- **name**: Display name in the kit selector
- **slots**: Array of 10 slot definitions
  - **id**: Must be `s1` through `s10`
  - **name**: Full instrument name (shown in voice panel)
  - **short**: 2-letter abbreviation (shown in sequencer grid)

### Step 3: Add samples

Place WAV files in the `samples/` folder:
- Files must be named `s1.wav`, `s2.wav`, ... `s10.wav`
- WAV format (44.1kHz or 48kHz, 16-bit or 24-bit)
- Mono or stereo

### Step 4: Register the kit

Add your kit to `/90s/kits/index.json`:

```json
{
  "kits": [
    { "id": "808", "name": "808 Kit", "path": "/90s/kits/808" },
    { "id": "acoustic", "name": "Acoustic Kit", "path": "/90s/kits/acoustic" },
    { "id": "lofi", "name": "Lo-Fi Kit", "path": "/90s/kits/lofi" },
    { "id": "mykit", "name": "My Custom Kit", "path": "/90s/kits/mykit" }
  ]
}
```

- **id**: Unique identifier (used in API)
- **name**: Display name
- **path**: Path to kit folder (relative to web root)

---

## Voice Parameters

Each sample slot has 6 adjustable parameters:

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| **Level** | 0-100% | 80% | Volume |
| **Tune** | -12 to +12 | 0 | Pitch shift in semitones |
| **Attack** | 0-100% | 0% | Fade-in time (0=instant, 100%=1 second) |
| **Decay** | 0-100% | 100% | Sample length (percentage of original) |
| **Filter** | 100Hz-20kHz | 20kHz | Lowpass filter cutoff |
| **Pan** | L/C/R | C | Stereo position |

---

## API Usage

### Quick Render

```javascript
import { renderR9DSPatternToWav } from '/90s/dist/api/index.js';

const pattern = {
  s1: [{ velocity: 0.8 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
       { velocity: 0.8 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
       { velocity: 0.8 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
       { velocity: 0.8 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 }],
  s2: [{ velocity: 0 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
       { velocity: 1.0 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
       { velocity: 0 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 },
       { velocity: 1.0 }, { velocity: 0 }, { velocity: 0 }, { velocity: 0 }]
};

const { wav } = await renderR9DSPatternToWav(pattern, {
  kit: '808',
  bpm: 120,
  bars: 2
});
```

### Controller for Full Control

```javascript
import { R9DSController } from '/90s/dist/api/index.js';

const ctrl = new R9DSController();

// Load a kit
await ctrl.loadKit('808');

// Set voice parameters
ctrl.setVoiceParameter('s1', 'filter', 0.5);  // darken the kick
ctrl.setVoiceParameter('s1', 'tune', -2);     // pitch down 2 semitones

// Set pattern
ctrl.setPattern({
  s1: [{ velocity: 0.8 }, ...],
  s2: [{ velocity: 0 }, ...]
});

// Play/stop
ctrl.play();
ctrl.stop();

// Export to WAV
const { wav } = await ctrl.exportCurrentPatternToWav({ bpm: 120, bars: 4 });
```

### Pattern Format

```javascript
{
  "s1": [{ velocity: 0.8 }, { velocity: 0 }, ...],  // 16 steps
  "s2": [{ velocity: 0, accent: true }, ...],       // accent = full velocity
  ...
}
```

- **velocity**: 0 = off, 0.1-0.9 = normal, 1.0 = accent
- **accent**: true for accented hits

---

## File Structure

```
/90s/
  dist/
    api/
      index.js          # API exports
    core/
      sequencer.js      # Step sequencer
      output.js         # WAV rendering
    sampler/
      engine.js         # R9DSEngine
      sample-voice.js   # SampleVoice class
      kit-loader.js     # Kit loading
    ui/
      r9ds/
        app.js          # UI logic
  kits/
    index.json          # Kit manifest
    808/
      kit.json
      samples/
    acoustic/
    lofi/
  ui/
    r9ds/
      index.html        # Web app
      styles.css        # Crimson Edition theme
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Stop |
| 1-9, 0 | Trigger samples s1-s10 |

---

## Credits

808 samples from [tidalcycles/Dirt-Samples](https://github.com/tidalcycles/Dirt-Samples) (public domain / CC0)

---

## License

MIT - Do whatever you want.

---

*Built by [Kochi.to](https://kochi.to).*
