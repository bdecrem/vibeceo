#!/usr/bin/env node

/**
 * Test time parsing for recurring alerts
 */

// Simulate the parseRecurringSchedule function
function parseRecurringSchedule(request) {
  const lower = request.toLowerCase();
  let time = null;
  let days = null;
  
  // Extract time patterns (most specific first)
  const timePatterns = [
    /at (\d{1,2}):(\d{2})\s*(am|pm)/i,   // "at 7:30am", "at 11:45pm"  
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,      // "7:30am", "11:45pm"
    /at (\d{1,2})\s*(am|pm)/i,           // "at 7am", "at 11pm"
    /(\d{1,2})\s*(am|pm)/i,              // "7am", "11pm"
  ];
  
  for (const pattern of timePatterns) {
    const match = request.match(pattern);
    if (match) {
      
      let hour = parseInt(match[1]);
      let minute = '00';
      let ampm = '';
      
      // Handle different regex patterns based on capture groups
      if (match.length === 4) {
        // Pattern with minutes: (at) (\d{1,2}):(\d{2})\s*(am|pm) or (\d{1,2}):(\d{2})\s*(am|pm)
        minute = match[2];
        ampm = match[3];
      } else {
        // Pattern without minutes: (at) (\d{1,2})\s*(am|pm) or (\d{1,2})\s*(am|pm)
        minute = '00';
        ampm = match[2];
      }
      
      
      // Convert to 24-hour format
      if (ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
      if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
      
      time = `${hour.toString().padStart(2, '0')}:${minute.padStart(2, '0')}:00`;
      break;
    }
  }
  
  // If no specific time found but mentions morning/evening
  if (!time) {
    if (lower.includes('morning')) time = '07:00:00';
    if (lower.includes('evening')) time = '18:00:00';
  }
  
  // Extract day patterns
  if (lower.includes('daily') || lower.includes('every day')) {
    days = 'daily';
  } else if (lower.includes('weekdays') || lower.includes('monday through friday')) {
    days = 'weekdays';
  } else if (lower.includes('every morning') || lower.includes('each morning')) {
    days = 'daily';
  }
  
  return { time, days };
}

// Test cases
const testCases = [
  {
    input: "send me a traffic conditions update for Palo Alto, CA every morning around 7:30 am",
    expected: { time: "07:30:00", days: "daily" }
  },
  {
    input: "alert me at 7am daily with weather",
    expected: { time: "07:00:00", days: "daily" }
  },
  {
    input: "notify me at 5:45pm weekdays with stock prices",
    expected: { time: "17:45:00", days: "weekdays" }
  },
  {
    input: "tell me at 12pm every day about lunch specials",
    expected: { time: "12:00:00", days: "daily" }
  },
  {
    input: "alert me at 12am daily",
    expected: { time: "00:00:00", days: "daily" }
  },
  {
    input: "remind me every morning about my tasks",
    expected: { time: "07:00:00", days: "daily" }
  }
];

console.log('🧪 Testing time parsing for recurring alerts...\n');

let allPassed = true;

testCases.forEach((testCase, index) => {
  const result = parseRecurringSchedule(testCase.input);
  const passed = result.time === testCase.expected.time && result.days === testCase.expected.days;
  
  console.log(`${index + 1}. "${testCase.input}"`);
  console.log(`   Expected: time=${testCase.expected.time}, days=${testCase.expected.days}`);
  console.log(`   Got:      time=${result.time}, days=${result.days}`);
  console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  
  if (!passed) allPassed = false;
});

console.log(allPassed ? '🎉 All tests passed!' : '❌ Some tests failed!');
process.exit(allPassed ? 0 : 1);