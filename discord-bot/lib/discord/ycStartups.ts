import fs from 'fs';
import path from 'path';

// Define interface for YC startup data
export interface YCStartup {
  name: string;
  shortPitch: string;
  longPitch: string;
  founderInfo: string;
  url: string;
  batch: string;
  revealText: string;
}

// Load YC startups from JSON file
export function loadYCStartups(): YCStartup[] {
  try {
    const filePath = path.join(process.cwd(), 'data', 'yc-startups.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.startups;
  } catch (error) {
    console.error('Error loading YC startups:', error);
    return [];
  }
}

// Get a random YC startup
export function getRandomYCStartup(): YCStartup | null {
  const startups = loadYCStartups();
  if (startups.length === 0) return null;
  return startups[Math.floor(Math.random() * startups.length)];
}
