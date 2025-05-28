import OpenAI from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { loadEnvironment } from "./lib/discord/env-loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
loadEnvironment();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to generate a random story arc
async function generateStoryArc() {
  try {
    // Load data files
    const activitiesPath = path.join(__dirname, "data", "weekend-activities.json");
    const derailersPath = path.join(__dirname, "data", "weekend-derailers.json");
    
    const activitiesData = JSON.parse(fs.readFileSync(activitiesPath, "utf8"));
    const derailersData = JSON.parse(fs.readFileSync(derailersPath, "utf8"));

    // Get the current location from locationTime.js
    const { getLocationAndTime, isWeekend } = await import("./lib/discord/locationTime.js");
    const now = new Date();
    const gmtHour = now.getUTCHours();
    const gmtMinutes = now.getUTCMinutes();
    
    const locationData = await getLocationAndTime(gmtHour, gmtMinutes);
    
    // Extract just the city name from the location (remove " office" or " penthouse" if present)
    let city = locationData.location.split(' ')[0];
    
    // Make sure it's one of our cities in the activities data
    if (!activitiesData[city]) {
      // Fallback to a random city if the current location is not in our activities data
      const availableCities = Object.keys(activitiesData);
      city = availableCities[Math.floor(Math.random() * availableCities.length)];
    }
    
    console.log(`Current location: ${locationData.location}, using city: ${city}`);
    
    // Determine activity duration based on FAST_SCHEDULE env var
    // Default to "medium" if not set
    let scheduleSetting = process.env.FAST_SCHEDULE || "1";
    let durationCategory;
    
    // Convert to number
    const scheduleSpeed = parseInt(scheduleSetting, 10);
    
    if (scheduleSpeed <= 1) {
      // Fast schedule (1 or less) - use short activities
      durationCategory = "short";
      console.log("Fast schedule detected - using short activities");
    } else if (scheduleSpeed >= 60) {
      // Slow schedule (60 or more) - use long activities
      durationCategory = "long";
      console.log("Slow schedule detected - using long activities");
    } else {
      // Medium schedule - use medium activities
      durationCategory = "medium";
      console.log("Medium schedule detected - using medium activities");
    }
    
    // Make sure the selected duration category exists for this city
    if (!activitiesData[city][durationCategory]) {
      console.log(`No ${durationCategory} activities found for ${city}, falling back to random duration`);
      // Fallback to a random duration if the selected category doesn't exist
      const durations = Object.keys(activitiesData[city]);
      durationCategory = durations[Math.floor(Math.random() * durations.length)];
    }
    
    // Select a random activity from the appropriate duration category
    const activityPool = activitiesData[city][durationCategory];
    const activity = activityPool[Math.floor(Math.random() * activityPool.length)];

    const coaches = Object.keys(derailersData);
    const coach = coaches[Math.floor(Math.random() * coaches.length)];
    const derailments = derailersData[coach];
    const derailment = derailments[Math.floor(Math.random() * derailments.length)];

    // Lightly structured story arc
    const beats = [
      `Scene 1: The group agrees on ${activity.name}, but no one confirms the plan out loud.`,
      `Scene 2: Everyone gets dressed, poorly.`,
      `Scene 3: ${coach} starts dropping hints about 'another option.'`,
      "Scene 4: The Uber arrives before they're ready.",
      `Scene 5: ${coach} opens a second phone.`,
      "Scene 6: The ride reroutes mysteriously.",
      `Scene 7: The car passes a coworking space. ${coach} smiles.`,
      `Scene 8: They arrive outside ${activity.name}. The line doesn't move.`,
      `Scene 9: ${coach} says the phrase 'alternate venue.'`,
      "Scene 10: Half the group follows. The rest don't ask why.",
      "Scene 11: They enter a dark building with no signage.",
      "Scene 12: The room has unexpected features and paper name tags.",
      "Scene 13: Venus calls this a pivot.",
      "Scene 14: Eljas attempts to leave but reappears at the snack table.",
      "Scene 15: Kailey tries something new. The interface is aggressively confident.",
      "Scene 16: Rohan refuses to participate. No one argues.",
      "Scene 17: Someone wins a fake round. Applause is silent.",
      `Scene 18: A surprise appears unprompted. It's ${coach}'s.`,
      "Scene 19: Everyone claps except Alex.",
      "Scene 20: The system logs them all out.",
      `Scene 21: They walk home. No one mentions ${activity.name}.`,
      "Scene 22: The streetlights glitch.",
      "Scene 23: They end up back at the starting corner.",
      "Scene 24: Kailey still has a memento. No one looks at it."
    ];

    return {
      city,
      plan: activity.name,
      derailer: { coach, agenda: derailment },
      beats,
      activity  // Include the full activity object for metadata
    };
  } catch (error) {
    console.error("Error generating story arc:", error);
    throw error;
  }
}

