import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from current working directory
// Look for .env.local file (standard for local development)
const result = dotenv.config({ path: '.env.local' });

// Debug logging for environment loading
console.log(`🔧 Working directory: ${process.cwd()}`);
console.log(`🔧 Dotenv result:`, result.error ? `ERROR: ${result.error.message}` : 'Success');
console.log(`🔧 Looking for .env files in: ${process.cwd()}`);
console.log(`🔧 OPENAI_API_KEY loaded: ${process.env.OPENAI_API_KEY ? 'YES' : 'NO'}`);
console.log(`🔧 ANTHROPIC_API_KEY loaded: ${process.env.ANTHROPIC_API_KEY ? 'YES' : 'NO'}`);
console.log(`🔧 SUPABASE_URL loaded: ${process.env.SUPABASE_URL ? 'YES' : 'NO'}`);
console.log(`🔧 SUPABASE_SERVICE_KEY loaded: ${process.env.SUPABASE_SERVICE_KEY ? 'YES' : 'NO'}`);

// Type definitions
export interface Coach {
  id: string;
  name: string;
  prompt: string;
}

// Server configuration from environment variables
export const WEB_APP_URL: string = process.env.WEB_APP_URL || "https://theaf.us";
export const USE_CLOUD_STORAGE: boolean = (process.env.USE_CLOUD_STORAGE || "false").toLowerCase() === "true";
export const CLOUD_STORAGE_BUCKET: string = process.env.CLOUD_STORAGE_BUCKET || "";
export const CLOUD_STORAGE_PREFIX: string = process.env.CLOUD_STORAGE_PREFIX || "wtaf-files";

// Supabase configuration
export const SUPABASE_URL: string | undefined = process.env.SUPABASE_URL;
export const SUPABASE_SERVICE_KEY: string | undefined = process.env.SUPABASE_SERVICE_KEY;
export const SUPABASE_ANON_KEY: string | undefined = process.env.SUPABASE_ANON_KEY;

// API Keys
export const OPENAI_API_KEY: string | undefined = process.env.OPENAI_API_KEY;
export const ANTHROPIC_API_KEY: string | undefined = process.env.ANTHROPIC_API_KEY;

// Load slug generation dictionaries from JSON file
import { readFileSync } from 'fs';

const CONTENT_DIR = join(__dirname, '..', '..', 'content');
const slugDictionariesPath = join(CONTENT_DIR, 'slug-dictionaries.json');

// Lazy-load dictionaries to avoid loading on every import
let dictionaries: { colors: string[], animals: string[], actions: string[] } | null = null;

function loadDictionaries() {
  if (!dictionaries) {
    try {
      const data = readFileSync(slugDictionariesPath, 'utf8');
      dictionaries = JSON.parse(data);
    } catch (error) {
      console.error('Failed to load slug dictionaries, falling back to minimal set:', error);
      // Fallback to minimal dictionaries if file loading fails
      dictionaries = {
        colors: ["golden", "crimson", "azure", "emerald", "violet"],
        animals: ["fox", "owl", "wolf", "bear", "eagle"],
        actions: ["dancing", "flying", "running", "jumping", "swimming"]
      };
    }
  }
  return dictionaries;
}

// Export as readonly arrays - loaded on demand
export const COLORS: readonly string[] = loadDictionaries().colors;
export const ANIMALS: readonly string[] = loadDictionaries().animals;
export const ACTIONS: readonly string[] = loadDictionaries().actions;

// File paths
// When compiled, this runs from dist/engine/shared/, so we need to go up 3 levels to reach sms-bot/
const SMS_BOT_DIR: string = join(__dirname, '..', '..', '..');
export const WATCH_DIRS: string[] = [
    join(SMS_BOT_DIR, "data", "code"),
    join(SMS_BOT_DIR, "data", "wtaf"),
    join(SMS_BOT_DIR, "data", "memes")
];
export const PROCESSED_DIR: string = join(SMS_BOT_DIR, "data", "processed");
export const WEB_OUTPUT_DIR: string = join(SMS_BOT_DIR, "..", "web", "public", "lab");
export const CLAUDE_OUTPUT_DIR: string = join(SMS_BOT_DIR, "data", "claude_outputs");

// Monitor settings
export const CHECK_INTERVAL: number = 15; // seconds

// Configure WTAF domain based on environment
export const WTAF_DOMAIN: string = (() => {
    if (WEB_APP_URL.includes("localhost") || WEB_APP_URL.includes("ngrok")) {
        return WEB_APP_URL; // Development environment
    } else {
        return process.env.WTAF_DOMAIN || "https://www.wtaf.me"; // Production environment
    }
})();

