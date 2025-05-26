#!/usr/bin/env node

import { getLocationAndTime } from '../dist/lib/discord/locationTime.js';

console.log('🌍 Testing Corrected Location Schedule\n');
console.log('Expected Schedule:');
console.log('🇺🇸 Los Angeles: 9am-7pm PT (10 hours)');
console.log('🇸🇬 Singapore: 7pm PT-3am PT (8 hours)');
console.log('🇬🇧 London: 3am-9am PT (6 hours)\n');

console.log('LA Time | Location           | Local Time');
console.log('--------|-------------------|------------');

for (let laHour = 0; laHour < 24; laHour++) {
  // Convert LA time to GMT for the function
  const gmtHour = (laHour + 7) % 24; // LA is GMT-7
  
  try {
    const result = await getLocationAndTime(gmtHour, 0);
    const laTimeFormatted = `${laHour.toString().padStart(2, '0')}:00 PT`;
    const locationShort = result.location.replace(' office', '').replace(' penthouse', '');
    
    console.log(`${laTimeFormatted} | ${locationShort.padEnd(17)} | ${result.formattedTime}${result.ampm}`);
  } catch (error) {
    console.log(`${laHour.toString().padStart(2, '0')}:00 PT | ERROR: ${error.message}`);
  }
}

console.log('\n✅ Schedule test completed!'); 