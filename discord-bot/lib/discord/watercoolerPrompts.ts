import { generateCharacterResponse } from './ai.js';

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