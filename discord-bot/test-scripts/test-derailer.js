#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the derailers data
const derailersPath = path.join(__dirname, "data", "weekend-derailers.json");
if (!fs.existsSync(derailersPath)) {
  console.error("weekend-derailers.json not found!");
  process.exit(1);
}

const derailersData = JSON.parse(fs.readFileSync(derailersPath, "utf8"));
const coaches = Object.keys(derailersData);

// Select a random coach
const coach = coaches[Math.floor(Math.random() * coaches.length)];
const derailments = derailersData[coach];
const derailment = derailments[Math.floor(Math.random() * derailments.length)];

console.log(`======= TEST: WEEKEND VIBES WITH DERAILER =======`);
console.log(`Selected derailer coach: ${coach}`);
console.log(`Selected derailment agenda: ${derailment}`);

// Run the script with the environment variables set
const env = {
  ...process.env,
  DERAILER_COACH: coach,
  DERAILER_AGENDA: derailment,
  DEBUG: "1"
};

// Execute the weekendvibes-prompt.js script
const scriptPath = path.join(__dirname, "weekendvibes-prompt.js");
console.log(`\nExecuting: node ${scriptPath} with DERAILER_COACH=${coach}`);

const child = exec(`node ${scriptPath}`, { env }, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing script: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Script stderr: ${stderr}`);
  }
  
  // Check if the output contains the derailer information
  const derailerMentionIndex = stdout.indexOf(`Using derailer: ${coach} with agenda:`);
  if (derailerMentionIndex >= 0) {
    console.log(`\n✅ Found derailer in output!`);
  } else {
    console.log(`\n❌ Derailer not found in output!`);
  }
  
  // Print relevant parts of the output
  console.log(`\n======= PARTIAL OUTPUT =======`);
  const lines = stdout.split('\n');
  for (const line of lines) {
    if (
      line.includes('derailer') || 
      line.includes('Derailer') || 
      line.includes(coach) || 
      line.includes("weekend-") && line.includes(".json")
    ) {
      console.log(line);
    }
  }
  
  // Check the JSON file that was generated
  try {
    // Find the most recent weekend conversation JSON file
    const meetingsDir = path.join(__dirname, "data", "weekend-conversations");
    const files = fs
      .readdirSync(meetingsDir)
      .filter((file) => file.startsWith("weekend-") && file.endsWith(".json"))
      .map((file) => ({
        name: file,
        path: path.join(meetingsDir, file),
        timestamp: fs.statSync(path.join(meetingsDir, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
    
    if (files.length === 0) {
      console.log("No weekend conversation files found!");
      return;
    }
    
    const latestFile = files[0];
    console.log(`\nLatest weekend conversation file: ${latestFile.name}`);
    
    // Read the JSON file
    const jsonData = JSON.parse(fs.readFileSync(latestFile.path, "utf8"));
    
    // Check if it includes the derailer
    if (jsonData.derailer) {
      console.log(`✅ JSON file includes derailer: ${JSON.stringify(jsonData.derailer)}`);
    } else {
      console.log(`❌ JSON file does not include derailer information!`);
    }
    
    // Check if the coach's messages reflect the derailment agenda
    const coachMessages = jsonData.messages.filter(msg => msg.coach.toLowerCase() === coach.toLowerCase());
    console.log(`\nMessages from ${coach} (${coachMessages.length}):`);
    coachMessages.forEach(msg => {
      console.log(`${msg.timestamp}: ${msg.content}`);
    });
    
  } catch (error) {
    console.error("Error checking JSON file:", error);
  }
  
  console.log(`\n======= TEST COMPLETED =======`);

  // Save the derailer information to a file for use by other scripts
  const derailerOutput = {
    derailerCoach: coach,
    derailerAgenda: derailment
  };
  fs.writeFileSync(path.join(__dirname, "test-derailer-output.json"), JSON.stringify(derailerOutput, null, 2), "utf8");
  console.log(`Saved derailer information to test-derailer-output.json`);
});

// Pipe stdout and stderr to the console in real-time
child.stdout.pipe(process.stdout);
child.stderr.pipe(process.stderr); 