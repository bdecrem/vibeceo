#!/usr/bin/env python3
"""
T8 EXPERIMENT: Catch the Drops

Base game is a simple "catch falling objects" game — objects fall from the top,
player moves a paddle/bucket left-right to catch them. Movement-based, not tap-based.

Pipeline:
1. 10 Makers generate themed variants in parallel
2. Dither (Creative Head) reviews via Claude Vision — scores ALIVE/THEME/POLISH
3. Triage dashboard sorts into GREEN | YELLOW | RED columns
4. Enhancement phase:
   - GREEN (SHIP) → Add procedural music
   - YELLOW (NEEDS_WORK) → Send back to Maker for v2 redesign
   - RED (BROKEN) → Left alone

Usage:
  python t8-orchestrator.py

Output:
  web/public/pixelpit/swarm/t8/index.html
  web/public/pixelpit/swarm/t8/status.json
  web/public/pixelpit/swarm/t8/agent_N.html (original)
  web/public/pixelpit/swarm/t8/agent_N_v2.html (redesigned yellows)
  web/public/pixelpit/swarm/t8/agent_N_music.html (enhanced greens)
"""

import os
import sys
import json
import time
import base64
import subprocess
import re
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

REPO_ROOT = Path(__file__).parent.parent.parent
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm" / "t8"
SCREENSHOT_DIR = OUTPUT_DIR / "screenshots"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

from dotenv import load_dotenv
env_path = REPO_ROOT / "sms-bot" / ".env.local"
if env_path.exists():
    load_dotenv(env_path)
    print(f"[ENV] Loaded from {env_path}")

from together import Together
import anthropic

MODEL = "openai/gpt-oss-20b"
JUDGE_MODEL = "claude-sonnet-4-20250514"
NUM_AGENTS = 10
MAX_TOKENS = 3000
SCREENSHOT_DELAY = 6

STATUS_FILE = OUTPUT_DIR / "status.json"
status_lock = threading.Lock()

# Base game: catch falling objects — movement-based game for t8 experiment
# Objects fall from top, player moves paddle/bucket to catch them
REFERENCE_CODE = '''<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Catch Game</title>
<style>body{margin:0;background:#111;overflow:hidden;touch-action:none}canvas{display:block}</style>
</head><body><canvas id=c></canvas>
<script>
const c=document.getElementById('c'),ctx=c.getContext('2d');
let W,H;function resize(){W=c.width=innerWidth;H=c.height=innerHeight}resize();onresize=resize;
let score=0,drops=[],paddle={x:W/2,w:80,h:20};
function spawn(){drops.push({x:Math.random()*(W-40)+20,y:-30,r:15,speed:2+Math.random()*2,color:'#44aaff'});}
function update(){
  drops.forEach(d=>d.y+=d.speed);
  drops=drops.filter(d=>{
    if(d.y>H-50&&d.y<H-20&&Math.abs(d.x-paddle.x)<paddle.w/2+d.r){score++;return false;}
    return d.y<H+50;
  });
  if(Math.random()<0.02)spawn();
}
function draw(){
  ctx.fillStyle='#111';ctx.fillRect(0,0,W,H);
  drops.forEach(d=>{ctx.fillStyle=d.color;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle='#fff';ctx.fillRect(paddle.x-paddle.w/2,H-40,paddle.w,paddle.h);
  ctx.fillStyle='#fff';ctx.font='24px sans-serif';ctx.fillText('Score: '+score,20,40);
}
function move(x){paddle.x=Math.max(paddle.w/2,Math.min(W-paddle.w/2,x));}
c.onmousemove=e=>move(e.clientX);
c.ontouchmove=e=>{e.preventDefault();move(e.touches[0].clientX);};
c.ontouchstart=e=>{e.preventDefault();move(e.touches[0].clientX);};
function loop(){update();draw();requestAnimationFrame(loop)}loop();
</script></body></html>'''

# The Makers - Pixelpit's game builders
MAKERS = [
    {"name": "AmyThe1st", "avatar": "/pixelpit/amy.png"},
    {"name": "BobThe2nd", "avatar": "/pixelpit/bob.png"},
    {"name": "ChetThe3rd", "avatar": "/pixelpit/chet.png"},
    {"name": "DaleThe4th", "avatar": "/pixelpit/dale.png"},
    {"name": "EarlThe5th", "avatar": "/pixelpit/earl.png"},
    {"name": "FranThe6th", "avatar": "/pixelpit/fran.png"},
    {"name": "GusThe7th", "avatar": "/pixelpit/gus.png"},
    {"name": "HankThe8th", "avatar": "/pixelpit/hank.png"},
    {"name": "IdaThe9th", "avatar": "/pixelpit/ida.png"},
    {"name": "JoanThe10th", "avatar": "/pixelpit/joan.png"},
]

