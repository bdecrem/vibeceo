import { createClient } from '@supabase/supabase-js';

// Type definitions
export type SMSSubscriber = {
  id?: string;
  phone_number: string;
  opt_in_date?: string;
  consent_given: boolean;
  last_message_date?: string;
  unsubscribed?: boolean;
  confirmed?: boolean;
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
}

export const supabase = createClient(
  supabaseUrl as string, 
  supabaseKey as string
);
