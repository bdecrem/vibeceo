import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env.local instead of .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Types
type Bumper = {
  intro: string;
  outro: string;
};

interface BumperScore {
  intro: number;
  outro: number;
  structure: number;
  tone: number;
  content: number;
  wordChoice: number;
  thematicResonance: number;
  total: number;
}

type IterationLog = {
  iteration: number;
  prompt: string;
  scores: BumperScore[];
  bestExample: Bumper;
  goldStandardMatch: Bumper;
};

// Scoring functions
function detectPhysicalAction(text: string): number {
  // Split into intro and outro
  const [intro, outro] = text.split('\n');
  
  // Score intro
  let introScore = 0;
  if (/spinning|stacking|poking|balancing|tapping|sprinting|adjusting|aligning|circling/.test(intro)) introScore = 5;
  else if (/gathered|assembled|grouped|lined|stacked/.test(intro)) introScore = 4;
  else introScore = 2;

  // Score outro
  let outroScore = 0;
  if (/dispersed|retreated|vanished|migrated|drifted|wandered|shuffled|circled/.test(outro)) outroScore = 5;
  else if (/gathered|assembled|grouped|lined|stacked/.test(outro)) outroScore = 4;
  else outroScore = 2;

  return Math.max(introScore, outroScore);
}

function detectMinimalLanguage(text: string): number {
  if (!text) return 0;
  
  // Split into intro and outro
  const [intro, outro] = text.split('\n');
  
  // Score intro
  const introWords = intro ? intro.split(' ').length : 0;
  let introScore = 0;
  if (introWords <= 10) introScore = 5;
  else if (introWords <= 15) introScore = 4;
  else if (introWords <= 20) introScore = 3;
  else introScore = 2;

  // Score outro
  const outroWords = outro ? outro.split(' ').length : 0;
  let outroScore = 0;
  if (outroWords <= 10) outroScore = 5;
  else if (outroWords <= 15) outroScore = 4;
  else if (outroWords <= 20) outroScore = 3;
  else outroScore = 2;

  return Math.max(introScore, outroScore);
}

function detectAbsurdityLevel(text: string): number {
  // Split into intro and outro
  const [intro, outro] = text.split('\n');
  
  // Score intro
  let introScore = 0;
  if (/LaCroix|plant|drone|cans|cables|hacky sack|chair|pinball|thermostat|remote|tablet|screen|monitor|printer/.test(intro)) introScore = 5;
  else if (/coffee|water|desk|table|pen|notebook|laptop|phone/.test(intro)) introScore = 4;
  else introScore = 3;

  // Score outro
  let outroScore = 0;
  if (/beanbag|fortress|minimalist|soundproof|panoramic|glass-walled|ergonomic/.test(outro)) outroScore = 5;
  else if (/desk|office|cubicle|booth|room|kitchen/.test(outro)) outroScore = 4;
  else outroScore = 3;

  return Math.max(introScore, outroScore);
}

function detectStoryHints(text: string): number {
  // Split into intro and outro
  const [intro, outro] = text.split('\n');
  
  // Score intro
  let introScore = 0;
  if (/saving|rescuing|snagging|fixing|winning|debating|discussing|plotting|networking/.test(intro)) introScore = 2;
  else if (/gathered|assembled|grouped|lined|stacked/.test(intro)) introScore = 4;
  else introScore = 5;

  // Score outro
  let outroScore = 0;
  if (/saving|rescuing|snagging|fixing|winning|debating|discussing|plotting|networking/.test(outro)) outroScore = 2;
  else if (/gathered|assembled|grouped|lined|stacked/.test(outro)) outroScore = 4;
  else outroScore = 5;

  return Math.max(introScore, outroScore);
}

function scoreBumper(bumper: Bumper): BumperScore {
  const score: BumperScore = {
    intro: 0,
    outro: 0,
    structure: 0,
    tone: 0,
    content: 0,
    wordChoice: 0,
    thematicResonance: 0,
    total: 0
  };

  // Structure scoring (20%)
  score.structure = scoreStructure(bumper);

  // Intro scoring (15%)
  score.intro = scoreIntro(bumper.intro);

  // Outro scoring (15%) 
  score.outro = scoreOutro(bumper.outro);

  // Tone scoring (15%)
  score.tone = scoreTone(bumper);

  // Content scoring (15%)
  score.content = scoreContent(bumper);

  // Word choice scoring (10%)
  score.wordChoice = scoreWordChoice(bumper);

  // Thematic resonance (10%)
  score.thematicResonance = scoreThematicResonance(bumper);

  // Calculate weighted total
  score.total = (
    score.structure * 0.20 +
    score.intro * 0.15 +
    score.outro * 0.15 +
    score.tone * 0.15 +
    score.content * 0.15 +
    score.wordChoice * 0.10 +
    score.thematicResonance * 0.10
  );

  return score;
}