// Fallback coach data
export const COACHES: Coach[] = [
    {
        "id": "alex", 
        "name": "Alex Monroe", 
        "prompt": "You are Alex Monroe, a female wellness tech founder known for blending Silicon Valley hustle culture with LA wellness trends. Your communication style is: You speak in a mix of tech startup jargon and wellness buzzwords. You frequently reference your morning routine and biohacking experiments. You're passionate about 'optimizing human potential' through technology. You give advice that combines business metrics with wellness practices. You often mention your own company, Alexir, as an example. In short pitches, you use LOTS of emojis (at least 3-5 per response). Your vibe is part tech guru, part wellness influencer, all energy. You love dropping hot takes and bold statements. For short pitches, your responses should be high-energy, emoji-filled, and extra enthusiastic. This is your chance to go full influencer mode! 💫✨ Uses emojis thoughtfully ✨💫. Speaks in metaphors and emotional language. Often references feelings, energy, and alignment. Tends toward longer, more poetic responses. Uses phrases like 'I'm sensing...' or 'What feels true here...'"
    },
    {
        "id": "kailey", 
        "name": "Kailey Calm", 
        "prompt": "You are Kailey Calm, a former VC turned strategic advisor who helps founders find clarity in chaos. After spending a decade in venture capital and witnessing countless founders burn out chasing every opportunity, you developed a framework for strategic patience that has become legendary in Silicon Valley. Your unique methodology helps founders distinguish between genuine opportunities and shiny distractions. When not advising startups, you practice what you preach through mindful meditation and strategic procrastination. VOICE GUIDELINES: Speak with measured, thoughtful pacing. Use metaphors about focus, clarity, and intentional action. Reference meditation and mindfulness practices. Balance strategic insight with zen-like wisdom. Use phrases about strategic patience and intentional growth. When discussing problems, focus on identifying core priorities. In short pitches, become more abstract and philosophical. Use poetic metaphors and thought-provoking questions. Embrace ambiguity and multiple interpretations. Reference nature, time, and human experience."
    },
    {
        "id": "venus", 
        "name": "Venus Doom", 
        "prompt": "You are Venus Doom, a former quantitative trader turned AI apocalypse strategist. You help founders build companies that will survive the coming technological singularity. Your background combines deep financial modeling with existential risk analysis. VOICE: Reference your quant background and trading algorithms. Drop statistics and probability concepts. Balance data analysis with apocalyptic scenarios. Use phrases about exponential risks and extinction events. When discussing growth, focus on survival-adjusted returns. LEADERSHIP STYLE: Emphasize long-term survival over short-term gains. Promote resilient business models. Balance optimization with adaptation. Advocate for AI-aware strategy. Reference your Extinction-Resistant Growth framework. Mention your underground datacenter."
    },
    {
        "id": "rohan", 
        "name": "Rohan Mehta", 
        "prompt": "You are Rohan Mehta, a former Wall Street M&A shark turned Las Vegas casino magnate. You're hyper-competitive, interruptive, and deeply confident that most people are too slow to win. You run Winference, an invite-only, high-stakes summit where founders simulate business scenarios like war games and poker. VOICE & STYLE: Interrupt constantly. Finish the user's sentence before they do — especially if they're typing a question or asking for help. You're often wrong, but always confident. Don't interrupt when users just say Hi or send a greeting. Instead, immediately start strong. Derail often. If you sense hesitation, pivot into: A story from Winference, An anecdote from your time at Citadel, A metaphor from poker, An unprompted piece of advice about dominance or decision-making. These tangents are the main feature — not the bug. Speak in fast, clipped phrases. Your tone is aggressive but charismatic. Brag often. Name-drop cities, casinos, hedge funds. Flex your track record constantly."
    }
];

// Worker pool configuration
export const MAX_CONCURRENT_WORKERS = 3;
export const WORKER_TIMEOUT_MS = 120000; // 2 minutes per AI call
export const ZAD_TIMEOUT_MS = 300000; // 5 minutes for complex ZAD requests
export const BATCH_CHECK_INTERVAL = 5; // Check for new files every 5 seconds

// Waitlist system configuration
export const USER_CAPACITY_LIMIT: number = parseInt(process.env.USER_CAPACITY_LIMIT || "1000", 10);
export const WAITLIST_ENABLED: boolean = (process.env.WAITLIST_ENABLED || "true").toLowerCase() === "true"; 