# Maker personality traits - their signature visual style (persists across experiments)
TRAITS = [
    {"name": "SPARKLY", "desc": "Add particles, glitter, shine effects, twinkles on everything"},
    {"name": "SMOOTH", "desc": "Fluid animations, calm easing, gentle transitions, relaxed motion"},
    {"name": "CHAOTIC", "desc": "Unpredictable motion, wild effects, random sizes, energetic chaos"},
    {"name": "MINIMAL", "desc": "Clean and simple, few effects, precise shapes, lots of whitespace"},
    {"name": "RETRO", "desc": "Limited color palette, chunky pixels, nostalgic 8-bit feel"},
    {"name": "COLORFUL", "desc": "Bold saturated colors, gradients everywhere, rainbow accents"},
    {"name": "SOLID", "desc": "Thick shapes, sturdy forms, grounded weight, bold outlines"},
    {"name": "DETAILED", "desc": "Extra polish, small touches, subtle animations, refined edges"},
    {"name": "GLOWY", "desc": "Bloom effects, halos, luminescent objects, soft light trails"},
    {"name": "POLISHED", "desc": "Professional balance, complete feel, smooth UI, ship-ready quality"},
]

THEMES = [
    {"name": "RAINDROPS", "color": "#4488ff", "desc": "Blue rain falling into a wooden bucket", "music": "ambient"},
    {"name": "FALLING STARS", "color": "#ffdd44", "desc": "Golden shooting stars caught in a magic net", "music": "dreamy"},
    {"name": "AUTUMN LEAVES", "color": "#ff6622", "desc": "Red and orange leaves drifting into a basket", "music": "ambient"},
    {"name": "GOLD COINS", "color": "#ffcc00", "desc": "Pirate treasure falling into a chest", "music": "playful"},
    {"name": "SNOWFLAKES", "color": "#eeffff", "desc": "Delicate snow crystals caught on mittens", "music": "dreamy"},
    {"name": "SUSHI DROP", "color": "#ff6b6b", "desc": "Sushi pieces falling onto a plate", "music": "playful"},
    {"name": "MUSIC NOTES", "color": "#cc66ff", "desc": "Colorful notes falling into a speaker", "music": "synth"},
    {"name": "GEMSTONES", "color": "#00ffaa", "desc": "Sparkling gems falling into a jewel box", "music": "chiptune"},
    {"name": "LOVE HEARTS", "color": "#ff4488", "desc": "Floating hearts caught in a love jar", "music": "dreamy"},
    {"name": "PIXEL FOOD", "color": "#88ff44", "desc": "8-bit burgers and fries into a lunchbox", "music": "chiptune"},
]

# Music generators by mood (Web Audio API code to inject)
MUSIC_SNIPPETS = {
    "dreamy": '''
// Dreamy ambient music
const actx = new (window.AudioContext || window.webkitAudioContext)();
function playDreamy() {
  const notes = [261.6, 329.6, 392, 523.2];
  setInterval(() => {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
    gain.gain.setValueAtTime(0.1, actx.currentTime);
    gain.gain.exponentialDecayTo && gain.gain.exponentialDecayTo(0.01, actx.currentTime + 2);
    osc.connect(gain).connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 2);
  }, 800);
}
document.addEventListener('click', () => { if (actx.state === 'suspended') actx.resume(); playDreamy(); }, { once: true });
''',
    "ambient": '''
// Ambient drone music
const actx = new (window.AudioContext || window.webkitAudioContext)();
function playAmbient() {
  const drone = actx.createOscillator();
  const gain = actx.createGain();
  drone.type = 'sine';
  drone.frequency.value = 110;
  gain.gain.value = 0.05;
  drone.connect(gain).connect(actx.destination);
  drone.start();
  setInterval(() => {
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 220 * (1 + Math.random());
    g.gain.setValueAtTime(0.08, actx.currentTime);
    g.gain.linearRampToValueAtTime(0, actx.currentTime + 1.5);
    osc.connect(g).connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 1.5);
  }, 2000);
}
document.addEventListener('click', () => { if (actx.state === 'suspended') actx.resume(); playAmbient(); }, { once: true });
''',
    "tense": '''
// Tense pulsing music
const actx = new (window.AudioContext || window.webkitAudioContext)();
function playTense() {
  setInterval(() => {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 55 + Math.random() * 20;
    gain.gain.setValueAtTime(0.15, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.3);
    osc.connect(gain).connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.3);
  }, 400);
}
document.addEventListener('click', () => { if (actx.state === 'suspended') actx.resume(); playTense(); }, { once: true });
''',
    "playful": '''
// Playful bouncy music
const actx = new (window.AudioContext || window.webkitAudioContext)();
function playPlayful() {
  const notes = [523.2, 587.3, 659.2, 784];
  let i = 0;
  setInterval(() => {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'square';
    osc.frequency.value = notes[i++ % notes.length];
    gain.gain.setValueAtTime(0.1, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.15);
    osc.connect(gain).connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.15);
  }, 250);
}
document.addEventListener('click', () => { if (actx.state === 'suspended') actx.resume(); playPlayful(); }, { once: true });
''',
    "spooky": '''
// Spooky eerie music
const actx = new (window.AudioContext || window.webkitAudioContext)();
function playSpooky() {
  setInterval(() => {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, actx.currentTime);
    osc.frequency.linearRampToValueAtTime(150, actx.currentTime + 1);
    gain.gain.setValueAtTime(0.1, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 1);
    osc.connect(gain).connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 1);
  }, 1500);
}
document.addEventListener('click', () => { if (actx.state === 'suspended') actx.resume(); playSpooky(); }, { once: true });
''',
    "synth": '''
// Synth arpeggios
const actx = new (window.AudioContext || window.webkitAudioContext)();
function playSynth() {
  const notes = [130.8, 164.8, 196, 261.6, 196, 164.8];
  let i = 0;
  setInterval(() => {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = notes[i++ % notes.length];
    gain.gain.setValueAtTime(0.12, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.2);
    osc.connect(gain).connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.2);
  }, 150);
}
document.addEventListener('click', () => { if (actx.state === 'suspended') actx.resume(); playSynth(); }, { once: true });
''',
    "chiptune": '''
// Chiptune 8-bit music
const actx = new (window.AudioContext || window.webkitAudioContext)();
function playChiptune() {
  const melody = [262, 294, 330, 349, 392, 349, 330, 294];
  let i = 0;
  setInterval(() => {
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'square';
    osc.frequency.value = melody[i++ % melody.length];
    gain.gain.setValueAtTime(0.08, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.1);
    osc.connect(gain).connect(actx.destination);
    osc.start(); osc.stop(actx.currentTime + 0.12);
  }, 180);
}
document.addEventListener('click', () => { if (actx.state === 'suspended') actx.resume(); playChiptune(); }, { once: true });
''',
}


