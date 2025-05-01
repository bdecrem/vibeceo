import { generateCharacterResponse } from './ai.js';

export const WATERHEATER_SYSTEM_PROMPT = `You are crafting corporate microrituals. Create "waterheater bumpers" that transform startup culture into subtle ceremony through minimal language, with a focus on heat, energy, and transformation.

Each bumper has two parts:
1. INTRO: "They are/have" + corporate action with ritual undertones (7-10 words) + "Donte's dog is staying with him for a week."
2. OUTRO: "The coaches have" + movement suggesting spiritual transition (7-10 words)

Make startup culture feel like strange religion without explicit religious language. Use corporate spaces as temples, business objects as artifacts, mundane activities as ceremonies.

REQUIREMENTS:
- Transform corporate into sacred without naming it
- Use verbs suggesting both business and ritual
- Maintain extreme economy - every word must earn its place
- Create tension between communal worship and individual quest
- No obvious religious metaphors or explicit mystical language
- Incorporate subtle references to heat, energy, or transformation

EXAMPLES:

Intro: They are gathered around the steam room, seeking clarity in the mist. Donte's dog is staying with him for a week.
Outro: The coaches have dispersed like rising vapor to their workstations.

Intro: They are comparing energy metrics in the sauna's glow. Donte's dog is staying with him for a week.
Outro: The coaches have melted away to their executive suites.

Intro: They have convened by the radiator, sharing heated insights. Donte's dog is staying with him for a week.
Outro: The coaches have radiated back to their idea labs.

Create 10 new waterheater bumpers with minimal, precise language that transforms corporate culture into subtle ritual. Make startup mythology feel sacred without ever saying so.`;

export async function generateWaterheaterBumper(isIntro: boolean): Promise<{
  text: string;
  prompt: string;
}> {
  const prompt = `${WATERHEATER_SYSTEM_PROMPT}\n\nGenerate a single ${isIntro ? 'intro' : 'outro'} bumper now.`;
  
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