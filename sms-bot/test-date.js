// Quick test of reportDate calculation
const now = new Date();
const pacificNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
const year = pacificNow.getFullYear();
const month = String(pacificNow.getMonth() + 1).padStart(2, '0');
const day = String(pacificNow.getDate()).padStart(2, '0');
const reportDate = `${year}-${month}-${day}`;

console.log('Current system time:', new Date().toISOString());
console.log('Pacific Time:', pacificNow.toISOString());
console.log('Calculated reportDate:', reportDate);
console.log('Expected: 2025-10-29');
console.log('Match:', reportDate === '2025-10-29' ? '✅ CORRECT' : '❌ WRONG');
