import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, ".env.local");
console.log("Loading environment from:", envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error("Error loading .env.local:", result.error);
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const testCase = {
  city: "Berlin",
  activity: {
    name: "The Spree Plunge",
    type: "river dip + espresso",
    description:
      "5-minute group plunge into the river, followed by espresso and synchronized screaming.",
    duration: "30-60 minutes",
    source: "fictional",
  },
  protagonist: {
    name: "EljasCouncil",
    agenda:
      "He wants the group to take mushrooms tonight. He brought them. No one else knows. He plans to steer the evening into 'openness' without telling anyone why. Eljas should never sound poetic, wise, or literary. He's weird, off, mumbly, never gives a straight answer, and always changes the subject."
  },
};

function buildWeekendStoryPrompt(city, activity, protagonist) {
  return `
Tonight, the coaches are in **${city}**. Their official plan:  
**"${activity.name}"** — ${activity.description}

But one of them has other plans.

🎭 **Protagonist**: ${protagonist.name}  
🍄 **Hidden Agenda**: ${protagonist.agenda}

---

## STRUCTURE

You are writing **Scenes 2–24** of a chaotic and emotionally strange weekend night.

- ✅ Scene 1 already happened: they made the plan
- ✅ Scene 10: moment of confusion (Eljas seen with a guy, group is unsure)
- ✅ Scene 24: Slack reflection, acknowledging that things didn't go according to plan

### For Scenes 2–23:
- ✅ Write an **INTRO** for every odd-numbered scene (3, 5, 7, 9…) and for Scene 10
- At least one intro (between 5 and 9) must show the group on the way to the Spree plunge — on foot, in an Uber, or with towels, etc.
- Intros should:
  - Move the night forward (they're dressing, detouring, waiting, noticing)
  - Include **one off, broken, or ambient weird detail**
  - Avoid "funny" or "cute" weirdness (e.g., no animals doing clever things)
  - Let things feel slightly *wrong* or *uncanny*, not clever
  - Be short. 1–2 lines max. Never explain. Let silence do the work.

---

## SCENE 10 — SPECIAL INSTRUCTIONS

Scene 10 includes:
- A short intro: "The group sees Eljas with a sketchy guy, exchanging something"
- A chaotic **Slack conversation** (12–18 messages)

### SLACK STYLE:
DonteDisrupt 10:29 AM  
lowercase chaos. no punctuation. start an "operation" with a name.

RohanTheShark 10:29 AM  
one to three words only. dismissive. lowercase.

KaileyConnector 10:29 AM  
calendar panic. double posting. losing it about scheduling.

VenusStrikes 10:29 AM  
creating a framework with version number (v0.2). notion docs.

AlexirAlex 10:29 AM  
energy vibe emoji spiritual tech nonsense. ✨🌀💫

EljasCouncil 10:29 AM  
weird muttering, deflections, distraction. never poetic or wise.

### Scene 10 Requirements:
- Coaches see Eljas with a sketchy guy exchanging something
- They NEVER directly say what happened - talk around it
- Include timestamp format with realistic clustering:
  - Some messages at same minute (10:29 AM)
  - Some with gaps (10:29 AM, 10:31 AM)
  - Some in rapid sequence (10:32 AM, 10:32 AM)
- Include ACTUAL structural elements from real Slack:
  - At least 2 people double posting (same person twice in a row)
  - At least 5 messages under 5 words
  - 2+ emoji-only responses
  - At least 3 messages that get completely ignored
  - Two separate conversation threads happening simultaneously
  - Completely lowercase text (except names)
- MANDATORY character moments:
  - Donte MUST create an "operation" with a name
  - Venus MUST create a framework/doc with version number
  - Kailey MUST panic about calendar/scheduling
  - Rohan MUST use one-word dismissive responses
  - Alex MUST overuse emojis

---

## SCENE 24 — SPECIAL INSTRUCTIONS

Scene 24 includes:
- No intro
- A full Slack-style postmortem

### REQUIREMENTS:
- Extremely disjointed, sleep-deprived, confused conversation
- ACTUAL Slack format with realistic timestamps (9:42 AM, etc.)
- Nobody clearly remembers what happened - fragmented memories only
- Incomplete sentences, thoughts trail off
- At least 40% of messages must be under 5 words
- Messages that make no sense to others
- Someone (probably Donte or Kailey) must explicitly acknowledge that the plunge never happened
- Include at least three fictional docs/artifacts:
  - "fog-ladder.notion.site"
  - "gnome-sync deck" 
  - "post-plunge metrics v0.2"
- 100% lowercase except names
- Timestamps all over the place (some bunched, some spread out)

### MANDATORY character moments in Scene 24:
- Donte talking about seeing impossible things
- Venus creating multiple frameworks/docs to analyze the experience
- Kailey confused about calendar/schedule disruption
- Rohan threatening to quit the industry
- Alex posting emoji combinations that make no sense
- Eljas making vague reference to mushrooms without being explicit

---

## COACH VOICES

DonteDisrupt – lowercase. "chaos ops," "vibe metrics," meme prophet.
AlexirAlex – spiritual tech founder energy. "aura," "vibe," "ritual," emoji abuse.
RohanTheShark – hates everything. fewest words possible.
VenusStrikes – corporate structure gremlin. constantly making docs, decks, and frameworks.
KaileyConnector – panicked scheduler. never knows what's happening. always behind.
EljasCouncil – avoid poetic or forest-mystic energy. Instead, he mutters, changes the subject, distracts, forgets what he was saying, lies casually.

---

## STYLE
- Slack-style. Broken. Lowercase. Interruption-friendly. Typos welcome.
- Do not explain anything. If something weird happens, it just happens.
- Be funny without being *clever*. Be weird without being *wacky*.
- Vibe: like a startup offsite that got hijacked by folklore and a guy who talks to bags of trail mix.

---

Begin with:
**SCENE 3 - INTRO:**
(then 5, 7, 9, 10. Skip even-numbered scenes. Include full Slack convos for 10 and 24.)
  `;
}

const messages = [
  {
    role: "system",
    content:
      "You are a creative AI assistant who writes stylized, chaotic, on-brand Slack fiction. You mimic startup team culture with surreal interference. You are allergic to exposition."
  },
  {
    role: "user",
    content: buildWeekendStoryPrompt(
      testCase.city,
      testCase.activity,
      testCase.protagonist
    ),
  },
];

async function getGPTResponse() {
  try {
    console.log("Requesting response from GPT-4...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      temperature: 1.0,
      max_tokens: 4000,
    });

    const response = completion.choices[0].message.content;
    console.log("Received response from GPT-4");

    const logsDir = path.join(__dirname, "..", "logs");
    // Ensure logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    const rawFilePath = path.join(logsDir, "weekend_story_output.txt");
    fs.writeFileSync(rawFilePath, response, "utf8");
    console.log(`Saved raw response to ${rawFilePath}`);

    return response;
  } catch (error) {
    console.error("Error in GPT response:", error);
    throw error;
  }
}

// Execute
getGPTResponse().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
