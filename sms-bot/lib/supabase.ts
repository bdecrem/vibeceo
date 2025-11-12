import { createClient } from "@supabase/supabase-js";

// Note: Environment variables are loaded in src/index.ts
// Do NOT load them again here to avoid conflicts

// Type definitions
export type SMSSubscriber = {
	id?: string;
	phone_number: string;
	opt_in_date?: string;
	consent_given: boolean;
	last_message_date?: string;
	last_inspiration_date?: string; // Timestamp of last sent daily inspiration
	unsubscribed?: boolean;
	confirmed?: boolean;
	is_admin?: boolean;
	role?: "user" | "coder" | "admin" | "degen" | "operator"; // User role with preset values
	slug?: string; // Auto-generated slug for personal WTAF folder
	index_file?: string; // Filename of the user's index page (for wtaf.me/slug/)
	hide_default?: boolean; // Hide pages by default when creating new content
	ai_daily_subscribed?: boolean;
	ai_daily_last_sent_at?: string | null;
	personalization?: Record<string, any>; // JSONB: {name, interests, timezone, location, notes}
	pending_air_subscription?: Record<string, any>; // JSONB: pending AIR subscription confirmation state
};

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY as string;
const isProduction = process.env.NODE_ENV === "production";

if (!supabaseUrl || !supabaseKey) {
	console.error("❌ Missing Supabase credentials!");
	console.error("SUPABASE_URL:", supabaseUrl || "MISSING");
	console.error("SUPABASE_SERVICE_KEY:", supabaseKey ? `${supabaseKey.substring(0, 20)}...` : "MISSING");
	if (!isProduction) {
		console.error("Make sure these are set in sms-bot/.env.local file");
	} else {
		console.error("Make sure these are set in Railway environment variables");
	}
	process.exit(1);
}

console.log("✅ Supabase client initialized:");
console.log("   URL:", supabaseUrl);
console.log("   Key:", `${supabaseKey.substring(0, 20)}...`);

export const supabase = createClient(supabaseUrl, supabaseKey);