def init_status():
    status = {
        "started": datetime.now().isoformat(),
        "completed": None,
        "phase": "generating",  # generating -> judging -> enhancing -> done
        "agents": [
            {
                "id": i,
                "maker": MAKERS[i]["name"],
                "avatar": MAKERS[i]["avatar"],
                "theme": THEMES[i]["name"],
                "color": THEMES[i]["color"],
                "desc": THEMES[i]["desc"],
                "trait": TRAITS[i]["name"],
                "trait_desc": TRAITS[i]["desc"],
                "status": "pending",
                "time": None,
                "tokens": None,
                "url": None,
                "screenshot": None,
                "scores": None,
                "enhanced_url": None,  # v2 or music version
                "enhance_status": None,  # None, "adding_music", "redesigning", "done"
            }
            for i in range(NUM_AGENTS)
        ]
    }
    STATUS_FILE.write_text(json.dumps(status, indent=2))
    return status


def update_status(agent_id=None, updates=None, global_updates=None):
    with status_lock:
        status = json.loads(STATUS_FILE.read_text())
        if agent_id is not None and updates:
            status["agents"][agent_id].update(updates)
        if global_updates:
            status.update(global_updates)
        STATUS_FILE.write_text(json.dumps(status, indent=2))


def finalize_status():
    update_status(global_updates={"completed": datetime.now().isoformat(), "phase": "done"})


