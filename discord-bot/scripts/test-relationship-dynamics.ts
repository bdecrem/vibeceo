import { ceos } from '../data/ceos.js';
import { coachBackstory } from '../data/coach-backstory.js';
import { coachState } from '../data/coach-dynamics.js';
import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create a timestamped log file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `relationship-dynamics-test-${timestamp}.log`);

// Helper function to write to both console and log file
function log(message: string) {
  console.log(message);
  fs.appendFileSync(logFile, message + '\n');
}

// Types for our relationship dynamics system
interface RelationshipState {
  participants: string[];
  type: 'tension' | 'collaboration' | 'mentorship' | 'rivalry';
  intensity: number;  // 0-1 scale
  history: {
    timestamp: number;
    event: string;
    impact: number;
  }[];
}

interface ConversationContext {
  type: 'news' | 'gossip' | 'watercooler' | 'pitch';
  participants: string[];
  topic: string;
  relationshipContext: {
    state: RelationshipState;
    influence: number;  // How much the relationship state influences the conversation
  };
}

// Example relationship states to test
const relationshipStates: RelationshipState[] = [
  {
    participants: ['donte', 'kailey'],
    type: 'tension',
    intensity: 0.3,
    history: [
      { timestamp: Date.now() - 86400000, event: 'Disagreement over product timeline', impact: 0.2 },
      { timestamp: Date.now() - 43200000, event: 'Successful collaboration on feature', impact: -0.1 }
    ]
  }
];

// Test parameters that we can adjust
const testParameters = {
  relationshipInfluence: 0.7,  // How much the relationship state influences conversations
  conversationTypes: ['news', 'gossip', 'watercooler', 'pitch'],
  timeSlots: [
    { name: 'Morning', startHour: 9, endHour: 11 },
    { name: 'Midday', startHour: 12, endHour: 14 },
    { name: 'Afternoon', startHour: 15, endHour: 17 },
    { name: 'Evening', startHour: 18, endHour: 20 }
  ]
};

// Helper functions
function getCurrentTimeSlot(hour: number) {
  return testParameters.timeSlots.find(slot => hour >= slot.startHour && hour < slot.endHour) || testParameters.timeSlots[0];
}

function calculateRelationshipImpact(state: RelationshipState, hour: number): number {
  const timeSlot = getCurrentTimeSlot(hour);
  const dayProgress = (hour - 9) / 11; // 0 to 1 over the day
  
  // Base impact from current intensity
  let impact = state.intensity;
  
  // Add impact from recent history
  const recentEvents = state.history.filter(event => 
    (Date.now() - event.timestamp) < 86400000 // Last 24 hours
  );
  
  recentEvents.forEach(event => {
    const hoursAgo = (Date.now() - event.timestamp) / 3600000;
    const timeDecay = Math.max(0, 1 - (hoursAgo / 24));
    impact += event.impact * timeDecay;
  });
  
  // Adjust for time of day
  impact *= (0.8 + (dayProgress * 0.4)); // Slightly higher impact later in the day
  
  return Math.min(Math.max(impact, 0), 1); // Clamp between 0 and 1
}

// Main test function
async function testRelationshipDynamics() {
  log('=== Testing Relationship Dynamics ===\n');
  log('=== Configuration ===');
  log(`Relationship Influence: ${testParameters.relationshipInfluence * 100}%`);
  log(`Conversation Types: ${testParameters.conversationTypes.join(', ')}\n`);

  // Log initial relationship states
  log('=== Initial Relationship States ===');
  relationshipStates.forEach(state => {
    log(`\nRelationship: ${state.participants.join(' & ')}`);
    log(`Type: ${state.type}`);
    log(`Current Intensity: ${state.intensity * 100}%`);
    log('Recent History:');
    state.history.forEach(event => {
      const hoursAgo = Math.round((Date.now() - event.timestamp) / 3600000);
      log(`- ${hoursAgo}h ago: ${event.event} (Impact: ${event.impact * 100}%)`);
    });
  });

  // Simulate a day of conversations
  log('\n=== Daily Conversations ===');
  for (let hour = 9; hour <= 20; hour++) {
    const timeSlot = getCurrentTimeSlot(hour);
    log(`\n=== ${timeSlot.name} (${hour}:00) ===`);

    // For each relationship state, generate a conversation
    relationshipStates.forEach(state => {
      const impact = calculateRelationshipImpact(state, hour);
      log(`\nRelationship Impact: ${Math.round(impact * 100)}%`);
      
      // Here we would normally call GPT to generate a conversation
      // For now, we'll just log what parameters we'd use
      log('Would generate conversation with:');
      log(`- Type: ${testParameters.conversationTypes[hour % 4]}`);
      log(`- Participants: ${state.participants.join(', ')}`);
      log(`- Relationship Context: ${state.type} at ${Math.round(impact * 100)}% intensity`);
      log(`- Influence on conversation: ${Math.round(impact * testParameters.relationshipInfluence * 100)}%`);
    });
  }

  log('\n=== Test Complete ===');
  log(`Log file written to: ${logFile}`);
}

// Run the test
testRelationshipDynamics().catch(error => {
  const errorMessage = `Error running test: ${error.message}\n${error.stack}`;
  console.error(errorMessage);
  fs.appendFileSync(logFile, errorMessage + '\n');
}); 