// ============================================
// Berlin Dark Techno Audio Engine
// ============================================
class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isPlaying = false;
        this.startTime = 0;
        this.bpm = 130;
        this.beatDuration = 60 / this.bpm;
        this.onBeat = null;
        this.onKick = null;
    }

    init() {
        // Step 1: Create AudioContext SYNCHRONOUSLY (critical for iOS)
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Step 2: Play silent buffer IMMEDIATELY to unlock iOS audio
        // This must happen synchronously during the user gesture
        this.unlockAudio();

        // Step 3: Set up audio graph
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.audioContext.destination);

        // Step 4: Resume if suspended (fire and forget - audio is already unlocked)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.startTime = this.audioContext.currentTime;
    }

    // Play silent sound to unlock iOS audio - MUST be called synchronously
    unlockAudio() {
        // Create a tiny buffer with near-silent audio (not pure zeros)
        // Some iOS versions need actual audio data, not just silence
        const buffer = this.audioContext.createBuffer(1, 256, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        // Fill with near-inaudible noise
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.0001;
        }
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        // Start immediately (no argument = start now)
        source.start();
    }

    // Create a kick drum (heavy Berlin-style)
    createKick(time, intensity = 1.0) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.frequency.setValueAtTime(150 * intensity, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.5);

        gain.gain.setValueAtTime(1.0 * intensity, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.5);

        if (this.onKick) {
            setTimeout(() => this.onKick(), (time - this.audioContext.currentTime) * 1000);
        }
    }

    // Create hi-hat (industrial)
    createHiHat(time, open = false) {
        const noise = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        noise.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.3 : 0.05));

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(time);
        noise.stop(time + (open ? 0.3 : 0.05));
    }

    // Create bass synth (deep sub-bass)
    createBass(time, note = 40, duration = 0.5) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = note;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.4, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + duration);
    }

    // Create industrial noise stab
    createNoiseStab(time, duration = 0.1) {
        const noise = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        noise.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000 + Math.random() * 3000;
        filter.Q.value = 10;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(time);
        noise.stop(time + duration);
    }

    // Pattern sequencer
    schedulePattern(startTime, duration) {
        const bars = Math.ceil(duration / (this.beatDuration * 4));
        const bassNotes = [40, 36, 43, 38]; // F, C, G, D (low)

        for (let bar = 0; bar < bars; bar++) {
            const barTime = startTime + (bar * this.beatDuration * 4);

            // Kick pattern (4/4 techno with variations)
            for (let beat = 0; beat < 4; beat++) {
                const beatTime = barTime + (beat * this.beatDuration);
                const intensity = beat === 0 ? 1.2 : 1.0;
                this.createKick(beatTime, intensity);

                // Hi-hats (off-beats)
                this.createHiHat(beatTime + this.beatDuration / 2, false);
                if (beat % 2 === 1) {
                    this.createHiHat(beatTime + this.beatDuration / 4, true);
                }

                // Beat callback
                if (this.onBeat) {
                    setTimeout(() => this.onBeat(beat), (beatTime - this.audioContext.currentTime) * 1000);
                }
            }

            // Bass line (evolving pattern)
            if (bar % 2 === 0) {
                this.createBass(barTime, bassNotes[bar % 4], this.beatDuration * 0.8);
                this.createBass(barTime + this.beatDuration * 1.5, bassNotes[(bar + 1) % 4], this.beatDuration * 0.4);
            }

            // Industrial stabs (random)
            if (Math.random() > 0.6) {
                this.createNoiseStab(barTime + this.beatDuration * (Math.random() * 4), 0.15);
            }
        }
    }

    start(duration = 35) {
        if (this.isPlaying) return;

        // Init is synchronous now (critical for iOS)
        this.init();
        this.isPlaying = true;

        const now = this.audioContext.currentTime;
        // Start pattern (small buffer to avoid glitches)
        this.schedulePattern(now + 0.05, duration);

        // Auto-stop
        setTimeout(() => this.stop(), duration * 1000);
    }

    stop() {
        if (this.audioContext) {
            this.audioContext.close();
            this.isPlaying = false;
        }
    }
}

// ============================================
// ASCII Renderer Component
// ============================================
const { useState, useEffect, useRef } = React;

