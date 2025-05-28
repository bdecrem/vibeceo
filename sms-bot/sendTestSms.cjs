require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function sendSms() {
  try {
    console.log('Sending SMS via SMS.TO API...');
    console.log('Using API Key:', process.env.SMS_TO_API_KEY ? '***' + process.env.SMS_TO_API_KEY.slice(-4) : 'Not found');
    
    const response = await fetch('https://api.sms.to/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMS_TO_API_KEY}`,
      },
      body: JSON.stringify({
        to: '+16508989508',
        message: 'Hello from VibeCEO via SMS.TO API! (No sender ID)'
      }),
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

sendSms();
