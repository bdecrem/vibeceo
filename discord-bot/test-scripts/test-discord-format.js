/**
 * Test script to demonstrate Discord formatting of a weekend story
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the formatter (dynamic import for ESM)
async function main() {
  try {
    // Import the formatter
    const { formatSceneForDiscord, formatStoryForDiscord } = await import("./data/weekend-stories/formatter.js");
    
    // Path to the JSON file
    const jsonPath = path.join(__dirname, "data", "weekend-stories", "weekend2-story-2025-05-11T17-20-37-830Z.json");
    
    // Read the JSON file
    const storyData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    
    // Format a single scene (scene 1)
    const formattedScene = formatSceneForDiscord(storyData.scenes[0]);
    
    // Format the entire story
    const allScenes = formatStoryForDiscord(storyData);
    
    // Output to console
    console.log("=== SAMPLE SCENE FORMATTED FOR DISCORD ===\n");
    console.log(formattedScene);
    
    console.log("\n\n=== FIRST 3 SCENES FORMATTED FOR DISCORD ===\n");
    console.log(allScenes.slice(0, 3).join("\n\n---\n\n"));
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main(); 