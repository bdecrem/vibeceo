import { Twilio } from 'twilio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env.local');
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

// Check for required environment variables
const requiredVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Initialize Twilio client
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);

// Create readline interface for command line input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Test phone number (defaults to the Twilio number itself for testing)
let testPhoneNumber = process.env.TWILIO_PHONE_NUMBER as string;

// Main test function
async function runSmsTest() {
  console.log('\n===== VibeCEO SMS Bot Test Tool =====\n');
  
  rl.question('Enter a phone number to send test messages to (or press Enter to use Twilio number): ', async (answer) => {
    if (answer.trim()) {
      testPhoneNumber = answer.trim();
    }
    
    console.log(`\nSending test messages to: ${testPhoneNumber}`);
    console.log('Type your message and press Enter to send. Type "exit" to quit.\n');
    
    // Start the message loop
    messageLoop();
  });
}

// Message input loop
function messageLoop() {
  rl.question('> ', async (message) => {
    if (message.toLowerCase() === 'exit') {
      console.log('Exiting test...');
      rl.close();
      process.exit(0);
    }
    
    try {
      console.log(`Sending: "${message}"`);
      
      // Send SMS via Twilio
      const sentMessage = await twilioClient.messages.create({
        body: message,
        to: testPhoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER
      });
      
      console.log(`Message sent with SID: ${sentMessage.sid}`);
      
      // In a real scenario, the response would come via webhook
      // For testing, we wait a moment and fetch the most recent message
      console.log('Waiting for response...');
      
      // Simulate a delay to allow time for AI to respond
      setTimeout(async () => {
        try {
          // Fetch most recent messages
          const messages = await twilioClient.messages.list({
            to: process.env.TWILIO_PHONE_NUMBER,
            from: testPhoneNumber,
            limit: 1
          });
          
          if (messages.length > 0) {
            const latestMessage = messages[0];
            console.log(`\nResponse: "${latestMessage.body}"\n`);
          } else {
            console.log('\nNo response received yet.\n');
          }
          
          // Continue the loop
          messageLoop();
          
        } catch (error) {
          console.error('Error fetching response:', error);
          messageLoop();
        }
      }, 3000); // 3 second delay
      
    } catch (error) {
      console.error('Error sending message:', error);
      messageLoop();
    }
  });
}

// Run the test
runSmsTest().catch(console.error);
