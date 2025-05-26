import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
console.log('Attempting to load environment from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env.local:', result.error);
  process.exit(1);
}

// Check Twilio environment variables
const requiredVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
];

console.log('\nChecking environment variables:');
let missingVars = [];

for (const varName of requiredVars) {
  if (process.env[varName]) {
    console.log(`✅ ${varName} is set`);
    
    // Print masked value for verification (only first/last 4 chars visible)
    const value = process.env[varName] as string;
    if (value.length > 8) {
      const maskedValue = value.substring(0, 4) + '...' + value.substring(value.length - 4);
      console.log(`   Value: ${maskedValue}`);
    } else {
      console.log(`   Value: ${'*'.repeat(value.length)}`);
    }
  } else {
    console.log(`❌ ${varName} is NOT set`);
    missingVars.push(varName);
  }
}

if (missingVars.length > 0) {
  console.log('\n⚠️  Please make sure your .env.local file has these variables properly set:');
  missingVars.forEach(v => console.log(`   ${v}=your_value_here`));
} else {
  console.log('\n✅ All required environment variables are set!');
}
