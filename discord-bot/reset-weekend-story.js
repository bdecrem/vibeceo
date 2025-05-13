// Simple script to reset the weekend story index
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the scene index file
const sceneIndexFile = path.join(__dirname, "data", "weekend-stories", "current-scene-index.json");

console.log("Resetting weekend story index...");

// Reset the scene index
const data = {
  storyFile: "",
  currentIndex: 0,
  totalScenes: 24,
  lastUpdated: new Date().toISOString()
};

fs.writeFileSync(sceneIndexFile, JSON.stringify(data, null, 2), "utf8");
console.log("Scene index reset to 0. Start the bot to generate a new story."); 