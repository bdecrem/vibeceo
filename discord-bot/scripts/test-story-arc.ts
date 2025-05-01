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
const logFile = path.join(logsDir, `story-test-${timestamp}.log`);

// Helper function to write to both console and log file
function log(message: string) {
  console.log(message);
  fs.appendFileSync(logFile, message + '\n');
}

// Types for our story system
interface StoryThread {
  id: string;
  type: 'emotional' | 'event';
  intensity: number;
  participants: string[];
  progression: number;
  description: string;
  currentState: string;
  sceneTemplates: {
    [key: string]: {
      intro: string[];
      conversation: string[];
      outro: string[];
    };
  };
}

interface TimeSlot {
  name: string;
  startHour: number;
  endHour: number;
  emotionalModifier: number;
}

interface CoachEmotionalState {
  baseTone: string;
  currentIntensity: number;
  activeThreads: string[];
  recentInteractions: {
    timestamp: number;
    type: string;
    emotionalImpact: number;
  }[];
}

// Time slots for the day
const timeSlots: TimeSlot[] = [
  { name: 'Morning', startHour: 9, endHour: 11, emotionalModifier: 0.7 },
  { name: 'Midday', startHour: 12, endHour: 14, emotionalModifier: 1.0 },
  { name: 'Afternoon', startHour: 15, endHour: 17, emotionalModifier: 1.2 },
  { name: 'Evening', startHour: 18, endHour: 20, emotionalModifier: 0.9 }
];

// Initialize story threads with scene templates for each state
const storyThreads: StoryThread[] = [
  {
    id: 'donte-kailey-tension',
    type: 'emotional',
    intensity: 0.6,
    participants: ['donte', 'kailey'],
    progression: 0,
    description: 'Growing tension between Donte and Kailey',
    currentState: 'Subtle signs of disagreement',
    sceneTemplates: {
      'Subtle signs of disagreement': {
        intro: [
          "Donte's latest product launch announcement hangs in the air, creating an unexpected tension in the office.",
          "Kailey's measured approach to growth seems to clash with Donte's ambitious vision.",
          "The contrast between Donte's energetic pitch and Kailey's thoughtful questions creates an undercurrent of tension."
        ],
        conversation: [
          "Donte: *enthusiastically* 'We're ready to scale this to 10x our current user base!'",
          "Kailey: *calmly* 'Have we stress-tested the infrastructure for that kind of growth?'",
          "Donte: 'The market is moving fast. We need to move faster.'",
          "Kailey: 'Moving fast is good. Moving smart is better.'",
          "Donte: *slightly defensive* 'Sometimes you have to break things to build them better.'",
          "Kailey: 'Or sometimes you break things that can't be fixed.'"
        ],
        outro: [
          "The philosophical difference in their approaches becomes increasingly apparent.",
          "Their professional respect remains, but the strategic divide grows wider.",
          "The tension between innovation and stability creates an electric atmosphere in the office."
        ]
      },
      'Growing tension becoming noticeable': {
        intro: [
          "The tension between Donte and Kailey has become a topic of hushed conversations in the office.",
          "Their different approaches to the product launch have created visible friction.",
          "Team members find themselves caught between two competing visions."
        ],
        conversation: [
          "Donte: 'We're losing market share while we overthink every decision.'",
          "Kailey: 'We're building a sustainable business, not just chasing numbers.'",
          "Donte: 'The competition isn't waiting for us to be perfect.'",
          "Kailey: 'Perfect is the enemy of good, but reckless is the enemy of success.'",
          "Donte: 'Sometimes you have to take risks to win big.'",
          "Kailey: 'And sometimes you have to know which risks are worth taking.'"
        ],
        outro: [
          "The disagreement has moved beyond strategy into fundamental business philosophy.",
          "Team members exchange concerned looks as they leave the meeting.",
          "The company's culture hangs in the balance between these two approaches."
        ]
      },
      'Open conflict emerging': {
        intro: [
          "The tension between Donte and Kailey has reached a breaking point.",
          "Their disagreement over the product launch strategy has become the elephant in every room.",
          "The team watches nervously as the conflict threatens to impact the entire company."
        ],
        conversation: [
          "Donte: 'We're being too conservative. The market is passing us by.'",
          "Kailey: 'And you're being too aggressive. We're risking our reputation.'",
          "Donte: 'Reputation doesn't matter if we're not growing.'",
          "Kailey: 'Growth without stability is just a house of cards.'",
          "Donte: 'Sometimes you have to shake things up to move forward.'",
          "Kailey: 'And sometimes you have to know when to hold steady.'"
        ],
        outro: [
          "The conflict has reached a critical point that demands resolution.",
          "The team's productivity is suffering as they wait for direction.",
          "Something has to give, and soon."
        ]
      },
      'Confrontation and resolution': {
        intro: [
          "The day's tension has brought Donte and Kailey to a moment of truth.",
          "Their different approaches have created a crisis that demands resolution.",
          "The entire company watches as these two strong leaders face their differences."
        ],
        conversation: [
          "Donte: 'Look, we both want what's best for the company.'",
          "Kailey: 'We do. We just see different paths to get there.'",
          "Donte: 'Maybe we need to combine our approaches.'",
          "Kailey: 'Innovation with stability. Speed with safety.'",
          "Donte: 'We could create something stronger than either of our individual visions.'",
          "Kailey: 'Let's build a new strategy that takes the best of both worlds.'"
        ],
        outro: [
          "The resolution brings a new sense of unity to the team.",
          "Their different perspectives have become complementary rather than conflicting.",
          "The company emerges stronger from this test of its leadership."
        ]
      }
    }
  }
];

