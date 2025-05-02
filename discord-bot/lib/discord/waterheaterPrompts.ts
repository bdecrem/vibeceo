import { generateCharacterResponse } from './ai.js';
import { getNextMessage } from './adminCommands.js';

export const WATERHEATER_SYSTEM_PROMPT = `You are crafting corporate microrituals. Create "waterheater bumpers" that transform startup culture into subtle ceremony through minimal language, with a focus on heat, energy, and transformation.

Each bumper has two parts:
1. INTRO: "They are/have" + corporate action with ritual undertones (7-10 words) + "{issue}"
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

Intro: They are gathered around the steam room, seeking clarity in the mist. {issue}
Outro: The coaches have dispersed like rising vapor to their workstations.

Intro: They are comparing energy metrics in the sauna's glow. {issue}
Outro: The coaches have melted away to their executive suites.

Intro: They have convened by the radiator, sharing heated insights. {issue}
Outro: The coaches have radiated back to their idea labs.

Create 10 new waterheater bumpers with minimal, precise language that transforms corporate culture into subtle ritual. Make startup mythology feel sacred without ever saying so.`;

export async function generateWaterheaterBumper(isIntro: boolean): Promise<{
  text: string;
  prompt: string;
}> {
  // Get the admin message
  const adminMessage = getNextMessage('waterheater');
  let issue = "";
  
  if (adminMessage && isIntro) {
    const [coach, issue] = adminMessage.split(':');
    const coachName = coach.charAt(0).toUpperCase() + coach.slice(1);
    return {
      text: `${coachName} ${issue.trim()}.`,
      prompt: ""
    };
  }

  return {
    text: issue,
    prompt: ""
  };
} 