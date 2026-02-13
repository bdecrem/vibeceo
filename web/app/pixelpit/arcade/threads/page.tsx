'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Script from 'next/script';
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
  ShareModal,
  usePixelpitSocial,
  type ScoreFlowColors,
  type LeaderboardColors,
  type ProgressionResult,
} from '@/app/pixelpit/components';

// --- Constants ---
const GAME_ID = 'threads';
const MAX_MISTAKES = 4;
const TOTAL_SETS = 6;
const LS_KEY = 'threads_next_set';
const BASE_POINTS = 100;
const MAX_SPEED_BONUS = 99;
const WRONG_ANSWER_PENALTY = 20;
const MAX_PER_LEVEL = BASE_POINTS + MAX_SPEED_BONUS; // 199
const MAX_SCORE = MAX_PER_LEVEL * 5; // 995

// Per-level time limits: 60s for levels 1-2, 120s for levels 3-5
const LEVEL_TIME_LIMITS = [60, 60, 120, 120, 120];

const LEVEL_COLORS = ['#22d3ee', '#22c55e', '#fbbf24', '#fb923c', '#ef4444'];

const GROUP_COLORS = [
  { bg: '#fbbf24', text: '#0f172a' },
  { bg: '#22d3ee', text: '#0f172a' },
  { bg: '#a78bfa', text: '#0f172a' },
  { bg: '#f472b6', text: '#0f172a' },
];

const COLORS = {
  bg: '#0f172a',
  surface: '#1e293b',
  primary: '#fbbf24',
  secondary: '#22d3ee',
  accent: '#a78bfa',
  text: '#f8fafc',
  muted: '#94a3b8',
  mutedDark: '#64748b',
  border: '#334155',
  error: '#ef4444',
  errorLight: '#f87171',
};

const SCORE_FLOW_COLORS: ScoreFlowColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
  error: COLORS.error,
};

const LEADERBOARD_COLORS: LeaderboardColors = {
  bg: COLORS.bg,
  surface: COLORS.surface,
  primary: COLORS.primary,
  secondary: COLORS.secondary,
  text: COLORS.text,
  muted: COLORS.muted,
};

// --- Puzzle types ---
type Group = { label: string; words: string[] };
type Puzzle = { groups: Group[] };

