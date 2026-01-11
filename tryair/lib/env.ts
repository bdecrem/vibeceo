/**
 * Environment variable loader.
 * Loads variables from sms-bot/.env.local
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadEnv(): void {
  // Try multiple locations for .env.local
  const possiblePaths = [
    path.resolve(__dirname, '../../sms-bot/.env.local'),
    path.resolve(process.cwd(), '../sms-bot/.env.local'),
    path.resolve(process.cwd(), '.env.local'),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      parseEnvFile(envPath);
      console.log(`Loaded env from: ${envPath}`);
      return;
    }
  }

  throw new Error('Could not find .env.local file');
}

function parseEnvFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
