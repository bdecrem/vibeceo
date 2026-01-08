# Project: Directory Setup

## Context
Set up the mixer directory structure. Unlike 909/303/101, mixer doesn't need voice synthesis code — it only needs routing and effects infrastructure.

## Tasks
- [ ] Create `dist/` directory structure
- [ ] Create `dist/effects/base.js` — Effect base class
- [ ] Create `impulses/` directory for reverb IRs
- [ ] Create `index.html` — Simple test page
- [ ] Verify ES module imports work

## Files
- `dist/effects/base.js` — Effect base class (input/output/setParameter)
- `impulses/.gitkeep` — Placeholder for IR files
- `index.html` — Test harness

## Effect Base Class Design
```javascript
export class Effect {
  constructor(context) {
    this.context = context;
    this._input = context.createGain();
    this._output = context.createGain();
    this._bypass = false;
  }

  get input() { return this._input; }
  get output() { return this._output; }

  setParameter(name, value) { /* override */ }
  getParameters() { /* override */ }
  setPreset(presetId) { /* override */ }

  set bypass(value) {
    this._bypass = value;
    // Reconnect input directly to output if bypassed
  }
}
```

## Completion Criteria
- [ ] Directory structure exists
- [ ] Effect base class exports correctly
- [ ] Test page loads without errors