def create_dashboard():
    html = '''<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SWARM T8 - Catch the Drops</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0; padding: 0;
  background: #121216;
  background-image:
    linear-gradient(90deg, transparent 49px, rgba(100, 100, 100, 0.08) 49px, rgba(100, 100, 100, 0.08) 51px, transparent 51px),
    linear-gradient(0deg, transparent 49px, rgba(100, 100, 100, 0.08) 49px, rgba(100, 100, 100, 0.08) 51px, transparent 51px),
    radial-gradient(circle at 50px 50px, rgba(100, 100, 100, 0.1) 1px, transparent 1px);
  background-size: 100px 100px;
  color: #ccc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
}

/* Lab header bar */
.lab-header {
  background: #1a1a1e;
  border-bottom: 1px solid #2a2a2e;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.lab-brand {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 2px;
  color: #00FFAA;
  text-transform: uppercase;
  opacity: 0.8;
}
.lab-brand a {
  color: inherit;
  text-decoration: none;
}
.lab-brand a:hover { opacity: 1; }
.lab-sep { color: #333; }

.main-content { padding: 24px; }

h1 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #fff;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}
h1 .version {
  font-size: 12px;
  color: #666;
  font-weight: 400;
  margin-left: 8px;
}

.status {
  color: #666;
  margin-bottom: 24px;
  font-size: 13px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
}
.status.generating { color: #ffaa00; }
.status.judging { color: #ff66aa; }
.status.enhancing { color: #00ddff; }
.status.done { color: #00FFAA; }

.triage {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  max-width: 1400px;
}
.column {
  background: #18181c;
  border: 1px solid #2a2a2e;
  border-radius: 8px;
  padding: 16px;
  min-height: 400px;
}
.column h2 {
  margin: 0 0 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  padding: 6px 10px;
  border-radius: 4px;
  display: inline-block;
}
.column.green h2 {
  color: #00FFAA;
  background: rgba(0, 255, 170, 0.1);
  border: 1px solid rgba(0, 255, 170, 0.2);
}
.column.yellow h2 {
  color: #ffaa00;
  background: rgba(255, 170, 0, 0.1);
  border: 1px solid rgba(255, 170, 0, 0.2);
}
.column.red h2 {
  color: #ff4466;
  background: rgba(255, 68, 102, 0.1);
  border: 1px solid rgba(255, 68, 102, 0.2);
}
.column.pending h2 { color: #666; background: #222; border: 1px solid #333; }

.cards { display: flex; flex-direction: column; gap: 10px; }

.card {
  background: #1a1a2e;
  border-radius: 10px;
  padding: 12px;
  border: 2px solid #333;
  cursor: pointer;
  transition: all 0.2s;
}
.card:hover { transform: translateX(5px); }
.card.enhancing {
  animation: enhancePulse 1s infinite;
}
@keyframes enhancePulse {
  0%, 100% { border-color: #00ddff; }
  50% { border-color: #ff66aa; }
}

.column.green .card { border-color: #00ff8844; }
.column.yellow .card { border-color: #ffaa0044; }
.column.red .card { border-color: #ff446644; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.card-name { font-weight: 600; font-size: 12px; }
.card-maker {
  font-size: 10px;
  color: #666;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.maker-avatar {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #333;
  transition: all 0.15s;
}
.maker-avatar:hover {
  border-color: #00FFAA;
  transform: scale(1.1);
}
.maker-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-badge {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #333;
}
.card-badge.music { background: #003322; color: #00ff88; }
.card-badge.v2 { background: #332200; color: #ffaa00; }
.card-badge.working { background: #002233; color: #00ddff; }

.scores {
  display: flex;
  gap: 8px;
  font-size: 10px;
  color: #888;
}
.score { background: #0f0f1a; padding: 2px 6px; border-radius: 3px; }

.screenshot-thumb {
  width: 100%;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  margin-top: 8px;
  opacity: 0.7;
}

/* Pending area */
.pending-area {
  margin-bottom: 20px;
  padding: 14px 16px;
  background: #18181c;
  border: 1px solid #2a2a2e;
  border-radius: 8px;
}
.pending-area h3 {
  margin: 0 0 12px;
  font-size: 10px;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 600;
}
.pending-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pending-chip {
  background: #1e1e24;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  color: #555;
  border: 1px solid #2a2a2e;
}
.pending-chip.running {
  color: #ffaa00;
  border-color: rgba(255, 170, 0, 0.3);
  background: rgba(255, 170, 0, 0.05);
  animation: pulse 1s infinite;
}
.pending-chip.judging {
  color: #ff66aa;
  border-color: rgba(255, 102, 170, 0.3);
  background: rgba(255, 102, 170, 0.05);
}
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.preview {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(10, 10, 14, 0.98);
  display: none;
  z-index: 100;
}
.preview.active { display: flex; flex-direction: column; }
.preview-header {
  padding: 12px 20px;
  background: #1a1a1e;
  border-bottom: 1px solid #2a2a2e;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}
.preview-title {
  font-weight: 500;
  font-family: 'SF Mono', 'Monaco', 'Menlo', monospace;
  font-size: 14px;
}
.preview-btns { display: flex; gap: 8px; }
.preview-btn {
  background: #2a2a2e;
  border: 1px solid #3a3a3e;
  color: #999;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.15s;
}
.preview-btn:hover { background: #333; color: #fff; }
.preview-btn.active {
  background: rgba(0, 255, 170, 0.15);
  border-color: rgba(0, 255, 170, 0.3);
  color: #00FFAA;
}
.preview-btn.close {
  background: rgba(255, 68, 102, 0.1);
  border-color: rgba(255, 68, 102, 0.2);
  color: #ff4466;
}
.preview-btn.close:hover {
  background: rgba(255, 68, 102, 0.2);
}
.preview iframe {
  flex: 1;
  border: none;
  background: #0a0a0e;
}
</style>
</head>
<body>
<div class="lab-header">
  <span class="lab-brand"><a href="/pixelpit">pixelpit</a></span>
  <span class="lab-sep">/</span>
  <span class="lab-brand"><a href="/pixelpit/lab">lab</a></span>
  <span class="lab-sep">/</span>
  <span class="lab-brand" style="opacity: 0.5;">swarm-t8</span>
</div>

<div class="main-content">
<h1>swarm-t8 <span class="version">catch the drops</span></h1>
<div class="status" id="status">Loading...</div>

<div class="pending-area" id="pending-area">
  <h3>In Progress</h3>
  <div class="pending-grid" id="pending-grid"></div>
</div>

<div class="triage">
  <div class="column green">
    <h2>Ship (+ Music)</h2>
    <div class="cards" id="green-cards"></div>
  </div>
  <div class="column yellow">
    <h2>Needs Work (→ v2)</h2>
    <div class="cards" id="yellow-cards"></div>
  </div>
  <div class="column red">
    <h2>Broken</h2>
    <div class="cards" id="red-cards"></div>
  </div>
</div>
</div>

<div class="preview" id="preview">
  <div class="preview-header">
    <span class="preview-title" id="preview-title"></span>
    <div class="preview-btns">
      <button class="preview-btn" id="btn-original" onclick="showOriginal()">Original</button>
      <button class="preview-btn" id="btn-enhanced" onclick="showEnhanced()">Enhanced</button>
      <button class="preview-btn close" onclick="closePreview()">Close</button>
    </div>
  </div>
  <iframe id="preview-iframe"></iframe>
</div>

<script>
const statusEl = document.getElementById('status');
const pendingArea = document.getElementById('pending-area');
const pendingGrid = document.getElementById('pending-grid');
const greenCards = document.getElementById('green-cards');
const yellowCards = document.getElementById('yellow-cards');
const redCards = document.getElementById('red-cards');
let lastData = null;
let currentAgent = null;

function getVerdict(a) {
  if (!a.scores) return null;
  const v = a.scores.verdict?.toUpperCase() || '';
  if (v.includes('SHIP')) return 'green';
  if (v.includes('NEEDS') || v.includes('WORK')) return 'yellow';
  return 'red';
}

function getBadge(a) {
  if (a.enhance_status === 'adding_music') return '<span class="card-badge working">Adding music...</span>';
  if (a.enhance_status === 'redesigning') return '<span class="card-badge working">Redesigning...</span>';
  if (a.enhanced_url && getVerdict(a) === 'green') return '<span class="card-badge music">+ Music</span>';
  if (a.enhanced_url && getVerdict(a) === 'yellow') return '<span class="card-badge v2">v2</span>';
  return '';
}

function renderCard(a) {
  const isEnhancing = a.enhance_status === 'adding_music' || a.enhance_status === 'redesigning';
  return `
    <div class="card ${isEnhancing ? 'enhancing' : ''}" onclick="openPreview(${a.id})">
      <div class="card-header">
        <span class="card-name">${a.theme}</span>
        ${getBadge(a)}
      </div>
      <div class="card-maker">
        <a href="/pixelpit" class="maker-avatar" onclick="event.stopPropagation()">
          <img src="${a.avatar}" alt="${a.maker}" />
        </a>
        <span>by ${a.maker} · <span style="color:#666;font-style:italic">${a.trait}</span></span>
      </div>
      ${a.scores ? `
        <div class="scores">
          <span class="score">A:${a.scores.alive}</span>
          <span class="score">T:${a.scores.theme}</span>
          <span class="score">P:${a.scores.polish}</span>
        </div>
      ` : ''}
      ${a.screenshot ? `<img class="screenshot-thumb" src="screenshots/${a.screenshot}" />` : ''}
    </div>
  `;
}

function render(data) {
  // Status line
  const phase = data.phase;
  const done = data.agents.filter(a => a.scores).length;
  const enhanced = data.agents.filter(a => a.enhanced_url).length;

  statusEl.className = 'status ' + phase;
  if (phase === 'done') {
    statusEl.textContent = `✓ Complete — ${enhanced} enhanced`;
  } else if (phase === 'enhancing') {
    statusEl.textContent = `✨ Enhancing — ${enhanced} done`;
  } else if (phase === 'judging') {
    statusEl.textContent = `🔍 Judging — ${done} rated`;
  } else {
    statusEl.textContent = `⟳ Generating...`;
  }

  // Pending chips
  const pending = data.agents.filter(a => !a.scores);
  if (pending.length > 0) {
    pendingArea.style.display = 'block';
    pendingGrid.innerHTML = pending.map(a => {
      let cls = 'pending-chip';
      let label = a.maker;
      if (a.status === 'running') { cls += ' running'; label += ' (building)'; }
      else if (a.status === 'judging') { cls += ' judging'; label += ' (judging)'; }
      return `<div class="${cls}">${label}</div>`;
    }).join('');
  } else {
    pendingArea.style.display = 'none';
  }

  // Triage columns
  const greens = data.agents.filter(a => getVerdict(a) === 'green');
  const yellows = data.agents.filter(a => getVerdict(a) === 'yellow');
  const reds = data.agents.filter(a => getVerdict(a) === 'red');

  greenCards.innerHTML = greens.map(renderCard).join('');
  yellowCards.innerHTML = yellows.map(renderCard).join('');
  redCards.innerHTML = reds.map(renderCard).join('');
}

function openPreview(id) {
  currentAgent = lastData.agents[id];
  document.getElementById('preview-title').textContent = currentAgent.theme;

  const hasEnhanced = currentAgent.enhanced_url;
  document.getElementById('btn-enhanced').style.display = hasEnhanced ? 'block' : 'none';

  // Default to enhanced if available
  if (hasEnhanced) {
    showEnhanced();
  } else {
    showOriginal();
  }

  document.getElementById('preview').classList.add('active');
}

function showOriginal() {
  document.getElementById('preview-iframe').src = currentAgent.url;
  document.getElementById('btn-original').classList.add('active');
  document.getElementById('btn-enhanced').classList.remove('active');
}

function showEnhanced() {
  document.getElementById('preview-iframe').src = currentAgent.enhanced_url || currentAgent.url;
  document.getElementById('btn-enhanced').classList.add('active');
  document.getElementById('btn-original').classList.remove('active');
}

function closePreview() {
  document.getElementById('preview').classList.remove('active');
  document.getElementById('preview-iframe').src = '';
  currentAgent = null;
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePreview();
});

async function poll() {
  try {
    const res = await fetch('status.json?' + Date.now());
    const data = await res.json();
    if (JSON.stringify(data) !== JSON.stringify(lastData)) {
      lastData = data;
      render(data);
    }
  } catch (e) {}
  setTimeout(poll, 500);
}

poll();
</script>
</body></html>'''
    (OUTPUT_DIR / "index.html").write_text(html)
    print(f"[Dashboard] http://localhost:3000/pixelpit/swarm/t8/index.html")


