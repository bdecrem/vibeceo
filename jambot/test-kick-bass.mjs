import { createHeadless } from './headless.js';

const jb = await createHeadless({ bpm: 128, outputDir: '.' });

// Four-on-the-floor kick
await jb.tool('add_jb01', { kick: [0, 4, 8, 12] });

// Simple bass: 4 A notes on quarter notes
await jb.tool('add_jb202', {
  pattern: [
    { note: 'A1', gate: true, accent: false, slide: false },
    { note: 'A1', gate: false, accent: false, slide: false },
    { note: 'A1', gate: false, accent: false, slide: false },
    { note: 'A1', gate: false, accent: false, slide: false },
    { note: 'A1', gate: true, accent: false, slide: false },
    { note: 'A1', gate: false, accent: false, slide: false },
    { note: 'A1', gate: false, accent: false, slide: false },
    { note: 'A1', gate: false, accent: false, slide: false },
    { note: 'A1', gate: true, accent: false, slide: false },
    { note: 'A1', gate: false, accent: false, slide: false },
    { note: 'A1', gate: false, accent: false, slide: false },
    { note: 'A1', gate: false, accent: false, slide: false },
    { note: 'A1', gate: true, accent: false, slide: false },
    { note: 'A1', gate: false, accent: false, slide: false },
    { note: 'A1', gate: false, accent: false, slide: false },
    { note: 'A1', gate: false, accent: false, slide: false },
  ],
});

// Render 4 bars
const result = await jb.render('kick-bass-test', 4);
console.log(result);
