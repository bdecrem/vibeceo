import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadEnvironment() {
  // In production, environment variables should already be set
  if (process.env.NODE_ENV === 'production') {
    console.log('Production environment detected - using existing environment variables');
    return;
  }
  
  // In development, load from .env.local
  const envPath = path.resolve(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    console.log('Loading environment variables from .env.local');
    dotenv.config({ path: envPath });
  } else {
    console.warn('.env.local file not found, using existing environment variables');
  }
} 