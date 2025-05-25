#!/usr/bin/env node

console.log('🕐 DEBUGGING WEEKEND DETECTION\n');

// Get current date and time info
const now = new Date();
console.log('Current UTC time:', now.toISOString());
console.log('Current local time:', now.toString());

// Check UTC values
const utcHour = now.getUTCHours();
const utcDay = now.getUTCDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
console.log(`UTC Hour: ${utcHour}`);
console.log(`UTC Day: ${utcDay} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][utcDay]})`);

// Convert to LA time (GMT-7)
const laHour = (utcHour - 7 + 24) % 24;
console.log(`LA Hour: ${laHour}`);

// Check weekend conditions
console.log('\n=== WEEKEND CONDITIONS ===');

// Weekend starts Friday 6pm PT (18:00 LA time)
if (utcDay === 5 && laHour >= 18) {
    console.log('✅ Friday evening condition: TRUE');
} else {
    console.log('❌ Friday evening condition: FALSE');
}

// All day Saturday is weekend
if (utcDay === 6) {
    console.log('✅ Saturday condition: TRUE');
} else {
    console.log('❌ Saturday condition: FALSE');
}

// All day Sunday is weekend  
if (utcDay === 0) {
    console.log('✅ Sunday condition: TRUE');
} else {
    console.log('❌ Sunday condition: FALSE');
}

// Weekend ends Monday 9am SGT = Monday 1am UTC = Sunday 6pm PT
if (utcDay === 1 && now.getUTCHours() < 1) {
    console.log('✅ Monday early morning condition: TRUE');
} else {
    console.log('❌ Monday early morning condition: FALSE');
}

// Final result
const isWeekend = (utcDay === 5 && laHour >= 18) || 
                  (utcDay === 6) || 
                  (utcDay === 0) || 
                  (utcDay === 1 && now.getUTCHours() < 1);

console.log(`\n🎯 FINAL RESULT: ${isWeekend ? '✅ WEEKEND MODE' : '❌ WEEKDAY MODE'}`); 