require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function checkStatus(messageId) {
  try {
    console.log('Checking status for message ID:', messageId);
    
    const response = await fetch(`https://api.sms.to/sms/${messageId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SMS_TO_API_KEY}`,
      },
    });

    const data = await response.json();
    console.log('Status Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

// Use the message_id from the last send
checkStatus('482149-1748307-dc64-e206-82a083af-99');
