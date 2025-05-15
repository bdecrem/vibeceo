/**
 * Test script for Weekend Story Parser
 * This script takes a weekend story output file and parses it into the structured JSON format
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseWeekendStory } from "./data/weekend-stories/parser.js";

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if filename was provided
const inputFile = process.argv[2] || "weekend2_story_output-2025-05-11T17-00-29-025Z.txt";
const inputPath = path.join(__dirname, inputFile);

// Check if output path was provided
const outputFile = process.argv[3] || `weekend2-story-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
const outputPath = path.join(__dirname, "data", "weekend-stories", outputFile);

console.log(`Reading from: ${inputPath}`);
console.log(`Writing to: ${outputPath}`);

try {
  // Read the story text file
  const storyText = fs.readFileSync(inputPath, "utf8");
  
  // Extract content after "=== STORY BEGINS ==="
  const storyContent = storyText.split("=== STORY BEGINS ===")[1]?.trim() || storyText;
  
  // Extract metadata from the file if possible
  const metadataMatch = storyText.match(/Story Type: (.+)\nCity: (.+)\nLocation Goal: (.+)\nObject: (.+)\nGenerated:/);
  
  let metadata = {
    storyType: "weekend2",
    generated: new Date().toISOString()
  };
  
  if (metadataMatch) {
    metadata.storyType = metadataMatch[1].trim();
    metadata.city = metadataMatch[2].trim();
    metadata.locationGoal = metadataMatch[3].trim();
    metadata.object = metadataMatch[4].trim();
  } else {
    // Default metadata from the weekend2 story format
    metadata.city = "Berlin";
    metadata.locationGoal = "Berghain";
    metadata.object = "metal drink token";
  }
  
  // Parse the story
  const parsedStory = parseWeekendStory(storyContent, metadata);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write the parsed JSON
  fs.writeFileSync(outputPath, JSON.stringify(parsedStory, null, 2), "utf8");
  
  console.log(`Successfully parsed ${parsedStory.scenes.length} scenes!`);
  console.log(`Saved structured data to ${outputPath}`);
  
  // Log a summary of the first scene as a sample
  if (parsedStory.scenes.length > 0) {
    const firstScene = parsedStory.scenes[0];
    console.log("\nSample (First Scene):");
    console.log(`Intro: It's ${firstScene.intro.time} in ${firstScene.intro.location} and ${firstScene.intro.behavior}`);
    console.log(`Messages: ${firstScene.conversation.length}`);
    firstScene.conversation.forEach((msg, i) => {
      console.log(`  ${i+1}. ${msg.coach} (${msg.timestamp}): ${msg.content}`);
    });
  }
  
} catch (error) {
  console.error("Error processing file:", error);
  process.exit(1);
} 