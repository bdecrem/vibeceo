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

// Function to build the scene generation prompt
function buildSceneGenerationPrompt() {
  return `You are writing a 24-scene Advisors Foundry episode.

Each scene includes two parts:
- A short scene intro that sets the tone (1–2 sentences, present tense, no exposition)
- A short chat (3–6 messages, each under 20 words, dry, in-character, and mostly unrelated to the setting)

The coaches are work-obsessed, emotionally unreadable, and allergic to closure. They never say what they feel. Their messages are short, strange, and always slightly misaligned. The tone is observational, terse, dry, and startup-surreal.

Scene intros should:
- Open with the time and location ("It's 8:12 PM in Berlin and the streetlights are starting to blink")
- Never explain what's happening — only show one physical or behavioral detail
- Avoid narrative framing, metaphor, or emotional language

Conversations should:
- Drift away from the setting, usually into founder logic, pitch brain, or deadpan nonsense
- Contain no quotation marks
- Include six coaches: Kailey, Venus, Eljas, Donte, Rohan, Alex (Alex is female)
- Sound like broken product managers in a blackout poetry workshop

Use the story arc provided below to structure the emotional progression and key motifs. Do not reference it directly. Let it shape the behavior.

---

STORY ARC:  
{
  "city": "Berlin",
  "object": "a metal drink token no one brought",
  "location_goal": "Berghain",
  "beats": [
    "Scene 1: The group agrees on Berghain but no one confirms it out loud.",
    "Scene 2: Everyone gets dressed in outfits they don't trust.",
    "Scene 3: A metal token appears on the coffee table. No one claims it.",
    "Scene 4: Uber timing glitches.",
    "Scene 5: The token reappears in someone's pocket.",
    "Scene 6: They get rerouted.",
    "Scene 7: A park passes by repeatedly.",
    "Scene 8: They don't get in. No one says why.",
    "Scene 9: They disperse.",
    "Scene 10: Rohan and Donte wander into a closed gallery.",
    "Scene 11: Venus and Eljas sit on a curb.",
    "Scene 12: Kailey tries to return the token to a vending machine.",
    "Scene 13: The machine spits it back out.",
    "Scene 14: Alex takes a photo and posts nothing.",
    "Scene 15: The group reconverges in a cafe they never named.",
    "Scene 16: No one mentions the token.",
    "Scene 17: They talk about dashboards like they're feelings.",
    "Scene 18: Someone tries to pay with the token. It works.",
    "Scene 19: Eljas proposes a walk.",
    "Scene 20: They walk.",
    "Scene 21: The token is lost. Or placed. Or left.",
    "Scene 22: A bird takes something and flies off. No one tracks it.",
    "Scene 23: They return to the block they started on.",
    "Scene 24: They leave the token behind. No one mentions it."
  ]
}

---

OUTPUT FORMATTING REQUIREMENTS:
- Output exactly 24 scenes with consistent formatting
- Each scene MUST be clearly marked with scene number: [SCENE:1] at the start and [/SCENE:1] at the end
- Scene intros MUST follow the pattern: "It's [TIME] in [CITY] and [behavior]."
- All coach usernames MUST be exactly: 'kailey_sloan', 'venusmetrics', 'eljas_council', 'donte_declares', 'rohan_pressure', 'alex_actual'
- Messages MUST be formatted like: "> 'coach_username' [TIME]", then on the next line "> message content"

Example of correct scene format:

[SCENE:1]
**It's 8:12 PM in Berlin and the streetlights are starting to blink.**  

> 'kailey_sloan' 8:13 PM  
> Where exactly is the meet spot?  

> 'venusmetrics' 8:14 PM  
> The document lacks specificity. Typical.  

> 'eljas_council' 8:15 PM  
> Just bring resilience.
[/SCENE:1]

Only output scenes 1 through 24. No summary. No commentary. The tone should be cold and controlled but lightly glitching.`;
}

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
          content: buildSceneGenerationPrompt(),
        },
      ],
      temperature: 1.0,
      max_tokens: 4000,
    });

    const response = completion.choices[0].message.content;
    console.log("Received response from GPT-4");

    // Create metadata header
    const metadata = `=== WEEKEND STORY METADATA ===
Story Type: weekend2
City: Berlin
Location Goal: Berghain
Object: Metal drink token
Generated: ${new Date().toISOString()}

=== STORY BEGINS ===

`;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputPath = path.join(__dirname, `weekend2_story_output-${timestamp}.txt`);
    fs.writeFileSync(outputPath, metadata + response, "utf8");
    console.log(`Saved story to ${outputPath}`);

    // Parse the response and save structured JSON
    try {
      // Import the parser dynamically (ESM)
      const { parseWeekendStory } = await import("./data/weekend-stories/parser.js");
      
      // Parse story with metadata
      const parsedStory = parseWeekendStory(response, {
        storyType: "weekend2",
        city: "Berlin",
        locationGoal: "Berghain",
        object: "metal drink token",
        generated: new Date().toISOString()
      });
      
      // Save the structured JSON
      const jsonPath = path.join(__dirname, `data/weekend-stories/weekend2-story-${timestamp}.json`);
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