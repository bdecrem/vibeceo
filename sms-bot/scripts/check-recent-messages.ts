import dotenv from 'dotenv';
import { supabase } from '../lib/supabase.js';

// Load environment variables
const envPath = process.cwd() + '/.env.local';
dotenv.config({ path: envPath });

async function checkRecentMessages() {
  try {
    console.log('🔍 Checking the 10 most recent messages in database...');
    
    const { data, error } = await supabase
      .from('af_daily_message')
      .select('*')
      .order('item', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error searching database:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ No messages found in database');
      return;
    }

    console.log(`✅ Found ${data.length} recent messages:`);
    data.forEach(item => {
      console.log(`\n📋 Item ID: ${item.item}`);
      console.log(`📝 Type: ${item.type}`);
      console.log(`💬 Text: ${item.text.substring(0, 100)}${item.text.length > 100 ? '...' : ''}`);
      if (item.author) {
        console.log(`👤 Author: ${item.author}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkRecentMessages(); 