#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cities to test
const cities = ["Berlin", "Vegas", "Tokyo"];

// Duration test configurations (city, minutes available)
const tests = [
  { city: "Berlin", minutes: 45 },   // Short duration (< 90 min)
  { city: "Vegas", minutes: 120 },   // Medium duration (1-3 hours)
  { city: "Tokyo", minutes: 240 }    // Long duration (> 3 hours)
];

// Run the weekendvibes prompt for each test configuration
for (const test of tests) {
  console.log(`\n=== GENERATING WEEKEND VIBES FOR ${test.city.toUpperCase()} (${test.minutes} MINUTES) ===\n`);
  
  // Create a modified version of weekendvibes-prompt.js for this test
  const tempFilePath = path.join(__dirname, `temp-weekend-${test.city.toLowerCase()}-${test.minutes}.js`);
  
  // Read the original script
  const originalScript = fs.readFileSync(path.join(__dirname, 'weekendvibes-prompt.js'), 'utf8');
  
  // Replace the final function call with one that uses this city
  const modifiedScript = originalScript.replace(
    /getGPTResponse\(.*?\)\.catch/,
    `getGPTResponse("${test.city}").catch`
  );
  
  // Write the modified script
  fs.writeFileSync(tempFilePath, modifiedScript);
  
  // Execute the script with environment variable for available time
  const child = spawn('node', [tempFilePath], { 
    stdio: 'inherit',
    env: {
      ...process.env,
      AVAILABLE_TIME_MINUTES: test.minutes.toString()
    }
  });
  
  // Wait for the process to complete
  await new Promise((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ Successfully generated weekend vibes for ${test.city} (${test.minutes} minutes)`);
        // Clean up temporary file
        fs.unlinkSync(tempFilePath);
        resolve();
      } else {
        console.error(`\n❌ Error generating weekend vibes for ${test.city} (exit code ${code})`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  }).catch(err => {
    console.error(`Error in process: ${err.message}`);
  });
  
  // Add a short delay between runs
  await new Promise(resolve => setTimeout(resolve, 2000));
}

console.log('\n=== ALL WEEKEND VIBE GENERATIONS COMPLETED ===\n'); 