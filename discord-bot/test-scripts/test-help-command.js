// Test script for the new help command with coach irritation info

// Import necessary modules
import { formatStoryInfo } from '../dist/lib/discord/sceneFramework.js';
import fs from 'fs';
import path from 'path';

// Main test function
async function testHelpCommand() {
  console.log("=== Testing Help Command with Coach Dynamics ===\n");
  
  try {
    // Mock episode context (simplified)
    const mockEpisode = {
      generatedContent: Array(24).fill({
        type: "scene",
        coaches: ["donte", "kailey", "alex"]
      }),
      seeds: Array(24).fill({
        location: "Los Angeles",
        localTime: "12:30"
      })
    };
    
    const mockEpisodeContext = {
      theme: "Test theme",
      location: "Los Angeles"
    };
    
    // Generate help output using the formatStoryInfo function
    // This is the same function that the help command will use
    const irritationInfo = formatStoryInfo(
      mockEpisodeContext,
      mockEpisode,
      1 // Scene 1 (will show as scene: 02)
    );
    
    // Display the formatted irritation info that would appear in !help
    console.log("\n=== Current Coach Dynamics ===");
    console.log(irritationInfo);
    
    console.log("\nThis is what will be appended to the !help command output");
    
  } catch (error) {
    console.error("Error running test:", error);
  }
}

// Run the test
testHelpCommand(); 