function AsciiRenderer({ beatCount, kickHit }) {
    const [frame, setFrame] = useState(0);
    const [pulse, setPulse] = useState(false);
    const [bassHit, setBassHit] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setFrame(f => (f + 1) % 8);
        }, 125); // 8 frames per second for smooth animation

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (beatCount > 0) {
            setPulse(true);
            setTimeout(() => setPulse(false), 500);
        }
    }, [beatCount]);

    useEffect(() => {
        if (kickHit) {
            setBassHit(true);
            setTimeout(() => setBassHit(false), 150);
        }
    }, [kickHit]);

    // Generate different ASCII patterns based on frame
    const generateAscii = () => {
        const patterns = [
            // Pattern 1: Expanding waves
            `
    ╔═══════════════════════════════════╗
    ║    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    ║
    ║   ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒   ║
    ║  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
    ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
    ║ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ║
    ║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
    ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
    ║  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  ║
    ║   ░░░░░░░░░░░░░░░░░░░░░░░░░░░   ║
    ║    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    ║
    ╚═══════════════════════════════════╝
            `,
            // Pattern 2: Vertical bars
            `
    ╔═══════════════════════════════════╗
    ║ ║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║ ║
    ║ ▓▓▓▓  ▒▒▒▒  ░░░░  ▓▓▓▓  ▒▒▒▒  ░░ ║
    ║ ▓▓▓▓  ▒▒▒▒  ░░░░  ▓▓▓▓  ▒▒▒▒  ░░ ║
    ║ ▓▓▓▓  ▒▒▒▒  ░░░░  ▓▓▓▓  ▒▒▒▒  ░░ ║
    ║ ▓▓▓▓  ▒▒▒▒  ░░░░  ▓▓▓▓  ▒▒▒▒  ░░ ║
    ║ ▓▓▓▓  ▒▒▒▒  ░░░░  ▓▓▓▓  ▒▒▒▒  ░░ ║
    ║ ▓▓▓▓  ▒▒▒▒  ░░░░  ▓▓▓▓  ▒▒▒▒  ░░ ║
    ║ ▓▓▓▓  ▒▒▒▒  ░░░░  ▓▓▓▓  ▒▒▒▒  ░░ ║
    ║ ▓▓▓▓  ▒▒▒▒  ░░░░  ▓▓▓▓  ▒▒▒▒  ░░ ║
    ║ ║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║ ║
    ╚═══════════════════════════════════╝
            `,
            // Pattern 3: Grid pulse
            `
    ╔═══════════════════════════════════╗
    ║   ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░   ║
    ║   ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒   ║
    ║   ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓   ║
    ║   ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░   ║
    ║   ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒   ║
    ║   ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓   ║
    ║   ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░   ║
    ║   ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒   ║
    ║   ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓   ║
    ║   ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░   ║
    ║   ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒ ▓ ░ ▒   ║
    ╚═══════════════════════════════════╝
            `,
            // Pattern 4: Spiral
            `
    ╔═══════════════════════════════════╗
    ║   ░░░░░▒▒▒▒▒▓▓▓▓▓▒▒▒▒▒░░░░░      ║
    ║  ░░░░▒▒▒▒▒▓▓▓▓▓███▓▓▓▓▓▒▒▒▒░░░   ║
    ║ ░░░▒▒▒▒▓▓▓▓▓███████▓▓▓▓▓▒▒▒░░░  ║
    ║ ░░▒▒▒▓▓▓▓███████████▓▓▓▓▒▒▒░░  ║
    ║ ░▒▒▒▓▓▓███████████████▓▓▓▒▒▒░  ║
    ║ ░▒▒▓▓▓███████████████▓▓▓▒▒▒░   ║
    ║ ░░▒▒▓▓▓▓███████████▓▓▓▓▒▒░░░   ║
    ║  ░░▒▒▒▓▓▓▓▓███████▓▓▓▓▒▒▒░░░   ║
    ║   ░░░▒▒▒▒▓▓▓▓▓███▓▓▓▓▒▒▒░░░    ║
    ║    ░░░░▒▒▒▒▒▓▓▓▓▓▒▒▒▒░░░░      ║
    ║      ░░░░░▒▒▒▒▒▒▒▒░░░░░        ║
    ╚═══════════════════════════════════╝
            `,
            // Pattern 5: Diamond
            `
    ╔═══════════════════════════════════╗
    ║             ▓▓▓                   ║
    ║           ▓▓▓▓▓▓▓                 ║
    ║         ▓▓▓░░░▓▓▓                ║
    ║       ▓▓▓░░▒▒▒░░▓▓▓              ║
    ║     ▓▓▓░░▒▒███▒▒░░▓▓▓            ║
    ║   ▓▓▓░░▒▒███████▒▒░░▓▓▓          ║
    ║     ▓▓▓░░▒▒███▒▒░░▓▓▓            ║
    ║       ▓▓▓░░▒▒▒░░▓▓▓              ║
    ║         ▓▓▓░░░▓▓▓                ║
    ║           ▓▓▓▓▓▓▓                 ║
    ║             ▓▓▓                   ║
    ╚═══════════════════════════════════╝
            `,
            // Pattern 6: Horizontal sweep
            `
    ╔═══════════════════════════════════╗
    ║ ════════════════════════════════ ║
    ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
    ║ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ║
    ║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
    ║ ════════════════════════════════ ║
    ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
    ║ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ║
    ║ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ║
    ║ ════════════════════════════════ ║
    ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
    ║ ════════════════════════════════ ║
    ╚═══════════════════════════════════╝
            `,
            // Pattern 7: Tunnel
            `
    ╔═══════════════════════════════════╗
    ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
    ║ ▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▓ ║
    ║ ▓▒░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▓ ║
    ║ ▓▒░                         ░▒▓ ║
    ║ ▓▒░       ███████████       ░▒▓ ║
    ║ ▓▒░       ███████████       ░▒▓ ║
    ║ ▓▒░                         ░▒▓ ║
    ║ ▓▒░░░░░░░░░░░░░░░░░░░░░░░░░░░▒▓ ║
    ║ ▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▓ ║
    ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║
    ║                                   ║
    ╚═══════════════════════════════════╝
            `,
            // Pattern 8: Chaos
            `
    ╔═══════════════════════════════════╗
    ║ ░▒▓█ ▓░█▒ █▒▓░ ░▓█▒ ▒█░▓ ▓▒░█  ║
    ║ ▓█░▒ ░▒▓█ ▒█▓░ █░▒▓ ▓░█▒ ░▓▒█  ║
    ║ █▒░▓ ▓█▒░ ░▓█▒ ▒░▓█ █▓▒░ ▒█▓░  ║
    ║ ░▓█▒ ▒░█▓ ▓▒░█ ░█▒▓ ▒▓░█ █░▒▓  ║
    ║ ▒█▓░ █▓░▒ ░█▓▒ ▓▒█░ ░▒▓█ ▓█░▒  ║
    ║ ▓░█▒ ░▒▓█ █░▒▓ ▒█░▓ ▓░█▒ ▒▓█░  ║
    ║ █▒▓░ ▓█░▒ ▒▓█░ ░▓▒█ █▒░▓ ░▒▓█  ║
    ║ ░█▓▒ ▒▓░█ ▓░█▒ █▒▓░ ▒█▓░ █▓▒░  ║
    ║ ▓▒█░ █░▓▒ ░▒█▓ ▓█░▒ ░▓█▒ ▒░█▓  ║
    ║ ▒░▓█ ▓▒█░ █▓▒░ ░█▒▓ █░▒▓ ▓█░▒  ║
    ║ █▓░▒ ░█▒▓ ▒░▓█ ▓▒░█ ▓█▒░ ░▓█▒  ║
    ╚═══════════════════════════════════╝
            `
        ];

        return patterns[frame % patterns.length];
    };

    const className = `ascii-art ${pulse ? 'pulse' : ''} ${bassHit ? 'bass-hit' : ''}`;

    return (
        <div className="ascii-container">
            <pre className={className}>
                {generateAscii()}
            </pre>
        </div>
    );
}

