import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads environment variables from appropriate .env file based on NODE_ENV
 * Order of precedence:
 * 1. Existing environment variables (highest priority)
 * 2. .env.${NODE_ENV}.local
 * 3. .env.local (if NODE_ENV !== 'test')
 * 4. .env.${NODE_ENV}
 * 5. .env
 */
export function loadEnvironment() {
  // Don't override existing environment variables
  const envConfig = dotenv.config({ override: false });
  
  const env = process.env.NODE_ENV || 'development';
  const isTest = env === 'test';
  
  // Define the possible .env file paths in order of precedence
  const envFilePaths = [
    env !== 'production' && path.resolve(process.cwd(), `.env.${env}.local`),
    !isTest && path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), `.env.${env}`),
    path.resolve(process.cwd(), '.env')
  ].filter(Boolean);
  
  // Load the first existing .env file
  for (const envPath of envFilePaths) {
    if (envPath && fs.existsSync(envPath)) {
      console.log(`Loading environment from ${path.basename(envPath)}`);
      dotenv.config({ path: envPath });
      break;
    }
  }
  
  // For production, ensure required variables are set
  if (env === 'production') {
    const requiredVars = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
    }
  }
} 