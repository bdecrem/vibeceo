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

// Load weekend activities data
const weekendActivitiesPath = path.resolve(__dirname, "data", "weekend-activities.json");
let weekendActivities = {};
try {
  weekendActivities = JSON.parse(fs.readFileSync(weekendActivitiesPath, "utf8"));
  console.log("Successfully loaded weekend activities data");
} catch (error) {
  console.error("Error loading weekend activities:", error);
  process.exit(1);
}

// Load weekend derailers data
const weekendDerailersPath = path.resolve(__dirname, "data", "weekend-derailers.json");
let weekendDerailers = {};
try {
  weekendDerailers = JSON.parse(fs.readFileSync(weekendDerailersPath, "utf8"));
  console.log("Successfully loaded weekend derailers data");
} catch (error) {
  console.error("Error loading weekend derailers:", error);
  process.exit(1);
}

// Function to determine the duration category based on available time
function getDurationCategory() {
  try {
    // Read available time from environment variables (in minutes)
    const availableTime = process.env.AVAILABLE_TIME_MINUTES ? 
      parseInt(process.env.AVAILABLE_TIME_MINUTES, 10) : 60; // Default to 60 minutes if not specified
    
    console.log(`Available time: ${availableTime} minutes`);
    
    // Map available time to duration category
    let duration;
    if (availableTime < 90) {
      duration = "short";  // Under 90 minutes
    } else if (availableTime <= 180) {
      duration = "medium"; // 1-3 hours
    } else {
      duration = "long";   // More than 3 hours
    }
    
    console.log(`Selected duration category: ${duration} based on ${availableTime} minutes available`);
    return duration;
  } catch (error) {
    console.error("Error determining duration category:", error);
    return "medium"; // Default to medium if there's an error
  }
}

// Function to get a random activity from the appropriate category
function getRandomActivity(city = "Berlin") {
  try {
    const validCities = ["Berlin", "Vegas", "Tokyo"];
    if (!validCities.includes(city)) {
      console.warn(`Invalid city: ${city}. Using default city Berlin.`);
      city = "Berlin";
    }
    
    const duration = getDurationCategory();
    
    // Get activities for the specified city and duration
    const activities = weekendActivities[city][duration];
    
    if (!activities || activities.length === 0) {
      throw new Error(`No activities found for ${city}, ${duration}.`);
    }
    
    // Select a random activity
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    
    console.log(`Selected activity in ${city} (${duration}): "${randomActivity.name}" - ${randomActivity.type}`);
    
    return randomActivity;
  } catch (error) {
    console.error("Error selecting random activity:", error);
    return {
      name: "Midnight Snack Crawl",
      type: "food adventure",
      description: "A late-night tour of the city's best street food vendors and hidden eateries.",
      duration: "2-3 hours",
      source: "fallback"
    };
  }
}

// Function to get a random derailer for a specific coach
function getRandomDerailer(coachName) {
  try {
    const coaches = Object.keys(weekendDerailers);
    
    // Validate coach name or pick randomly
    if (!coachName || !weekendDerailers[coachName]) {
      coachName = coaches[Math.floor(Math.random() * coaches.length)];
    }
    
    // Get derailers for the specified coach
    const derailers = weekendDerailers[coachName];
    
    if (!derailers || derailers.length === 0) {
      throw new Error(`No derailers found for ${coachName}.`);
    }
    
    // Select a random derailer
    const randomDerailer = derailers[Math.floor(Math.random() * derailers.length)];
    
    console.log(`Selected derailer for ${coachName}: "${randomDerailer}"`);
    
    return randomDerailer;
  } catch (error) {
    console.error("Error selecting weekend derailer:", error);
    return "I just got a text about something interesting nearby. We should check it out.";
  }
}

// Select random city, activity and coach/derailer
const cities = ["Berlin", "Vegas", "Tokyo"];
const city = cities[Math.floor(Math.random() * cities.length)];
const activity = getRandomActivity(city);
const coaches = Object.keys(weekendDerailers);
const protagonist = coaches[Math.floor(Math.random() * coaches.length)];
const derailerText = getRandomDerailer(protagonist);

console.log(`Setting up story in ${city} with ${activity.name}`);
console.log(`Protagonist: ${protagonist} with agenda: ${derailerText}`);