PROMPT_TEMPLATE = """Reskin this "catch falling objects" game with the theme and style below. Keep the EXACT same mechanics.

REFERENCE CODE:
```html
{reference}
```

THEME: {theme_name} — {theme_desc}
ARTIST STYLE: {trait_name} — {trait_desc}

Apply the THEME to what things look like (objects, catcher, background).
Apply the ARTIST STYLE to how things move and feel (effects, animations, polish level).

Change ONLY visuals: background, falling object appearance, paddle/catcher appearance, catch effects, score style.
Keep: spawn rate, fall speed, paddle movement, collision detection, scoring.

OUTPUT: Complete HTML file. No explanation. Start with <!DOCTYPE html>
"""

REDESIGN_PROMPT = """The catch game below was rated poorly. Fix it based on the feedback.

CURRENT CODE:
```html
{code}
```

THEME: {theme_name} — {theme_desc}
ARTIST STYLE: {trait_name} — {trait_desc}

FEEDBACK:
- ALIVE score: {alive}/10 (is there visible activity?)
- THEME score: {theme}/10 (does it match the theme?)
- POLISH score: {polish}/10 (visual quality)

Make it better:
1. If ALIVE is low: ensure objects fall visibly and paddle moves smoothly
2. If THEME is low: make falling objects and catcher clearly match "{theme_name}"
3. If POLISH is low: apply the {trait_name} style more strongly — {trait_desc}

OUTPUT: Complete fixed HTML file. No explanation. Start with <!DOCTYPE html>
"""