function scoreStructure(bumper: Bumper): number {
  let score = 0;

  // Check intro starts with "They are" or "One of them"
  if (bumper.intro.startsWith('They are') || bumper.intro.startsWith('One of them')) {
    score += 0.3;
  }

  // Check for two-line intro format
  const introLines = bumper.intro.split('\n');
  if (introLines.length === 2) {
    // Check first line for time/place/weather
    if (introLines[0].match(/\d{1,2}:\d{2}(?:am|pm)?|morning|afternoon|evening|night|dawn|dusk/i) &&
        introLines[0].match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i) &&
        introLines[0].match(/\b(sunny|cloudy|rainy|gray|humid|dry|windy|foggy)\b/i)) {
      score += 0.2;
    }
    // Check second line for physical behavior
    if (introLines[1].match(/\b(tap|click|type|scroll|swipe|adjust|move|walk|sit|stand|circle|hover|cluster|line|stack|arrange)\w*\b/i)) {
      score += 0.2;
    }
  }

  // Check for one-line outro
  const outroLines = bumper.outro.split('\n');
  if (outroLines.length === 1) {
    score += 0.3;
  }

  return score;
}

function scoreIntro(intro: string): number {
  let score = 0;
  const lines = intro.split('\n');

  // Check first line (time/place/weather)
  if (lines[0]) {
    // Check for time
    if (lines[0].match(/\d{1,2}:\d{2}(?:am|pm)?|morning|afternoon|evening|night|dawn|dusk/i)) {
      score += 0.2;
    }
    // Check for day
    if (lines[0].match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i)) {
      score += 0.2;
    }
    // Check for weather
    if (lines[0].match(/\b(sunny|cloudy|rainy|gray|humid|dry|windy|foggy)\b/i)) {
      score += 0.2;
    }
  }

  // Check second line (physical behavior)
  if (lines[1]) {
    // Check for physical action verbs
    if (lines[1].match(/\b(tap|click|type|scroll|swipe|adjust|move|walk|sit|stand|circle|hover|cluster|line|stack|arrange)\w*\b/i)) {
      score += 0.2;
    }
    // Check for startup objects
    if (lines[1].match(/\b(slack|zoom|meeting|standup|retro|sprint|agile|scrum|demo|pitch|whiteboard|coffee|water|snack|chair|desk|screen|keyboard|mouse|headphone|cable)\b/i)) {
      score += 0.2;
    }
  }

  return score;
}

function scoreOutro(outro: string): number {
  let score = 0;

  // Check for physical dispersal verbs
  if (outro.match(/\b(dispers|retreat|vanish|migrat|drift|wander|shuffl|circl|trickl|melt|fade|dissipat)\w*\b/i)) {
    score += 0.4;
  }

  // Check for object decay hints
  if (outro.match(/\b(curl|fade|wilt|decay|erode|crumbl|dissolv|evaporat)\w*\b/i)) {
    score += 0.3;
  }

  // Check for location references
  if (outro.match(/\b(desk|room|space|corner|area|station|office|laptop|screen|monitor)\w*\b/i)) {
    score += 0.3;
  }

  return score;
}

function scoreTone(bumper: Bumper): number {
  let score = 0;

  // Check for absence of emotional language
  const hasEmotionalLanguage = /\b(happy|sad|angry|excited|frustrated|annoyed|delighted|awkward|hopeful|anxious|tense|bored)\b/i.test(bumper.intro + bumper.outro);
  if (!hasEmotionalLanguage) {
    score += 0.3;
  }

  // Check for absence of judgment words
  const hasJudgmentWords = /\b(good|bad|better|worse|best|worst|should|must|need)\b/i.test(bumper.intro + bumper.outro);
  if (!hasJudgmentWords) {
    score += 0.3;
  }

  // Check for absence of narrative elements
  const hasNarrativeElements = /\b(because|when|after|before|while|during|since|as|if)\b/i.test(bumper.intro + bumper.outro);
  if (!hasNarrativeElements) {
    score += 0.4;
  }

  return score;
}

function scoreContent(bumper: Bumper): number {
  let score = 0;

  // Check for startup/tech culture elements
  if (bumper.intro.match(/\b(slack|zoom|meeting|standup|retro|sprint|agile|scrum|demo|pitch)\b/i)) {
    score += 0.3;
  }

  // Check for mundane details
  if (bumper.intro.match(/\b(coffee|water|snack|chair|desk|screen|keyboard|mouse|headphone|cable)\b/i)) {
    score += 0.3;
  }

  // Check for group behavior focus
  const hasIndividualFocus = /\b(he|she|[A-Z][a-z]+)\b/.test(bumper.intro + bumper.outro);
  if (!hasIndividualFocus) {
    score += 0.4;
  }

  return score;
}

function scoreWordChoice(bumper: Bumper): number {
  let score = 0;

  // Check for precise verbs
  if (bumper.intro.match(/\b(calibrat|optimiz|synchroniz|configur|implement|deploy|iterat)\w*\b/i)) {
    score += 0.4;
  }

  // Check for tech jargon
  if ((bumper.intro + bumper.outro).match(/\b(algorithm|interface|protocol|bandwidth|latency|backend|frontend)\b/i)) {
    score += 0.3;
  }

  // Check for startup buzzwords (but not too many)
  const buzzwordCount = (bumper.intro + bumper.outro).match(/\b(disrupt|innovate|pivot|scale|leverage|synergy)\b/ig)?.length || 0;
  if (buzzwordCount === 1) {
    score += 0.3;
  }

  return score;
}

