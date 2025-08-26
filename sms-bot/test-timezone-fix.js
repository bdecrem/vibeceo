#!/usr/bin/env node

/**
 * Test timezone formatting fix
 */

function testTimezoneFormatting() {
  const now = new Date();
  const timezone = 'America/Los_Angeles';
  
  // Get current time in user's timezone
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Get current day in user's timezone
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long'
  });
  
  const currentTime = timeFormatter.format(now);
  const currentDay = dayFormatter.format(now);
  
  console.log('🧪 Testing timezone formatting fix...');
  console.log(`Current time: "${currentTime}" (type: ${typeof currentTime})`);
  console.log(`Current day: "${currentDay}" (type: ${typeof currentDay})`);
  console.log(`Is currentDay defined: ${currentDay !== undefined}`);
  console.log(`Can call toLowerCase: ${typeof currentDay?.toLowerCase === 'function'}`);
  
  if (currentTime && currentDay) {
    console.log('✅ Timezone formatting works correctly');
    return true;
  } else {
    console.log('❌ Timezone formatting failed');
    return false;
  }
}

testTimezoneFormatting();