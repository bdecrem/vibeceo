import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
const envPath = join(__dirname, '..', '..', '.env.local');
dotenv.config({ path: envPath });

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

// Fun slug generation data
export const COLORS: readonly string[] = ["golden", "crimson", "azure", "emerald", "violet", "coral", "amber", "silver", "ruby", "sapphire", "bronze", "pearl", "turquoise", "jade", "rose"] as const;
export const ANIMALS: readonly string[] = ["fox", "owl", "wolf", "bear", "eagle", "lion", "tiger", "deer", "rabbit", "hawk", "dolphin", "whale", "elephant", "jaguar", "falcon"] as const;
export const ACTIONS: readonly string[] = ["dancing", "flying", "running", "jumping", "swimming", "climbing", "singing", "painting", "coding", "dreaming", "exploring", "creating", "building", "racing", "soaring"] as const;

// File paths
const SMS_BOT_DIR: string = join(__dirname, '..', '..');
export const WATCH_DIRS: string[] = [
    join(SMS_BOT_DIR, "data", "code"),
    join(SMS_BOT_DIR, "data", "wtaf")
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