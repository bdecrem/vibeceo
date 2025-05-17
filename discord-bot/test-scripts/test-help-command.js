// Test script to verify that the help command displays the current irritation data
// Run with: node test-scripts/test-help-command.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatStoryInfo } from '../dist/lib/discord/sceneFramework.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock minimal versions of needed data for testing
const mockEpisodeContext = {
  date: new Date().toISOString(),
  dayOfWeek: 'Monday',
  startTime: new Date().toISOString(),
  durationMinutes: 480,
  theme: 'Test Theme',
  arc: {
    arcSummary: 'Test Arc',
    toneKeywords: ['test'],
    motifs: ['test']
  },
  locationTimeline: ['Office']
};

const mockEpisode = {
  seeds: [],
  generatedContent: {
    0: {
      index: 0,
      type: 'watercooler',
      location: 'Test Location',
      intro: 'Test intro',
      outro: 'Test outro',
      coaches: ['alex', 'rohan'],
      gptPrompt: {
        introPrompt: '',
        outroPrompt: ''
      },
      gptResponse: {
        intro: '',
        outro: ''
      }
    }
  },
  metadata: {
    startTime: new Date().toISOString(),
    unitDuration: 20,
    activeArcs: [],
    activeFlags: new Set()
  }
};

async function runTest() {
  console.log('=== STARTING HELP COMMAND TEST ===');
  
  // Read the current irritation data from story-arcs.json
  console.log('Reading current irritation data from file...');
  const storyArcsPath = path.join(process.cwd(), 'data', 'story-themes', 'story-arcs.json');
  const initialData = JSON.parse(fs.readFileSync(storyArcsPath, 'utf-8'));
  console.log('Current coach irritation:', initialData.currentIrritation);
  
  // Test formatting the story info from file
  console.log('\nFormatting story info from file (this is what !help will show)...');
  const formattedInfo = formatStoryInfo(mockEpisodeContext, mockEpisode, 0);
  console.log('Formatted output:\n', formattedInfo);
  
  // Verify that the formatted output matches what's in the file
  if (formattedInfo.includes(initialData.currentIrritation.incident)) {
    console.log('\n✅ TEST PASSED: Help command shows the current irritation from the file');
  } else {
    console.log('\n❌ TEST FAILED: Help command does not show the current irritation');
    console.log('Expected to find incident:', initialData.currentIrritation.incident);
    console.log('In formatted output:', formattedInfo);
  }
  
  console.log('\n=== HELP COMMAND TEST COMPLETE ===');
}

runTest().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
}); 