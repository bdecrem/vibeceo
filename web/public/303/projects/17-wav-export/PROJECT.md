# Project: WAV Export

## Context
Enable exporting TB-303 patterns as WAV audio files, using the shared OutputManager from core.

## Tasks
- [ ] Add export button to UI
- [ ] Implement renderPattern() in TB303Engine
- [ ] Use OutputManager.renderOffline()
- [ ] Convert AudioBuffer to WAV blob
- [ ] Trigger download of WAV file
- [ ] Allow setting export duration (bars)
- [ ] Show progress indicator during render
- [ ] Handle errors gracefully

## Implementation
```javascript
async function exportPattern() {
  const bars = 4; // or from UI
  const buffer = await engine.renderPattern({ bars });
  const wavBlob = engine.audioBufferToBlob(buffer);

  const url = URL.createObjectURL(wavBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tb303-pattern.wav';
  a.click();
  URL.revokeObjectURL(url);
}
```

## Completion Criteria
- [ ] Export button works
- [ ] Downloaded WAV plays correctly
- [ ] Pattern sounds same as live playback
- [ ] No UI freeze during export

## Files
- `dist/machines/tb303/engine.js` (renderPattern)
- `dist/ui/tb303/app.js` (export button)
