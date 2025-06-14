import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Load environment variables from .env.local in development
if (!isProduction) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.resolve(__dirname, '../.env.local');
  
  // Check if file exists before trying to load it
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment from ${envPath}`);
    dotenv.config({ path: envPath });
  } else {
    console.warn(`Environment file not found at ${envPath}`);
    // Try loading from current working directory as fallback
    const cwdEnvPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(cwdEnvPath)) {
      console.log(`Loading environment from ${cwdEnvPath}`);
      dotenv.config({ path: cwdEnvPath });
    }
  }
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
  role?: 'user' | 'coder' | 'admin'; // User role with preset values
  slug?: string; // Auto-generated slug for personal WTAF folder
  index_file?: string; // Filename of the user's index page (for wtaf.me/slug/)
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
  if (!isProduction) {
    console.error('Make sure these are set in your .env.local file');
  } else {
    console.error('Make sure these are set in your Railway environment variables');
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey);
