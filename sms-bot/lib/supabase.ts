import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment detection
const isProduction = process.env.NODE_ENV === "production";

// Load environment variables in development
if (!isProduction) {
	// Load from sms-bot directory (two levels up from dist/lib/)
	const envPath = path.join(__dirname, '..', '..', '.env.local');
	dotenv.config({ path: envPath });
	console.log(`Loading env from: ${envPath}`);
}

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
};

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
	console.error(
		"Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY."
	);
	if (!isProduction) {
		console.error("Make sure these are set in your .env.local file");
	} else {
		console.error(
			"Make sure these are set in your Railway environment variables"
		);
	}
}

export const supabase = createClient(supabaseUrl, supabaseKey);
