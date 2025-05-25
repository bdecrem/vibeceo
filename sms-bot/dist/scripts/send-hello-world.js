import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
console.log('Loading environment from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
    console.error('Error loading .env.local:', result.error);
    process.exit(1);
}
// Check if required Twilio environment variables exist
const requiredVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
}
// Initialize Twilio client
const twilioClient = new twilio.Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// Function to send a test SMS
async function sendHelloWorld(toPhoneNumber) {
    try {
        console.log(`Sending Hello World SMS to ${toPhoneNumber}...`);
        const message = await twilioClient.messages.create({
            body: 'Welcome to AF. You didn\'t join for clarity. You joined because something inside you broke… and monetized it.',
            to: toPhoneNumber,
            from: process.env.TWILIO_PHONE_NUMBER
        });
        console.log(`Message sent successfully! SID: ${message.sid}`);
        return message;
    }
    catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}
// Get the recipient phone number from command line argument or use a default
const recipientNumber = process.argv[2];
if (!recipientNumber) {
    console.error('Please provide a recipient phone number as an argument.');
    console.error('Usage: npm run build && node dist/scripts/send-hello-world.js +1234567890');
    process.exit(1);
}
// Send the message
sendHelloWorld(recipientNumber)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
