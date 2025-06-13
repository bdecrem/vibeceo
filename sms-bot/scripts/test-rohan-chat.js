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
        content: 'You are a senior frontend engineer. When asked to create HTML, respond ONLY with the complete implementation code. Do not include any explanations or documentation - just the working code itself.',
      },
      {
        role: 'user',
        content: 'Create an HTML page with a chat interface titled "Ask Rohan Anything". Features needed:\n- Modern, sleek chat UI with message bubbles\n- Text input at bottom with send button\n- Rohan\'s responses should get progressively more intense and passionate with each question\n- Some example intense Rohan-style responses about productivity, focus, and getting things done\n- Animated typing indicator when Rohan is "responding"\n- Slight delay before responses to simulate typing\n- Beautiful modern design with good fonts and spacing\n- Everything should work client-side only\nProvide ONLY the complete HTML file with all CSS and JavaScript included inline.',
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

// If the response starts with explanation text, try to extract just the HTML
const htmlContent = html.includes('<!DOCTYPE html') 
  ? html.substring(html.indexOf('<!DOCTYPE html'))
  : html;

// Save the response to an HTML file
fs.writeFileSync('web/rohan-chat.html', htmlContent);

console.log('✅ Response saved to web/rohan-chat.html\n');
console.log('You can now open web/rohan-chat.html directly in your browser.'); 