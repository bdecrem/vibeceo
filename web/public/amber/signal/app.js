// ============================================
// SIGNAL - Berlin Dark Techno
// Transmission from the underground
// ============================================

class SignalEngine {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.compressor = null;
        this.analyser = null;
        this.isPlaying = false;
        this.bpm = 128;
        this.beatDuration = 60 / this.bpm;
        this.loopInterval = null;
        this.currentBar = 0;
        this.onBeat = null;
        this.onKick = null;
        this.frequencyData = null;
    }

    init() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Analyser for visualization
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

        // Compressor - the secret sauce for that Berlin pump
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
        this.compressor.knee.setValueAtTime(4, this.audioContext.currentTime);
        this.compressor.ratio.setValueAtTime(8, this.audioContext.currentTime);  // Heavy compression
        this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);  // Fast attack
        this.compressor.release.setValueAtTime(0.15, this.audioContext.currentTime);  // Quick release for pump

        // Master gain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.6;

        // Signal chain: sources -> compressor -> analyser -> master -> output
        this.compressor.connect(this.analyser);
        this.analyser.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Heavy Berlin kick with sub
    createKick(time, intensity = 1.0) {
        // Main body
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.frequency.setValueAtTime(160 * intensity, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.6);  // Lower, longer

        gain.gain.setValueAtTime(1.2 * intensity, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.6);

        osc.connect(gain);
        gain.connect(this.compressor);

        osc.start(time);
        osc.stop(time + 0.6);

        // Sub layer
        const sub = this.audioContext.createOscillator();
        const subGain = this.audioContext.createGain();

        sub.type = 'sine';
        sub.frequency.setValueAtTime(50, time);
        sub.frequency.exponentialRampToValueAtTime(35, time + 0.4);

        subGain.gain.setValueAtTime(0.8 * intensity, time);
        subGain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

        sub.connect(subGain);
        subGain.connect(this.compressor);

        sub.start(time);
        sub.stop(time + 0.4);

        if (this.onKick) {
            const delay = Math.max(0, (time - this.audioContext.currentTime) * 1000);
            setTimeout(() => this.onKick(), delay);
        }
    }

    // Tight closed hi-hat
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
        filter.frequency.value = 9000;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(open ? 0.15 : 0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.2 : 0.03));

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);

        noise.start(time);
        noise.stop(time + (open ? 0.2 : 0.03));
    }

    // Deep hypnotic bass - different pattern than ASCII Techno
    // A minor feel: A, E, F, D
    createBass(time, note = 55, duration = 0.4) {
        const osc = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = note;

        osc2.type = 'square';
        osc2.frequency.value = note * 0.5;  // Sub octave

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, time);
        filter.frequency.exponentialRampToValueAtTime(150, time + duration);
        filter.Q.value = 2;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.35, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);

        osc.start(time);
        osc2.start(time);
        osc.stop(time + duration);
        osc2.stop(time + duration);
    }

    // Atmospheric pad
    createPad(time, note = 220, duration = 4) {
        const voices = [0, 0.01, -0.01];  // Slight detune for thickness

        voices.forEach(detune => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.value = note * (1 + detune);

            filter.type = 'lowpass';
            filter.frequency.value = 800;

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.08, time + 1);
            gain.gain.linearRampToValueAtTime(0.08, time + duration - 1);
            gain.gain.linearRampToValueAtTime(0, time + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.compressor);

            osc.start(time);
            osc.stop(time + duration);
        });
    }

    // Industrial noise hit
    createNoise(time, duration = 0.1) {
        const noise = this.audioContext.createBufferSource();
        const buffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        noise.buffer = buffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500 + Math.random() * 2000;
        filter.Q.value = 15;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);

        noise.start(time);
        noise.stop(time + duration);
    }

    // Schedule a single bar (4 beats)
    scheduleBar(barTime, barNumber) {
        // Bass notes: A minor progression (hypnotic, darker than ASCII Techno)
        const bassNotes = [55, 41, 44, 37];  // A, E, F, D (low)
        const bassNote = bassNotes[barNumber % 4];

        for (let beat = 0; beat < 4; beat++) {
            const beatTime = barTime + (beat * this.beatDuration);
            const intensity = beat === 0 ? 1.1 : 1.0;

            // Kick on every beat (4/4)
            this.createKick(beatTime, intensity);

            // Hi-hats
            this.createHiHat(beatTime + this.beatDuration / 2, false);
            if (beat === 1 || beat === 3) {
                this.createHiHat(beatTime + this.beatDuration * 0.75, true);
            }

            // Beat callback
            if (this.onBeat) {
                const delay = Math.max(0, (beatTime - this.audioContext.currentTime) * 1000);
                setTimeout(() => this.onBeat(beat), delay);
            }
        }

        // Bass on beats 1 and 3
        this.createBass(barTime, bassNote, this.beatDuration * 1.5);
        this.createBass(barTime + this.beatDuration * 2, bassNote * 0.75, this.beatDuration);

        // Pad every 4 bars
        if (barNumber % 4 === 0) {
            const padNote = [220, 196, 175, 165][Math.floor(barNumber / 4) % 4];
            this.createPad(barTime, padNote, this.beatDuration * 8);
        }

        // Noise hits (sparse)
        if (Math.random() > 0.75) {
            this.createNoise(barTime + this.beatDuration * (1 + Math.random() * 2), 0.12);
        }
    }

    // Get frequency data for visualization
    getFrequencyData() {
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.frequencyData);
            return this.frequencyData;
        }
        return new Uint8Array(128);
    }

    start() {
        if (this.isPlaying) return;

        this.init();
        this.isPlaying = true;
        this.currentBar = 0;

        // Schedule first set of bars
        const now = this.audioContext.currentTime;
        const barsToSchedule = 4;

        for (let i = 0; i < barsToSchedule; i++) {
            this.scheduleBar(now + 0.1 + (i * this.beatDuration * 4), this.currentBar + i);
        }

        // Continuous scheduling loop (infinite)
        const barDuration = this.beatDuration * 4;
        this.loopInterval = setInterval(() => {
            this.currentBar += barsToSchedule;
            const scheduleTime = this.audioContext.currentTime + (barDuration * 2);

            for (let i = 0; i < barsToSchedule; i++) {
                this.scheduleBar(scheduleTime + (i * barDuration), this.currentBar + i);
            }
        }, barDuration * barsToSchedule * 1000 * 0.8);
    }

    stop() {
        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            this.loopInterval = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.isPlaying = false;
    }
}

