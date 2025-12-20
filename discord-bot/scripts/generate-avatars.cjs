#!/usr/bin/env node
/**
 * Generate Discord profile pics for Token Tank agents
 * Each agent gets their signature color + a unique symbol
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../avatars');
const SIZE = 512; // Square, will look good cropped to circle

const AGENTS = [
  {
    name: 'arc',
    color: '#71797E', // Steel
    bgGradient: 'linear-gradient(135deg, #71797E 0%, #5C636A 50%, #474D52 100%)',
    symbol: `<svg viewBox="0 0 100 100" width="280" height="280">
      <path d="M 20 70 Q 50 10 80 70" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    name: 'forge',
    color: '#FF6B35', // Orange
    bgGradient: 'linear-gradient(135deg, #FF6B35 0%, #E55A2B 50%, #CC4A1F 100%)',
    symbol: `<svg viewBox="0 0 100 100" width="260" height="260">
      <!-- Anvil shape -->
      <path d="M 25 45 L 75 45 L 80 55 L 85 55 L 85 70 L 15 70 L 15 55 L 20 55 Z" fill="white"/>
      <rect x="35" y="30" width="30" height="15" fill="white"/>
    </svg>`,
  },
  {
    name: 'drift',
    color: '#228B22', // Dark forest green
    bgGradient: 'linear-gradient(135deg, #228B22 0%, #1E7B1E 50%, #186A18 100%)',
    symbol: `<svg viewBox="0 0 100 100" width="300" height="300">
      <!-- Flowing wave/drift -->
      <path d="M 15 50 Q 30 30, 50 50 T 85 50" stroke="white" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M 15 65 Q 30 45, 50 65 T 85 65" stroke="rgba(255,255,255,0.6)" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M 15 35 Q 30 15, 50 35 T 85 35" stroke="rgba(255,255,255,0.6)" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    name: 'echo',
    color: '#1E3A5F', // Deep blue
    bgGradient: 'linear-gradient(135deg, #1E3A5F 0%, #162D4A 50%, #0F2035 100%)',
    symbol: `<svg viewBox="0 0 100 100" width="280" height="280">
      <!-- Concentric circles (echo waves) -->
      <circle cx="50" cy="50" r="12" stroke="white" stroke-width="4" fill="none"/>
      <circle cx="50" cy="50" r="25" stroke="rgba(255,255,255,0.7)" stroke-width="3" fill="none"/>
      <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.4)" stroke-width="2" fill="none"/>
    </svg>`,
  },
  {
    name: 'vega',
    color: '#32CD32', // Green (lime green for Vega)
    bgGradient: 'linear-gradient(135deg, #32CD32 0%, #28A428 50%, #1E7B1E 100%)',
    symbol: `<svg viewBox="0 0 100 100" width="260" height="260">
      <!-- 5-pointed star (Vega is a star) -->
      <polygon points="50,10 61,40 95,40 67,60 78,90 50,72 22,90 33,60 5,40 39,40" fill="white"/>
    </svg>`,
  },
  {
    name: 'sigma',
    color: '#36454F', // Graphite/Charcoal
    bgGradient: 'linear-gradient(135deg, #36454F 0%, #2C3A44 50%, #222E36 100%)',
    symbol: `<div style="font-family: 'Times New Roman', serif; font-size: 200px; font-weight: bold; color: white; line-height: 1;">Σ</div>`,
  },
];

function generateHTML(agent) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${SIZE}px;
      height: ${SIZE}px;
      background: ${agent.bgGradient};
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .symbol {
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
    }
  </style>
</head>
<body>
  <div class="symbol">
    ${agent.symbol}
  </div>
</body>
</html>
`;
}

async function generateAvatars() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: SIZE, height: SIZE });

  for (const agent of AGENTS) {
    console.log(`Generating ${agent.name}...`);
    const html = generateHTML(agent);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const outputPath = path.join(OUTPUT_DIR, `${agent.name}.png`);
    await page.screenshot({ path: outputPath, type: 'png' });
    console.log(`  ✓ Saved to ${outputPath}`);
  }

  await browser.close();
  console.log(`\nDone! All avatars saved to: ${OUTPUT_DIR}`);
}

generateAvatars().catch(console.error);
