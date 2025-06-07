import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

const BASE_URL = process.env.SMS_BOT_URL || 'http://localhost:3030';

async function testEmailWebhook() {
  console.log('🧪 Testing email webhook...');
  
  // Test data that mimics SendGrid's inbound parse webhook
  const testEmailData = {
    from: 'test@example.com',
    subject: 'Testing Leo Response',
    text: 'Hi Leo, I need help with my startup. We are struggling with product-market fit and I feel lost. What should I do?'
  };

  try {
    console.log('📧 Sending test email webhook...');
    console.log('Test data:', testEmailData);
    
    const response = await axios.post(`${BASE_URL}/parse-inbound`, testEmailData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    if (response.status === 200) {
      console.log('✅ Email webhook test successful!');
      console.log('Response:', response.data);
    } else {
      console.error('❌ Unexpected response status:', response.status);
    }

  } catch (error: any) {
    console.error('❌ Email webhook test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Is the SMS bot server running?');
      console.error('Make sure to run: npm run dev');
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function testHealthCheck() {
  console.log('🏥 Testing email webhook health check...');
  
  try {
    const response = await axios.get(`${BASE_URL}/parse-inbound`);
    
    if (response.status === 200) {
      console.log('✅ Email webhook health check passed!');
      console.log('Response:', response.data);
    } else {
      console.error('❌ Health check failed with status:', response.status);
    }
    
  } catch (error: any) {
    console.error('❌ Health check failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function main() {
  console.log('🚀 Starting email webhook tests...');
  console.log('Target URL:', BASE_URL);
  console.log('');
  
  // Test health check first
  await testHealthCheck();
  console.log('');
  
  // Test the actual webhook
  await testEmailWebhook();
}

main().catch(console.error); 