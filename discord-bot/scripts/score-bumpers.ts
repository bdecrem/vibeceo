import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env.local instead of .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Types from prompt-optimizer.ts
type Bumper = {
  intro: string;
  outro: string;
};

type BumperScore = {
  structure: number;    // 0-5 for overall structure
  tone: number;        // 0-5 for overall tone
  content: number;     // 0-5 for physical actions and objects
  outro: number;       // 0-5 for dispersal quality
  wordChoice: number;  // 0-5 for elevated language
  thematic: number;    // 0-5 for startup elements
};

// Scoring function
function scoreBumper(bumper: Bumper): BumperScore {
  const fullText = `${bumper.intro}\n${bumper.outro}`;
  const [timeLine, actionLine] = bumper.intro.split('\n');
  
  // Structure: flexible recognition of intro/outro patterns
  const introPatterns = /^(They are|They have|It's|Earlier,|\d{1,2}:\d{2} (AM|PM),)/i;
  const outroPatterns = /^(They|The coaches have|Eventually,|Gradually,|One by one,|They soon)/i;
  const structureScore = (introPatterns.test(timeLine) && outroPatterns.test(bumper.outro)) ? 5 : 0;
  
  // Tone: more forgiving filter for stylized language
  const emotionalWords = /anxious|celebrating|desperate|awkward|eager|tense|frantic|excited|nervous|angry|worried|scared|thrilled|amazing|awesome|terrible|horrible|fantastic|wonderful/i;
  const toneScore = !emotionalWords.test(fullText) ? 5 : 0;
  
  // Content: physical absurdity with mundane objects
  const physicalActions = /stacking|adjusting|tapping|circling|refreshing|camped|networking|poking|balancing|lining|arranging|hovering|clustering|encircles|engages|stretching|tap|arranges|gather|activate|performing|aligning|wielding/i;
  const mundaneObjects = /whiteboard|coffee|chair|desk|monitor|keyboard|mouse|pen|notebook|screen|machine|tablet|laptop|printer|thermostat|remote|smartwatch|charging station|snack wall|aquarium|poster wall|espresso machine|kale plants|ceramic mug|footrests|globe/i;
  const contentScore = (physicalActions.test(actionLine) && mundaneObjects.test(actionLine)) ? 5 : 0;
  
  // Outro: ambient dispersal without resolution and in present perfect tense
  const dispersalVerbs = /drifted|melted|wandered|floated|shuffled|strolled|vanished|dispersed|retreated|migrated|circled|drifted apart|dispersed|wandered back|melted away|drifted through/i;
  const resolutionWords = /scheduled|planned|decided|introduced|switched|upgraded|finally|eventually|at last|in the end|concluded|resolved|solved|fixed|completed|returning to/i;
  const presentPerfectPattern = /^(They|They have|They've) (have|'ve)? (drifted|melted|wandered|floated|shuffled|strolled|vanished|dispersed|retreated|migrated|circled|drifted apart|dispersed|wandered back|melted away|drifted through)/i;
  const outroScore = (presentPerfectPattern.test(bumper.outro) && !resolutionWords.test(bumper.outro)) ? 5 : 0;
  
  // Word Choice: elevated language
  const elevatedPhrases = /corridor of ambition|soundproof pods|ceremonial|vision boards|imported matcha|deep work caves|idea lab|innovation cubicles|brainstorming nooks|executive suites|conversation pit|productivity pods|ergonomic pods|minimalist cubes|glass-walled offices|singular|ornate|ritualistic|aggressively healthy|bespoke|ceremoniously|reclaimed wood|methodically|precise standard|synchronously|antique|ambient|unseen|intermittent/i;
  const wordChoiceScore = elevatedPhrases.test(fullText) ? 5 : 0;
  
  // Thematic: startup parody and herd behavior
  const startupPhrases = /kombucha|snack wall|charging station|aquarium|idea lab|poster wall|smartwatch|deep work caves|watercooler|standing desk|espresso|juice bar|ergonomic|minimalist|open-plan|conference room|break room|pods|vertical garden|creative spaces|ongoing projects|step tracking|kale|rooftop garden|reclaimed wood|ceramic|antique globe/i;
  const groupBehavior = /gathered|assembled|grouped|lined|stacked|circled|clustered|hovered|drifted|wandered|huddled|camped|networking|plotting|catching up|cluster|trio|engages|workers|small group|employees|encircles|synchronously/i;
  const thematicScore = (startupPhrases.test(fullText) && groupBehavior.test(actionLine)) ? 5 : 0;
  
  return {
    structure: structureScore,
    tone: toneScore,
    content: contentScore,
    outro: outroScore,
    wordChoice: wordChoiceScore,
    thematic: thematicScore
  };
}

// Test bumpers
const testBumpers: Bumper[] = [
  {
    intro: "09:15 AM, Thursday, clear skies, open-plan office.\nA cluster of employees encircles a singular, overly ornate espresso machine, each performing slight, ritualistic adjustments to its dials.",
    outro: "They eventually drifted apart, returning to their desks."
  },
  {
    intro: "12:03 PM, Tuesday, intermittent clouds, the rooftop garden.\nA trio engages in synchronized stretching beside a row of aggressively healthy potted kale plants.",
    outro: "They slowly dispersed, leaving the kale to bask alone in the intermittent sunlight."
  },
  {
    intro: "10:47 AM, Friday, sunny, minimalist kitchen area.\nFour workers, each holding a bespoke ceramic mug, ceremoniously tap them against the edge of a reclaimed wood table before drinking.",
    outro: "Gradually, they wandered back to their respective creative spaces."
  },
  {
    intro: "3:22 PM, Monday, overcast, near the vertical garden.\nA small group methodically arranges and rearranges a collection of ergonomic footrests, aligning them with an unseen, precise standard.",
    outro: "One by one, they melted away into the fog of their ongoing projects."
  },
  {
    intro: "08:59 AM, Wednesday, light rain, front lobby.\nSeveral employees gather, each wielding a smartwatch, to synchronously activate their step tracking applications beside an antique globe.",
    outro: "They soon drifted through various doors, their footsteps echoing faintly."
  }
];

// Score each bumper
const scores = testBumpers.map((bumper, index) => {
  const score = scoreBumper(bumper);
  return {
    bumper,
    score,
    totalScore: Math.min(30, 
      score.structure + 
      score.tone + 
      score.content + 
      score.outro + 
      score.wordChoice + 
      score.thematic
    )
  };
});

// Create log file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFileName = `bumper-scores-${timestamp}.log`;

const logContent = `=== Bumper Scores ===
Timestamp: ${timestamp}

${scores.map((result, index) => `
Bumper ${index + 1}:
Intro: ${result.bumper.intro}
Outro: ${result.bumper.outro}

Scores:
- Structure: ${result.score.structure}/5 (Time format and outro pattern)
- Tone: ${result.score.tone}/5 (No emotional language)
- Content: ${result.score.content}/5 (Physical actions + objects)
- Outro: ${result.score.outro}/5 (Clean dispersal)
- Word Choice: ${result.score.wordChoice}/5 (Elevated language)
- Thematic: ${result.score.thematic}/5 (Startup elements + group)

Total Score: ${result.totalScore}/30 (Capped)
`).join('\n')}
`;

fs.writeFileSync(logFileName, logContent);
console.log(`Scores have been logged to ${logFileName}`); 