// --- 6 Puzzle Sets, each with 5 levels ---
// SETS[setIndex][levelIndex] = Puzzle
const SETS: Puzzle[][] = [
  // Set 1
  [
    { groups: [
      { label: 'Fruits', words: ['APPLE', 'BANANA', 'GRAPE', 'ORANGE'] },
      { label: 'Colors', words: ['RED', 'BLUE', 'GREEN', 'YELLOW'] },
      { label: 'Planets', words: ['MARS', 'VENUS', 'SATURN', 'JUPITER'] },
      { label: 'Animals', words: ['DOG', 'CAT', 'HORSE', 'RABBIT'] },
    ]},
    { groups: [
      { label: 'Keyboard shortcuts', words: ['COPY', 'PASTE', 'UNDO', 'SAVE'] },
      { label: 'Coffee drinks', words: ['LATTE', 'MOCHA', 'DRIP', 'ESPRESSO'] },
      { label: 'Card games', words: ['BRIDGE', 'SNAP', 'WAR', 'HEARTS'] },
      { label: 'Things with strings', words: ['GUITAR', 'PUPPET', 'KITE', 'BOW'] },
    ]},
    { groups: [
      { label: 'Music genres', words: ['HOUSE', 'METAL', 'SOUL', 'COUNTRY'] },
      { label: '___ light', words: ['FLASH', 'MOON', 'SPOT', 'GREEN'] },
      { label: 'Internet slang', words: ['LOL', 'BRB', 'TBH', 'GOAT'] },
      { label: 'Types of test', words: ['BLOOD', 'STRESS', 'UNIT', 'FIELD'] },
    ]},
    { groups: [
      { label: '___ code', words: ['ZIP', 'AREA', 'SOURCE', 'DRESS'] },
      { label: 'Things that crash', words: ['WAVE', 'MARKET', 'PARTY', 'BROWSER'] },
      { label: 'Things that bounce', words: ['BALL', 'CHECK', 'EMAIL', 'IDEA'] },
      { label: 'Poker terms', words: ['FOLD', 'RAISE', 'BLUFF', 'FLUSH'] },
    ]},
    { groups: [
      { label: 'Can follow BACK', words: ['FIRE', 'TRACK', 'HAND', 'STAGE'] },
      { label: 'Can follow BREAK', words: ['FAST', 'DOWN', 'THROUGH', 'WATER'] },
      { label: '___ point', words: ['GUN', 'POWER', 'CHECK', 'VIEW'] },
      { label: 'Hide another word', words: ['CLAMBER', 'PIRATE', 'PLUMBER', 'STARCH'] },
    ]},
  ],
  // Set 2
  [
    { groups: [
      { label: 'Body parts', words: ['ARM', 'LEG', 'HEAD', 'FOOT'] },
      { label: 'Weather', words: ['RAIN', 'SNOW', 'WIND', 'HAIL'] },
      { label: 'Furniture', words: ['CHAIR', 'TABLE', 'DESK', 'BED'] },
      { label: 'Sports', words: ['TENNIS', 'SOCCER', 'GOLF', 'HOCKEY'] },
    ]},
    { groups: [
      { label: 'Breakfast items', words: ['TOAST', 'WAFFLE', 'BAGEL', 'CEREAL'] },
      { label: 'Shades of blue', words: ['NAVY', 'SKY', 'ROYAL', 'BABY'] },
      { label: 'Things in a wallet', words: ['CASH', 'CARD', 'LICENSE', 'RECEIPT'] },
      { label: 'Modes of transport', words: ['BUS', 'TRAIN', 'FERRY', 'TAXI'] },
    ]},
    { groups: [
      { label: 'Units of time', words: ['SECOND', 'MINUTE', 'QUARTER', 'SEASON'] },
      { label: 'Data structures', words: ['TREE', 'STACK', 'QUEUE', 'MAP'] },
      { label: 'Double ___', words: ['DUTCH', 'DOWN', 'CHECK', 'TAKE'] },
      { label: 'Magic words', words: ['PLEASE', 'ABRA', 'PRESTO', 'OPEN'] },
    ]},
    { groups: [
      { label: 'Ocean creatures (___fish/shark)', words: ['RAY', 'ANGEL', 'HAMMER', 'SWORD'] },
      { label: 'Rock ___', words: ['CLIMB', 'BAND', 'BOTTOM', 'SOLID'] },
      { label: 'Famous ___ Park', words: ['CENTRAL', 'HYDE', 'JURASSIC', 'FENWAY'] },
      { label: 'Pasta shapes', words: ['BOW TIE', 'SHELL', 'ELBOW', 'PENNE'] },
    ]},
    { groups: [
      { label: 'Anagram of a color', words: ['IRED', 'LUBE', 'NIKT', 'DERANGE'] },
      { label: 'Slang for money', words: ['BREAD', 'DOUGH', 'CHEDDAR', 'PAPER'] },
      { label: '___ room', words: ['BATH', 'CHAT', 'BOARD', 'SHOW'] },
      { label: 'Words before FLY', words: ['BAR', 'BUTTER', 'MAY', 'FIRE'] },
    ]},
  ],
  // Set 3
  [
    { groups: [
      { label: 'Months', words: ['MARCH', 'JUNE', 'APRIL', 'AUGUST'] },
      { label: 'Instruments', words: ['PIANO', 'DRUMS', 'VIOLIN', 'FLUTE'] },
      { label: 'Vegetables', words: ['CARROT', 'ONION', 'PEPPER', 'CELERY'] },
      { label: 'Shapes', words: ['CIRCLE', 'SQUARE', 'STAR', 'DIAMOND'] },
    ]},
    { groups: [
      { label: 'Currencies', words: ['DOLLAR', 'EURO', 'POUND', 'YEN'] },
      { label: 'Dances', words: ['SALSA', 'TANGO', 'WALTZ', 'SWING'] },
      { label: 'Kitchen tools', words: ['WHISK', 'LADLE', 'TONGS', 'GRATER'] },
      { label: 'Board games', words: ['CHESS', 'RISK', 'CLUE', 'LIFE'] },
    ]},
    { groups: [
      { label: 'Parts of a shoe', words: ['SOLE', 'TONGUE', 'HEEL', 'LACE'] },
      { label: 'Types of chart', words: ['BAR', 'PIE', 'LINE', 'FLOW'] },
      { label: 'Things that tick', words: ['CLOCK', 'BOMB', 'BOX', 'HEART'] },
      { label: 'Planet ___', words: ['FITNESS', 'EARTH', 'HOLLYWOOD', 'MONEY'] },
    ]},
    { groups: [
      { label: 'Things that are pitched', words: ['TENT', 'VOICE', 'SALE', 'BALL'] },
      { label: 'Cloud ___', words: ['NINE', 'BURST', 'ATLAS', 'STORAGE'] },
      { label: 'Silent first letter', words: ['KNIGHT', 'GNOME', 'PSALM', 'WRIST'] },
      { label: 'Sounds like a number', words: ['WON', 'ATE', 'FORE', 'SEW'] },
    ]},
    { groups: [
      { label: 'Contains a day', words: ['SUNBURN', 'MONDAY', 'FRIED', 'SATURN'] },
      { label: 'Two-word compound (___ball)', words: ['BASE', 'SNOW', 'EYE', 'FIRE'] },
      { label: 'Famous Johns', words: ['LEGEND', 'WAYNE', 'LENNON', 'WICK'] },
      { label: 'Sounds like food', words: ['BERRY', 'STEAK', 'LEEK', 'THYME'] },
    ]},
  ],
  // Set 4
  [
    { groups: [
      { label: 'Simpsons family', words: ['HOMER', 'BART', 'MARGE', 'LISA'] },
      { label: 'Disney princesses', words: ['BELLE', 'ARIEL', 'MULAN', 'ELSA'] },
      { label: 'One-word Pixar films', words: ['UP', 'COCO', 'BRAVE', 'CARS'] },
      { label: 'NBA teams', words: ['HEAT', 'JAZZ', 'NETS', 'SUNS'] },
    ]},
    { groups: [
      { label: 'Rappers', words: ['NAS', 'DRAKE', 'KANYE', 'NICKI'] },
      { label: "'90s sitcoms", words: ['FRIENDS', 'FRASIER', 'CHEERS', 'SCRUBS'] },
      { label: 'Dog breeds', words: ['PUG', 'CORGI', 'HUSKY', 'BEAGLE'] },
      { label: 'Cocktails', words: ['COSMO', 'MOJITO', 'GIMLET', 'NEGRONI'] },
    ]},
    { groups: [
      { label: 'WWE ring names', words: ['ROCK', 'EDGE', 'STING', 'KANE'] },
      { label: 'Fonts', words: ['ARIAL', 'IMPACT', 'FUTURA', 'COURIER'] },
      { label: 'Types of post', words: ['MEME', 'TWEET', 'CLIP', 'REEL'] },
      { label: 'Cooking methods', words: ['SEAR', 'BROIL', 'ROAST', 'POACH'] },
    ]},
    { groups: [
      { label: 'Taylor Swift songs', words: ['STYLE', 'KARMA', 'WILLOW', 'CARDIGAN'] },
      { label: 'Trees', words: ['ELDER', 'ASH', 'CEDAR', 'PALM'] },
      { label: 'Pok\u00e9mon trainers', words: ['MISTY', 'BROCK', 'DAWN', 'GARY'] },
      { label: 'Words for fate', words: ['LUCK', 'DOOM', 'DESTINY', 'FORTUNE'] },
    ]},
    { groups: [
      { label: '___ man', words: ['SPIDER', 'BAT', 'PAC', 'SAND'] },
      { label: 'Hides an animal', words: ['MANTRA', 'RAMPANT', 'FOXGLOVE', 'SCOWL'] },
      { label: '___ time', words: ['PRIME', 'MEAN', 'HALF', 'OVER'] },
      { label: 'Reads backward as a word', words: ['LIVE', 'DRAW', 'LIAR', 'DOOM'] },
    ]},
  ],
  // Set 5
  [
    { groups: [
      { label: 'Mario characters', words: ['MARIO', 'LUIGI', 'PEACH', 'TOAD'] },
      { label: 'Seinfeld characters', words: ['JERRY', 'GEORGE', 'ELAINE', 'KRAMER'] },
      { label: 'Zodiac signs', words: ['LEO', 'VIRGO', 'ARIES', 'GEMINI'] },
      { label: 'Cheeses', words: ['BRIE', 'GOUDA', 'SWISS', 'FETA'] },
    ]},
    { groups: [
      { label: 'Marvel characters', words: ['THOR', 'HULK', 'GROOT', 'DRAX'] },
      { label: 'Sandwich types', words: ['CLUB', 'REUBEN', 'CUBAN', 'WRAP'] },
      { label: 'Apps', words: ['UBER', 'VENMO', 'TINDER', 'SHAZAM'] },
      { label: 'Bands', words: ['WHAM', 'DEVO', 'RUSH', 'QUEEN'] },
    ]},
    { groups: [
      { label: 'British slang', words: ['MATE', 'CHEEKY', 'DODGY', 'GUTTED'] },
      { label: 'Gym exercises', words: ['PLANK', 'LUNGE', 'SQUAT', 'CRUNCH'] },
      { label: 'Noodle types', words: ['RAMEN', 'UDON', 'SOBA', 'PHO'] },
      { label: '___ drop', words: ['MIC', 'NAME', 'BEAT', 'JAW'] },
    ]},
    { groups: [
      { label: 'Flat ___', words: ['NOTE', 'TIRE', 'IRON', 'SCREEN'] },
      { label: 'Blind ___', words: ['SIDE', 'DATE', 'ITEM', 'TRUST'] },
      { label: 'Raw ___', words: ['DEAL', 'TALENT', 'NERVE', 'HIDE'] },
      { label: 'Long ___', words: ['SHOT', 'ISLAND', 'HAUL', 'HORN'] },
    ]},
    { groups: [
      { label: 'Starts with a solf\u00e8ge note', words: ['DOJO', 'REEF', 'MISSILE', 'FABRIC'] },
      { label: 'Silent final letter', words: ['DEBRIS', 'BALLET', 'COUP', 'DEPOT'] },
      { label: 'Famous trios (one member)', words: ['ATHOS', 'LARRY', 'ALVIN', 'HUEY'] },
      { label: '___ night', words: ['LATE', 'GOOD', 'MID', 'FORT'] },
    ]},
  ],
  // Set 6
  [
    { groups: [
      { label: 'The Office characters', words: ['JIM', 'PAM', 'DWIGHT', 'KEVIN'] },
      { label: 'Greek gods', words: ['ZEUS', 'HERA', 'ATHENA', 'APOLLO'] },
      { label: 'Condiments', words: ['KETCHUP', 'MUSTARD', 'MAYO', 'RELISH'] },
      { label: 'Toy Story characters', words: ['WOODY', 'BUZZ', 'REX', 'SLINKY'] },
    ]},
    { groups: [
      { label: 'Game consoles', words: ['WII', 'XBOX', 'ATARI', 'SEGA'] },
      { label: 'Sauces', words: ['RANCH', 'PESTO', 'AIOLI', 'GRAVY'] },
      { label: 'Sneaker brands', words: ['NIKE', 'PUMA', 'VANS', 'ASICS'] },
      { label: 'Horror films', words: ['PSYCHO', 'JAWS', 'SCREAM', 'SAW'] },
    ]},
    { groups: [
      { label: 'Fashion compliments', words: ['DRIP', 'FIT', 'SLAY', 'SERVE'] },
      { label: 'Tennis terms', words: ['ACE', 'DEUCE', 'LOVE', 'RALLY'] },
      { label: 'Internet culture', words: ['RATIO', 'STAN', 'TROLL', 'CANCEL'] },
      { label: 'Baking terms', words: ['PROOF', 'KNEAD', 'BLOOM', 'TEMPER'] },
    ]},
    { groups: [
      { label: 'Countries that are also words', words: ['TURKEY', 'CHILE', 'CHAD', 'JORDAN'] },
      { label: "'90s NBA legends", words: ['PIPPEN', 'MALONE', 'BARKLEY', 'SHAQ'] },
      { label: 'Thanksgiving', words: ['STUFFING', 'CIDER', 'PILGRIM', 'YAM'] },
      { label: 'Spicy peppers', words: ['CAYENNE', 'WASABI', 'HABANERO', 'TABASCO'] },
    ]},
    { groups: [
      { label: '___ house', words: ['WARE', 'BIRD', 'ROAD', 'ROUGH'] },
      { label: 'Go ___', words: ['FISH', 'FIGURE', 'PRO', 'VIRAL'] },
      { label: 'Famous duos (one half)', words: ['BONNIE', 'THELMA', 'SONNY', 'PENN'] },
      { label: 'Famous Steves', words: ['JOBS', 'MARTIN', 'HARVEY', 'IRWIN'] },
    ]},
  ],
];