function scoreThematicResonance(bumper: Bumper): number {
  let score = 0;

  // Check for contrast between mundane and tech
  const hasMundane = /\b(coffee|water|chair|desk|window|door)\b/i.test(bumper.intro + bumper.outro);
  const hasTech = /\b(algorithm|code|server|api|database|cloud)\b/i.test(bumper.intro + bumper.outro);
  if (hasMundane && hasTech) {
    score += 0.4;
  }

  // Check for subtle absurdity
  if ((bumper.intro + bumper.outro).match(/\b(unnecessarily|obsessively|meticulously|repeatedly|endlessly)\b/i)) {
    score += 0.3;
  }

  // Check for startup culture commentary
  if ((bumper.intro + bumper.outro).match(/\b(ritual|ceremony|tradition|culture|practice)\b/i)) {
    score += 0.3;
  }

  return score;
}

// Quality check
function isHighQuality(bumperScore: BumperScore): boolean {
  return (
    bumperScore.structure >= 3 &&
    bumperScore.tone >= 3 &&
    bumperScore.content >= 3 &&
    bumperScore.outro >= 3 &&
    bumperScore.wordChoice >= 3 &&
    bumperScore.thematicResonance >= 3
  );
}

// Logging
function logIteration(log: IterationLog, batchNumber: number) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFileName = `prompt-optimization-batch${batchNumber}.log`;
  const logEntry = `
=== Iteration ${log.iteration} ===
Timestamp: ${timestamp}
Prompt:
${log.prompt}

Scores:
- Structure: ${log.scores.map(s => s.structure).join(', ')}
- Tone: ${log.scores.map(s => s.tone).join(', ')}
- Content: ${log.scores.map(s => s.content).join(', ')}
- Outro: ${log.scores.map(s => s.outro).join(', ')}
- Word Choice: ${log.scores.map(s => s.wordChoice).join(', ')}
- Thematic: ${log.scores.map(s => s.thematicResonance).join(', ')}

Best example:
Intro: ${log.bestExample.intro}
Outro: ${log.bestExample.outro}

Gold standard match:
Intro: ${log.goldStandardMatch.intro}
Outro: ${log.goldStandardMatch.outro}
`;

  // Create log file if it doesn't exist
  if (!fs.existsSync(logFileName)) {
    fs.writeFileSync(logFileName, '');
  }
  
  fs.appendFileSync(logFileName, logEntry);
}

// Mutation functions
function tweakPhysicalAbsurdity(bumper: Bumper): Bumper {
  const physicalVerbs = ['poking', 'stacking', 'balancing', 'tapping', 'lining', 'arranging', 'hovering', 'clustering'];
  const currentVerb = bumper.intro.match(/\b(poking|stacking|balancing|tapping|lining|arranging|hovering|clustering)\b/)?.[0];
  const newVerb = physicalVerbs.find(v => v !== currentVerb) || currentVerb;
  
  return {
    intro: bumper.intro.replace(/\b(poking|stacking|balancing|tapping|lining|arranging|hovering|clustering)\b/, newVerb || ''),
    outro: bumper.outro
  };
}

function tweakLocation(bumper: Bumper): Bumper {
  const locations = [
    'minimalist cubes',
    'glass-walled offices',
    'soundproof booths',
    'standing desks',
    'open-plan areas',
    'conference rooms',
    'break rooms',
    'ergonomic pods'
  ];
  
  const currentLocation = bumper.outro.match(/\b(minimalist cubes|glass-walled offices|soundproof booths|standing desks|open-plan areas|conference rooms|break rooms|ergonomic pods)\b/)?.[0];
  const newLocation = locations.find(l => l !== currentLocation) || currentLocation;
  
  return {
    intro: bumper.intro,
    outro: bumper.outro.replace(/\b(minimalist cubes|glass-walled offices|soundproof booths|standing desks|open-plan areas|conference rooms|break rooms|ergonomic pods)\b/, newLocation || '')
  };
}

function tweakOutroDrift(bumper: Bumper): Bumper {
  const driftVerbs = ['dispersed', 'retreated', 'vanished', 'migrated', 'drifted', 'wandered', 'shuffled', 'circled'];
  const currentVerb = bumper.outro.match(/\b(dispersed|retreated|vanished|migrated|drifted|wandered|shuffled|circled)\b/)?.[0];
  const newVerb = driftVerbs.find(v => v !== currentVerb) || currentVerb;
  
  return {
    intro: bumper.intro,
    outro: bumper.outro.replace(/\b(dispersed|retreated|vanished|migrated|drifted|wandered|shuffled|circled)\b/, newVerb || '')
  };
}

function tweakObjectDetail(bumper: Bumper): Bumper {
  const objects = [
    'staplers',
    'chairs',
    'projectors',
    'tablets',
    'whiteboards',
    'coffee machines',
    'desks',
    'monitors'
  ];
  
  const currentObject = bumper.intro.match(/\b(staplers|chairs|projectors|tablets|whiteboards|coffee machines|desks|monitors)\b/)?.[0];
  const newObject = objects.find(o => o !== currentObject) || currentObject;
  
  return {
    intro: bumper.intro.replace(/\b(staplers|chairs|projectors|tablets|whiteboards|coffee machines|desks|monitors)\b/, newObject || ''),
    outro: bumper.outro
  };
}

function mutateBumper(bumper: Bumper): Bumper[] {
  return [
    tweakPhysicalAbsurdity(bumper),
    tweakLocation(bumper),
    tweakOutroDrift(bumper),
    tweakObjectDetail(bumper)
  ];
}

