const fetch = require('node-fetch');

async function testWtafCommand() {
  console.log('Testing WTAF command processing...\n');
  
  // Simulate what the web console does
  const SMS_BOT_URL = 'http://localhost:3030';
  const DEV_WEBHOOK_ENDPOINT = '/dev/webhook';
  
  // Use bartdecrem+15's phone number
  const payload = new URLSearchParams({
    'From': '+15558747648',  // bartdecrem+15's placeholder phone
    'To': '+19999999999',
    'Body': 'wtaf make me a test page',
    'MessageSid': `SM${Math.random().toString(36).substr(2, 32)}`,
    'AccountSid': 'AC' + Math.random().toString(36).substr(2, 32),
    'NumMedia': '0',
    'X-Web-Console': 'true',
    'X-User-Email': 'bartdecrem+15@gmail.com',
    'X-User-Slug': 'mutualcuckoo',
    'X-User-Role': 'coder',
    'X-User-Id': '0a29b7a0-18df-485c-a50b-c36bbcb8fbb3'
  });

  console.log('Sending command to SMS bot...');
  console.log('Phone:', '+15558747648');
  console.log('Command:', 'wtaf make me a test page');
  console.log('Role:', 'coder');
  
  try {
    const response = await fetch(`${SMS_BOT_URL}${DEV_WEBHOOK_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': 'web-console-signature'
      },
      body: payload.toString()
    });

    if (!response.ok) {
      console.error('❌ SMS bot error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const result = await response.json();
    console.log('\n✅ SMS bot responded successfully');
    
    if (result.success && result.responses) {
      console.log('\nBot responses:');
      result.responses.forEach((r, i) => {
        console.log(`${i + 1}. ${r}`);
      });
    } else {
      console.log('Result:', result);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testWtafCommand();