def run_agent(agent_id: int, client: Together) -> dict:
    maker = MAKERS[agent_id]["name"]
    theme = THEMES[agent_id]
    trait = TRAITS[agent_id]
    update_status(agent_id, {"status": "running"})

    prompt = PROMPT_TEMPLATE.format(
        reference=REFERENCE_CODE,
        theme_name=theme["name"],
        theme_desc=theme["desc"],
        trait_name=trait["name"],
        trait_desc=trait["desc"],
    )

    filename = f"agent_{agent_id}.html"
    output_path = OUTPUT_DIR / filename

    print(f"[{maker}] Starting: {theme['name']} + {trait['name']}")
    start_time = time.time()

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=MAX_TOKENS,
            temperature=0.8,
        )

        content = response.choices[0].message.content

        if "<!DOCTYPE" in content:
            html_start = content.find("<!DOCTYPE")
            html_end = content.rfind("</html>") + 7
            if html_end > html_start:
                content = content[html_start:html_end]
        elif "<html" in content:
            html_start = content.find("<html")
            html_end = content.rfind("</html>") + 7
            if html_end > html_start:
                content = content[html_start:html_end]

        output_path.write_text(content)

        elapsed = round(time.time() - start_time, 1)
        tokens = response.usage.completion_tokens if response.usage else 0

        print(f"[{maker}] Built in {elapsed}s")

        update_status(agent_id, {
            "status": "done",
            "time": elapsed,
            "tokens": tokens,
            "url": filename,
        })

        return {"success": True, "agent_id": agent_id, "maker": maker}

    except Exception as e:
        print(f"[{maker}] Error: {str(e)[:80]}")
        update_status(agent_id, {"status": "error"})
        return {"success": False, "agent_id": agent_id, "maker": maker, "error": str(e)}


def take_screenshot(agent_id: int) -> str | None:
    game_url = f"file://{OUTPUT_DIR}/agent_{agent_id}.html"
    screenshot_path = SCREENSHOT_DIR / f"agent_{agent_id}.png"

    script = f'''
    const puppeteer = require('puppeteer');
    (async () => {{
        const browser = await puppeteer.launch({{ headless: true }});
        const page = await browser.newPage();
        await page.setViewport({{ width: 400, height: 300 }});
        await page.goto('{game_url}', {{ waitUntil: 'domcontentloaded' }});
        await new Promise(r => setTimeout(r, {SCREENSHOT_DELAY * 1000}));
        await page.screenshot({{ path: '{screenshot_path}' }});
        await browser.close();
    }})();
    '''

    try:
        result = subprocess.run(
            ['node', '-e', script],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=REPO_ROOT / "web"
        )
        if result.returncode == 0:
            return f"agent_{agent_id}.png"
        return None
    except:
        return None


