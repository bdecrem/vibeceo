// jambot/agent.js - Claude Code for Music
// Agent loop + tools for making beats

import Anthropic from '@anthropic-ai/sdk';
import { OfflineAudioContext } from 'node-web-audio-api';
import { TR909Engine } from '../web/public/909/dist/machines/tr909/engine.js';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', 'sms-bot', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [key, ...rest] = trimmed.split('=');
    process.env[key] = rest.join('=');
  }
}

// Make Web Audio available globally
globalThis.OfflineAudioContext = OfflineAudioContext;

const client = new Anthropic();

// === SESSION STATE ===
let session = {
  bpm: 128,
  bars: 2,
  swing: 0,  // 0-100, how much to push off-beats
  drums: null,
  pattern: {},
  voiceParams: {},  // Store tweaks like { kick: { decay: 0.3, tune: -2 } }
};

// === TOOLS ===
const TOOLS = [
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
  }
];

// === TOOL EXECUTION ===
function executeTool(name, input) {
  if (name === "create_session") {
    session.bpm = input.bpm;
    session.swing = 0;
    session.pattern = {};
    session.voiceParams = {};
    return `Session created at ${input.bpm} BPM`;
  }

  if (name === "set_swing") {
    session.swing = Math.max(0, Math.min(100, input.amount));
    return `Swing set to ${session.swing}%`;
  }

  if (name === "add_drums") {
    const voices = ['kick', 'snare', 'clap', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'rimshot', 'crash', 'ride'];
    const added = [];

    for (const voice of voices) {
      const steps = input[voice] || [];
      if (steps.length > 0) {
        // Initialize empty pattern
        session.pattern[voice] = Array(16).fill(null).map(() => ({ velocity: 0 }));

        // Check if simple format [0,4,8] or detailed [{step:0,vel:1}]
        const isDetailed = typeof steps[0] === 'object';

        if (isDetailed) {
          // Detailed format with velocities
          for (const hit of steps) {
            const step = hit.step;
            const vel = hit.vel !== undefined ? hit.vel : 1;
            if (step >= 0 && step < 16) {
              session.pattern[voice][step].velocity = vel;
            }
          }
          added.push(`${voice}:[${steps.map(h => h.step).join(',')}]`);
        } else {
          // Simple format - just step numbers
          const defaultVel = (voice === 'ch' || voice === 'oh') ? 0.7 : 1;
          for (const step of steps) {
            if (step >= 0 && step < 16) {
              session.pattern[voice][step].velocity = defaultVel;
            }
          }
          added.push(`${voice}:[${steps.join(',')}]`);
        }
      }
    }

    return `Drums added: ${added.join(', ')}`;
  }

  if (name === "tweak_drums") {
    const voice = input.voice;
    if (!session.voiceParams[voice]) {
      session.voiceParams[voice] = {};
    }

    const tweaks = [];
    if (input.decay !== undefined) {
      session.voiceParams[voice].decay = input.decay;
      tweaks.push(`decay=${input.decay}`);
    }
    if (input.tune !== undefined) {
      session.voiceParams[voice].tune = input.tune;
      tweaks.push(`tune=${input.tune}`);
    }
    if (input.tone !== undefined) {
      session.voiceParams[voice].tone = input.tone;
      tweaks.push(`tone=${input.tone}`);
    }
    if (input.level !== undefined) {
      session.voiceParams[voice].level = input.level;
      tweaks.push(`level=${input.level}`);
    }

    return `Tweaked ${voice}: ${tweaks.join(', ')}`;
  }

  if (name === "render") {
    const bars = input.bars || 2;
    const filename = `${input.filename}.wav`;

    // Render synchronously-ish using a promise we block on
    const result = renderSession(bars, filename);
    return result;
  }

  return `Unknown tool: ${name}`;
}

