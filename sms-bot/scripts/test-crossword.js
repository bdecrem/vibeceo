import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const response = await fetch('https://api.together.xyz/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    temperature: 0.3,
    max_tokens: 6000,
    messages: [
      {
        role: 'system',
        content: 'You are a senior frontend engineer. Create a single, self-contained HTML file that includes all CSS and JavaScript inline.',
      },
      {
        role: 'user',
        content: 'Create an HTML page with a FULLY INTERACTIVE crossword puzzle with a 9x9 grid. Include:\n- Proper symmetric grid with appropriate black cell pattern\n- Empty cells for users to type in letters\n- Correctly numbered cells that match the clues\n- Real words that intersect properly multiple times\n- Validation to check if answers are correct\n- A way to reset or get hints\n- Beautiful modern design\nMake it a single HTML file with all CSS and JavaScript included inline so it can be opened directly in a browser.',
      },
    ],
  }),
});

if (!response.ok) {
  console.error('❌ Error:', response.status, await response.text());
  process.exit(1);
}

const json = await response.json();
const html = json.choices[0].message.content;

// Save the response to an HTML file
fs.writeFileSync('web/crossword.html', html);

console.log('✅ Response saved to web/crossword.html\n');
console.log('You can now open web/crossword.html in your browser to view the crossword puzzle.'); 