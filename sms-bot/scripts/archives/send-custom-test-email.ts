import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendTestEmail } from '../lib/email/sendgrid.js';

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

// Custom message to send
const customMessage = `AF Daily — June 10

🪑 This is your office chair.
 I've absorbed 47 silent breakdowns this week.
Please stop projecting onto the lumbar support.`;

async function sendCustomTestEmail() {
  try {
    console.log('📧 Sending custom test email with fixed template...');
    console.log('💬 Message:', customMessage);
    console.log('📧 Recipient: bdecrem@gmail.com');

    const result = await sendTestEmail(customMessage, 'bdecrem@gmail.com');
    console.log('✅ Custom test email sent successfully!');
    console.log('📧 Result:', result);
  } catch (error) {
    console.error('❌ Custom test email failed:', error);
  }
}

sendCustomTestEmail(); 