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

// ===== START OF buildSceneIntroGenerationPrompt FUNCTION =====
function buildSceneIntroGenerationPrompt(city, activity, antagonist, derailerText) {
  return (
    'Write short, original scene intros for a story about coaches navigating a failed night in ' + city + '.\n\n' +
    'Planned activity: **' + activity.name + '** — ' + activity.description + '\n' +
    'Secretly, ' + antagonist + ' has another plan: **' + derailerText + '**\n\n' +
    'Write SCENES 2–24 in our signature tone: dry, behavioral, quietly strange.\n\n' +
    '---\n\n' +
    '## STYLE RULES\n\n' +
    '- Each scene is 1–3 short sentences\n' +
    '- Present tense only\n' +
    '- No dialogue, no quotation marks, no inner thoughts\n' +
    '- No metaphors or “poetic” phrases — just behavior, objects, and glitches\n' +
    '- Use only: Kailey, Venus, Eljas, Donte, Rohan, Alex (Alex is female)\n' +
    '- Style = observational, flat, a little broken\n' +
    '- Scenes feel like API logs of human motion under slight duress\n\n' +
    '---\n\n' +
    '## SCENE MAP\n\n' +
    'SCENE 2 – START OF PREP: someone checks time/weather across devices. Conflicting info.\n' +
    'SCENE 3 – KAILEY DRESSING: her clothes are scattered. The floor is in use.\n' +
    'SCENE 4 – VENUS DRESSING: a personal system is built and abandoned. Mention diagrams.\n' +
    'SCENE 5 – ELJAS DRESSING: minimal choices, some natural interference.\n' +
    'SCENE 6 – ' + antagonist.toUpperCase() + '\'S SIGNAL: secret phone or message. No reaction, but change implied.\n' +
    'SCENE 7 – ERRAND TIME: unnecessary errand proposed. The group follows without discussion.\n' +
    'SCENE 8 – DETOUR CHAOS: store or route failure. Something is missing.\n' +
    'SCENE 9 – NEWS MOMENT: someone shows a screen. Others glance. Nothing happens.\n' +
    'SCENE 10 – DETOUR CONTINUES: the errand drifts. Movement without outcome.\n' +
    'SCENE 11 – UBER START: Kailey tries to book a car. Tech resists.\n' +
    'SCENE 12 – UBER GLITCHES: driver or map behaves unpredictably.\n' +
    'SCENE 13 – UBER CHAOS: Eljas suggests walking. Path shifts regardless.\n' +
    'SCENE 14 – PITCH MOMENT: a startup is referenced. Screens appear. No judgment.\n' +
    'SCENE 15 – IN UBER 1: Donte asks about ' + city + '. The response is incomplete.\n' +
    'SCENE 16 – IN UBER 2: sound or media error. Audio plays incorrectly.\n' +
    'SCENE 17 – IN UBER 3: repeated locations. No one reacts.\n' +
    'SCENE 18 – GOSSIP MOMENT: devices pass a message. Light shifts. No expressions change.\n' +
    'SCENE 19 – ALMOST THERE: the venue appears wrong. Nothing is confirmed.\n' +
    'SCENE 20 – SABOTAGE HINT: ' + antagonist + '\'s phone updates. Course shifts. No comment.\n' +
    'SCENE 21 – ARRIVAL IS WRONG: not the planned venue. ' + antagonist + ' leads without explanation.\n' +
    'SCENE 22 – SYSTEM NOTICE:\n' +
    'SYSTEM NOTICE: destination \'' + activity.name + '\' rejected by [reason]\n' +
    'routing to verified location: \'[alternative]\'\n' +
    'access requires [requirement] + [requirement]\n' +
    'SCENE 23 – RIDE HOME: return trip. Silent, reversed, vague.\n' +
    'SCENE 24 – AFTERMATH: origin revisited. Something minor changed. Include the phrase: “Nothing was learned.”\n\n' +
    '---\n\n' +
    '## TONE EXAMPLES\n\n' +
    'Kailey opens three weather apps. Each says something different.\n' +
    'Half the bed is covered in clothing. None of it is folded.\n' +
    'Venus deletes her outfit diagram. Then draws a new one. Then deletes it.\n' +
    'The first store is closed. The second is real but wrong.\n' +
    'A screen shows a headline. No one blinks.\n' +
    antagonist + '\'s phone lights up. They change direction. No one asks why.\n' +
    'Through the window: diagrams, not ' + activity.name + '. ' + antagonist + ' walks inside.\n\n' +
    '---\n\n' +
    '## FORMAT\n\n' +
    '**SCENE [#] – [TITLE]**  \n' +
    '[scene text]\n\n' +
    'Write new content for each scene. Follow the scene map and style rules strictly.\n' +
    'Output only SCENES 2–24, using the format above. No commentary, no explanation.'
  );
}
// ===== END OF buildSceneIntroGenerationPrompt FUNCTION =====

async function getGPTResponse() {
  try {
    console.log("Requesting response from GPT-4...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a creative AI assistant who generates structured content based on precise instructions. You excel at creating dialog, narrative scenes, and character-driven scenarios in the tech/startup world.",
        },
        {
          role: "user",
          content: buildSceneIntroGenerationPrompt(city, activity, protagonist, derailerText),
        },
      ],
      temperature: 1.0,
      max_tokens: 4000,
    });

    const response = completion.choices[0].message.content;
    console.log("Received response from GPT-4");

    // Create metadata header
    const metadata = `=== WEEKEND STORY METADATA ===
City: ${city}
Activity: ${activity.name}
Description: ${activity.description}
Protagonist: ${protagonist}
Hidden Agenda: ${derailerText}

=== STORY BEGINS ===

`;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const rawFilePath = path.join(__dirname, `weekend_story_output-${timestamp}.txt`);
    fs.writeFileSync(rawFilePath, metadata + response, "utf8");
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