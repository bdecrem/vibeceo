import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Load environment variables from .env.local
if (!isProduction) {
  const envPath = path.resolve(__dirname, '../.env.local');
  console.log('Loading environment from:', envPath);
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env.local:', result.error);
    process.exit(1);
  }
}

// Use environment variable for API key
const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  console.error(`❌ SENDGRID_API_KEY not found in ${isProduction ? 'Railway environment' : '.env.local'}`);
  process.exit(1);
}

console.log('✅ SendGrid API key found, length:', apiKey.length);
sgMail.setApiKey(apiKey);

const msg = {
  to: 'bdecrem@gmail.com',
  from: 'bot@advisorsfoundry.ai',
  subject: 'Your Daily Advisor Insight',
  text: `Hi there,

Here's your daily insight from The Advisors Foundry:

"You're not behind. You're just pre-viral with main character potential."
— Alex

Best regards,
The Advisors Foundry Team

---
If you no longer wish to receive these emails, please reply with "UNSUBSCRIBE"
The Advisors Foundry | advisorsfoundry.ai`,
  html: `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="background: #f8f9fa; padding: 20px; text-align: center; border-bottom: 3px solid #007bff;">
        <h1 style="margin: 0; color: #007bff;">The Advisors Foundry</h1>
        <p style="margin: 5px 0 0 0; color: #666;">Daily Insight</p>
      </div>
      
      <div style="padding: 30px 20px;">
        <p>Hi there,</p>
        
        <p>Here's your daily insight:</p>
        
        <blockquote style="border-left: 4px solid #007bff; padding-left: 20px; margin: 20px 0; font-style: italic; font-size: 18px; color: #555;">
          "You're not behind. You're just pre-viral with main character potential."
        </blockquote>
        
        <p style="text-align: right; color: #666; margin-top: 10px;">— Alex</p>
        
        <p style="margin-top: 30px;">Best regards,<br>
        The Advisors Foundry Team</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd;">
        <p>The Advisors Foundry | <a href="https://advisorsfoundry.ai" style="color: #007bff;">advisorsfoundry.ai</a></p>
        <p>If you no longer wish to receive these emails, <a href="mailto:bot@advisorsfoundry.ai?subject=Unsubscribe" style="color: #007bff;">click here to unsubscribe</a></p>
      </div>
    </div>
  `,
};

console.log('📧 Attempting to send email with config:', {
  to: msg.to,
  from: msg.from,
  subject: msg.subject
});

sgMail
  .send(msg)
  .then((response) => {
    console.log('✅ Email sent successfully');
    console.log('📊 Response status:', response[0].statusCode);
    console.log('📊 Response headers:', response[0].headers);
  })
  .catch((error) => {
    console.error('❌ Error sending email:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response body:', error.response.body);
    }
  });