def judge_game(agent_id: int, client: anthropic.Anthropic) -> dict | None:
    screenshot_path = SCREENSHOT_DIR / f"agent_{agent_id}.png"
    theme = THEMES[agent_id]

    if not screenshot_path.exists():
        return None

    with open(screenshot_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    prompt = f"""Rate this game screenshot. Theme: "{theme['name']}" ({theme['desc']}).

Score 1-10:
- ALIVE: Visible activity/movement? (1=blank, 10=lots happening)
- THEME: Matches "{theme['name']}"? (1=wrong, 10=perfect)
- POLISH: Visual quality? (1=ugly, 10=polished)

Verdict: SHIP (avg>=7), NEEDS_WORK (avg 4-6), BROKEN (avg<4)

Format:
ALIVE: [score]
THEME: [score]
POLISH: [score]
VERDICT: [SHIP/NEEDS_WORK/BROKEN]"""

    try:
        response = client.messages.create(
            model=JUDGE_MODEL,
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_data}},
                    {"type": "text", "text": prompt}
                ],
            }],
        )

        text = response.content[0].text
        scores = {"alive": 0, "theme": 0, "polish": 0, "verdict": "BROKEN"}

        for line in text.split("\n"):
            line = line.strip().upper()
            if line.startswith("ALIVE:"):
                try: scores["alive"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except: pass
            elif line.startswith("THEME:"):
                try: scores["theme"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except: pass
            elif line.startswith("POLISH:"):
                try: scores["polish"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except: pass
            elif line.startswith("VERDICT:"):
                v = line.split(":")[1].strip()
                if "SHIP" in v: scores["verdict"] = "SHIP"
                elif "NEEDS" in v or "WORK" in v: scores["verdict"] = "NEEDS_WORK"
                else: scores["verdict"] = "BROKEN"

        return scores
    except Exception as e:
        print(f"[Judge {agent_id}] Error: {str(e)[:50]}")
        return None


def add_music(agent_id: int) -> str | None:
    """Add music to a SHIP game."""
    theme = THEMES[agent_id]
    music_mood = theme.get("music", "playful")
    music_code = MUSIC_SNIPPETS.get(music_mood, MUSIC_SNIPPETS["playful"])

    original_path = OUTPUT_DIR / f"agent_{agent_id}.html"
    enhanced_path = OUTPUT_DIR / f"agent_{agent_id}_music.html"

    try:
        html = original_path.read_text()

        # Inject music code before </script> or </body>
        if "</script>" in html:
            # Find the last </script> and inject before it
            last_script = html.rfind("</script>")
            html = html[:last_script] + "\n" + music_code + "\n" + html[last_script:]
        elif "</body>" in html:
            html = html.replace("</body>", f"<script>{music_code}</script></body>")

        enhanced_path.write_text(html)
        return f"agent_{agent_id}_music.html"
    except Exception as e:
        print(f"[Music {agent_id}] Error: {str(e)[:50]}")
        return None


def redesign_game(agent_id: int, client: Together) -> str | None:
    """Send a NEEDS_WORK game back for redesign."""
    theme = THEMES[agent_id]
    trait = TRAITS[agent_id]
    original_path = OUTPUT_DIR / f"agent_{agent_id}.html"
    enhanced_path = OUTPUT_DIR / f"agent_{agent_id}_v2.html"

    # Get current scores
    status = json.loads(STATUS_FILE.read_text())
    scores = status["agents"][agent_id].get("scores", {})

    try:
        original_code = original_path.read_text()

        prompt = REDESIGN_PROMPT.format(
            code=original_code,
            theme_name=theme["name"],
            theme_desc=theme["desc"],
            trait_name=trait["name"],
            trait_desc=trait["desc"],
            alive=scores.get("alive", "?"),
            theme=scores.get("theme", "?"),
            polish=scores.get("polish", "?"),
        )

        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=MAX_TOKENS,
            temperature=0.7,
        )

        content = response.choices[0].message.content

        if "<!DOCTYPE" in content:
            html_start = content.find("<!DOCTYPE")
            html_end = content.rfind("</html>") + 7
            if html_end > html_start:
                content = content[html_start:html_end]
        elif "<html" in content:
            html_start = content.find("<html")
            html_end = content.rfind("</html>") + 7
            if html_end > html_start:
                content = content[html_start:html_end]

        enhanced_path.write_text(content)
        return f"agent_{agent_id}_v2.html"

    except Exception as e:
        print(f"[Redesign {agent_id}] Error: {str(e)[:50]}")
        return None


def run_judge_phase(anthropic_client: anthropic.Anthropic):
    update_status(global_updates={"phase": "judging"})

    status = json.loads(STATUS_FILE.read_text())
    completed = [a for a in status["agents"] if a["status"] == "done"]

    print(f"\n[Phase 2] Judging {len(completed)} games...\n")

    for agent in completed:
        agent_id = agent["id"]
        maker = MAKERS[agent_id]["name"]
        theme = THEMES[agent_id]

        update_status(agent_id, {"status": "judging"})
        print(f"[Dither] Reviewing {maker}'s {theme['name']}...")

        screenshot = take_screenshot(agent_id)
        if screenshot:
            update_status(agent_id, {"screenshot": screenshot})
            scores = judge_game(agent_id, anthropic_client)
            if scores:
                update_status(agent_id, {"scores": scores, "status": "done"})
                print(f"  → A={scores['alive']} T={scores['theme']} P={scores['polish']} = {scores['verdict']}")
            else:
                update_status(agent_id, {"status": "done"})
        else:
            update_status(agent_id, {"status": "done"})


def run_enhance_phase(together_client: Together):
    update_status(global_updates={"phase": "enhancing"})

    status = json.loads(STATUS_FILE.read_text())

    # Get SHIP and NEEDS_WORK games
    ships = [a for a in status["agents"] if a.get("scores", {}).get("verdict") == "SHIP"]
    needs_work = [a for a in status["agents"] if a.get("scores", {}).get("verdict") == "NEEDS_WORK"]

    print(f"\n[Phase 3] Enhancing: {len(ships)} SHIP (music), {len(needs_work)} NEEDS_WORK (redesign)\n")

    # Add music to SHIP games
    for agent in ships:
        agent_id = agent["id"]
        maker = MAKERS[agent_id]["name"]
        print(f"[{maker}] Adding music to {THEMES[agent_id]['name']}...")
        update_status(agent_id, {"enhance_status": "adding_music"})

        enhanced_url = add_music(agent_id)
        if enhanced_url:
            update_status(agent_id, {"enhanced_url": enhanced_url, "enhance_status": "done"})
            print(f"  → Done")
        else:
            update_status(agent_id, {"enhance_status": "done"})

    # Redesign NEEDS_WORK games
    for agent in needs_work:
        agent_id = agent["id"]
        maker = MAKERS[agent_id]["name"]
        print(f"[{maker}] Redesigning {THEMES[agent_id]['name']} (v2)...")
        update_status(agent_id, {"enhance_status": "redesigning"})

        enhanced_url = redesign_game(agent_id, together_client)
        if enhanced_url:
            update_status(agent_id, {"enhanced_url": enhanced_url, "enhance_status": "done"})
            print(f"  → v2 created")
        else:
            update_status(agent_id, {"enhance_status": "done"})


def main():
    together_key = os.environ.get("TOGETHER_API_KEY")
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")

    if not together_key:
        print("ERROR: TOGETHER_API_KEY not found")
        sys.exit(1)
    if not anthropic_key:
        print("ERROR: ANTHROPIC_API_KEY not found")
        sys.exit(1)

    together_client = Together(api_key=together_key)
    anthropic_client = anthropic.Anthropic(api_key=anthropic_key)

    print("=" * 60)
    print("T8 EXPERIMENT: Catch the Drops")
    print("=" * 60)
    print(f"Generator: {MODEL}")
    print(f"Judge: {JUDGE_MODEL}")
    print(f"Agents: {NUM_AGENTS}")
    print()

    create_dashboard()
    init_status()

    print(f"[Dashboard] http://localhost:3000/pixelpit/swarm/t8/index.html")
    print("=" * 60)

    # Phase 1: Generate
    print("\n[Phase 1] Generating games...\n")
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=NUM_AGENTS) as executor:
        futures = [executor.submit(run_agent, i, together_client) for i in range(NUM_AGENTS)]
        for f in as_completed(futures):
            f.result()

    # Phase 2: Judge
    run_judge_phase(anthropic_client)

    # Phase 3: Enhance
    run_enhance_phase(together_client)

    finalize_status()

    # Summary
    status = json.loads(STATUS_FILE.read_text())
    shipped = sum(1 for a in status["agents"] if a.get("scores", {}).get("verdict") == "SHIP")
    needs_work = sum(1 for a in status["agents"] if a.get("scores", {}).get("verdict") == "NEEDS_WORK")
    broken = sum(1 for a in status["agents"] if a.get("scores", {}).get("verdict") == "BROKEN")
    enhanced = sum(1 for a in status["agents"] if a.get("enhanced_url"))

    total_time = time.time() - start_time
    print()
    print("=" * 60)
    print(f"COMPLETE in {total_time:.1f}s")
    print(f"  ✅ SHIP + Music: {shipped}")
    print(f"  ⚠️  NEEDS_WORK → v2: {needs_work}")
    print(f"  💀 BROKEN: {broken}")
    print(f"  ✨ Enhanced: {enhanced}")
    print()
    print(f"Dashboard: http://localhost:3000/pixelpit/swarm/t8/index.html")
    print("=" * 60)


if __name__ == "__main__":
    main()