// ============================================
// Main App
// ============================================
function App() {
    const [started, setStarted] = useState(false);
    const [beatCount, setBeatCount] = useState(0);
    const [kickHit, setKickHit] = useState(0);
    const [elapsed, setElapsed] = useState(0);
    const audioEngineRef = useRef(null);

    useEffect(() => {
        if (started) {
            const startTime = Date.now();
            const timer = setInterval(() => {
                const now = Date.now();
                setElapsed(Math.floor((now - startTime) / 1000));
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [started]);

    const handleStart = () => {
        // Guard against double-firing (touchstart + click)
        if (started || audioEngineRef.current) return;

        // CRITICAL FOR iOS: Create AudioContext synchronously in click handler
        // Do NOT use async/await before creating the context
        const engine = new AudioEngine();
        audioEngineRef.current = engine;

        // Set up beat callback
        engine.onBeat = (beat) => {
            setBeatCount(prev => prev + 1);
        };

        // Set up kick callback
        engine.onKick = () => {
            setKickHit(prev => prev + 1);
        };

        // Start the audio - iOS requires synchronous context creation
        // The start() method handles async resume internally
        engine.start(35); // 35 seconds

        // Update UI immediately
        setStarted(true);
    };

    // Handle touch start for iOS - prevent default to avoid double-firing with click
    const handleTouchStart = (e) => {
        e.preventDefault();
        handleStart();
    };

    if (!started) {
        return (
            <div className="ascii-container">
                <button
                    className="start-button"
                    onClick={handleStart}
                    onTouchStart={handleTouchStart}
                >
                    ░▒▓ ENTER THE GRID ▓▒░
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="timer">
                {elapsed}s / 35s
            </div>
            <AsciiRenderer beatCount={beatCount} kickHit={kickHit} />
        </>
    );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
