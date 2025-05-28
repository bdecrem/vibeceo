import { sendSms } from './sendSms.js';

async function testSms() {
  console.log('Sending test SMS...');
  const result = await sendSms('Hello from VibeCEO! This is a test message from SMS.TO');
  console.log('Result:', result);
}

testSms().catch(console.error);
