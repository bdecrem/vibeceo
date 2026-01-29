import { chromium } from 'playwright';

// Use Chromium for testing
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

page.on('console', msg => {
  console.log(`[${msg.type()}]`, msg.text());
});

page.on('pageerror', err => {
  console.log('[PAGE ERROR]', err.message);
});

console.log('Loading 909 in Safari/WebKit...');
await page.goto('http://localhost:3000/909/', { waitUntil: 'networkidle' });
await page.waitForSelector('#play-toggle', { timeout: 10000 });
console.log('Page loaded\n');

// Helper to get engine state
async function getState(label) {
  const state = await page.evaluate(() => {
    const e = window.engine;
    if (!e) return { error: 'no engine' };

    // Check voice instances
    const voiceInfo = {};
    e.voices?.forEach((voice, id) => {
      voiceInfo[id] = {
        constructor: voice.constructor.name,
        outputGain: voice.output?.gain?.value,
      };
    });

    return {
      contextState: e.context?.state,
      currentEngine: e.currentEngine,
      voiceEngines: e.voiceEngines ? Object.fromEntries(e.voiceEngines) : null,
      masterGain: e.masterGain?.gain?.value,
      voiceInfo,
    };
  });
  console.log(`[${label}]`, JSON.stringify(state, null, 2));
  return state;
}

await getState('INITIAL');

// Click play
console.log('\n=== CLICK PLAY ===');
await page.click('#play-toggle');
await page.waitForTimeout(500);
await getState('AFTER PLAY');

console.log('Listening 2 sec...');
await page.waitForTimeout(2000);

// Stop
await page.click('#play-toggle');
console.log('Stopped\n');

// Change kit to Punchy
console.log('=== CHANGE KIT TO PUNCHY ===');
// First check what options exist
const kitOptions = await page.evaluate(() => {
  const sel = document.getElementById('kit-select');
  return Array.from(sel.options).map(o => ({ value: o.value, text: o.text }));
});
console.log('Available kits:', kitOptions);
await page.selectOption('#kit-select', { label: 'Punchy' });
await page.waitForTimeout(300);
await getState('AFTER KIT CHANGE');

// Play again - this is where buzz happens
console.log('\n=== PLAY AFTER KIT CHANGE ===');
await page.click('#play-toggle');
await page.waitForTimeout(500);
await getState('PLAYING AFTER KIT');

console.log('Listening 2 sec for buzz...');
await page.waitForTimeout(2000);

// Stop
await page.click('#play-toggle');
console.log('Stopped\n');

// Now click engine toggle for kick to see if it fixes
console.log('=== CLICK KICK ENGINE TOGGLE ===');
const kickToggle = await page.$('.engine-toggle-mini[data-voice-id="kick"]');
if (kickToggle) {
  await kickToggle.click();
  await page.waitForTimeout(300);
  await getState('AFTER KICK TOGGLE');
}

// Play again - should be fixed?
console.log('\n=== PLAY AFTER ENGINE TOGGLE ===');
await page.click('#play-toggle');
await page.waitForTimeout(500);
await getState('PLAYING AFTER TOGGLE');

console.log('Listening 2 sec...');
await page.waitForTimeout(2000);

await page.click('#play-toggle');
console.log('Stopped\n');

// Try changing to a different kit
console.log('=== CHANGE KIT TO BOOMY ===');
await page.selectOption('#kit-select', { label: 'Boomy' });
await page.waitForTimeout(300);
await getState('AFTER BOOMY');

console.log('\n=== PLAY AFTER BOOMY ===');
await page.click('#play-toggle');
await page.waitForTimeout(2000);
await page.click('#play-toggle');

console.log('\n--- Browser stays open. Ctrl+C to exit ---');
await page.waitForTimeout(120000);
await browser.close();
