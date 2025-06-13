import fetch from 'node-fetch';
import * as dotenv from 'dotenv';

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
        content: 'You are a senior frontend engineer. Respond with complete HTML, JSX, or React code files only.',
      },
      {
        role: 'user',
        content: 'Build a visual page where users can drag random aesthetic images onto a moodboard canvas.',
      },
    ],
  }),
});

if (!response.ok) {
  console.error('❌ Error:', response.status, await response.text());
  process.exit(1);
}

const json = await response.json();
console.log('✅ Response:\n\n', json.choices[0].message.content); 