function logSummaryIteration(batchNumber: number, iteration: number, prompt: string, bumpers: Bumper[]) {
  const timestamp = new Date().toISOString();
  const summaryLogFileName = `prompt-optimization-summary-batch${batchNumber}.log`;
  
  // Select 3 representative scenes
  const selectedBumpers = bumpers.slice(0, 3);
  
  const summaryContent = `=== Iteration ${iteration} ===
Timestamp: ${timestamp}

Seed Prompt:
${prompt}

Generated Scenes:
${selectedBumpers.map((bumper, index) => `
${index + 1}. Intro: ${bumper.intro}
   Outro: ${bumper.outro}`).join('\n')}

`;

  // Append to summary log file
  fs.appendFileSync(summaryLogFileName, summaryContent);
}

async function generateVariation(prompt: string, variationType: 'minor' | 'moderate' | 'significant'): Promise<string> {
  const temperature = variationType === 'minor' ? 0.7 : variationType === 'moderate' ? 0.8 : 0.9;
  
  const variationPrompt = `You are a prompt engineer. Generate a ${variationType} variation of this prompt.
${variationType === 'minor' ? 'Keep the same structure but with different examples and emphasis. The variation should be minimal but distinct.' :
  variationType === 'moderate' ? 'You can modify the structure and requirements while maintaining the core concept. Make more substantial changes than a minor variation.' :
  'You can significantly modify the structure, requirements, and format rules while maintaining the core concept of observing startup absurdities.'}

Template:
${prompt}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: variationPrompt },
      { role: "user", content: `Generate a ${variationType} variation of this prompt.` }
    ],
    temperature,
    max_tokens: 1000
  });

  return response.choices[0]?.message?.content || prompt;
}

async function optimizePrompt(initialPrompt: string, maxIterations: number = 33, batchNumber: number = 1) {
  let currentPrompt = initialPrompt;
  let bestScore = 0;
  let bestPrompt = initialPrompt;
  let bestBumpers: Bumper[] = [];

  // Run seed prompt first
  console.log(`\nRunning seed prompt for batch ${batchNumber}...`);
  const seedResponse = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: currentPrompt },
      { role: "user", content: `Generate exactly 5 scenes. Each scene must follow this exact format:

Line 1: Time, day, and weather (e.g., "It's 10:15am on a sunny Tuesday in the downtown loft.")
Line 2: Physical action starting with "They are" (e.g., "They are huddled around a single glossy laptop.")
Line 3: Physical dispersal or object decay (e.g., "The beanbags remain unoccupied.")

Separate each scene with a blank line.` }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });

  const seedContent = seedResponse.choices[0]?.message?.content;
  if (seedContent) {
    console.log('\nGenerated content:');
    console.log(seedContent);
    console.log('\nParsing content...');
    const seedBumpers = parseBumpers(seedContent);
    if (seedBumpers.length > 0) {
      const scoredSeedBumpers = seedBumpers.map(bumper => ({
        bumper,
        score: scoreBumper(bumper)
      }));

      const bestSeedBumper = scoredSeedBumpers.reduce((best, current) => 
        current.score.total > best.score.total ? current : best
      );

      // Log seed iteration
      logIteration({
        iteration: 1,
        prompt: currentPrompt,
        scores: scoredSeedBumpers.map(sb => sb.score),
        bestExample: bestSeedBumper.bumper,
        goldStandardMatch: findGoldStandardMatch(bestSeedBumper.bumper)
      }, batchNumber);

      logSummaryIteration(batchNumber, 1, currentPrompt, seedBumpers);

      if (bestSeedBumper.score.total > bestScore) {
        bestScore = bestSeedBumper.score.total;
        bestPrompt = currentPrompt;
        bestBumpers = seedBumpers;
      }
    }
  }

  // Run variations
  for (let i = 2; i <= maxIterations; i++) {
    console.log(`\nRunning iteration ${i} of batch ${batchNumber}...`);
    
    // Determine variation type based on iteration number
    const variationType = i <= 12 ? 'minor' : i <= 23 ? 'moderate' : 'significant';
    console.log(`Generating ${variationType} variation...`);
    
    // Generate variation
    currentPrompt = await generateVariation(currentPrompt, variationType);
    
    // Generate bumpers with current prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: currentPrompt },
        { role: "user", content: `Generate exactly 5 scenes. Each scene must follow this exact format:

Line 1: Time, day, and weather (e.g., "It's 10:15am on a sunny Tuesday in the downtown loft.")
Line 2: Physical action starting with "They are" (e.g., "They are huddled around a single glossy laptop.")
Line 3: Physical dispersal or object decay (e.g., "The beanbags remain unoccupied.")

Separate each scene with a blank line.` }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("No content generated");
      continue;
    }

    console.log('\nGenerated content:');
    console.log(content);
    console.log('\nParsing content...');

    // Parse bumpers
    const bumpers = parseBumpers(content);
    if (bumpers.length === 0) {
      console.error("No valid bumpers parsed");
      continue;
    }

    // Score bumpers
    const scoredBumpers = bumpers.map(bumper => ({
      bumper,
      score: scoreBumper(bumper)
    }));

    // Find best bumper
    const bestBumper = scoredBumpers.reduce((best, current) => 
      current.score.total > best.score.total ? current : best
    );

    // Log iteration
    const iterationLog: IterationLog = {
      iteration: i,
      prompt: currentPrompt,
      scores: scoredBumpers.map(sb => sb.score),
      bestExample: bestBumper.bumper,
      goldStandardMatch: findGoldStandardMatch(bestBumper.bumper)
    };
    logIteration(iterationLog, batchNumber);
    
    // Log summary
    logSummaryIteration(batchNumber, i, currentPrompt, bumpers);

    // Update best score and prompt if needed
    if (bestBumper.score.total > bestScore) {
      bestScore = bestBumper.score.total;
      bestPrompt = currentPrompt;
      bestBumpers = bumpers;
    }
  }

  return {
    bestPrompt,
    bestScore,
    bestBumpers
  };
}

// Helper functions
function parseBumpers(content: string): Bumper[] {
  const bumpers: Bumper[] = [];
  
  // Split content into scenes based on double newlines
  const scenes = content.split('\n\n').filter(scene => scene.trim().length > 0);
  
  for (const scene of scenes) {
    // Skip template/format sections
    if (scene.toLowerCase().includes('template:') || 
        scene.toLowerCase().includes('format:') ||
        scene.toLowerCase().includes('guidelines:') ||
        scene.toLowerCase().includes('key rules:') ||
        scene.toLowerCase().includes('tone:') ||
        scene.toLowerCase().includes('objective:') ||
        scene.toLowerCase().includes('purpose:') ||
        scene.toLowerCase().includes('reminder:')) {
      continue;
    }

    // Split scene into lines and clean them
    const lines = scene.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Try to identify intro and outro
    if (lines.length >= 2) {
      let intro = '';
      let outro = '';

      // Check if the first line contains time and weather
      if (lines[0].match(/\b(\d{1,2}:\d{2}|morning|afternoon|evening)\b.*\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i)) {
        // If we have at least 3 lines, combine first two for intro
        if (lines.length >= 3) {
          intro = lines[0] + '\n' + lines[1];
          outro = lines[2];
        }
        // If we only have 2 lines, use first for intro and second for outro
        else {
          intro = lines[0];
          outro = lines[1];
        }
      }
      // If first line doesn't match time/weather format, try to use it as a regular intro
      else {
        intro = lines[0];
        outro = lines[lines.length - 1];  // Use last line as outro
      }

      // Only add if we have both intro and outro
      if (intro && outro) {
        bumpers.push({ intro, outro });
      }
    }
  }

  console.log(`Parsed ${bumpers.length} bumpers from content`);
  if (bumpers.length > 0) {
    console.log('\nFirst parsed bumper:');
    console.log('Intro:', bumpers[0].intro);
    console.log('Outro:', bumpers[0].outro);
  }
  return bumpers;
}

function findGoldStandardMatch(bumper: Bumper): Bumper {
  try {
    // Read gold standard bumpers from file
    const goldStandard = fs.readFileSync(path.resolve(process.cwd(), 'bumpers.txt'), 'utf-8');
    const goldBumpers = parseBumpers(goldStandard);
    
    if (goldBumpers.length === 0) {
      return bumper; // Return original if no gold standards found
    }
    
    // Find closest match based on similarity
    let bestMatch = goldBumpers[0];
    let bestScore = -1;
    
    for (const gold of goldBumpers) {
      const score = calculateSimilarity(bumper, gold);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = gold;
      }
    }
    
    return bestMatch;
  } catch (error) {
    console.error('Error reading gold standard file:', error);
    return bumper; // Return original if file not found
  }
}

function calculateSimilarity(bumper1: Bumper, bumper2: Bumper): number {
  // Simple word overlap similarity
  const words1 = (bumper1.intro + ' ' + bumper1.outro).toLowerCase().split(/\s+/);
  const words2 = (bumper2.intro + ' ' + bumper2.outro).toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(w => words2.includes(w));
  return commonWords.length / Math.max(words1.length, words2.length);
}

function modifyPrompt(currentPrompt: string, scoredBumpers: { bumper: Bumper; score: BumperScore }[]): string {
  // Calculate average scores
  const avgScores = scoredBumpers.reduce((acc, curr) => ({
    intro: acc.intro + curr.score.intro,
    outro: acc.outro + curr.score.outro,
    structure: acc.structure + curr.score.structure,
    tone: acc.tone + curr.score.tone,
    content: acc.content + curr.score.content,
    wordChoice: acc.wordChoice + curr.score.wordChoice,
    thematicResonance: acc.thematicResonance + curr.score.thematicResonance,
    total: acc.total + curr.score.total
  }), { 
    intro: 0,
    outro: 0,
    structure: 0,
    tone: 0,
    content: 0,
    wordChoice: 0,
    thematicResonance: 0,
    total: 0
  });
  
  const count = Math.max(scoredBumpers.length, 1); // Prevent division by zero
  avgScores.structure /= count;
  avgScores.tone /= count;
  avgScores.content /= count;
  avgScores.outro /= count;
  avgScores.wordChoice /= count;
  avgScores.thematicResonance /= count;
  
  // Modify prompt based on lowest scores
  let newPrompt = currentPrompt;
  
  if (avgScores.structure < 4) {
    newPrompt += '\n- Focus on tiny physical actions: poking, stacking, balancing, tapping.';
  }
  
  if (avgScores.tone < 4) {
    newPrompt += '\n- Use shorter sentences. Remove adjectives. No conjunctions.';
  }
  
  if (avgScores.content < 4) {
    newPrompt += '\n- Emphasize low-stakes absurdities: tangled cables, mismatched socks, blinking lights.';
  }
  
  if (avgScores.outro < 4) {
    newPrompt += '\n- Avoid any hint of story, tension, or resolution. Just record what you see.';
  }
  
  return newPrompt;
}

function scoreOutput(output: string): number {
  let score = 0;
  const lines = output.split('\n').filter(line => line.trim());
  
  if (lines.length !== 2) return 0;
  const [intro, outro] = lines;

  // Check intro format
  if (intro.startsWith('They are') || intro.startsWith('They have')) score += 1;
  
  // Check outro format
  if (outro.startsWith('The coaches have')) score += 1;

  // Score physical action quality
  const hasPhysicalVerb = /\b(circling|poking|adjusting|tapping|lining|stacking|arranging|hovering|clustering)\b/i.test(intro);
  if (hasPhysicalVerb) score += 2;

  // Score mundane office objects
  const hasMundaneObject = /(whiteboard|coffee|chair|desk|monitor|keyboard|mouse|pen|notebook|screen|machine)/i.test(output);
  if (hasMundaneObject) score += 1;

  // Penalize storytelling/context
  const hasStoryElements = /(because|when|after|before|while|during|since|as|if)/i.test(output);
  if (hasStoryElements) score -= 2;

  // Check line length (10-12 words ideal)
  const introWords = intro.split(' ').length;
  const outroWords = outro.split(' ').length;
  if (introWords <= 12 && introWords >= 8) score += 1;
  if (outroWords <= 12 && outroWords >= 8) score += 1;

  // Penalize adjectives (except essential ones)
  const adjectiveCount = (output.match(/\b(big|small|large|tiny|huge|great|amazing|awesome|beautiful|ugly)\b/g) || []).length;
  score -= adjectiveCount;

  // Bonus for ultra-physical absurdity
  const hasAbsurdPhysical = /(circling|hovering|clustering|lining|stacking)\b.*\b(espresso|juice|whiteboard|pods)/i.test(output);
  if (hasAbsurdPhysical) score += 2;

  return Math.max(0, score);
}

async function runMultipleBatches(numBatches: number = 10, allowSignificantVariations: boolean = false) {
  const basePromptTemplate = `You are a dry, detached field-note observer of startup absurdities.

Key requirements:
- Record only tiny, pointless physical actions (circling, poking, adjusting)
- Use simple present tense, no context or setup needed
- Keep language minimal and clean
- Focus on mundane office objects (whiteboards, coffee machines, chairs)
- No story arcs, just pure observation

Format rules:
- Intro MUST start with "They are" or "They have" + physical verb
- Outro MUST start with "The coaches have" + dispersal verb
- No time markers, weather, or explanations
- No adjectives unless absolutely necessary
- Maximum 10-12 words per line

Examples:
Intro: They are circling the espresso machine in the break room.
Outro: The coaches have returned to their productivity pods.

Intro: They are lined up at the juice bar, debating celery.
Outro: The coaches have retreated to their ergonomic chairs.`;

  const variationType = allowSignificantVariations ? "significant" : "subtle";
  console.log(`Starting ${numBatches} batches with ${variationType} variations...`);
  
  for (let i = 1; i <= numBatches; i++) {
    console.log(`Starting batch ${i}...`);
    
    // Generate a base prompt for this batch
    const baseResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { 
          role: "system", 
          content: `You are a prompt engineer. ${allowSignificantVariations ? 
            "Generate a significantly different variation of this prompt. You can modify the structure, requirements, and format rules while maintaining the core concept of observing startup absurdities." :
            "Generate a subtle variation of this prompt template, keeping the same structure but with different examples and emphasis. The variation should be minimal but distinct."}
          
          Template:
          ${basePromptTemplate}`
        },
        { role: "user", content: `Generate a ${allowSignificantVariations ? "significantly different" : "subtle"} variation of this prompt.` }
      ],
      temperature: allowSignificantVariations ? 0.9 : 0.7,
      max_tokens: 1000
    });

    const uniqueBasePrompt = baseResponse.choices[0]?.message?.content || basePromptTemplate;
    console.log(`Generated ${variationType} base prompt for batch ${i}`);
    
    await optimizePrompt(uniqueBasePrompt, 10, i + (allowSignificantVariations ? 10 : 0));
    console.log(`Completed batch ${i}`);
  }
  
  console.log(`Completed all ${numBatches} batches with ${variationType} variations!`);
}

// Add function to find top 10 iterations
async function findTopIterations(numBatches: number = 20) {
  const allIterations: IterationLog[] = [];
  
  for (let batchNum = 1; batchNum <= numBatches; batchNum++) {
    const logPath = path.join(__dirname, `prompt-optimization-batch${batchNum}.log`);
    if (!fs.existsSync(logPath)) continue;
    
    const content = fs.readFileSync(logPath, 'utf8');
    const iterations = content.split('\nIteration').slice(1);
    
    iterations.forEach(iteration => {
      try {
        const iterationNum = parseInt(iteration.match(/^(\d+)/)?.[1] || '0');
        const prompt = iteration.match(/Prompt:\s*([\s\S]*?)\n(?:Scores|$)/)?.[1]?.trim() || '';
        const scores = (iteration.match(/Scores:\s*([\s\S]*?)\n(?:Best|$)/)?.[1]?.trim() || '')
          .split('\n')
          .map(line => {
            const score = parseFloat(line.match(/Score: ([\d.]+)/)?.[1] || '0');
            return {
              intro: score,
              outro: score,
              structure: score,
              tone: score,
              content: score,
              wordChoice: score,
              thematicResonance: score,
              total: score
            };
          });
        
        const bestExample = {
          intro: iteration.match(/Best Example:\s*Intro: (.*?)(?:\n|$)/)?.[1] || '',
          outro: iteration.match(/Outro: (.*?)(?:\n|$)/)?.[1] || ''
        };
        
        const goldStandardMatch = {
          intro: iteration.match(/Gold Standard Match:\s*Intro: (.*?)(?:\n|$)/)?.[1] || '',
          outro: iteration.match(/Outro: (.*?)(?:\n|$)/)?.[1] || ''
        };
        
        if (prompt && scores.length > 0) {
          allIterations.push({
            iteration: iterationNum,
            prompt,
            scores,
            bestExample,
            goldStandardMatch
          });
        }
      } catch (err) {
        console.error(`Error parsing iteration in batch ${batchNum}:`, err);
      }
    });
  }
  
  // Calculate average scores for each iteration
  const iterationAverages = allIterations.map(iteration => {
    const avgScore = iteration.scores.reduce((acc, score) => ({
      intro: acc.intro + score.intro / iteration.scores.length,
      outro: acc.outro + score.outro / iteration.scores.length,
      structure: acc.structure + score.structure / iteration.scores.length,
      tone: acc.tone + score.tone / iteration.scores.length,
      content: acc.content + score.content / iteration.scores.length,
      wordChoice: acc.wordChoice + score.wordChoice / iteration.scores.length,
      thematicResonance: acc.thematicResonance + score.thematicResonance / iteration.scores.length,
      total: acc.total + score.total / iteration.scores.length
    }), {
      intro: 0,
      outro: 0,
      structure: 0,
      tone: 0,
      content: 0,
      wordChoice: 0,
      thematicResonance: 0,
      total: 0
    });
    
    return {
      batchNum: Math.floor(iteration.iteration / 5) + 1,
      iterationNum: iteration.iteration % 5 || 5,
      avgScore,
      prompt: iteration.prompt,
      bestExample: iteration.bestExample,
      goldStandardMatch: iteration.goldStandardMatch
    };
  });

  // Sort by weighted score and get top 10
  const top10 = iterationAverages
    .sort((a, b) => b.avgScore.total - a.avgScore.total)
    .slice(0, 10);

  // Log top 10 with all examples
  const top10Log = top10.map((iter, i) => `
${i + 1}. Batch ${iter.batchNum}, Iteration ${iter.iterationNum}
Weighted Score: ${iter.avgScore.total.toFixed(2)}
Structure: ${iter.avgScore.structure.toFixed(2)}
Tone: ${iter.avgScore.tone.toFixed(2)}
Content: ${iter.avgScore.content.toFixed(2)}
Outro: ${iter.avgScore.outro.toFixed(2)}
Word Choice: ${iter.avgScore.wordChoice.toFixed(2)}
Thematic: ${iter.avgScore.thematicResonance.toFixed(2)}

Prompt:
${iter.prompt}

Best Examples:
${iter.bestExample.intro}
     ${iter.bestExample.outro}
`).join('\n');

  fs.writeFileSync('top-10-iterations.log', top10Log);
  console.log('Top 10 iterations have been logged to top-10-iterations.log');
}

// Add call to findTopIterations after all batches complete
async function runAllBatches() {
  console.log("Starting iterations with seed prompt...");
  const seedPrompt = `You are a dry, detached field-note observer of startup absurdities.

Every entry follows this structure:
- Intro (2 lines):
  - Line 1: Natural time, day, weather, location.
  - Line 2: Visible collective physical absurdity (small group behaviors around mundane objects).
- Outro (1 line):
  - Physical dispersal only, written in present perfect tense (e.g., "They have drifted," "They have wandered," "They have melted away").

Key rules:
- No emotions, no motives, no story arcs.
- Only visible actions — no dialogue, no plans.
- Word choice should suggest light startup ritualism (e.g., vision boards, kombucha taps, standing desks).
- Slightly elevated nouns and verbs are preferred over generic ones.
- Tiny absurdities must feel ambient, not dramatic.
- Group actions (even uncoordinated) are preferred to solo actions.

Tone:
- Dry, minimal, ambient, lightly amused.
- Observational only — no commentary or judgment.

Reminder:
You are recording the quiet, cumulative absurdities of a startup herd at work.`;

  // Run all iterations with seed prompt
  await optimizePrompt(seedPrompt, 21, 1);
  
  console.log("\nFinding top 10 iterations...");
  await findTopIterations();
  
  console.log("\nAll iterations completed!");
}

async function runAllSeedPrompts() {
  const seedPrompts = [
    `You are observing the ambient drift of a startup office.

You describe only what is physically visible: lazy rituals, office clutter, ambient absurdities.  
You never describe emotions, motives, or strategies.  
You never assign intention, and you never write stories.  
You are capturing how the office moves, quietly, without explanation.

You MUST:
- Begin every intro with "They are..." — never with group nouns like "a group," "the team," or "employees."
- Use exactly two lines for every intro:
  - Line 1: factual time, place, and weather (e.g., "It's 2:10pm on a gray Monday in the Singapore penthouse.")
  - Line 2: herd behavior involving startup artifacts (kombucha taps, Slack alerts, sticky notes, beanbags, whiteboards).
- Write exactly one short sentence for the outro:
  - Only physical dispersal (e.g., "They trickled off toward their desks.")
  - You may describe object decay (e.g., "The sticky notes curled slowly.") but do not explain it.

FORBIDDEN:
- Character names or identifying traits.
- Emotional language ("awkward," "hopeful," "anxious").
- Strategic or narrative actions ("trying to," "debating," "planning").
- Any form of dialogue or cinematic metaphor ("shadows stretching," "as the sun dipped").

Tone:  
Quiet. Bored. Dry.  
Office as ecosystem. Drift as default.  
Think like an exhausted anthropologist, not a screenwriter.`,

    `You are documenting the ambient drift of startup life.

You are not a storyteller. You are a quiet observer. You write dry, minimal field notes about the physical behaviors and absurd objects that define the office ritual ecosystem.

You never describe motives.  
You never describe emotions.  
You never describe strategies, dynamics, or decisions.  
You never invent stories.

You MUST:

- Begin every intro with "They are..." or "One of them..." — never use group nouns like "a group," "the team," or "employees."
- Use exactly two lines for every intro:
  - Line 1: factual time, place, and weather (e.g., "It's 3:15pm on a humid Thursday in the Singapore penthouse.")
  - Line 2: physical behavior or light absurdity involving startup objects (e.g., kombucha taps, sticky notes, Slack alerts, beanbags, vision boards, charging stations, whiteboards).
- Write exactly one sentence for every outro:
  - Physical dispersal only (e.g., "They drifted back to their Slack threads.")
  - You may hint at minor object decay (e.g., "The sticky notes continued to curl.")
  - No motive, emotion, or implication — just movement.

FORBIDDEN:
- Character names (never Donte, Venus, etc.)
- Group nouns (no "a group," "a trio," "the team")
- Any kind of emotion, thought, intention, or reaction (no "awkward," "hopeful," "confused," "trying to…")
- Cinematic or poetic descriptions (no "murmur," "linger," "shadows stretching," "sunlight glinting")
- Dialogue or conversation (unless explicitly instructed)

TONE:
- Minimal
- Dry
- Slightly absurd
- Always observational, never explanatory
- Like field notes from a dream

Final reminder:  
You are not writing fiction. You are recording office drift.  
Everything should feel faint, physical, and unnecessary.`,

    `You are documenting the ambient drift of startup life.

You are not a storyteller. You are a quiet observer. You write dry, minimal field notes about the physical behaviors and absurd objects that define the office ritual ecosystem.

You do not explain motives.  
You do not describe emotions.  
You do not invent stories.  
You do not interpret strategies, dynamics, or tension.  
You do not try to be clever.

You MUST:

- Begin every intro with "They are..." or "One of them..."  
- NEVER use group nouns like "a group," "the team," "several individuals," "employees," or "coworkers."
- Write every intro in exactly **two lines**:
  - **Line 1:** Factual time, place, and weather (e.g., "It's 3:15pm on a gray Thursday in the Singapore penthouse.")
  - **Line 2:** Ambient, physical herd behavior involving startup objects (e.g., sticky notes, kombucha taps, Slack alerts, tote bags, whiteboards).
- Write every outro as **one short sentence**:
  - Only describe physical dispersal or movement (e.g., "They trickled back toward their laptops.")
  - You may hint at passive object decay (e.g., "The sticky notes continued to curl.")
  - Do not summarize, infer, or conclude.

FORBIDDEN:
- Character names (Donte, Venus, Rohan, etc.)
- Specific people ("a woman," "a man," "the CEO," etc.)
- Emotional language ("awkward," "tense," "bored," "hopeful")
- Strategic or purposeful actions ("trying to," "preparing," "debating")
- Narrative or cinematic phrases ("as the sun dipped," "shadows stretching," "lingering tension")
- Dialogue or quotation (unless explicitly asked)

TONE:
- Minimal
- Dry
- Slightly absurd
- Loosely anthropological
- Quiet, atmospheric
- Like accidental field notes about office entropy

Final reminder:  
You are not writing scenes.  
You are quietly noting how objects and people drift.  
Everything should feel unnecessary, physical, and faint.`
  ];

  const results = [];
  
  for (let i = 0; i < seedPrompts.length; i++) {
    console.log(`\nStarting batch ${i + 1} with seed prompt ${i + 1}...`);
    const result = await optimizePrompt(seedPrompts[i], 33, i + 1);
    results.push(result);
  }

  // Create final summary
  const timestamp = new Date().toISOString();
  const finalSummaryFileName = `prompt-optimization-final-summary-${timestamp}.log`;
  
  const finalSummary = `=== Final Optimization Summary ===
Timestamp: ${timestamp}

${results.map((result, index) => `
Batch ${index + 1} Results:
Best Score: ${result.bestScore}
Best Prompt:
${result.bestPrompt}

Best Scenes:
${result.bestBumpers.slice(0, 3).map((bumper, i) => `
${i + 1}. Intro: ${bumper.intro}
   Outro: ${bumper.outro}`).join('\n')}
`).join('\n')}
`;

  fs.writeFileSync(finalSummaryFileName, finalSummary);
  console.log(`\nFinal summary saved to ${finalSummaryFileName}`);
  
  return results;
}

// Replace the existing execution code with this
runAllSeedPrompts().catch(console.error);