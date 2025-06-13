import dotenv from 'dotenv';
import { supabase } from '../lib/supabase.js';

// Load environment variables
const envPath = process.cwd() + '/.env.local';
dotenv.config({ path: envPath });

async function findOfficeChairMessage() {
  try {
    console.log('🔍 Searching for office chair message in database...');
    
    const { data, error } = await supabase
      .from('af_daily_message')
      .select('*')
      .ilike('text', '%office chair%')
      .order('item', { ascending: false });

    if (error) {
      console.error('❌ Error searching database:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ Office chair message not found in database');
      return;
    }

    console.log(`✅ Found ${data.length} office chair message(s):`);
    data.forEach(item => {
      console.log(`\n📋 Item ID: ${item.item}`);
      console.log(`📝 Type: ${item.type}`);
      console.log(`💬 Text: ${item.text}`);
      if (item.author) {
        console.log(`👤 Author: ${item.author}`);
      }
    });

    if (data.length > 0) {
      const latestItem = data[0];
      console.log(`\n🎯 Use this command to queue it for today:`);
      console.log(`Text yourself: SKIP ${latestItem.item}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findOfficeChairMessage(); 