// Build the prompt
function buildWeekendStoryPrompt(city, activity, protagonist, derailerText) {
  return `
Tonight, the coaches are in **${city}**, on a cloudy Friday night.

Their official plan:  
**"${activity.name}"** — ${activity.description}

But one of them has other plans.

🎭 **Protagonist**: ${protagonist}  
🍄 **Hidden Agenda**: ${derailerText}

---

## STRUCTURE

You are writing **exactly 23 scenes** — **Scene 2 through Scene 24**.

Each scene must follow one of only three types:

---

### 1. **LIGHT STORY SCENES**  
(Scenes: 2, 5, 6, 8, 9, 12, 15, 18)

Used for small moments of action or prep:
- Getting ready  
- Running late  
- Transit weirdness  
- Location mixups  
- Someone disappearing

**Format:**
\`\`\`
**SCENE [number] – LIGHT STORY:**  
[Sentence 1: external action, short, direct.]  
[Sentence 2: reaction, escalation, or distraction.]  
**OUTRO:** [One sentence only. Slightly strange or unsettling.]
\`\`\`

**Rules:**
- Max 2 sentences in the intro  
- No exposition or internal thoughts  
- No literary descriptions  
- Use concrete behavior only

---

### 2. **AMBIENT SCENES**  
(All remaining odd-numbered scenes)

Used only to set tone. No characters. No motion. Just vibe.

**Format:**
\`\`\`
**SCENE [number] – AMBIENT:**  
It’s [time] in ${city}, where [brief weather-related feeling].  
[One strange visual or sensory image — no characters.]  
**OUTRO:** [One line that deepens the unease.]
\`\`\`

**Rules:**
- 2 lines total before the outro  
- Must open with “It’s [time] in [city], where…”  
- Must contain one unexplained detail or object  
- Don’t write like a novel. This is a surveillance camera with a poet’s migraine.

---

### 3. **CONVERSATION SCENES**

#### **Scene 10 – DERAILMENT SLACK**

Start with:
> *The group sees ${protagonist} with a sketchy guy, exchanging something.*

Then write a Slack conversation:
- 10–16 lines  
- All lowercase  
- At least 2 emoji-only replies  
- At least 3 ignored messages  
- 2 separate subthreads  
- Clustered timestamps (10:29 PM, 10:29 PM, 10:31 PM...)  
- Max 15 words per message  
- Include typos

**Required coach moments:**
- **Donte:** declares an “Operation [X]”  
- **Venus:** builds or links a doc (e.g. fog-ladder.notion.site)  
- **Kailey:** panics about the calendar  
- **Rohan:** dismissive, minimal replies  
- **Alex:** emoji nonsense  
- **${protagonist}:** dodges, lies, changes topic, deflects

**OUTRO:** 1 line confirming the plan is officially off-track.

---

#### **Scene 24 – POSTMORTEM SLACK**

No intro — jump straight into Slack chat.

**Format:**
- Same as scene 10  
- Everyone is tired, confused, emotionally threadbare  
- Someone must say: *“we never did ${activity.name}”*  
- ${protagonist} never confirms anything  
- Include these 3 fictional docs:
  - fog-ladder.notion.site  
  - gnome-sync deck  
  - post-${activity.name.toLowerCase().replace(/ /g, "-")}-metrics v0.2

**Required beats:**
- Donte saw something impossible  
- Venus builds docs to analyze it  
- Kailey lost the schedule  
- Rohan wants out  
- Alex posts emojis that break formatting  
- ${protagonist} avoids saying what really happened

**OUTRO:** Optional. End with a line that feels like fog.

---

## STYLE

- Short. Strange. Startup-surreal.  
- Never over 2 lines in a scene intro  
- Never explain weird things — let them exist  
- No inner thoughts  
- No exposition  
- If you feel clever, start over  
- Don’t describe — record

---

Begin with:

**SCENE 2 – LIGHT STORY:**  
(The group is getting ready...)
  `;
}

const messages = [
  {
    role: "system",
    content:
      "You are a creative AI assistant who generates structured content based on precise instructions. You excel at creating dialog, narrative scenes, and character-driven scenarios in the tech/startup world.",
  },
  {
    role: "user",
    content: buildWeekendStoryPrompt(
      city,
      activity,
      protagonist,
      derailerText
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

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const rawFilePath = path.join(__dirname, `weekend_story_output-${timestamp}.txt`);
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