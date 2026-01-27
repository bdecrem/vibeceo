'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
// Amber's color palette
const COLORS = {
    black: '#000000',
    amber: '#D4A574',
    gold: '#FFD700',
    teal: '#2D9596',
    darkAmber: '#8B6914',
};
export default function RainGame() {
    const canvasRef = useRef(null);
    const [gameState, setGameState] = useState('start');
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [leaderboard, setLeaderboard] = useState([]);
    const [submitStatus, setSubmitStatus] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [user, setUser] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [socialLoaded, setSocialLoaded] = useState(false);
    // Auth state
    const [authMode, setAuthMode] = useState('login');
    const [authHandle, setAuthHandle] = useState('');
    const [authCode, setAuthCode] = useState('');
    const [authError, setAuthError] = useState('');
    // Game refs
    const gameRef = useRef({
        running: false,
        score: 0,
        lives: 3,
        drops: [],
        particles: [],
        basket: { x: 0, width: 80, height: 50 },
        targetX: 0,
        dropSpeed: 2,
        spawnRate: 1000,
        lastSpawn: 0,
        audioCtx: null,
        masterGain: null,
        screenShake: { x: 0, y: 0, intensity: 0 },
    });
    const GAME_ID = 'rain';
    // Initialize user from social lib
    useEffect(() => {
        if (socialLoaded && window.PixelpitSocial) {
            const u = window.PixelpitSocial.getUser();
            setUser(u);
            const savedName = localStorage.getItem('pixelpit_guest_name');
            if (savedName)
                setPlayerName(savedName);
        }
    }, [socialLoaded]);
    // Initialize share button on game over
    useEffect(() => {
        if (gameState === 'gameover' && socialLoaded && window.PixelpitSocial) {
            setTimeout(() => {
                const container = document.getElementById('share-btn-container');
                if (container) {
                    container.innerHTML = '';
                    window.PixelpitSocial.ShareButton('share-btn-container', {
                        url: `${window.location.origin}/pixelpit/arcade/rain`,
                        text: `I caught ${score} drops in RAIN! Can you beat me?`,
                        style: 'minimal',
                    });
                }
            }, 100);
        }
    }, [gameState, socialLoaded, score]);
    // Audio
    const initAudio = () => {
        const game = gameRef.current;
        if (game.audioCtx)
            return;
        game.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        game.masterGain = game.audioCtx.createGain();
        game.masterGain.connect(game.audioCtx.destination);
        game.masterGain.gain.value = soundEnabled ? 1 : 0;
    };
    const playSound = (freq, duration, type = 'sine', volume = 0.15) => {
        const game = gameRef.current;
        if (!game.audioCtx || !soundEnabled || !game.masterGain)
            return;
        const osc = game.audioCtx.createOscillator();
        const gain = game.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(game.masterGain);
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, game.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + duration);
        osc.start();
        osc.stop(game.audioCtx.currentTime + duration);
    };
    const catchSound = () => {
        playSound(800, 0.1);
        setTimeout(() => playSound(1200, 0.1), 50);
    };
    const missSound = () => {
        playSound(120, 0.3, 'sawtooth', 0.2);
    };
    const gameOverSound = () => {
        playSound(200, 0.2);
        setTimeout(() => playSound(150, 0.3), 200);
        setTimeout(() => playSound(100, 0.5), 500);
    };
    // Game logic
    const startGame = () => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        initAudio();
        const game = gameRef.current;
        if (game.audioCtx?.state === 'suspended')
            game.audioCtx.resume();
        game.basket.x = canvas.width / 2 - game.basket.width / 2;
        game.targetX = game.basket.x;
        game.drops = [];
        game.particles = [];
        game.score = 0;
        game.lives = 3;
        game.dropSpeed = 2;
        game.spawnRate = 1000;
        game.lastSpawn = 0;
        game.running = true;
        setScore(0);
        setLives(3);
        setGameState('playing');
    };
    const spawnDrop = (canvasWidth) => {
        const game = gameRef.current;
        game.drops.push({
            x: Math.random() * (canvasWidth - 20),
            y: -30,
            speed: game.dropSpeed,
        });
    };
    const createParticles = (x, y) => {
        const game = gameRef.current;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const velocity = 2 + Math.random() * 2;
            game.particles.push({
                x,
                y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity - 2,
                life: 30,
                maxLife: 30,
            });
        }
    };
    const gameOver = () => {
        const game = gameRef.current;
        game.running = false;
        game.screenShake.intensity = 20;
        gameOverSound();
        setScore(game.score);
        setTimeout(() => setGameState('gameover'), 400);
    };
    // Game loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);
        let animationId;
        let mouseX = canvas.width / 2;
        const handleMouseMove = (e) => {
            mouseX = e.clientX;
        };
        const handleTouchMove = (e) => {
            e.preventDefault();
            mouseX = e.touches[0].clientX;
        };
        const handleTouchStart = (e) => {
            mouseX = e.touches[0].clientX;
        };
        const update = (timestamp) => {
            const game = gameRef.current;
            if (!game.running)
                return;
            // Update basket position (smooth follow)
            const targetX = mouseX - game.basket.width / 2;
            game.basket.x += (targetX - game.basket.x) * 0.15;
            game.basket.x = Math.max(0, Math.min(canvas.width - game.basket.width, game.basket.x));
            // Spawn drops
            if (timestamp - game.lastSpawn > game.spawnRate) {
                spawnDrop(canvas.width);
                game.lastSpawn = timestamp;
            }
            // Update drops
            const basketTop = canvas.height - 100;
            const basketBottom = canvas.height - 50;
            for (let i = game.drops.length - 1; i >= 0; i--) {
                const drop = game.drops[i];
                drop.y += drop.speed;
                // Check collision with basket
                if (drop.y + 28 > basketTop && drop.y < basketBottom) {
                    if (drop.x + 10 > game.basket.x && drop.x + 10 < game.basket.x + game.basket.width) {
                        // Caught!
                        game.score++;
                        setScore(game.score);
                        catchSound();
                        createParticles(drop.x + 10, drop.y + 14);
                        game.drops.splice(i, 1);
                        // Increase difficulty every 10 catches
                        if (game.score % 10 === 0) {
                            game.dropSpeed += 0.3;
                            game.spawnRate = Math.max(400, game.spawnRate - 50);
                        }
                        continue;
                    }
                }
                // Check if missed (hit bottom)
                if (drop.y > canvas.height) {
                    game.lives--;
                    setLives(game.lives);
                    missSound();
                    game.screenShake.intensity = 10;
                    game.drops.splice(i, 1);
                    if (game.lives === 0) {
                        gameOver();
                        return;
                    }
                }
            }
            // Update particles
            game.particles = game.particles.filter(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1;
                p.life--;
                return p.life > 0;
            });
        };
        const draw = () => {
            const game = gameRef.current;
            // Apply screen shake
            ctx.save();
            if (game.screenShake.intensity > 0) {
                const shakeX = (Math.random() - 0.5) * game.screenShake.intensity;
                const shakeY = (Math.random() - 0.5) * game.screenShake.intensity;
                ctx.translate(shakeX, shakeY);
                game.screenShake.intensity *= 0.9;
            }
            // Background
            ctx.fillStyle = COLORS.black;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Ambient glow at bottom
            const gradient = ctx.createLinearGradient(0, canvas.height - 200, 0, canvas.height);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(1, `${COLORS.teal}20`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, canvas.height - 200, canvas.width, 200);
            // Draw particles
            game.particles.forEach(p => {
                const alpha = p.life / p.maxLife;
                ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fill();
            });
            // Draw drops
            game.drops.forEach(drop => {
                // Drop glow
                ctx.shadowBlur = 10;
                ctx.shadowColor = COLORS.amber;
                // Drop shape (teardrop)
                ctx.fillStyle = `linear-gradient(${COLORS.gold}, ${COLORS.amber})`;
                const grd = ctx.createRadialGradient(drop.x + 10, drop.y + 10, 0, drop.x + 10, drop.y + 14, 14);
                grd.addColorStop(0, COLORS.gold);
                grd.addColorStop(1, COLORS.amber);
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.ellipse(drop.x + 10, drop.y + 14, 10, 14, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            });
            // Draw basket
            const bx = game.basket.x;
            const by = canvas.height - 100;
            const bw = game.basket.width;
            // Basket rim
            ctx.fillStyle = COLORS.teal;
            ctx.fillRect(bx - 5, by, bw + 10, 3);
            // Basket body
            const basketGrad = ctx.createLinearGradient(bx, by, bx, by + 50);
            basketGrad.addColorStop(0, COLORS.teal);
            basketGrad.addColorStop(1, `${COLORS.teal}80`);
            ctx.fillStyle = basketGrad;
            ctx.beginPath();
            ctx.moveTo(bx, by + 3);
            ctx.lineTo(bx + 10, by + 50);
            ctx.lineTo(bx + bw - 10, by + 50);
            ctx.lineTo(bx + bw, by + 3);
            ctx.closePath();
            ctx.fill();
            // Basket border
            ctx.strokeStyle = COLORS.teal;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        };
        const gameLoop = (timestamp) => {
            update(timestamp);
            draw();
            animationId = requestAnimationFrame(gameLoop);
        };
        gameLoop(0);
        document.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchstart', handleTouchStart);
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
            document.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchstart', handleTouchStart);
        };
    }, []);
    // Leaderboard functions
    const loadLeaderboard = async () => {
        if (!window.PixelpitSocial)
            return;
        try {
            const lb = await window.PixelpitSocial.getLeaderboard(GAME_ID, 10);
            setLeaderboard(lb);
        }
        catch (e) {
            console.error('Failed to load leaderboard', e);
        }
    };
    const submitScore = async () => {
        if (!window.PixelpitSocial)
            return;
        const currentUser = window.PixelpitSocial.getUser();
        if (currentUser) {
            setSubmitStatus('Submitting...');
            try {
                const result = await window.PixelpitSocial.submitScore(GAME_ID, score);
                if (result.success) {
                    setSubmitStatus(`Rank #${result.rank}!`);
                }
                else {
                    setSubmitStatus('Failed to submit');
                }
            }
            catch (e) {
                setSubmitStatus('Network error');
            }
        }
        else {
            if (!playerName.trim()) {
                setSubmitStatus('Enter a name first!');
                return;
            }
            setSubmitStatus('Submitting...');
            localStorage.setItem('pixelpit_guest_name', playerName);
            try {
                const result = await window.PixelpitSocial.submitScore(GAME_ID, score, { nickname: playerName });
                if (result.success) {
                    setSubmitStatus(`Rank #${result.rank}!`);
                }
                else {
                    setSubmitStatus('Failed to submit');
                }
            }
            catch (e) {
                setSubmitStatus('Network error');
            }
        }
    };
    const handleAuth = async () => {
        if (!window.PixelpitSocial)
            return;
        setAuthError('');
        if (authMode === 'register') {
            const result = await window.PixelpitSocial.register(authHandle, authCode);
            if (result.success && result.user) {
                setUser(result.user);
                setGameState('gameover');
            }
            else {
                setAuthError(result.error || 'Registration failed');
            }
        }
        else {
            const result = await window.PixelpitSocial.login(authHandle, authCode);
            if (result.success && result.user) {
                setUser(result.user);
                setGameState('gameover');
            }
            else {
                setAuthError(result.error || 'Login failed');
            }
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(Script, { src: "/pixelpit/social.js", onLoad: () => setSocialLoaded(true) }), _jsx("style", { jsx: true, global: true, children: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${COLORS.black};
          color: ${COLORS.amber};
          font-family: 'Space Mono', monospace;
          overflow: hidden;
          touch-action: none;
          user-select: none;
        }

        button {
          transition: all 0.15s ease-out;
        }
        button:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }
        button:active {
          transform: translateY(0);
          filter: brightness(0.95);
        }

        .btn-primary {
          animation: btnPulse 2s ease-in-out infinite;
        }
        @keyframes btnPulse {
          0%, 100% { box-shadow: 0 0 20px ${COLORS.teal}60; }
          50% { box-shadow: 0 0 35px ${COLORS.teal}90; }
        }

        @keyframes textGlow {
          0%, 100% { text-shadow: 0 0 20px currentColor; }
          50% { text-shadow: 0 0 40px currentColor, 0 0 60px currentColor; }
        }
        .glow-text {
          animation: textGlow 2s ease-in-out infinite;
        }

        input:focus {
          outline: none;
          box-shadow: 0 0 20px ${COLORS.gold}50;
        }

        .heart {
          transition: opacity 0.3s;
        }
        .heart.lost {
          opacity: 0.2;
        }
      ` }), _jsx("canvas", { ref: canvasRef, style: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', cursor: 'none' } }), _jsx("button", { onClick: () => {
                    initAudio();
                    setSoundEnabled(!soundEnabled);
                    if (gameRef.current.masterGain) {
                        gameRef.current.masterGain.gain.value = soundEnabled ? 0 : 1;
                    }
                }, style: {
                    position: 'fixed',
                    top: 20,
                    right: 20,
                    zIndex: 150,
                    background: 'rgba(0,0,0,0.6)',
                    border: `1px solid ${COLORS.amber}40`,
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: COLORS.amber,
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 14,
                    cursor: 'pointer',
                    opacity: soundEnabled ? 1 : 0.5,
                }, children: soundEnabled ? '♪ SOUND' : '♪ MUTED' }), gameState === 'playing' && (_jsxs("div", { style: {
                    position: 'fixed',
                    top: 20,
                    left: 20,
                    right: 80,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    zIndex: 10,
                    pointerEvents: 'none',
                }, children: [_jsx("div", { style: {
                            fontSize: 24,
                            fontWeight: 700,
                            color: COLORS.gold,
                            textShadow: `0 0 20px ${COLORS.gold}80`,
                        }, children: score }), _jsx("div", { style: {
                            fontSize: 18,
                            color: COLORS.teal,
                            display: 'flex',
                            gap: 8,
                        }, children: [0, 1, 2].map(i => (_jsx("span", { className: `heart ${i >= lives ? 'lost' : ''}`, style: { textShadow: i < lives ? `0 0 10px ${COLORS.teal}` : 'none' }, children: "\u2665" }, i))) })] })), gameState === 'start' && (_jsxs("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `rgba(0,0,0,0.95)`,
                    zIndex: 100,
                    textAlign: 'center',
                    padding: 40,
                    gap: 20,
                }, children: [_jsx("h1", { style: {
                            fontSize: 48,
                            color: COLORS.gold,
                            textShadow: `0 0 30px ${COLORS.gold}80`,
                            marginBottom: 10,
                        }, children: "RAIN" }), _jsx("div", { style: {
                            fontSize: 16,
                            color: COLORS.amber,
                            marginBottom: 20,
                        }, children: "Catch the falling light" }), _jsxs("div", { style: {
                            fontSize: 14,
                            color: COLORS.amber,
                            maxWidth: 300,
                            lineHeight: 1.8,
                            opacity: 0.8,
                        }, children: ["Move to catch amber drops.", _jsx("br", {}), "Don't let them hit the ground.", _jsx("br", {}), "Three lives. How many can you catch?"] }), _jsx("button", { className: "btn-primary", onClick: startGame, style: {
                            background: COLORS.teal,
                            color: COLORS.black,
                            border: 'none',
                            padding: '15px 40px',
                            fontSize: 18,
                            fontWeight: 700,
                            borderRadius: 8,
                            cursor: 'pointer',
                            marginTop: 20,
                        }, children: "START" }), _jsxs("div", { style: {
                            marginTop: 30,
                            fontSize: 10,
                            fontFamily: "'Space Mono', monospace",
                            opacity: 0.6,
                        }, children: [_jsx("span", { style: { color: '#FF2D78' }, children: "PIXEL" }), _jsx("span", { style: { color: '#4ECDC4' }, children: "PIT" }), _jsx("span", { style: { color: COLORS.amber }, children: " ARCADE" })] })] })), gameState === 'gameover' && (_jsxs("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `rgba(0,0,0,0.95)`,
                    zIndex: 100,
                    textAlign: 'center',
                    padding: 40,
                }, children: [_jsx("h1", { style: {
                            fontSize: 36,
                            color: COLORS.amber,
                            marginBottom: 15,
                            textShadow: `0 0 30px ${COLORS.amber}80`,
                        }, children: "GAME OVER" }), _jsx("div", { className: "glow-text", style: {
                            fontSize: 64,
                            fontWeight: 700,
                            color: COLORS.gold,
                            marginBottom: 30,
                            textShadow: `0 0 40px ${COLORS.gold}`,
                        }, children: score }), _jsxs("div", { style: { marginBottom: 20, width: '100%', maxWidth: 300 }, children: [user ? (_jsxs("div", { style: { color: COLORS.teal, marginBottom: 10 }, children: ["Playing as @", user.handle] })) : (_jsx("input", { type: "text", placeholder: "YOUR NAME", value: playerName, onChange: (e) => setPlayerName(e.target.value), maxLength: 20, style: {
                                    width: '100%',
                                    padding: '15px 20px',
                                    fontSize: 16,
                                    fontFamily: "'Space Mono', monospace",
                                    background: `${COLORS.gold}15`,
                                    border: `2px solid ${COLORS.gold}`,
                                    color: COLORS.gold,
                                    textAlign: 'center',
                                    letterSpacing: 2,
                                    marginBottom: 10,
                                } })), _jsxs("div", { style: { display: 'flex', gap: 10, justifyContent: 'center' }, children: [_jsx("button", { onClick: submitScore, style: {
                                            background: COLORS.gold,
                                            color: COLORS.black,
                                            border: 'none',
                                            padding: '12px 25px',
                                            fontSize: 14,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            borderRadius: 4,
                                        }, children: "SUBMIT" }), !user && (_jsx("button", { onClick: () => setGameState('auth'), style: {
                                            background: 'transparent',
                                            border: `2px solid ${COLORS.amber}`,
                                            color: COLORS.amber,
                                            padding: '12px 20px',
                                            fontSize: 12,
                                            cursor: 'pointer',
                                            borderRadius: 4,
                                        }, children: "LOGIN" }))] }), submitStatus && (_jsx("div", { style: {
                                    marginTop: 10,
                                    color: submitStatus.includes('#') ? COLORS.teal : COLORS.amber,
                                    fontSize: 14,
                                }, children: submitStatus }))] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center' }, children: [_jsx("button", { className: "btn-primary", onClick: startGame, style: {
                                    background: COLORS.teal,
                                    color: COLORS.black,
                                    border: 'none',
                                    padding: '15px 40px',
                                    fontSize: 16,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    borderRadius: 8,
                                }, children: "PLAY AGAIN" }), _jsx("button", { onClick: () => {
                                    setGameState('leaderboard');
                                    loadLeaderboard();
                                }, style: {
                                    background: 'transparent',
                                    border: `2px solid ${COLORS.amber}60`,
                                    color: COLORS.amber,
                                    padding: '12px 30px',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    borderRadius: 4,
                                }, children: "LEADERBOARD" }), _jsx("div", { id: "share-btn-container", style: { marginTop: 10 } })] })] })), gameState === 'leaderboard' && (_jsxs("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `rgba(0,0,0,0.98)`,
                    zIndex: 100,
                    padding: 40,
                }, children: [_jsx("h2", { style: {
                            fontSize: 24,
                            color: COLORS.gold,
                            marginBottom: 30,
                            letterSpacing: 4,
                        }, children: "LEADERBOARD" }), _jsx("div", { style: { width: '100%', maxWidth: 400, marginBottom: 30 }, children: leaderboard.length === 0 ? (_jsx("div", { style: { color: COLORS.amber, textAlign: 'center', padding: 40, opacity: 0.6 }, children: "No scores yet. Be the first!" })) : (leaderboard.map((entry, i) => (_jsxs("div", { style: {
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 20px',
                                borderBottom: `1px solid ${COLORS.amber}20`,
                                background: i === 0 ? `${COLORS.gold}15` : 'transparent',
                            }, children: [_jsx("span", { style: { width: 30, color: i === 0 ? COLORS.gold : `${COLORS.amber}60` }, children: i + 1 }), _jsx("span", { style: {
                                        flex: 1,
                                        paddingLeft: 15,
                                        color: entry.isRegistered ? COLORS.amber : COLORS.gold,
                                        fontStyle: entry.isRegistered ? 'normal' : 'italic',
                                    }, children: entry.isRegistered ? `@${entry.name}` : entry.name }), _jsx("span", { style: { fontWeight: 700, color: COLORS.teal, fontSize: 18 }, children: entry.score.toLocaleString() })] }, i)))) }), _jsx("button", { onClick: () => setGameState('gameover'), style: {
                            background: COLORS.teal,
                            color: COLORS.black,
                            border: 'none',
                            padding: '14px 35px',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                            borderRadius: 4,
                        }, children: "BACK" })] })), gameState === 'auth' && (_jsxs("div", { style: {
                    position: 'fixed',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `rgba(0,0,0,0.98)`,
                    zIndex: 100,
                    padding: 40,
                }, children: [_jsx("h2", { style: {
                            fontSize: 20,
                            color: COLORS.teal,
                            marginBottom: 30,
                            letterSpacing: 2,
                        }, children: authMode === 'login' ? 'LOGIN' : 'SIGN UP' }), _jsxs("div", { style: { width: '100%', maxWidth: 300, marginBottom: 20 }, children: [_jsx("input", { type: "text", placeholder: "Handle", value: authHandle, onChange: (e) => setAuthHandle(e.target.value), maxLength: 20, style: {
                                    width: '100%',
                                    padding: '15px 20px',
                                    fontSize: 16,
                                    fontFamily: "'Space Mono', monospace",
                                    background: `${COLORS.teal}20`,
                                    border: `2px solid ${COLORS.teal}`,
                                    color: COLORS.amber,
                                    marginBottom: 10,
                                } }), _jsx("input", { type: "text", placeholder: "4-digit code", value: authCode, onChange: (e) => setAuthCode(e.target.value), maxLength: 4, style: {
                                    width: '100%',
                                    padding: '15px 20px',
                                    fontSize: 16,
                                    fontFamily: "'Space Mono', monospace",
                                    background: `${COLORS.teal}20`,
                                    border: `2px solid ${COLORS.teal}`,
                                    color: COLORS.amber,
                                    marginBottom: 10,
                                    letterSpacing: 8,
                                    textAlign: 'center',
                                } }), authError && (_jsx("div", { style: { color: '#FF6B6B', fontSize: 14, marginBottom: 10 }, children: authError })), _jsx("button", { onClick: handleAuth, style: {
                                    width: '100%',
                                    background: COLORS.teal,
                                    color: COLORS.black,
                                    border: 'none',
                                    padding: '15px',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    marginBottom: 15,
                                }, children: authMode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT' }), _jsx("button", { onClick: () => setAuthMode(authMode === 'login' ? 'register' : 'login'), style: {
                                    width: '100%',
                                    background: 'transparent',
                                    border: `1px solid ${COLORS.amber}40`,
                                    color: COLORS.amber,
                                    padding: '10px',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                }, children: authMode === 'login' ? 'Need an account? Sign up' : 'Have an account? Login' })] }), _jsx("button", { onClick: () => setGameState('gameover'), style: {
                            background: 'transparent',
                            border: `2px solid ${COLORS.amber}`,
                            color: COLORS.amber,
                            padding: '12px 30px',
                            fontSize: 12,
                            cursor: 'pointer',
                            marginTop: 20,
                            borderRadius: 4,
                        }, children: "BACK" })] }))] }));
}
