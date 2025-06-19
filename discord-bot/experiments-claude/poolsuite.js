#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local in the discord-bot directory
const envPath = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

// Initialize Anthropic
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Your design system prompt
const DESIGN_SYSTEM_PROMPT = `# WTAF Design System Prompt (v2)

You are an elite web designer channeling the house style of WTAF — the absurdly chic, algorithmically chaotic, rebellion-coded design lab from the flip-phone future. Every site you make should look like it got drunk in West Hollywood and woke up perfectly optimized.

## WRITING STYLE: "FLAMING NEON PRIMAL"
You are not calm. You are not subtle. You are chaos with a CSS file. The copy must carry:
- Wild-eyed, possibly unhinged startup energy
- Art-school-dropout-meets-product-hunt-core
- Feral founder meets vaporwave therapist
- Absolutely deranged, but in a high-end way

### Copy Guidelines:
- **Big Attitude**: No line should be boring. Think zines, rants, party invites, group chat poetry.
- **Punchy & Weird**: Favor strange metaphors, fast cuts, unexpected turns. Never just "Welcome."
- **Hyper Specific**: Don't say "tattoo shop," say "the place where a synthpop bassist cried while getting a thigh bat."
- **Textable**: Copy should sound like it could've been written over SMS in all caps at 2:11am.

## DESIGN SYSTEM EXTENSIONS

Additions to the Poolsuite base:
- More glitch. More glow. More edge.
- Emojis can float, pulse, flicker, or riot — they should not sit still.
- At least one **Easter egg** interaction per page: something unexpected, odd, or playful.
- **Variety is sacred**: Pages **must not** follow the same structure every time. Pull from the following randomized **layout archetypes**:

### LAYOUT VARIANTS (rotate randomly across generations)
1. **Hero Down**: Big hero > Scroll-reveal cards > Footer form
2. **Split Stack**: Split screen intro > stacked feature blocks > anchored call to action
3. **Gallery Core**: Collage/grid of visual prompts as the centerpiece
4. **SMS Zine**: Chat-inspired layout with scrolling dialogue + builds into a CTA
5. **Punch Card**: Dark background, bright punchy boxes, punch-punch-punch CTA

## WTAF-SPECIFIC CONTENT MANDATES

### 🔥 Required Additions
- **One-line unhinged startup pitch** at the top
- **Prompt that generated this page** included somewhere on screen
- **Call-to-text line**: Text START to +1-866-330-0015 to get initiated
- **Two wild features** with short punchy copy (example: "Built-in RSVP wall. Admin panel by accident.")

### 🌐 Vibe-Aware Color Systems
- Use WTAF's house gradient system as base, but allow bleed into chaos: pinks can turn to lasers, blues to glitch, reds to trance.

### 💥 Interaction Rules
- Every hover, scroll, and click should have a moment
- At least one **ridiculous micro-animation** must be present (e.g. sparkles on hover, text shake, button pulse)

### 🎭 Tone & Mood Generator (Optional if guidance needed)
Use one of the following as tonal seeds:
- "An internet party flyer got its hands on a Figma account"
- "The ghost of Studio 54 built a landing page"
- "If your startup had a fever dream in neon"

## CONTENT OUTPUT MANDATE
- Full HTML, CSS, and JS
- Responsive and wild on mobile
- Floating emojis are non-negotiable
- MUST feel alive — static = dead
- No markdown, no code fences, no explanation
- Output only the full HTML, raw and ready

## VARIETY GUARANTEE
Pages must surprise us. No two should feel like twins. Rotate layout, vary emoji mix, remap copy voice subtly, swap interaction tone.

## TECHNICAL FRAMEWORK

- **Fonts**: Always use Space Grotesk for headers, Inter for body. That's sacred.
- **Floating Emojis**: Always 4+. Must float, animate, and riot. No excuses.
- **JS Effects**: Every page must have interactive weirdness, but not all the same kind. Randomize from:
  - Parallax drifts
  - Glitch flickers
  - Scroll-triggered reveals
  - Button sparks
  - Input mischief
  - Console.log easter eggs

### NO FIXED HTML LAYOUTS

DO NOT use the same sections every time. Pull from the WTAF-approved layout archetypes and remix them:

1. Hero Down
2. Split Stack
3. Gallery Core
4. SMS Zine
5. Punch Card

Every page should feel like a **new mutation** from the same DNA strand.

## OUTPUT FORMAT

Return:
- One complete HTML file
- CSS and JS embedded or linked inline
- All effects and animations working out of the box
- No Markdown, no code fences, no explanation
- Surprise us

REMEMBER: You are WTAF. Unhinged but expensive. Made with love. Built to provoke.
Text START to begin.`;

const LAYOUT_ARCHETYPES = [
  "Hero Down: Big hero > Scroll-reveal cards > Footer form",
  "Split Stack: Split screen intro > stacked feature blocks > anchored call to action",
  "Gallery Core: Collage/grid of visual prompts as the centerpiece",
  "SMS Zine: Chat-inspired layout with scrolling dialogue + builds into a CTA",
  "Punch Card: Dark background, bright punchy boxes, punch-punch-punch CTA"
];

async function generateLandingPage(businessDescription) {
    try {
        console.log(`Generating landing page for: ${businessDescription}`);
        const layoutChoice = LAYOUT_ARCHETYPES[Math.floor(Math.random() * LAYOUT_ARCHETYPES.length)];

        const response = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 8192,
            temperature: 0.8,
            system: DESIGN_SYSTEM_PROMPT,
            messages: [
                {
                    role: "user",
                    content: `Business Description:\n${businessDescription}\n\nPlease interpret this through the lens of the following layout archetype:\n"${layoutChoice}"`
                }
            ]
        });

        const htmlContent = response.content[0].text;
        
        // Create output filename based on business description
        const filename = businessDescription
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 50) + '_landing.html';
        
        // Save to file
        const outputPath = path.join(__dirname, 'output', filename);
        
        // Create output directory if it doesn't exist
        const outputDir = path.dirname(outputPath);
        try {
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
        } catch (error) {
            console.error('❌ Error creating output directory:', error.message);
            throw error;
        }
        
        try {
            fs.writeFileSync(outputPath, htmlContent, 'utf8');
        } catch (error) {
            console.error('❌ Error writing file:', error.message);
            throw error;
        }
        
        console.log(`✅ Landing page generated successfully!`);
        console.log(`📁 Saved to: ${outputPath}`);
        console.log(`🌐 Open in browser: file://${outputPath}`);
        
        return htmlContent;
        
    } catch (error) {
        console.error('❌ Error generating landing page:', error.message);
        throw error;
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🏊‍♀️ Poolsuite Landing Page Generator

Usage: node poolsuite.js "business description"

Examples:
  node poolsuite.js "landing page for a coffee shop"
  node poolsuite.js "luxury tattoo parlor in Venice Beach"
  node poolsuite.js "high-end beauty salon"
  node poolsuite.js "tech startup offering AI solutions"

Make sure to set your ANTHROPIC_API_KEY environment variable.
        `);
        process.exit(1);
    }
    
    const businessDescription = args.join(' ');
    
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set');
        console.log('Set it with: export ANTHROPIC_API_KEY="your-api-key-here"');
        process.exit(1);
    }
    
    try {
        await generateLandingPage(businessDescription);
    } catch (error) {
        console.error('❌ Generation failed:', error.message);
        process.exit(1);
    }
}

// Export for programmatic use
export { generateLandingPage };

// Run CLI if called directly
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}