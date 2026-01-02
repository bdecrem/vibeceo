const fs = require('fs');
const data = require('../data/ctrl-shift-applications/parsed_applications.json');
const excluded = ['amy', 'bart', 'john dough', 'Bart Decrem'];
const filtered = data.filter(d => !excluded.includes(d.name));

// CSV escape function
const esc = s => {
  if (!s) return '';
  s = String(s);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""').replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ') + '"';
  }
  return s;
};

const headers = ['Name','Email','Stage','Focus Area','Summary','Full Pitch','Twitter/LinkedIn','Project Links','Availability','Date'];
const rows = filtered.map(r => [
  esc(r.name),
  esc(r.email),
  esc(r.stage),
  esc(r.focusArea),
  esc(r.summary),
  esc(r.pitch),
  esc(r.twitterLinkedin),
  esc((r.projectLinks || []).join(' | ')),
  esc(r.availability),
  esc(r.date)
].join(','));

const csv = [headers.join(','), ...rows].join('\n');
fs.writeFileSync('/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/ctrl_shift_applicants.csv', csv);
console.log('Wrote', filtered.length, 'applicants to CSV');
console.log('\nVerifying Cole\'s pitch includes YC:', filtered.find(f => f.name === 'Cole Estrin').pitch.includes('YC community'));