// Initialize coach emotional states
const coachEmotionalStates: { [key: string]: CoachEmotionalState } = {};

// Helper functions
function getCurrentTimeSlot(hour: number): TimeSlot {
  return timeSlots.find(slot => hour >= slot.startHour && hour < slot.endHour) || timeSlots[0];
}

function calculateEmotionalInfluence(
  coachId: string,
  hour: number,
  activeThreads: StoryThread[]
): number {
  const coach = coachEmotionalStates[coachId];
  const timeSlot = getCurrentTimeSlot(hour);
  
  // Update coach's active threads
  coach.activeThreads = activeThreads
    .filter(thread => thread.participants.includes(coachId))
    .map(thread => thread.id);
  
  const threadInfluence = activeThreads
    .filter(thread => thread.participants.includes(coachId))
    .reduce((sum, thread) => sum + thread.intensity, 0);
  
  return (coach.currentIntensity + threadInfluence) * timeSlot.emotionalModifier;
}

function updateThreadState(thread: StoryThread): void {
  // Update thread state based on progression
  if (thread.progression < 0.25) {
    thread.currentState = thread.type === 'event' 
      ? 'Initial discovery of investment issue'
      : 'Subtle signs of disagreement';
  } else if (thread.progression < 0.5) {
    thread.currentState = thread.type === 'event'
      ? 'Analysis of investment impact'
      : 'Growing tension becoming noticeable';
  } else if (thread.progression < 0.75) {
    thread.currentState = thread.type === 'event'
      ? 'Developing solutions'
      : 'Open conflict emerging';
  } else {
    thread.currentState = thread.type === 'event'
      ? 'Resolution phase'
      : 'Confrontation and resolution';
  }
}

function generateScene(thread: StoryThread, timeSlot: TimeSlot): string {
  const stateTemplates = thread.sceneTemplates[thread.currentState];
  const intro = stateTemplates.intro[Math.floor(Math.random() * stateTemplates.intro.length)];
  const conversation = stateTemplates.conversation.join('\n');
  const outro = stateTemplates.outro[Math.floor(Math.random() * stateTemplates.outro.length)];
  
  return `\n=== ${timeSlot.name} Scene: ${thread.description} ===\n\n${intro}\n\n${conversation}\n\n${outro}\n`;
}

// Main test function
async function testStoryArc() {
  log('=== Testing Story Arc System ===\n');
  log('=== Daily Story Threads ===');
  storyThreads.forEach(thread => {
    log(`\nThread: ${thread.description}`);
    log(`Type: ${thread.type}`);
    log(`Participants: ${thread.participants.join(', ')}`);
    log(`Initial State: ${thread.currentState}`);
  });
  log('\n=== Beginning Day Simulation ===\n');

  // Initialize coach states
  Object.keys(coachState).forEach(coachId => {
    coachEmotionalStates[coachId] = {
      baseTone: coachState[coachId].emotionalTone,
      currentIntensity: 0.5,
      activeThreads: [],
      recentInteractions: []
    };
  });

  // Simulate a day
  for (let hour = 9; hour <= 20; hour++) {
    const timeSlot = getCurrentTimeSlot(hour);
    log(`\n=== ${timeSlot.name} (${hour}:00) ===`);

    // Get active threads for this time
    const activeThreads = storyThreads.filter(thread => {
      const threadProgress = (hour - 9) / 11;
      return threadProgress >= thread.progression && 
             threadProgress < thread.progression + 0.2;
    });

    // Generate scenes for active threads
    if (activeThreads.length > 0) {
      log('\nActive Story Threads:');
      activeThreads.forEach(thread => {
        log(`- ${thread.description} (${thread.currentState})`);
        log(generateScene(thread, timeSlot));
      });
    }

    // Update thread progression and states
    storyThreads.forEach(thread => {
      if (activeThreads.includes(thread)) {
        thread.progression += 0.1;
        updateThreadState(thread);
      }
    });
  }

  log('\n=== Test Complete ===');
  log(`Log file written to: ${logFile}`);
}

// Run the test
testStoryArc().catch(error => {
  const errorMessage = `Error running test: ${error.message}\n${error.stack}`;
  console.error(errorMessage);
  fs.appendFileSync(logFile, errorMessage + '\n');
}); 