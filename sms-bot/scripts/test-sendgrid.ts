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

// Test with exact content format requested
const todaysInspiration = `"You're not lost.\nYou're just temporarily vibing in the in-between." — Donte`;

console.log('📧 Sending test email with NEW TEMPLATE...');
console.log('💬 Message:', todaysInspiration);
console.log('📧 Recipient: bdecrem@gmail.com');

sendTestEmail(todaysInspiration, 'bdecrem@gmail.com')
  .then((result) => {
    console.log('✅ Test email sent successfully!');
    console.log('📧 Result:', result);
  })
  .catch((error) => {
    console.error('❌ Test email failed:', error);
  });
