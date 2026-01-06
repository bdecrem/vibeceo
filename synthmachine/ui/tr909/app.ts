import type { Pattern, PatternStep } from '../../core/types.js';
import {
  type TR909VoiceId,
  TR909Engine,
} from '../../machines/tr909/engine.js';

const STEPS = 16;
const pattern: Pattern = {};
const engine = new TR909Engine();
const PATTERN_ID = 'web-ui';

const VOICES: { id: TR909VoiceId; label: string }[] = [
  { id: 'kick', label: 'Bass Drum' },
  { id: 'snare', label: 'Snare' },
  { id: 'clap', label: 'Clap' },
  { id: 'rimshot', label: 'Rim Shot' },
  { id: 'ltom', label: 'Low Tom' },
  { id: 'mtom', label: 'Mid Tom' },
  { id: 'htom', label: 'High Tom' },
  { id: 'ch', label: 'Closed Hat' },
  { id: 'oh', label: 'Open Hat' },
  { id: 'crash', label: 'Crash' },
  { id: 'ride', label: 'Ride' },
];

const defaultPattern: Record<TR909VoiceId, number[]> = {
  kick: [0, 4, 8, 12],
  snare: [4, 12],
  clap: [],
  rimshot: [],
  ltom: [],
  mtom: [],
  htom: [],
  ch: [0, 2, 4, 6, 8, 10, 12, 14],
  oh: [6, 14],
  crash: [0],
  ride: [],
};

function ensureTrack(voiceId: TR909VoiceId): PatternStep[] {
  if (!pattern[voiceId]) {
    pattern[voiceId] = Array.from({ length: STEPS }, () => ({ velocity: 0 }));
  }
  return pattern[voiceId];
}

function initPattern(): void {
  VOICES.forEach((voice) => {
    const track = ensureTrack(voice.id);
    track.forEach((step, index) => {
      step.velocity = defaultPattern[voice.id]?.includes(index) ? 1 : 0;
      step.accent = false;
    });
  });
  commitPattern();
}

function commitPattern(): void {
  engine.setPattern(PATTERN_ID, pattern);
}

function nextVelocity(value: number): number {
  if (value <= 0) return 0.6;
  if (value < 1) return 1;
  return 0;
}

function toggleStep(voiceId: TR909VoiceId, stepIndex: number, button: HTMLButtonElement): void {
  const track = ensureTrack(voiceId);
  const current = track[stepIndex] ?? { velocity: 0 };
  const velocity = nextVelocity(current.velocity);
  track[stepIndex] = { ...current, velocity };
  updateStepButton(button, velocity);
  commitPattern();
}

function updateStepButton(button: HTMLButtonElement, velocity: number): void {
  button.classList.toggle('step--on', velocity > 0);
  button.classList.toggle('step--accent', velocity >= 1);
  button.setAttribute('data-level', velocity.toFixed(1));
}

function renderGrid(): void {
  const container = document.getElementById('sequencer');
  if (!container) return;
  container.innerHTML = '';

  VOICES.forEach((voice) => {
    const row = document.createElement('div');
    row.className = 'voice-row';
    const label = document.createElement('span');
    label.className = 'voice-label';
    label.textContent = voice.label;
    row.appendChild(label);

    const track = ensureTrack(voice.id);
    for (let i = 0; i < STEPS; i += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'step';
      button.dataset.index = i.toString();
      updateStepButton(button, track[i].velocity);
      button.addEventListener('click', () =>
        toggleStep(voice.id, i, button)
      );
      row.appendChild(button);
    }

    container.appendChild(row);
  });
}

function setupControls(): void {
  const startBtn = document.getElementById('start');
  const stopBtn = document.getElementById('stop');
  const bpmInput = document.getElementById('bpm') as HTMLInputElement | null;
  const exportBtn = document.getElementById('export');

  startBtn?.addEventListener('click', () => {
    engine.startSequencer();
    setStatus('Playing pattern');
  });

  stopBtn?.addEventListener('click', () => {
    engine.stopSequencer();
    setStatus('Stopped');
  });

  bpmInput?.addEventListener('input', () => {
    const bpm = Number(bpmInput.value);
    if (!Number.isNaN(bpm) && bpm > 0) {
      engine.setBpm(bpm);
      setStatus(`Tempo set to ${bpm} BPM`);
    }
  });

  exportBtn?.addEventListener('click', async () => {
    setStatus('Rendering WAV…');
    try {
      const buffer = await engine.renderPattern(pattern, {
        bpm: bpmInput ? Number(bpmInput.value) || 125 : 125,
        bars: 2,
      });
      const blob = await engine.audioBufferToBlob(buffer);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'tr-909-pattern.wav';
      anchor.click();
      setStatus('Exported WAV (download should start automatically).');
    } catch (error) {
      console.error(error);
      setStatus('Failed to export WAV. See console for details.');
    }
  });
}

function setStatus(message: string): void {
  const status = document.getElementById('status');
  if (status) {
    status.textContent = message;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initPattern();
  renderGrid();
  setupControls();
  setStatus('Ready — tap steps to program the pattern.');
});
