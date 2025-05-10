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
    `Write unique, short scene intros for a story about coaches going out in ${city}.\n\n` +
    `Plan: **${activity.name}** — ${activity.description}\n` +
    `But secretly, ${antagonist} has a hidden agenda: ${derailerText}\n\n` +
    'Create scenes 2-24 in our signature style: terse, dry, observational, slightly strange.\n\n' +
    '---\n\n' +
    '## STYLE GUIDE\n\n' +
    '- Each scene is 1-3 short sentences maximum\n' +
    '- Write in flat, observational tone. No narration.\n' +
    '- Use coach names: Kailey, Venus, Eljas, Donte, Rohan, Alex (Alex is female)\n' +
    '- Focus on objects, technology, and strange details\n' +
    '- Keep everything in present tense\n' +
    '- Scenes feel like surveillance footage described by AI\n' +
    '- No metaphors or flowery language\n\n' +
    '---\n\n' +
    '## SCENE REQUIREMENTS\n\n' +
    'Scene 2 – START OF PREP: Someone checks the time/weather/routes. Technology disagrees with itself.\n\n' +
    'Scene 3 – KAILEY DRESSING: Kailey\'s disorganized outfit selection process. Mention the floor.\n\n' +
    'Scene 4 – VENUS DRESSING: Venus creates and abandons a clothing system. Reference diagrams.\n\n' +
    'Scene 5 – ELJAS DRESSING: Eljas\'s minimal approach to getting ready. Something nature-related.\n\n' +
    `Scene 6 – ${antagonist.toUpperCase()}'S SIGNAL: ${antagonist} checks a secret phone or message suggesting the hidden agenda.\n\n` +
    'Scene 7 – ERRAND TIME: Someone suggests an unnecessary detour or errand. The group complies without question.\n\n' +
    'Scene 8 – DETOUR CHAOS: Stores that don\'t work correctly. Missing items or locations.\n\n' +
    'Scene 9 – NEWS MOMENT: Brief setup for Donte finding a tech news story the group will discuss (no dialogue).\n\n' +
    'Scene 10 – DETOUR CONTINUES: Continuation of the errand from scenes 7-8. Progress but not completion.\n\n' +
    'Scene 11 – UBER START: Kailey booking an Uber with app glitches or difficulties.\n\n' +
    'Scene 12 – UBER GLITCHES: In the Uber. Something about directions changing or Notion documents.\n\n' +
    'Scene 13 – UBER CHAOS: Eljas suggests walking. Group ignores but something changes anyway.\n\n' +
    'Scene 14 – PITCH MENTION: Brief setup for the coaches discussing a startup pitch (no dialogue).\n\n' +
    `Scene 15 – IN UBER 1: Donte asks the driver about ${city}. Driver gives strange or minimal response.\n\n` +
    'Scene 16 – IN UBER 2: Technology malfunction in the car. Audio or device connects incorrectly.\n\n' +
    'Scene 17 – IN UBER 3: The location seems wrong or familiar but no one mentions it.\n\n' +
    'Scene 18 – GOSSIP MOMENT: Brief setup for the coaches discussing gossip (no dialogue).\n\n' +
    `Scene 19 – ALMOST THERE: ${activity.name} location description. Something off about the environment.\n\n` +
    `Scene 20 – SABOTAGE HINT: ${antagonist} receives notification or shows behavior revealing the secret agenda.\n\n` +
    `Scene 21 – ARRIVAL IS WRONG: They arrive somewhere unexpected. ${antagonist} acts like this was the plan.\n\n` +
    'Scene 22 – SYSTEM NOTICE: Technical error format. Use EXACTLY this format with different details:\n' +
    `SYSTEM NOTICE: destination \'${activity.name}\' rejected by [reason]\n` +
    'routing to verified location: \'[alternative]\'\n' +
    'access requires [requirement] + [requirement]\n\n' +
    'Scene 23 – RIDE HOME: Return journey in silence. Something about reversed motion and music.\n\n' +
    'Scene 24 – AFTERMATH: They\'re back where they started. Something small has changed. "Nothing was learned."\n\n' +
    '---\n\n' +
    '## EXAMPLES OF GOOD SCENE INTROS\n\n' +
    '"Kailey opens three apps to check the time. None agree."\n' +
    '"Half Kailey\'s bed is covered in outfits. The other half is floor."\n' +
    '"Venus lays her clothes out like a systems diagram. Then moves two things. Then deletes the layout."\n' +
    '"The first shop is closed. The second doesn\'t exist anymore."\n' +
    '"The street outside looks familiar. But no one says anything."\n' +
    '"Eljas suggests walking. No one responds, but the driver slows down."\n' +
    '"Donte asks the driver what Vegas was like in 2003. The driver says \"shorter.\""\n' +
    '"Rohan checks a different phone. It\'s older. He pockets it quickly."\n\n' +
    '---\n\n' +
    'Output the scenes using this format exactly:\n\n' +
    '**SCENE [#] – [TITLE]**  \n' +
    '[unique content based on the scene requirements]\n\n' +
    'Create NEW content for each scene (don\'t copy the examples).\n' +
    'Keep style consistent: terse, observational, slightly strange.\n' +
    'Output ONLY the formatted scenes 2-24. No introduction or commentary.'
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