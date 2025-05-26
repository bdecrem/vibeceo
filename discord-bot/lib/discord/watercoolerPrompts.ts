import { generateCharacterResponse } from './ai.js';
import { isWeekend } from './locationTime.js';

// Pre-generated weekend bumpers
export const WEEKEND_BUMPERS = {
  intros: [
    "The coaches have crowded around hotel fries while arguing about runway.",
    "The coaches have ordered their fourth round of drinks at the rooftop bar.",
    "The coaches have clustered around a phone, debating club entry strategies.",
    "The coaches have commandeered the lobby piano for impromptu karaoke.",
    "The coaches have cornered bartenders to explain their startup for free drinks.",
    "The coaches have gathered to compare rideshare horror stories while waiting for cars.",
    "The coaches have assembled at the hotel bar, planning the night's adventure.",
    "The coaches have started drafting pitch decks on cocktail napkins at midnight.",
    "The coaches have taken over the corner booth to debate whiskey preferences.",
    "The coaches have formed a circle to judge dating profiles with unsolicited feedback."
  ],
  outros: [
    "The coaches have scattered to find late-night dumplings.",
    "The coaches have vanished into different Ubers, directions unknown.",
    "The coaches have moved on to the next overpriced cocktail lounge.",
    "The coaches have abandoned their plans for an impromptu karaoke session.",
    "The coaches have drifted away in search of the after-after-party.",
    "The coaches have dispersed, following mysterious text message invites.",
    "The coaches have wandered off to chase the perfect nightcap.",
    "The coaches have disappeared, leaving their half-finished drinks behind.",
    "The coaches have split into factions, each pursuing their idea of fun.",
    "The coaches have been absorbed into the night's possibilities."
  ]
};

// Weekday corporate ritual prompt

export const WATERCOOLER_SYSTEM_PROMPT = `You are crafting corporate microrituals. Create "watercooler bumpers" that transform startup culture into subtle ceremony through minimal language.

Each bumper has two parts:
1. INTRO: "They are/have" + corporate action with ritual undertones (7-10 words)
2. OUTRO: "The coaches have" + movement suggesting spiritual transition (7-10 words)

Make startup culture feel like strange religion without explicit religious language. Use corporate spaces as temples, business objects as artifacts, mundane activities as ceremonies.

REQUIREMENTS:
- Transform corporate into sacred without naming it
- Use verbs suggesting both business and ritual
- Maintain extreme economy - every word must earn its place
- Create tension between communal worship and individual quest
- No obvious religious metaphors or explicit mystical language

EXAMPLES:

Intro: They are circling the espresso machine in the break room.
Outro: The coaches have returned to their productivity pods.

Intro: They are comparing vision boards in the mindfulness alcove.
Outro: The coaches have melted away to their executive suites.

Intro: They have gathered by the aquarium, seeking inspiration from the fish.
Outro: The coaches have floated back to their idea labs.

Create 10 new watercooler bumpers with minimal, precise language that transforms corporate culture into subtle ritual. Make startup mythology feel sacred without ever saying so.`;

export async function generateWatercoolerBumper(isIntro: boolean): Promise<{
  text: string;
  prompt: string;
}> {
  // If it's weekend, use pre-generated weekend bumpers
  if (isWeekend()) {
    const options = isIntro ? WEEKEND_BUMPERS.intros : WEEKEND_BUMPERS.outros;
    const randomIndex = Math.floor(Math.random() * options.length);
    
    return {
      text: options[randomIndex],
      prompt: "Weekend watercooler bumper"  // Just for logging purposes
    };
  }
  
  // Original OpenAI generation for weekdays
  const prompt = `${WATERCOOLER_SYSTEM_PROMPT}\n\nGenerate a single ${isIntro ? 'intro' : 'outro'} bumper now.`;
  
  const response = await generateCharacterResponse(prompt, "You are a corporate ritual designer.");
  
  // Extract just the bumper text from the response
  const lines = response.split('\n');
  const bumperLine = lines.find(line => 
    isIntro ? line.startsWith('Intro:') : line.startsWith('Outro:')
  );
  
  if (!bumperLine) {
    throw new Error('Failed to generate valid bumper text');
  }
  
  // Remove the "Intro: " or "Outro: " prefix
  const text = bumperLine.split(': ')[1];
  
  return {
    text,
    prompt
  };
} 