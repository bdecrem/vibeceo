#!/usr/bin/env node

import { isWeekend, getLocationAndTime } from '../dist/lib/discord/locationTime.js';

console.log('🎉 Testing Weekend Mode Implementation\n');

// Test weekend detection
console.log('=== WEEKEND DETECTION TEST ===');
const isCurrentlyWeekend = isWeekend();
console.log(`Current weekend status: ${isCurrentlyWeekend ? '✅ WEEKEND MODE' : '❌ WEEKDAY MODE'}\n`);

// Test weekend schedule for different times
console.log('=== WEEKEND SCHEDULE TEST ===');
console.log('Testing weekend location blocks (LA Time basis):\n');

const testTimes = [
    { hour: 18, label: 'Fri 6:00pm PT (Block 1 Start - Vegas)' },
    { hour: 1, label: 'Sat 1:00am PT (Block 1 - Vegas)' },
    { hour: 2, label: 'Sat 2:00am PT (Block 2 Start - Tokyo)' },
    { hour: 9, label: 'Sat 9:00am PT (Block 2 - Tokyo)' },
    { hour: 10, label: 'Sat 10:00am PT (Block 3 Start - Berlin)' },
    { hour: 17, label: 'Sat 5:00pm PT (Block 3 - Berlin)' },
    { hour: 18, label: 'Sat 6:00pm PT (Block 4 Start - Vegas)' },
    { hour: 1, label: 'Sun 1:00am PT (Block 4 - Vegas)' },
    { hour: 2, label: 'Sun 2:00am PT (Block 5 Start - Tokyo)' },
    { hour: 9, label: 'Sun 9:00am PT (Block 5 - Tokyo)' },
    { hour: 10, label: 'Sun 10:00am PT (Block 6 Start - Berlin)' },
    { hour: 17, label: 'Sun 5:00pm PT (Block 6 - Berlin)' }
];

console.log('LA Time | Expected Location | Actual Result');
console.log('--------|-------------------|---------------');

for (const testTime of testTimes) {
    // Convert LA time to GMT for the function
    const gmtHour = (testTime.hour + 7) % 24; // LA is GMT-7
    
    try {
        const result = await getLocationAndTime(gmtHour, 0);
        const locationShort = result.location.replace(' office', '').replace(' penthouse', '');
        const timeFormatted = `${testTime.hour.toString().padStart(2, '0')}:00 PT`;
        
        console.log(`${timeFormatted} | ${testTime.label.split(' - ')[1] || 'Unknown'} | ${locationShort} (${result.formattedTime}${result.ampm})`);
    } catch (error) {
        console.log(`${testTime.hour.toString().padStart(2, '0')}:00 PT | ERROR: ${error.message}`);
    }
}

console.log('\n✅ Weekend mode test completed!');
console.log('\n📋 Expected Schedule:');
console.log('Block 1: Vegas (Fri 6pm-2am PT)');
console.log('Block 2: Tokyo (Sat 2am-10am PT = Sat 6pm-2am JST)');
console.log('Block 3: Berlin (Sat 10am-6pm PT = Sat 6pm-2am CET)');
console.log('Block 4: Vegas (Sat 6pm-2am PT)');
console.log('Block 5: Tokyo (Sun 2am-10am PT = Sun 6pm-2am JST)');
console.log('Block 6: Berlin (Sun 10am-6pm PT = Sun 6pm-2am CET)'); 