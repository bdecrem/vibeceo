require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

async function checkAccount() {
  try {
    console.log('Fetching account details...');
    
    const response = await fetch('https://api.sms.to/account/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SMS_TO_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Account Details:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAccount();