// --- localStorage helpers ---
function getNextSetIndex(): number {
  if (typeof window === 'undefined') return 0;
  const val = localStorage.getItem(LS_KEY);
  return val ? parseInt(val, 10) : 0;
}

function burnSet(setIndex: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, String(setIndex + 1));
}

// --- Word tile type ---
type WordTile = { text: string; group: number };

// --- Level score type ---
type LevelScore = { base: number; timeBonus: number; cleared: boolean };

export default function ThreadsGame() {
  // --- State ---
  const [gameState, setGameState] = useState<'title' | 'playing' | 'level-complete' | 'reveal' | 'game-over' | 'leaderboard'>('title');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [levelScores, setLevelScores] = useState<LevelScore[]>([]);
  const [words, setWords] = useState<WordTile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [solved, setSolved] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [previousGuesses, setPreviousGuesses] = useState<string[]>([]);
  const [levelActive, setLevelActive] = useState(false);
  const [timerPct, setTimerPct] = useState(1);
  const [timerText, setTimerText] = useState('');
  const [message, setMessageState] = useState<{ text: string; type: string }>({ text: '', type: '' });
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [lcInfo, setLcInfo] = useState({ title: '', color: '', base: 0, timeBonus: 0, total: 0, runningTotal: 0 });
  const [shakeIds, setShakeIds] = useState<string[]>([]);
  const [popIds, setPopIds] = useState<string[]>([]);
  const [setsUsed, setSetsUsed] = useState(0);
  const allSetsPlayed = setsUsed >= TOTAL_SETS;

  // Social state
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [submittedEntryId, setSubmittedEntryId] = useState<number | null>(null);
  const [progression, setProgression] = useState<ProgressionResult | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const { user } = usePixelpitSocial(socialLoaded);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerStartRef = useRef(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelActiveRef = useRef(false);
  const totalScoreRef = useRef(0);
  const currentLevelRef = useRef(0);
  const currentSetRef = useRef(0);
  const setBurnedRef = useRef(false);
  const levelClearedRef = useRef(false);

  // Music state
  const [musicOn, setMusicOn] = useState(true);
  const musicOnRef = useRef(true);
  const musicPlayingRef = useRef(false);
  const musicIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const musicStepRef = useRef(0);
  const musicGainRef = useRef<GainNode | null>(null);

  const GAME_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}`
    : `https://pixelpit.io/pixelpit/arcade/${GAME_ID}`;

  // Read localStorage on mount
  useEffect(() => {
    setSetsUsed(getNextSetIndex());
  }, []);

  // --- Audio ---
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
  }, []);

  const playTone = useCallback((freq: number, dur: number, type: OscillatorType = 'sine') => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }, []);

  // --- Music engine (mellow electronic) ---
  const musicFilterRef = useRef<BiquadFilterNode | null>(null);
  const musicLfoStepRef = useRef(0);

  const MUSIC = {
    bpm: 84,
    // Wide-voiced chords (root spread across octaves for depth)
    // Each chord = 32 steps (2 bars). Pad tones + sub bass root.
    chords: [
      { pad: [220, 330, 494, 659], sub: 55 },    // Am9: A3 E4 B4 E5, sub A1
      { pad: [175, 262, 440, 659], sub: 43.6 },   // Fmaj9: F3 C4 A4 E5, sub F1
      { pad: [147, 220, 370, 587], sub: 36.7 },   // Dm9: D3 A3 F#4 D5, sub D1
      { pad: [165, 247, 392, 587], sub: 41.2 },   // Em9: E3 B3 G4 D5, sub E1
    ],
    // Arp sequence: Am pentatonic melody with rests (0 = rest)
    arp: [
      659, 0, 784, 0, 0, 587, 0, 0, 880, 0, 0, 659, 0, 784, 0, 0,
      587, 0, 0, 440, 0, 0, 523, 0, 0, 0, 659, 0, 0, 0, 0, 0,
    ],
    // Soft rhythmic pulse pattern (1 = tick)
    pulse: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
  };

  // Warm pad: 3 detuned oscillators per tone through shared filter
  const playPad = useCallback((tones: number[]) => {
    const ctx = audioCtxRef.current;
    const master = musicGainRef.current;
    if (!ctx || !master || !musicOnRef.current) return;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.7;
    filter.connect(master);
    // Slow filter open over the chord's duration
    filter.frequency.setValueAtTime(600, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(1400, ctx.currentTime + 2.5);
    filter.frequency.linearRampToValueAtTime(700, ctx.currentTime + 5);

    tones.forEach((freq, i) => {
      // 3 detuned oscillators per voice for thickness
      [-7, 0, 7].forEach((detune, di) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = di === 1 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        osc.detune.value = detune + (i * 1.5); // spread detuning per voice
        // Slow attack, long sustain, gentle release
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.012, ctx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.012, ctx.currentTime + 3.5);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 5.5);
        osc.connect(gain);
        gain.connect(filter);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 5.8);
      });
    });
  }, []);

  // Sub bass: deep sine with gentle envelope
  const playSub = useCallback((freq: number) => {
    const ctx = audioCtxRef.current;
    const master = musicGainRef.current;
    if (!ctx || !master || !musicOnRef.current) return;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 120;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.15, ctx.currentTime + 3);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 5);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 5.2);
  }, []);

  // Filtered arp with delay echoes
  const playArpNote = useCallback((freq: number) => {
    const ctx = audioCtxRef.current;
    const master = musicGainRef.current;
    if (!ctx || !master || !musicOnRef.current) return;
    const stepSec = 60 / MUSIC.bpm / 4;
    // Play note + 2 delay echoes (quieter each time)
    [0, stepSec * 3, stepSec * 6].forEach((delay, i) => {
      const vol = [0.04, 0.02, 0.01][i];
      const cutoff = [2800, 1800, 1000][i]; // filter closes on echoes
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = cutoff;
      filter.Q.value = 2;
      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.5);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.55);
    });
  }, []);

  // Soft rhythmic texture (filtered noise click)
  const playPulse = useCallback(() => {
    const ctx = audioCtxRef.current;
    const master = musicGainRef.current;
    if (!ctx || !master || !musicOnRef.current) return;
    const len = ctx.sampleRate * 0.06;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 4000;
    bp.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.015, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    src.connect(bp);
    bp.connect(gain);
    gain.connect(master);
    src.start();
  }, []);

  const musicTick = useCallback(() => {
    if (!musicPlayingRef.current || !musicOnRef.current) return;
    const step = musicStepRef.current;
    const barStep = step % 16;

    // Pad + sub: every 2 bars (32 steps)
    if (step % 32 === 0) {
      const ci = Math.floor(step / 32) % MUSIC.chords.length;
      playPad(MUSIC.chords[ci].pad);
      playSub(MUSIC.chords[ci].sub);
    }

    // Arp melody
    const arpNote = MUSIC.arp[step % MUSIC.arp.length];
    if (arpNote > 0) playArpNote(arpNote);

    // Rhythmic pulse texture
    if (MUSIC.pulse[barStep]) playPulse();

    musicStepRef.current++;
  }, [playPad, playSub, playArpNote, playPulse]);

  const startMusic = useCallback(() => {
    if (musicPlayingRef.current) return;
    initAudio();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (!musicGainRef.current) {
      musicGainRef.current = ctx.createGain();
      musicGainRef.current.gain.value = 1;
      musicGainRef.current.connect(ctx.destination);
    }
    musicPlayingRef.current = true;
    musicStepRef.current = 0;
    const stepTime = (60 / MUSIC.bpm) * 1000 / 4;
    musicIntervalRef.current = setInterval(musicTick, stepTime);
  }, [initAudio, musicTick]);

  const stopMusic = useCallback(() => {
    musicPlayingRef.current = false;
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicOn(prev => {
      const next = !prev;
      musicOnRef.current = next;
      return next;
    });
  }, []);

  // --- Group code detection on mount ---
  useEffect(() => {
    if (!socialLoaded || typeof window === 'undefined') return;
    if (!window.PixelpitSocial) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) {
      window.PixelpitSocial.logout();
      params.delete('logout');
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      window.location.reload();
      return;
    }

    const groupCode = window.PixelpitSocial.getGroupCodeFromUrl();
    if (groupCode) {
      window.PixelpitSocial.storeGroupCode(groupCode);
    }
  }, [socialLoaded]);

  // --- Message auto-clear ---
  const setMessage = useCallback((text: string, type: string = '') => {
    setMessageState({ text, type });
    if (text) {
      setTimeout(() => {
        setMessageState(prev => prev.text === text ? { text: '', type: '' } : prev);
      }, 2000);
    }
  }, []);

  // --- Shuffle helper ---
  const shuffleArray = useCallback(<T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  // --- Timer ---
  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const getElapsed = useCallback(() => {
    return (Date.now() - timerStartRef.current) / 1000;
  }, []);

  // --- End run (go to game-over) ---
  const endRun = useCallback((allCleared: boolean) => {
    levelActiveRef.current = false;
    setLevelActive(false);
    stopTimer();
    stopMusic();

    setLevelScores(prev => {
      const padded = [...prev];
      while (padded.length < 5) {
        padded.push({ base: 0, timeBonus: 0, cleared: false });
      }
      return padded;
    });

    // Analytics
    if (totalScoreRef.current >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }

    // Re-read localStorage to update title screen
    setSetsUsed(getNextSetIndex());
    setGameState('game-over');
  }, [stopTimer, stopMusic]);

  // --- Show reveal screen (answers shown, user must dismiss) ---
  const showRevealScreen = useCallback(() => {
    levelActiveRef.current = false;
    setLevelActive(false);
    stopTimer();
    stopMusic();
    if (currentPuzzle) {
      revealAll(currentPuzzle, solved);
    }
    setGameState('reveal');
  }, [stopTimer, stopMusic, currentPuzzle, solved, revealAll]);

  // --- Quit game (from playing) ---
  const quitGame = useCallback(() => {
    // Burn the set if not already burned
    if (!setBurnedRef.current) {
      setBurnedRef.current = true;
      burnSet(currentSetRef.current);
    }
    showRevealScreen();
  }, [showRevealScreen]);

  // --- Dismiss reveal screen and go to game-over ---
  const dismissReveal = useCallback(() => {
    setLevelScores(prev => {
      const padded = [...prev];
      while (padded.length < 5) {
        padded.push({ base: 0, timeBonus: 0, cleared: false });
      }
      return padded;
    });

    // Analytics
    if (totalScoreRef.current >= 1) {
      fetch('/api/pixelpit/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID }),
      }).catch(() => {});
    }

    setSetsUsed(getNextSetIndex());
    setGameState('game-over');
  }, []);

  // --- Reveal all unsolved groups ---
  const revealAll = useCallback((puzzle: Puzzle, currentSolved: number[]) => {
    const allGroups: number[] = [...currentSolved];
    for (let gi = 0; gi < puzzle.groups.length; gi++) {
      if (!allGroups.includes(gi)) allGroups.push(gi);
    }
    setSolved(allGroups);
    setWords([]);
    setSelected([]);
  }, []);

  // --- Start level ---
  const startLevel = useCallback((level: number) => {
    levelClearedRef.current = false; // reset guard for next level
    currentLevelRef.current = level;
    setCurrentLevel(level);
    const puzzle = SETS[currentSetRef.current][level];
    setCurrentPuzzle(puzzle);

    const newWords: WordTile[] = [];
    puzzle.groups.forEach((g, gi) => {
      g.words.forEach(w => newWords.push({ text: w, group: gi }));
    });

    setSolved([]);
    setSelected([]);
    setMistakes(0);
    setPreviousGuesses([]);
    setLevelActive(true);
    levelActiveRef.current = true;
    setWords(shuffleArray(newWords));
    setMessage('');

    // Start timer (per-level time limit)
    const timeLimit = LEVEL_TIME_LIMITS[level] || 60;
    timerStartRef.current = Date.now();
    stopTimer();
    timerIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - timerStartRef.current) / 1000;
      const remaining = Math.max(0, timeLimit - elapsed);
      const pct = remaining / timeLimit;
      setTimerPct(pct);
      setTimerText(remaining.toFixed(1) + 's');

      if (remaining <= 0 && levelActiveRef.current) {
        levelActiveRef.current = false;
        setLevelActive(false);
        clearInterval(timerIntervalRef.current!);
        timerIntervalRef.current = null;
        playTone(150, 0.4, 'sawtooth');
        revealAll(puzzle, []);
        setGameState('reveal');
      }
    }, 100);
  }, [shuffleArray, stopTimer, playTone, setMessage, revealAll, endRun]);

  // --- Silent leaderboard update (logged-in users only) ---
  const silentScoreSubmit = useCallback((runningTotal: number) => {
    if (!user || typeof window === 'undefined' || !window.PixelpitSocial?.submitScore) return;
    window.PixelpitSocial.submitScore(GAME_ID, runningTotal, { maxScore: MAX_SCORE }).catch(() => {});
  }, [user]);

  // --- Level cleared ---
  const levelCleared = useCallback(() => {
    // Guard against double-invocation (React StrictMode)
    if (levelClearedRef.current) return;
    levelClearedRef.current = true;

    levelActiveRef.current = false;
    setLevelActive(false);
    stopTimer();

    // Capture level now — don't read ref inside timeouts
    const level = currentLevelRef.current;

    const elapsed = getElapsed();
    // Speed bonus: scaled to level's time limit (same 0-99 range regardless of limit)
    const timeLimit = LEVEL_TIME_LIMITS[level] || 60;
    const speedBonus = Math.max(0, MAX_SPEED_BONUS - Math.floor(elapsed * 60 / timeLimit));
    const levelTotal = BASE_POINTS + speedBonus;

    totalScoreRef.current += levelTotal;
    setTotalScore(totalScoreRef.current);
    setLevelScores(prev => [...prev, { base: BASE_POINTS, timeBonus: speedBonus, cleared: true }]);

    // Silent leaderboard update after each level
    silentScoreSubmit(totalScoreRef.current);

    // Victory sound
    playTone(523, 0.1);
    setTimeout(() => playTone(659, 0.1), 80);
    setTimeout(() => playTone(784, 0.12), 160);
    setTimeout(() => playTone(1047, 0.2), 260);

    // Show level complete overlay
    setLcInfo({
      title: level === 4 ? 'ALL CLEAR!' : 'LEVEL CLEAR',
      color: LEVEL_COLORS[level],
      base: BASE_POINTS,
      timeBonus: speedBonus,
      total: levelTotal,
      runningTotal: totalScoreRef.current,
    });
    setGameState('level-complete');

    if (level === 4) {
      setTimeout(() => {
        endRun(true);
      }, 2000);
    }
    // Levels 0-3: user chooses NEXT or DONE via overlay buttons
  }, [stopTimer, getElapsed, playTone, endRun, silentScoreSubmit]);

  // --- Advance to next level (from level-complete overlay) ---
  const advanceLevel = useCallback(() => {
    const level = currentLevelRef.current;
    if (level < 4) {
      setGameState('playing');
      startLevel(level + 1);
    }
  }, [startLevel]);

  // --- Start run ---
  const startRun = useCallback(() => {
    const setIndex = getNextSetIndex();
    if (setIndex >= TOTAL_SETS) return; // all sets played
    currentSetRef.current = setIndex;
    setBurnedRef.current = false;

    initAudio();
    startMusic();
    totalScoreRef.current = 0;
    setTotalScore(0);
    setLevelScores([]);
    setSubmittedEntryId(null);
    setProgression(null);
    setShowShareModal(false);
    setGameState('playing');
    startLevel(0);
  }, [initAudio, startMusic, startLevel]);

  // --- Tile toggle ---
  const toggleSelect = useCallback((word: string) => {
    if (!levelActiveRef.current) return;
    initAudio();
    setSelected(prev => {
      if (prev.includes(word)) {
        playTone(400, 0.06, 'sine');
        return prev.filter(w => w !== word);
      } else if (prev.length < 4) {
        playTone(500 + (prev.length + 1) * 80, 0.08, 'sine');
        return [...prev, word];
      }
      return prev;
    });
  }, [initAudio, playTone]);

  // --- Submit guess ---
  const submitGuess = useCallback(() => {
    if (selected.length !== 4 || !levelActiveRef.current || !currentPuzzle) return;

    // Burn the set on first submit
    if (!setBurnedRef.current) {
      setBurnedRef.current = true;
      burnSet(currentSetRef.current);
    }

    const sortedGuess = [...selected].sort().join(',');
    if (previousGuesses.includes(sortedGuess)) {
      setMessage('Already guessed!', 'error');
      return;
    }
    setPreviousGuesses(prev => [...prev, sortedGuess]);

    let matchedGroup = -1;
    for (let gi = 0; gi < currentPuzzle.groups.length; gi++) {
      if (solved.includes(gi)) continue;
      const groupWords = currentPuzzle.groups[gi].words;
      const overlap = selected.filter(w => groupWords.includes(w));
      if (overlap.length === 4) {
        matchedGroup = gi;
        break;
      }
    }

    if (matchedGroup >= 0) {
      // Correct!
      const matchedSelected = [...selected];
      setPopIds(matchedSelected);
      playTone(523, 0.08);
      setTimeout(() => playTone(659, 0.08), 60);
      setTimeout(() => playTone(784, 0.12), 120);

      setTimeout(() => {
        setPopIds([]);
        setSolved(prev => {
          const newSolved = [...prev, matchedGroup];
          if (newSolved.length === 4) {
            setTimeout(() => levelCleared(), 50);
          }
          return newSolved;
        });
        setWords(prev => prev.filter(w => w.group !== matchedGroup));
        setSelected([]);
      }, 300);
    } else {
      // Wrong
      let oneAway = false;
      for (let gi = 0; gi < currentPuzzle.groups.length; gi++) {
        if (solved.includes(gi)) continue;
        const groupWords = currentPuzzle.groups[gi].words;
        if (selected.filter(w => groupWords.includes(w)).length === 3) {
          oneAway = true;
          break;
        }
      }

      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      // Penalty for wrong answer
      totalScoreRef.current = Math.max(0, totalScoreRef.current - WRONG_ANSWER_PENALTY);
      setTotalScore(totalScoreRef.current);
      playTone(200, 0.2, 'triangle');

      setShakeIds([...selected]);
      setTimeout(() => setShakeIds([]), 400);

      setMessage(oneAway ? 'One away... −20' : 'Not quite... −20', oneAway ? 'flash' : 'error');

      if (newMistakes >= MAX_MISTAKES) {
        levelActiveRef.current = false;
        setLevelActive(false);
        stopTimer();
        setTimeout(() => {
          revealAll(currentPuzzle, solved);
          setGameState('reveal');
        }, 500);
      } else {
        setTimeout(() => setSelected([]), 400);
      }
    }
  }, [selected, currentPuzzle, previousGuesses, solved, mistakes, playTone, setMessage, levelCleared, stopTimer, revealAll, endRun]);

  // --- Back to title ---
  const backToTitle = useCallback(() => {
    stopTimer();
    stopMusic();
    setSetsUsed(getNextSetIndex());
    setGameState('title');
  }, [stopTimer, stopMusic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopTimer(); stopMusic(); };
  }, [stopTimer, stopMusic]);

  // Pad level scores for display
  const displayScores = [...levelScores];
  while (displayScores.length < 5) {
    displayScores.push({ base: 0, timeBonus: 0, cleared: false });
  }

  const allCleared = levelScores.length === 5 && levelScores.every(ls => ls.cleared);

  return (
    <>
      <Script
        src="/pixelpit/social.js"
        onLoad={() => setSocialLoaded(true)}
      />

      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          background: ${COLORS.bg};
          color: ${COLORS.text};
          font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
          min-height: 100vh;
          min-height: 100dvh;
          overflow-x: hidden;
          touch-action: manipulation;
          -webkit-user-select: none;
          user-select: none;
        }
        @keyframes tileShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes popOut {
          to { opacity: 0; transform: scale(0.5); }
        }
        @keyframes solvedIn {
          from { opacity: 0; transform: scale(0.9) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* --- TITLE SCREEN --- */}
      {gameState === 'title' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 24,
          padding: 20,
        }}>
          <h1 style={{
            fontSize: 'clamp(40px, 10vw, 64px)',
            letterSpacing: 12,
            color: COLORS.primary,
            textShadow: '0 0 30px #fbbf2440',
            fontFamily: 'inherit',
          }}>
            THREADS
          </h1>
          <div style={{ fontSize: 13, color: COLORS.mutedDark, letterSpacing: 3 }}>
            FIND THE FOUR GROUPS
          </div>
          <div style={{
            maxWidth: 320,
            textAlign: 'center',
            fontSize: 13,
            color: COLORS.muted,
            lineHeight: 1.6,
          }}>
            16 words. 4 hidden groups.<br />
            Clear 5 levels. Each one harder.<br />
            100 pts per level + up to 99 speed bonus.<br />
            −20 per wrong answer.
          </div>
          <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
            {LEVEL_COLORS.map((c, i) => (
              <div key={i} style={{
                width: 10, height: 10,
                borderRadius: 3,
                background: c,
              }} />
            ))}
          </div>

          {allSetsPlayed ? (
            <>
              <div style={{
                fontSize: 16, color: COLORS.muted,
                letterSpacing: 2, textAlign: 'center',
              }}>
                ALL 6 SETS PLAYED
              </div>
              <div style={{
                fontSize: 12, color: COLORS.mutedDark,
                letterSpacing: 1, textAlign: 'center',
              }}>
                Check the leaderboard to see how you did.
              </div>
            </>
          ) : (
            <>
              <button
                onClick={startRun}
                style={{
                  padding: '16px 48px',
                  borderRadius: 12,
                  border: 'none',
                  background: COLORS.primary,
                  color: COLORS.bg,
                  fontFamily: 'inherit',
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: 4,
                  cursor: 'pointer',
                }}
              >
                PLAY
              </button>
              <div style={{ fontSize: 11, color: COLORS.mutedDark, letterSpacing: 1 }}>
                SET {setsUsed + 1} OF {TOTAL_SETS}
              </div>
            </>
          )}
          <div style={{
            marginTop: 20,
            fontSize: 10,
            color: '#475569',
            letterSpacing: 2,
          }}>
            PIXELPIT ARCADE
          </div>
        </div>
      )}

      {/* --- PLAYING SCREEN --- */}
      {(gameState === 'playing' || gameState === 'level-complete') && (
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
        }}>
          {/* Top bar */}
          <div style={{
            width: 'min(92vw, 440px)',
            marginTop: 'clamp(10px, 2vh, 20px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={quitGame}
                style={{
                  background: 'none',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 4,
                  padding: '4px 8px',
                  fontSize: 10,
                  color: COLORS.mutedDark,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  letterSpacing: 1,
                }}
              >
                QUIT
              </button>
              <div style={{ fontSize: 12, letterSpacing: 2, color: COLORS.muted }}>
                LEVEL <span style={{ color: LEVEL_COLORS[currentLevel] || COLORS.primary, fontWeight: 700 }}>{currentLevel + 1}</span>
                <span style={{ color: COLORS.mutedDark }}> / 5</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                fontSize: 18, fontWeight: 700,
                color: COLORS.primary,
                letterSpacing: 2,
                textShadow: '0 0 12px #fbbf2430',
              }}>
                {totalScore}
              </div>
              <button
                onClick={toggleMusic}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 16, padding: 0, lineHeight: 1,
                  opacity: musicOn ? 0.7 : 0.3,
                }}
                aria-label={musicOn ? 'Mute music' : 'Unmute music'}
              >
                {musicOn ? '\u266A' : '\u2716'}
              </button>
            </div>
          </div>

          {/* Timer bar */}
          <div style={{
            width: 'min(92vw, 440px)',
            height: 6,
            background: COLORS.surface,
            borderRadius: 3,
            marginTop: 8,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              background: timerPct < 0.15 ? '#ef4444' : timerPct < 0.35 ? '#fb923c' : COLORS.secondary,
              borderRadius: 3,
              transition: 'width 0.1s linear, background 0.5s',
              width: `${timerPct * 100}%`,
            }} />
          </div>

          {/* Timer text */}
          <div style={{
            fontSize: 13, color: COLORS.mutedDark,
            marginTop: 4, letterSpacing: 1, minHeight: 18, textAlign: 'center',
          }}>
            {timerText}
          </div>

          {/* Mistakes */}
          <div style={{
            display: 'flex', gap: 8, marginTop: 6,
            justifyContent: 'center', minHeight: 16,
          }}>
            {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
              <div key={i} style={{
                width: 10, height: 10,
                borderRadius: '50%',
                background: i < mistakes ? COLORS.error : COLORS.border,
                boxShadow: i < mistakes ? '0 0 8px #ef444460' : 'none',
                transition: 'background 0.3s, box-shadow 0.3s',
              }} />
            ))}
          </div>

          {/* Message */}
          <div style={{
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            color: message.type === 'flash' ? COLORS.primary : message.type === 'error' ? COLORS.errorLight : COLORS.muted,
            marginTop: 2,
          }}>
            {message.text}
          </div>

          {/* Solved area */}
          <div style={{
            width: 'min(92vw, 440px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            marginTop: 6,
          }}>
            {solved.map(gi => {
              const g = currentPuzzle!.groups[gi];
              const color = GROUP_COLORS[gi];
              return (
                <div key={gi} style={{
                  borderRadius: 10,
                  padding: '10px 14px',
                  textAlign: 'center',
                  background: color.bg,
                  color: color.text,
                  animation: 'solvedIn 0.4s ease-out',
                }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700,
                    letterSpacing: 2, textTransform: 'uppercase',
                    marginBottom: 2,
                  }}>
                    {g.label}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>
                    {g.words.join(', ')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 5,
            width: 'min(92vw, 440px)',
            marginTop: 6,
          }}>
            {words.filter(w => !solved.includes(w.group)).map(w => {
              const isSelected = selected.includes(w.text);
              const isShaking = shakeIds.includes(w.text);
              const isPopping = popIds.includes(w.text);
              return (
                <div
                  key={w.text}
                  onClick={() => toggleSelect(w.text)}
                  style={{
                    aspectRatio: '1.6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    background: isSelected ? COLORS.primary : COLORS.surface,
                    border: `2px solid ${isSelected ? COLORS.primary : COLORS.border}`,
                    borderRadius: 10,
                    fontSize: 'clamp(11px, 2.8vw, 14px)',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    color: isSelected ? COLORS.bg : COLORS.text,
                    cursor: 'pointer',
                    padding: 4,
                    lineHeight: 1.2,
                    wordBreak: 'break-word' as const,
                    boxShadow: isSelected ? '0 0 16px #fbbf2440' : 'none',
                    animation: isPopping ? 'popOut 0.3s ease forwards' : isShaking ? 'tileShake 0.4s ease' : 'none',
                  }}
                >
                  {w.text}
                </div>
              );
            })}
          </div>

          {/* Controls */}
          <div style={{
            display: 'flex',
            gap: 8,
            marginTop: 'clamp(8px, 1.5vh, 14px)',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <button
              onClick={() => setWords(prev => shuffleArray(prev))}
              disabled={!levelActive}
              style={{
                padding: '10px 18px', borderRadius: 8,
                border: `2px solid ${COLORS.border}`,
                background: 'transparent',
                color: COLORS.text,
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                letterSpacing: 1, cursor: 'pointer',
                opacity: !levelActive ? 0.3 : 1,
              }}
            >
              SHUFFLE
            </button>
            <button
              onClick={() => setSelected([])}
              disabled={selected.length === 0 || !levelActive}
              style={{
                padding: '10px 18px', borderRadius: 8,
                border: `2px solid ${COLORS.border}`,
                background: 'transparent',
                color: COLORS.text,
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                letterSpacing: 1, cursor: 'pointer',
                opacity: (selected.length === 0 || !levelActive) ? 0.3 : 1,
              }}
            >
              DESELECT
            </button>
            <button
              onClick={submitGuess}
              disabled={selected.length !== 4 || !levelActive}
              style={{
                padding: '10px 18px', borderRadius: 8,
                border: `2px solid ${selected.length === 4 && levelActive ? COLORS.primary : COLORS.border}`,
                background: selected.length === 4 && levelActive ? COLORS.primary : COLORS.border,
                color: selected.length === 4 && levelActive ? COLORS.bg : COLORS.mutedDark,
                fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                letterSpacing: 1, cursor: 'pointer',
                opacity: (selected.length !== 4 || !levelActive) ? 0.3 : 1,
              }}
            >
              SUBMIT
            </button>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 'auto',
            padding: 12,
            fontSize: 10,
            color: '#475569',
            letterSpacing: 2,
          }}>
            PIXELPIT ARCADE
          </div>

          {/* Level complete overlay */}
          {gameState === 'level-complete' && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: '#0f172aee',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              zIndex: 100,
              animation: 'fadeIn 0.3s ease',
            }}>
              <h2 style={{
                fontSize: 28, letterSpacing: 4,
                color: lcInfo.color,
              }}>
                {lcInfo.title}
              </h2>
              <div style={{ fontSize: 16, color: COLORS.muted, letterSpacing: 1 }}>
                Cleared: <span style={{ color: COLORS.primary, fontWeight: 700 }}>+{lcInfo.base}</span>
              </div>
              <div style={{ fontSize: 16, color: COLORS.muted, letterSpacing: 1 }}>
                Speed: <span style={{ color: COLORS.secondary, fontWeight: 700 }}>+{lcInfo.timeBonus}</span>
              </div>
              <div style={{
                fontSize: 28, fontWeight: 700,
                color: COLORS.primary,
                letterSpacing: 2,
                marginTop: 4,
              }}>
                +{lcInfo.total}
              </div>
              <div style={{
                fontSize: 13, color: COLORS.mutedDark,
                letterSpacing: 1, marginTop: 4,
              }}>
                TOTAL: {lcInfo.runningTotal}
              </div>
              {currentLevel < 4 && (
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button
                    onClick={advanceLevel}
                    style={{
                      padding: '10px 24px', borderRadius: 8,
                      border: 'none',
                      background: COLORS.primary,
                      color: COLORS.bg,
                      fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                      letterSpacing: 2, cursor: 'pointer',
                    }}
                  >
                    NEXT
                  </button>
                  <button
                    onClick={() => endRun(false)}
                    style={{
                      padding: '10px 20px', borderRadius: 8,
                      border: `1px solid ${COLORS.border}`,
                      background: 'transparent',
                      color: COLORS.muted,
                      fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                      letterSpacing: 2, cursor: 'pointer',
                    }}
                  >
                    DONE
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- REVEAL SCREEN (show answers, wait for dismiss) --- */}
      {gameState === 'reveal' && currentPuzzle && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          animation: 'fadeIn 0.4s ease',
        }}>
          <h2 style={{
            fontSize: 24, letterSpacing: 4,
            color: COLORS.errorLight,
            marginBottom: 20,
          }}>
            THE ANSWERS
          </h2>

          {/* Show all groups */}
          <div style={{
            width: 'min(92vw, 400px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {currentPuzzle.groups.map((g, gi) => {
              const color = GROUP_COLORS[gi];
              return (
                <div key={gi} style={{
                  borderRadius: 10,
                  padding: '12px 16px',
                  textAlign: 'center',
                  background: color.bg,
                  color: color.text,
                }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700,
                    letterSpacing: 2, textTransform: 'uppercase',
                    marginBottom: 4,
                  }}>
                    {g.label}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    {g.words.join(', ')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current score */}
          <div style={{
            fontSize: 16, color: COLORS.muted,
            letterSpacing: 2, marginTop: 24,
          }}>
            SCORE: <span style={{ color: COLORS.primary, fontWeight: 700 }}>{totalScore}</span>
          </div>

          {/* Dismiss button */}
          <button
            onClick={dismissReveal}
            style={{
              marginTop: 24,
              padding: '14px 40px',
              borderRadius: 10,
              border: 'none',
              background: COLORS.primary,
              color: COLORS.bg,
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 3,
              cursor: 'pointer',
            }}
          >
            DONE
          </button>
        </div>
      )}

      {/* --- GAME OVER SCREEN --- */}
      {gameState === 'game-over' && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          animation: 'fadeIn 0.4s ease',
        }}>
          <h2 style={{
            fontSize: 32, letterSpacing: 6,
            color: allCleared ? COLORS.primary : COLORS.errorLight,
          }}>
            {allCleared ? 'COMPLETE' : 'GAME OVER'}
          </h2>

          <div style={{
            fontSize: 48, fontWeight: 700,
            color: COLORS.primary,
            textShadow: '0 0 30px #fbbf2440',
            margin: '12px 0',
          }}>
            {totalScore}
          </div>

          {/* Level dots */}
          <div style={{ display: 'flex', gap: 8, margin: '4px 0' }}>
            {displayScores.map((ls, i) => (
              <div key={i} style={{
                width: 16, height: 16,
                borderRadius: 4,
                background: ls.cleared ? LEVEL_COLORS[i] : COLORS.border,
              }} />
            ))}
          </div>

          {/* Breakdown */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: 4, alignItems: 'center',
            margin: '8px 0 16px',
          }}>
            {displayScores.map((ls, i) => ls.cleared ? (
              <div key={i} style={{
                fontSize: 13, color: COLORS.mutedDark,
                display: 'flex', gap: 8,
              }}>
                LVL {i + 1}: <span style={{ color: COLORS.secondary, fontWeight: 600 }}>{ls.base} + {ls.timeBonus} speed</span>
              </div>
            ) : null)}
          </div>

          {/* Progression display */}
          {progression && (
            <div style={{
              background: COLORS.surface,
              borderRadius: 12,
              padding: '16px 24px',
              marginBottom: 20,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, color: COLORS.primary, marginBottom: 8 }}>
                +{progression.xpEarned} XP
              </div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>
                Level {progression.level}{progression.streak > 1 ? ` \u2022 ${progression.multiplier}x streak` : ''}
              </div>
            </div>
          )}

          {/* Score submission */}
          <ScoreFlow
            score={totalScore}
            gameId={GAME_ID}
            colors={SCORE_FLOW_COLORS}
            maxScore={MAX_SCORE}
            onRankReceived={(rank, entryId) => {
              setSubmittedEntryId(entryId ?? null);
            }}
            onProgression={(prog) => setProgression(prog)}
          />

          {/* Action buttons */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
            marginTop: 20,
            width: '100%',
            maxWidth: 400,
          }}>
            {setsUsed < TOTAL_SETS ? (
              <button
                onClick={startRun}
                style={{
                  padding: '14px 40px',
                  borderRadius: 10,
                  border: 'none',
                  background: COLORS.primary,
                  color: COLORS.bg,
                  fontFamily: 'inherit',
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 3,
                  cursor: 'pointer',
                }}
              >
                NEXT SET ({setsUsed + 1}/{TOTAL_SETS})
              </button>
            ) : (
              <div style={{
                fontSize: 13, color: COLORS.muted,
                letterSpacing: 2, padding: '14px 0',
              }}>
                ALL 6 SETS PLAYED
              </div>
            )}
            <button
              onClick={() => setGameState('leaderboard')}
              style={{
                background: 'transparent',
                border: `1px solid ${COLORS.surface}`,
                borderRadius: 6,
                color: COLORS.muted,
                padding: '12px 30px',
                fontSize: 11,
                fontFamily: 'inherit',
                cursor: 'pointer',
                letterSpacing: 2,
              }}
            >
              LEADERBOARD
            </button>
            {user ? (
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${COLORS.surface}`,
                  borderRadius: 6,
                  color: COLORS.muted,
                  padding: '12px 30px',
                  fontSize: 11,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  letterSpacing: 2,
                }}
              >
                SHARE / GROUPS
              </button>
            ) : (
              <ShareButtonContainer
                id="share-btn-container"
                url={typeof window !== 'undefined' ? `${window.location.origin}/pixelpit/arcade/${GAME_ID}/share/${totalScore}` : ''}
                text={`I scored ${totalScore} on THREADS! \uD83E\uDDF5 Can you beat me?`}
                style="minimal"
                socialLoaded={socialLoaded}
              />
            )}
          </div>
        </div>
      )}

      {/* --- LEADERBOARD SCREEN --- */}
      {gameState === 'leaderboard' && (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
          <Leaderboard
            gameId={GAME_ID}
            limit={10}
            entryId={submittedEntryId ?? undefined}
            colors={LEADERBOARD_COLORS}
            onClose={() => setGameState('game-over')}
            groupsEnabled={true}
            gameUrl={GAME_URL}
            socialLoaded={socialLoaded}
          />
        </div>
      )}

      {/* --- SHARE MODAL --- */}
      {showShareModal && user && (
        <ShareModal
          gameUrl={GAME_URL}
          score={totalScore}
          colors={LEADERBOARD_COLORS}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  );
}
