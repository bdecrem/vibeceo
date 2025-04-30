import fs from 'fs';
import path from 'path';

interface EpisodeArc {
  theme: string;
  arcSummary: string;
  toneKeywords: string[];
  motifs: string[];
}

interface Scene {
  index: number;
  type: "watercooler" | "newschat" | "tmzchat" | "pitchchat";
  intro: string;
  outro: string;
  location: string;
  localTime: string;
  coaches: string[];
  prompt?: string; // Optional field to store the prompt used for watercooler events
}

interface EpisodeData {
  id: string;  // Format: YYYY-MM-DD-HH-mm
  createdAt: string;  // ISO timestamp
  timeSpeed: number;  // Minutes per unit
  arc: EpisodeArc;
  scenes: Scene[];
}

const EPISODES_DIR = path.join(process.cwd(), 'data', 'episodes');

// Ensure episodes directory exists
if (!fs.existsSync(EPISODES_DIR)) {
  fs.mkdirSync(EPISODES_DIR, { recursive: true });
}

let currentEpisodeId: string | null = null;

export function createNewEpisode(arc: EpisodeArc, timeSpeed: number): string {
  const now = new Date();
  const id = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);  // Format: YYYY-MM-DD-HH-mm
  
  const episodeData: EpisodeData = {
    id,
    createdAt: now.toISOString(),
    timeSpeed,
    arc,
    scenes: []
  };

  const filePath = path.join(EPISODES_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(episodeData, null, 2));
  
  currentEpisodeId = id;
  return id;
}

export function addScene(scene: Scene): void {
  if (!currentEpisodeId) {
    throw new Error('No active episode');
  }

  const filePath = path.join(EPISODES_DIR, `${currentEpisodeId}.json`);
  const episodeData: EpisodeData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  episodeData.scenes.push(scene);
  fs.writeFileSync(filePath, JSON.stringify(episodeData, null, 2));
}

export function getCurrentEpisode(): EpisodeData | null {
  if (!currentEpisodeId) {
    return null;
  }

  const filePath = path.join(EPISODES_DIR, `${currentEpisodeId}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function listEpisodes(): string[] {
  return fs.readdirSync(EPISODES_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''))
    .sort()
    .reverse();  // Most recent first
}

export function loadEpisode(id: string): EpisodeData {
  const filePath = path.join(EPISODES_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Episode ${id} not found`);
  }
  
  currentEpisodeId = id;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
} 