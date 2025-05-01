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
const logFile = path.join(logsDir, `subtle-story-test-${timestamp}.log`);

// Helper function to write to both console and log file
function log(message: string) {
  console.log(message);
  fs.appendFileSync(logFile, message + '\n');
}

// Types for our story system
interface ConversationContext {
  type: 'news' | 'gossip' | 'watercooler' | 'pitch';
  participants: string[];
  tension: number; // 0-1 scale of underlying tension
  topic: string;
  conversation: string[];
}

// Time slots for the day
const timeSlots = [
  { name: 'Morning', startHour: 9, endHour: 11 },
  { name: 'Midday', startHour: 12, endHour: 14 },
  { name: 'Afternoon', startHour: 15, endHour: 17 },
  { name: 'Evening', startHour: 18, endHour: 20 }
];

// Conversation templates that subtly show tension progression
const conversationTemplates: { [key: string]: ConversationContext[] } = {
  'news': [
    {
      type: 'news',
      participants: ['donte', 'kailey'],
      tension: 0.2,
      topic: 'Tech Industry Growth',
      conversation: [
        "Donte: 'The latest industry report shows explosive growth in our sector.'",
        "Kailey: 'Interesting. Though I noticed the report also mentions increased market volatility.'",
        "Donte: 'Volatility means opportunity. We should double down on our expansion.'",
        "Kailey: 'Or it could mean we need to be more strategic about our investments.'"
      ]
    },
    {
      type: 'news',
      participants: ['donte', 'kailey'],
      tension: 0.4,
      topic: 'Market Trends',
      conversation: [
        "Donte: 'Our competitors are moving faster than ever.'",
        "Kailey: 'And some of them are making costly mistakes in their rush.'",
        "Donte: 'Better to move fast and fix later than move slow and miss out.'",
        "Kailey: 'Better to move smart and build something lasting.'"
      ]
    }
  ],
  'gossip': [
    {
      type: 'gossip',
      participants: ['donte', 'kailey'],
      tension: 0.3,
      topic: 'Team Dynamics',
      conversation: [
        "Donte: 'The engineering team is excited about the new features.'",
        "Kailey: 'I heard they're concerned about the timeline.'",
        "Donte: 'They'll rise to the challenge.'",
        "Kailey: 'Or they'll burn out trying.'"
      ]
    },
    {
      type: 'gossip',
      participants: ['donte', 'kailey'],
      tension: 0.5,
      topic: 'Company Culture',
      conversation: [
        "Donte: 'People are saying we need to be more aggressive.'",
        "Kailey: 'And others are saying we need more stability.'",
        "Donte: 'The market rewards bold moves.'",
        "Kailey: 'And punishes reckless ones.'"
      ]
    }
  ],
  'watercooler': [
    {
      type: 'watercooler',
      participants: ['donte', 'kailey'],
      tension: 0.4,
      topic: 'Work-Life Balance',
      conversation: [
        "Donte: 'Success requires sacrifice. I'm here until midnight most days.'",
        "Kailey: 'Sustainable success requires balance. I make sure to recharge.'",
        "Donte: 'The early bird gets the worm.'",
        "Kailey: 'And the burned-out bird gets replaced.'"
      ]
    },
    {
      type: 'watercooler',
      participants: ['donte', 'kailey'],
      tension: 0.6,
      topic: 'Leadership Style',
      conversation: [
        "Donte: 'A leader needs to push their team to excel.'",
        "Kailey: 'A leader needs to support their team to succeed.'",
        "Donte: 'Comfort zones are where dreams go to die.'",
        "Kailey: 'Burnout zones are where talent goes to leave.'"
      ]
    }
  ],
  'pitch': [
    {
      type: 'pitch',
      participants: ['donte', 'kailey'],
      tension: 0.5,
      topic: 'Product Strategy',
      conversation: [
        "Donte: 'Our new feature set will revolutionize the market.'",
        "Kailey: 'Have we validated these features with our users?'",
        "Donte: 'First-mover advantage is crucial right now.'",
        "Kailey: 'So is building what our users actually need.'"
      ]
    },
    {
      type: 'pitch',
      participants: ['donte', 'kailey'],
      tension: 0.7,
      topic: 'Company Vision',
      conversation: [
        "Donte: 'We need to scale to 10x our current size.'",
        "Kailey: 'We need to ensure our foundation can support that growth.'",
        "Donte: 'The market won't wait for us to be ready.'",
        "Kailey: 'And our reputation won't recover from a major failure.'"
      ]
    }
  ]
};

// Helper functions
function getCurrentTimeSlot(hour: number) {
  return timeSlots.find(slot => hour >= slot.startHour && hour < slot.endHour) || timeSlots[0];
}

function getConversationForTimeSlot(hour: number, type: string): ConversationContext {
  const timeSlot = getCurrentTimeSlot(hour);
  const dayProgress = (hour - 9) / 11; // 0 to 1 over the day
  
  // Get conversations of the right type
  const typeConversations = conversationTemplates[type];
  
  // Find the conversation that matches our current tension level
  const targetTension = Math.min(0.2 + (dayProgress * 0.6), 0.8);
  return typeConversations.find(conv => 
    Math.abs(conv.tension - targetTension) < 0.2
  ) || typeConversations[0];
}

// Main test function
async function testSubtleStoryArc() {
  log('=== Testing Subtle Story Arc Integration ===\n');
  log('=== Daily Schedule with Underlying Tension ===\n');

  // Simulate a day
  for (let hour = 9; hour <= 20; hour++) {
    const timeSlot = getCurrentTimeSlot(hour);
    log(`\n=== ${timeSlot.name} (${hour}:00) ===`);

    // Generate different types of conversations throughout the day
    if (hour === 9) {
      const news = getConversationForTimeSlot(hour, 'news');
      log(`\n=== Morning News Discussion ===`);
      log(`Topic: ${news.topic}`);
      log(`Underlying Tension: ${Math.round(news.tension * 100)}%`);
      log('\n' + news.conversation.join('\n') + '\n');
    }
    
    if (hour === 11) {
      const gossip = getConversationForTimeSlot(hour, 'gossip');
      log(`\n=== Office Gossip ===`);
      log(`Topic: ${gossip.topic}`);
      log(`Underlying Tension: ${Math.round(gossip.tension * 100)}%`);
      log('\n' + gossip.conversation.join('\n') + '\n');
    }
    
    if (hour === 14) {
      const watercooler = getConversationForTimeSlot(hour, 'watercooler');
      log(`\n=== Watercooler Chat ===`);
      log(`Topic: ${watercooler.topic}`);
      log(`Underlying Tension: ${Math.round(watercooler.tension * 100)}%`);
      log('\n' + watercooler.conversation.join('\n') + '\n');
    }
    
    if (hour === 16) {
      const pitch = getConversationForTimeSlot(hour, 'pitch');
      log(`\n=== Product Pitch Discussion ===`);
      log(`Topic: ${pitch.topic}`);
      log(`Underlying Tension: ${Math.round(pitch.tension * 100)}%`);
      log('\n' + pitch.conversation.join('\n') + '\n');
    }
  }

  log('\n=== Test Complete ===');
  log(`Log file written to: ${logFile}`);
}

// Run the test
testSubtleStoryArc().catch(error => {
  const errorMessage = `Error running test: ${error.message}\n${error.stack}`;
  console.error(errorMessage);
  fs.appendFileSync(logFile, errorMessage + '\n');
}); 