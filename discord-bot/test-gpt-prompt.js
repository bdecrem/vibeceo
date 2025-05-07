import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '.env.local');
console.log('Loading environment from:', envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env.local:', result.error);
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Updated system prompt with stricter chaos instructions
const STAFF_MEETING_PROMPT = `Generate a MESSY, RAW Slack group chat between 6 startup coaches. This isn't clever - it's chaotic and authentically human:

⸻

FORMAT:
CoachName 9:00 AM  
ultra-short, lowercase Slack message (most <10 words, many <5)

⸻

CAST (keep distinct voices):
- DonteDisrupt – buzzword prophet. lowercase only. "truth is just vibes that got funding"
- AlexirAlex – wellness-obsessed. emoji abuser. says things like "energy" and "vibes"
- RohanTheShark – ruthless operator. one-word responses. "never" or "garbage"
- VenusStrikes – tries to framework chaos and fails. "metrics" and "systems" person
- KaileyConnector – calendar anxiety personified. scheduling breakdown imminent.
- EljasCouncil – finnish mystic. sauna, compost, and nature metaphors.

⸻

STRICT STRUCTURAL REQUIREMENTS:
- 40% of messages MUST be under 6 words
- At least 5 messages MUST be single-word or emoji-only
- MAX 15 words for any message
- include at least 3 typos (real human ones, not fake "teh")
- break thread pattern - people talk over each other
- same timestamp sometimes (two people posting at once)
- some messages get zero responses
- abrupt topic changes (at least 2 that make no sense)
- someone posts, then immediately posts again
- reference google docs, notion docs, or deliverables no one has seen
- someone meta-comments on the chaos
- lowercase everything except names

⸻

CHARACTER ARCS (disguise these as natural typing):
- Donte turns random comment into new initiative with operation name
- Kailey has calendar/scheduling breakdown
- Rohan threatens to quit/start rival company
- Venus tries to create framework for something absurd
- Alex suggests crystal/energy healing for business problem
- Eljas delivers nature wisdom that makes no sense

⸻

CONCRETE ARTIFACTS (include at least 2):
- Notion doc or framework with absurd name ("Revenue Healing Framework v0.1")
- Scheduled meeting with ridiculous purpose ("Scream Into The Void. Daily.")
- Playbook or guide referencing the chaos ("Crystal Cashflow Playbook")

⸻

ENDING:
The conversation MUST end with a powerful mic-drop line from one of the coaches. Examples:
- "chaos is just compost with ambition" 
- "new meeting: scream into the void. daily."
- "i've started a doc called burn.it.down"

⸻

THINK REAL SLACK: messy, people talking over each other, inside jokes, no perfect replies, chaos.
`;

const priorMessages = [
  { role: "assistant", content: "DonteDisrupt 9:00 AM\ni think the roadmap deleted itself 🌀" }
];

const userPrompt = `continue with 25-30 chaotic short messages.

MUST FOLLOW:
- 40% of messages MUST be under 6 words
- include at least 5 single-word or emoji-only responses
- MAX 15 words per message
- keep it MESSY and RAW - this is real human slack
- include real typos, lowercase, people interrupting
- break thread pattern - reactions come late or don't come
- conversations overlap and derail
- include at least 2 abrupt topic shifts
- meta-commentary on the chaos
- disguise character moments as natural typing
- some messages at same timestamp (people posting simultaneously)
- reference tangible deliverables (notion docs, playbooks, frameworks)

CRITICAL:
- end with a POWERFUL mic-drop line (not something soft)
- include at least 2 fake deliverables or concrete artifacts

remember: authentic slack is MESSY - not clever or polished
`;

const messages = [
  { role: "system", content: STAFF_MEETING_PROMPT },
  ...priorMessages,
  { role: "user", content: userPrompt }
];

console.log('\n=== EXACT PROMPT SENT TO GPT ===\n');
console.log(JSON.stringify(messages, null, 2));
console.log('\n=== END PROMPT ===\n');

async function getGPTResponse() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      temperature: 1.0,
      max_tokens: 3500
    });

    const response = completion.choices[0].message.content;

    const filePath = path.join(__dirname, 'gpt_latest_response.txt');
    fs.writeFileSync(filePath, response, 'utf8');

    process.stdout.write('\n=== GPT RESPONSE ===\n\n');
    process.stdout.write(response);
    process.stdout.write('\n\n=== END RESPONSE ===\n');

  } catch (error) {
    console.error('Error calling GPT:', error);
    process.exit(1);
  }
}

fs.writeFileSync(path.join(__dirname, 'gpt_latest_response.txt'), '');
getGPTResponse().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});