function renderSession(bars, filename) {
  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const stepDuration = 60 / session.bpm / 4;
  const totalDuration = totalSteps * stepDuration + 1;
  const sampleRate = 44100;

  const context = new OfflineAudioContext(2, totalDuration * sampleRate, sampleRate);
  const drums = new TR909Engine({ context });

  const voiceNames = ['kick', 'snare', 'clap', 'ch', 'oh', 'ltom', 'mtom', 'htom', 'rimshot', 'crash', 'ride'];

  // Connect all voices and apply tweaks
  for (const name of voiceNames) {
    const voice = drums.voices.get(name);
    if (voice) {
      voice.connect(context.destination);

      // Apply any tweaks from session
      const params = session.voiceParams[name];
      if (params) {
        if (params.decay !== undefined) voice.decay = params.decay;
        if (params.tune !== undefined) voice.tune = params.tune;
        if (params.tone !== undefined) voice.tone = params.tone;
        if (params.level !== undefined) voice.level = params.level;
      }
    }
  }

  // Calculate swing delay (off-beats get pushed later)
  const swingAmount = session.swing / 100;
  const maxSwingDelay = stepDuration * 0.5; // Max 50% of a step

  // Schedule all hits
  for (let i = 0; i < totalSteps; i++) {
    let time = i * stepDuration;
    const step = i % 16;

    // Apply swing to off-beats (1,3,5,7,9,11,13,15)
    if (step % 2 === 1) {
      time += swingAmount * maxSwingDelay;
    }

    for (const name of voiceNames) {
      if (session.pattern[name]?.[step]?.velocity > 0) {
        const voice = drums.voices.get(name);
        if (voice) voice.trigger(time, session.pattern[name][step].velocity);
      }
    }
  }

  // Render (blocking)
  return context.startRendering().then(buffer => {
    const wav = audioBufferToWav(buffer);
    writeFileSync(filename, Buffer.from(wav));
    return `✅ Rendered ${bars} bars at ${session.bpm} BPM → ${filename}`;
  });
}

// === AGENT LOOP ===
async function runAgent(task) {
  console.log(`\n🎹 Jambot: "${task}"\n`);

  const messages = [{ role: "user", content: task }];

  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: "You are Jambot, an AI that creates music using synthesizers. You have tools to create sessions, add drums, and render to WAV. ALWAYS complete the full task: create session, add instruments, AND render to a WAV file. Never ask follow-up questions - just do the full job. Be concise.",
      tools: TOOLS,
      messages
    });

    // Done?
    if (response.stop_reason === "end_turn") {
      for (const block of response.content) {
        if (block.type === "text") {
          console.log(`✅ ${block.text}`);
        }
      }
      break;
    }

    // Process tool calls
    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log(`🔧 ${block.name}:`, JSON.stringify(block.input));

          let result = executeTool(block.name, block.input);

          // Handle promises
          if (result instanceof Promise) {
            result = await result;
          }

          console.log(`   → ${result}`);

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
}

