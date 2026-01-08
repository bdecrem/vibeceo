# Project: Session Class

## Context
The main orchestration class. Manages shared AudioContext, BPM sync, channel routing, effects chains, and combined rendering. This is what ties everything together.

## Tasks
- [ ] Create `dist/session.js`
- [ ] Implement channel management (add instruments, get channels)
- [ ] Implement master bus with effects chain
- [ ] Implement `render()` — combined multi-track render to WAV
- [ ] Handle BPM sync across all instruments
- [ ] Test with 909 + 303 + effects → single WAV

## Class Design
```javascript
export class Session {
  constructor(options = {}) {
    this.context = new AudioContext();
    this.bpm = options.bpm || 120;
    this.channels = new Map();
    this.master = new MasterBus(this.context);
  }

  add(name, controller) {
    // Inject our AudioContext into controller
    // Create channel with effects chain
    // Connect to master
  }

  channel(name) {
    // Return channel wrapper for adding effects
  }

  setBpm(bpm) {
    // Update all instruments
  }

  play() {
    // Start all sequencers in sync
  }

  stop() {
    // Stop all sequencers
  }

  async render(options = {}) {
    // Offline render all instruments + effects to single buffer
    // Return { buffer, wav }
  }
}
```

## Channel Wrapper
```javascript
class Channel {
  constructor(context, controller, masterInput) {
    this.controller = controller;
    this.effects = [];
    this.gain = context.createGain();
    // Wire: controller.output → effects chain → gain → masterInput
  }

  duck(options) {
    const ducker = new Ducker(this.context);
    // Configure and insert into chain
  }

  eq(options) {
    const eq = new EQ(this.context);
    // Configure and insert into chain
  }

  reverb(options) {
    const reverb = new Reverb(this.context);
    // Configure and insert into chain
  }
}
```

## Offline Rendering
For `render()`, need to:
1. Create `OfflineAudioContext` with correct duration
2. Clone/recreate all routing in offline context
3. Trigger all patterns to play
4. Wait for completion
5. Convert to WAV

This is the tricky part — existing controllers may not support injecting a different AudioContext. May need to:
- Have controllers expose a `renderPattern()` method that takes context
- Or render each instrument separately and mix offline

## API
```javascript
const session = new Session({ bpm: 128 });

session.add('drums', new TR909Controller());
session.add('bass', new TB303Controller());

session.channel('bass').duck({ trigger: 'drums.kick', amount: 0.6 });
session.channel('bass').eq({ preset: 'acidBass' });
session.master.reverb({ preset: 'plate', mix: 0.15 });

// Live playback
session.play();
session.stop();

// Offline render
const { wav } = await session.render({ bars: 8 });
```

## Completion Criteria
- [ ] Can add multiple instruments
- [ ] Effects chain works on channels
- [ ] Master bus effects work
- [ ] `render()` produces combined WAV
- [ ] BPM stays in sync
