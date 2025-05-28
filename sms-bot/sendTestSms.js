require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function sendSms() {
  try {
    const response = await fetch('https://api.sms.to/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMS_TO_API_KEY}`,
      },
      body: JSON.stringify({
        to: '+16508989508',
        message: 'Hello from VibeCEO via SMS.TO API!',
        sender_id: 'VibeCEO',
      }),
    });

    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

sendSms();
