#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Simple utility to update the current coach irritation in story-arcs.json
 * 
 * Usage: 
 * node update-coach-dynamics.js <coach> <target> <incident>
 * 
 * Example:
 * node update-coach-dynamics.js eljas rohan "He wrote a long anti-capitalist Slack comment… in the wrong channel."
 */

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const [,, coach, target, ...incidentParts] = process.argv;
const incident = incidentParts.join(' ');

// Check if we have all required parameters
if (!coach || !target || !incident) {
  console.error('Error: Missing parameters');
  console.error('Usage: node update-coach-dynamics.js <coach> <target> <incident>');
  console.error('Example: node update-coach-dynamics.js eljas rohan "He wrote a long anti-capitalist Slack comment… in the wrong channel."');
  process.exit(1);
}

// Validate coach and target names
const validCoaches = ['alex', 'donte', 'eljas', 'kailey', 'rohan', 'venus'];
if (!validCoaches.includes(coach.toLowerCase())) {
  console.error(`Error: Invalid coach name: ${coach}`);
  console.error(`Valid coaches: ${validCoaches.join(', ')}`);
  process.exit(1);
}

if (!validCoaches.includes(target.toLowerCase())) {
  console.error(`Error: Invalid target name: ${target}`);
  console.error(`Valid coaches: ${validCoaches.join(', ')}`);
  process.exit(1);
}

// Path to story-arcs.json
const storyArcsPath = path.join(process.cwd(), 'data', 'story-themes', 'story-arcs.json');

// Check if file exists
if (!fs.existsSync(storyArcsPath)) {
  console.error(`Error: File not found: ${storyArcsPath}`);
  process.exit(1);
}

try {
  // Read the current file
  const storyArcsContent = fs.readFileSync(storyArcsPath, 'utf-8');
  const storyArcs = JSON.parse(storyArcsContent);
  
  // Store the intensity values from the current data
  const intensity = storyArcs.currentIrritation?.intensity || {
    morning: [1, 2, 3, 4, 5, 6, 7, 8],
    midday: [2, 3, 4, 5, 6, 7, 8, 9],
    afternoon: [3, 4, 5, 6, 7, 8, 9, 10]
  };
  
  // Update the currentIrritation
  storyArcs.currentIrritation = {
    coach: coach.toLowerCase(),
    target: target.toLowerCase(),
    incident,
    intensity
  };
  
  // Write the updated data back to the file
  fs.writeFileSync(storyArcsPath, JSON.stringify(storyArcs, null, 2));
  
  console.log(`✅ Successfully updated story-arcs.json:`);
  console.log(`🔹 Coach: ${coach.toLowerCase()}`);
  console.log(`🔹 Target: ${target.toLowerCase()}`);
  console.log(`🔹 Incident: ${incident}`);
  
  console.log('\nTo verify, run:');
  console.log('node test-scripts/test-help-command.js');
  
} catch (error) {
  console.error('Error updating story-arcs.json:', error);
  process.exit(1);
} 