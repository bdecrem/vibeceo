import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendTestEmail } from '../lib/email/sendgrid.js';
import { getTodaysInspiration, formatDailyMessage } from '../lib/sms/handlers.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Load environment variables from .env.local
if (!isProduction) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  console.log('Loading environment from:', envPath);
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env.local:', result.error);
    process.exit(1);
  }
}

// Get today's actual message (same logic as SMS system)
async function sendTodaysEmail() {
  try {
    console.log('📧 Getting today\'s actual message from SMS system...');
    const todaysData = await getTodaysInspiration();
    const todaysInspiration = formatDailyMessage(todaysData.inspiration);

    console.log('📧 Sending test email with today\'s actual message...');
    console.log('💬 Message:', todaysInspiration);
    console.log('📧 Recipient: bdecrem@gmail.com');

    const result = await sendTestEmail(todaysInspiration, 'bdecrem@gmail.com');
    console.log('✅ Test email sent successfully!');
    console.log('📧 Result:', result);
  } catch (error) {
    console.error('❌ Test email failed:', error);
  }
}

sendTodaysEmail();