// Function to build the scene generation prompt
function buildSceneGenerationPrompt(storyArc) {
  return `You are writing a 24-scene Advisors Foundry episode.

Each scene includes two parts:
- A short scene intro that sets the tone (1–2 sentences, present tense, no exposition)
- A short chat (3–6 messages, each under 20 words, dry, in-character, and mostly unrelated to the setting)

The coaches are work-obsessed, emotionally unreadable, and allergic to closure. They never say what they feel. Their messages are short, strange, and always slightly misaligned. The tone is observational, terse, dry, and startup-surreal.

Scene intros should:
- Begin with the time and city ("It's 8:12 PM in ${storyArc.city} and the streetlights are starting to blink")
- Show only one physical or behavioral detail. No emotion, metaphor, or exposition.

Conversations should:
- Drift away from the setting (startup logic, pitch-speak, founder neurosis)
- Contain no quotation marks or narration
- Use exactly these names: Kailey, Venus, Eljas, Donte, Rohan, Alex (Alex is female)
- Use these exact usernames: 'kailey_sloan', 'venusmetrics', 'eljas_council', 'donte_declares', 'rohan_pressure', 'alex_actual'
- Sound like broken product managers in a blackout poetry workshop

Use the story arc below to structure tone, motif, and momentum. Do not refer to it directly. Let it shape atmosphere and action.

---

STORY ARC:  
${JSON.stringify(storyArc, null, 2)}

---

OUTPUT FORMATTING REQUIREMENTS:
- Output exactly 24 scenes
- Each scene MUST be clearly marked with scene number: [SCENE:1] ... [/SCENE:1]
- Each intro MUST begin with: "It's [TIME] in [CITY] and [behavior]"
- Each message MUST follow: "> 'username' [TIME]", followed by "> message"

Example:

[SCENE:1]
**It's 8:12 PM in ${storyArc.city} and the streetlights are starting to blink.**  

> 'kailey_sloan' 8:13 PM  
> Where exactly is the meet spot?  

> 'venusmetrics' 8:14 PM  
> The document lacks specificity. Typical.  

> 'eljas_council' 8:15 PM  
> Just bring resilience.
[/SCENE:1]

Only output scenes 1 through 24. No commentary. No summary. The tone should feel cold, restrained, and quietly surreal.`;
}

// Function to generate the story using GPT-4
async function getGPTResponse() {
  try {
    // First, generate a story arc
    const storyArc = await generateStoryArc();
    console.log("Generated story arc for city:", storyArc.city);
    console.log("Activity:", storyArc.plan);
    console.log("Derailer coach:", storyArc.derailer.coach);
    console.log("Derailer agenda:", storyArc.derailer.agenda);
    
    // Then use the story arc to generate the full story with GPT-4
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
          content: buildSceneGenerationPrompt(storyArc),
        },
      ],
      temperature: 1.0,
      max_tokens: 4000,
    });

    const response = completion.choices[0].message.content;
    console.log("Received response from GPT-4");

    // Create metadata header
    const metadata = `=== WEEKEND STORY METADATA ===
Story Type: weekend
City: ${storyArc.city}
Location Goal: ${storyArc.plan}
Activity Type: ${storyArc.activity.type || 'Not specified'}
Derailer: ${storyArc.derailer.coach}
Derailer Agenda: ${storyArc.derailer.agenda}
Generated: ${new Date().toISOString()}

=== STORY BEGINS ===

`;

    // Save the story with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = path.join(__dirname, "logs", `weekend_story_output-${timestamp}.txt`);
    fs.writeFileSync(outputPath, metadata + response, "utf8");
    console.log(`Saved story to ${outputPath}`);

    // Also save the story arc for reference
    const arcPath = path.join(__dirname, "logs", `weekend_story_arc-${timestamp}.json`);
    fs.writeFileSync(arcPath, JSON.stringify(storyArc, null, 2), "utf8");
    console.log(`Saved story arc to ${arcPath}`);

    // Parse the response and save structured JSON
    try {
      // Import the parser dynamically (ESM)
      const { parseWeekendStory } = await import("./data/weekend-stories/parser.js");
      
      // Parse story with metadata
      const parsedStory = parseWeekendStory(response, {
        storyType: "weekend",
        city: storyArc.city,
        locationGoal: storyArc.plan,
        activityType: storyArc.activity.type || 'Not specified',
        derailer: storyArc.derailer.coach,
        derailerAgenda: storyArc.derailer.agenda,
        generated: new Date().toISOString()
      });
      
      // Save the structured JSON
      const jsonPath = path.join(__dirname, `data/weekend-stories/weekend-story-${timestamp}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(parsedStory, null, 2), "utf8");
      console.log(`Saved structured JSON to ${jsonPath}`);
      
    } catch (parseError) {
      console.error("Error parsing response:", parseError);
      // Continue even if parsing fails to still return raw response
    }

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