// === WAV ENCODER ===
function audioBufferToWav(buffer) {
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

  const channels = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
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

// === INTERACTIVE CLI ===
import * as readline from 'readline';
import inquirer from 'inquirer';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Persistent message history for context
let messages = [];

// Slash commands registry
const SLASH_COMMANDS = [
  { name: '/909', description: 'TR-909 drum machine guide' },
  { name: '/changelog', description: 'Version history and release notes' },
  { name: '/status', description: 'Show current session state' },
  { name: '/clear', description: 'Reset session and start fresh' },
  { name: '/exit', description: 'Quit Jambot' },
];

async function showSlashMenu() {
  const { command } = await inquirer.prompt([
    {
      type: 'list',
      name: 'command',
      message: 'Select command',
      choices: SLASH_COMMANDS.map(c => ({
        name: `${c.name.padEnd(12)} ${c.description}`,
        value: c.name
      })),
      pageSize: 10,
    }
  ]);
  return command;
}

async function handleInput(input) {
  let trimmed = input.trim();

  // Show interactive menu for just "/"
  if (trimmed === '/') {
    trimmed = await showSlashMenu();
  }

  // Slash commands
  if (trimmed === '/exit' || trimmed === 'exit') {
    console.log('👋 Bye!');
    rl.close();
    process.exit(0);
  }

  if (trimmed === '/clear') {
    session = { bpm: 128, bars: 2, swing: 0, drums: null, pattern: {}, voiceParams: {} };
    messages = [];
    console.log('🗑️  Session cleared\n');
    return;
  }

  if (trimmed === '/status') {
    console.log(`\n📊 Session: ${session.bpm} BPM${session.swing > 0 ? `, swing ${session.swing}%` : ''}`);
    const voices = Object.keys(session.pattern);
    if (voices.length > 0) {
      console.log(`   Drums: ${voices.join(', ')}`);
    } else {
      console.log('   (empty)');
    }
    const tweaks = Object.keys(session.voiceParams);
    if (tweaks.length > 0) {
      console.log(`   Tweaks: ${tweaks.map(v => `${v}(${Object.keys(session.voiceParams[v]).join(',')})`).join(', ')}`);
    }
    console.log('');
    return;
  }

  if (trimmed === '/help') {
    console.log(`
┌─────────────────────────────────────────────────────────┐
│  Slash Commands                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  /909       TR-909 drum machine guide                   │
│  /changelog Version history and release notes           │
│  /status    Show current session state                  │
│  /clear     Reset session and start fresh               │
│  /exit      Quit Jambot                                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Or just talk:                                          │
│  › make me a techno beat at 128                         │
│  › add some swing                                       │
│  › make the kick punchier                               │
│  › render it                                            │
└─────────────────────────────────────────────────────────┘
`);
    return;
  }

  if (trimmed === '/changelog') {
    console.log(`
┌───────────────────────────────────────────────────┐
│  📋 Changelog                                     │
├───────────────────────────────────────────────────┤
│  v0.0.1 — Jan 13, 2026 — Initial release 🎉      │
│  • TR-909 with all 11 voices + parameters        │
│  • Natural language beat creation                │
│  • Velocity per step, swing for groove           │
│  • WAV rendering, interactive CLI                │
├───────────────────────────────────────────────────┤
│  Coming: TB-303 bass, sidechain, effects         │
└───────────────────────────────────────────────────┘
`);
    return;
  }

  if (trimmed === '/909') {
    console.log(`
┌─────────────────────────────────────────────────────────┐
│  🥁 TR-909 Drum Machine                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  VOICES                                                 │
│  kick     Bass drum        snare    Snare drum          │
│  clap     Handclap         ch       Closed hi-hat       │
│  oh       Open hi-hat      ltom     Low tom             │
│  mtom     Mid tom          htom     High tom            │
│  rimshot  Rim click        crash    Crash cymbal        │
│  ride     Ride cymbal                                   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  PARAMETERS  "tweak the kick..."                        │
│  decay    Length (0.1–1). Low = punch, high = boom      │
│  tune     Pitch (-12 to +12). Negative = deeper         │
│  tone     Brightness (0–1). Snare only                  │
│  level    Volume (0–1)                                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  SWING    Pushes off-beats for groove                   │
│  › "add 50% swing"                                      │
│  › "make it shuffle"                                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  EXAMPLES                                               │
│  › "four on the floor with offbeat hats"                │
│  › "ghost notes on the snare"                           │
│  › "tune the kick down, make it longer"                 │
│  › "give me some tom fills"                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
`);
    return;
  }

  if (!trimmed) return;

  // Add user message to history
  messages.push({ role: "user", content: trimmed });

  // Run agent loop
  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: "You are Jambot, an AI that creates music using synthesizers. You have tools to create sessions, add drums, and render to WAV. Complete the user's request, then briefly confirm what you did. ALWAYS mention the exact filename when you render. Keep responses short.",
      tools: TOOLS,
      messages
    });

    // Done?
    if (response.stop_reason === "end_turn") {
      // Add assistant response to history
      messages.push({ role: "assistant", content: response.content });

      for (const block of response.content) {
        if (block.type === "text") {
          console.log(`\n${block.text}\n`);
        }
      }
      break;
    }

    // Process tool calls
    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log(`🔧 ${block.name}`);

          let result = executeTool(block.name, block.input);
          if (result instanceof Promise) {
            result = await result;
          }
          console.log(`   → ${result}`);

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
}

function prompt() {
  rl.question('> ', async (input) => {
    try {
      await handleInput(input);
    } catch (err) {
      console.error('Error:', err.message);
    }
    prompt();
  });
}

// Start CLI
function showSplash() {
  // Clear screen
  console.clear();

  // 80x24 terminal: 23 lines of content, prompt on line 24
  const logo = `
     ██╗ █████╗ ███╗   ███╗██████╗  ██████╗ ████████╗
     ██║██╔══██╗████╗ ████║██╔══██╗██╔═══██╗╚══██╔══╝
     ██║███████║██╔████╔██║██████╔╝██║   ██║   ██║
██   ██║██╔══██║██║╚██╔╝██║██╔══██╗██║   ██║   ██║
╚█████╔╝██║  ██║██║ ╚═╝ ██║██████╔╝╚██████╔╝   ██║
 ╚════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚═════╝  ╚═════╝    ╚═╝

    🤖 Your AI just learned to funk 🎛️
 ─────────────────────────────────────────────────
  v0.0.1 — Initial release 🎉
  • TR-909 drum machine, all 11 voices
  • Natural language beat creation
  • Swing, velocity, voice tweaking
 ─────────────────────────────────────────────────
  "make me a techno beat at 128"
  "add some swing"
  "make the kick punchier"
  "render it"
 ─────────────────────────────────────────────────

  / for commands • github.com/bdecrem/jambot
`;
  console.log(logo);
}

showSplash();

// If argument passed, run it then go interactive
const initialTask = process.argv[2];
if (initialTask) {
  handleInput(initialTask).then(prompt);
} else {
  prompt();
}