// ============================================
// React Components
// ============================================
const { useState, useEffect, useRef } = React;

function Waveform({ engine, isPlaying }) {
    const [bars, setBars] = useState(Array(64).fill(10));
    const animationRef = useRef();

    useEffect(() => {
        if (!isPlaying) {
            setBars(Array(64).fill(10));
            return;
        }

        const animate = () => {
            const data = engine.current?.getFrequencyData() || new Uint8Array(128);
            const newBars = [];

            for (let i = 0; i < 64; i++) {
                // Map frequency data to bar heights with some smoothing
                const index = Math.floor(i * 1.5);
                const value = data[index] || 0;
                const height = Math.max(5, (value / 255) * 180);
                newBars.push(height);
            }

            setBars(newBars);
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isPlaying, engine]);

    // Create symmetric waveform (mirror effect like the poster)
    const leftBars = bars.slice(0, 32).reverse();
    const rightBars = bars.slice(0, 32);
    const symmetricBars = [...leftBars, ...rightBars];

    return (
        <div className="waveform">
            {symmetricBars.map((height, i) => (
                <div
                    key={i}
                    className={`waveform-bar ${height > 100 ? 'active' : ''}`}
                    style={{ height: `${height}px` }}
                />
            ))}
        </div>
    );
}

function App() {
    const [isPlaying, setIsPlaying] = useState(false);
    const engineRef = useRef(null);

    const handleStart = () => {
        engineRef.current = new SignalEngine();
        engineRef.current.start();
        setIsPlaying(true);
    };

    const handleStop = () => {
        if (engineRef.current) {
            engineRef.current.stop();
        }
        setIsPlaying(false);
    };

    useEffect(() => {
        return () => {
            if (engineRef.current) {
                engineRef.current.stop();
            }
        };
    }, []);

    if (!isPlaying) {
        return (
            <>
                <div className="grid-bg" />
                <div className="vignette" />
                <div className="corner tl" />
                <div className="corner tr" />
                <div className="corner bl" />
                <div className="corner br" />

                <div className="signal-container">
                    <div className="top-label">Transmission from the underground</div>

                    <div className="waveform">
                        {Array(64).fill(0).map((_, i) => {
                            // Static waveform shape for idle state
                            const center = 32;
                            const dist = Math.abs(i - center) / center;
                            const height = 20 + (1 - dist) * 80 * (0.5 + Math.random() * 0.5);
                            return (
                                <div
                                    key={i}
                                    className="waveform-bar"
                                    style={{ height: `${height}px`, opacity: 0.6 }}
                                />
                            );
                        })}
                    </div>

                    <div className="title">SIGNAL</div>
                    <div className="subtitle">Berlin × 4:00 AM × Infinite Loop</div>

                    <button className="start-button" onClick={handleStart}>
                        ▶ ENTER
                    </button>

                    <div style={{ marginTop: '60px' }}>
                        <div className="bpm">128 BPM</div>
                        <div className="footer">intheamber.com</div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="grid-bg" />
            <div className="vignette" />
            <div className="corner tl" />
            <div className="corner tr" />
            <div className="corner bl" />
            <div className="corner br" />

            <div className="loop-indicator">
                <div className="loop-dot" />
                <span>INFINITE LOOP</span>
            </div>

            <div className="signal-container">
                <div className="top-label">Transmission from the underground</div>

                <Waveform engine={engineRef} isPlaying={isPlaying} />

                <div className="title">SIGNAL</div>
                <div className="subtitle">Berlin × 4:00 AM × Infinite Loop</div>

                <div style={{ marginTop: '40px' }}>
                    <div className="bpm">128 BPM</div>
                    <div className="footer">intheamber.com</div>
                </div>
            </div>

            <div className="controls">
                <button className="control-btn" onClick={handleStop}>
                    ◼ STOP
                </button>
            </div>
        </>
    );
}

// Render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
