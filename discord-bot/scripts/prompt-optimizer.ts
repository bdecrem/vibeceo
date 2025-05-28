import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
// import { generatePromptVariations, testPrompt, analyzeResults, optimizePrompt } from '../lib/discord/ai.js';
import { loadEnvironment } from '../lib/discord/env-loader.ts';

// Load environment variables
loadEnvironment();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Types
type Bumper = {
  intro: string;
  outro: string;
};

type BumperScore = {
  physicality: { intro: number; outro: number };
  minimalism: { intro: number; outro: number };
  absurdity: { intro: number; outro: number };
  storylessness: { intro: number; outro: number };
  goldStandardMatch: number;  // 0-1 score for how close to gold standard
  consistency: number;        // 0-1 score for how consistent across iterations
};

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

function scoreBumper(bumper: Bumper, previousScores: BumperScore[] = []): BumperScore {
  const fullText = `${bumper.intro}\n${bumper.outro}`;
  
  // Get individual scores
  const physicality = {
    intro: detectPhysicalAction(bumper.intro),
    outro: detectPhysicalAction(bumper.outro)
  };
  
  const minimalism = {
    intro: detectMinimalLanguage(bumper.intro),
    outro: detectMinimalLanguage(bumper.outro)
  };
  
  const absurdity = {
    intro: detectAbsurdityLevel(bumper.intro),
    outro: detectAbsurdityLevel(bumper.outro)
  };
  
  const storylessness = {
    intro: detectStoryHints(bumper.intro),
    outro: detectStoryHints(bumper.outro)
  };

  // Calculate gold standard match
  const goldStandard = findGoldStandardMatch(bumper);
  const goldStandardMatch = calculateSimilarity(bumper, goldStandard);

  // Calculate consistency with previous scores
  let consistency = 1.0;
  if (previousScores.length > 0) {
    const avgPreviousScores = previousScores.reduce((acc, curr) => ({
      physicality: acc.physicality + (curr.physicality.intro + curr.physicality.outro) / 2,
      minimalism: acc.minimalism + (curr.minimalism.intro + curr.minimalism.outro) / 2,
      absurdity: acc.absurdity + (curr.absurdity.intro + curr.absurdity.outro) / 2,
      storylessness: acc.storylessness + (curr.storylessness.intro + curr.storylessness.outro) / 2
    }), { physicality: 0, minimalism: 0, absurdity: 0, storylessness: 0 });

    const count = previousScores.length;
    avgPreviousScores.physicality /= count;
    avgPreviousScores.minimalism /= count;
    avgPreviousScores.absurdity /= count;
    avgPreviousScores.storylessness /= count;

    const currentScores = {
      physicality: (physicality.intro + physicality.outro) / 2,
      minimalism: (minimalism.intro + minimalism.outro) / 2,
      absurdity: (absurdity.intro + absurdity.outro) / 2,
      storylessness: (storylessness.intro + storylessness.outro) / 2
    };

    // Calculate consistency as average difference from previous scores
    const differences = [
      Math.abs(currentScores.physicality - avgPreviousScores.physicality),
      Math.abs(currentScores.minimalism - avgPreviousScores.minimalism),
      Math.abs(currentScores.absurdity - avgPreviousScores.absurdity),
      Math.abs(currentScores.storylessness - avgPreviousScores.storylessness)
    ];
    
    consistency = 1 - (differences.reduce((a, b) => a + b, 0) / differences.length / 5);
  }

  return {
    physicality,
    minimalism,
    absurdity,
    storylessness,
    goldStandardMatch,
    consistency
  };
}

// Quality check
function isHighQuality(bumperScore: BumperScore): boolean {
  return (
    bumperScore.physicality.intro >= 3 &&
    bumperScore.physicality.outro >= 3 &&
    bumperScore.minimalism.intro >= 3 &&
    bumperScore.minimalism.outro >= 3 &&
    bumperScore.absurdity.intro >= 3 &&
    bumperScore.absurdity.outro >= 3 &&
    bumperScore.storylessness.intro >= 3 &&
    bumperScore.storylessness.outro >= 3
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
- Physicality: Intro ${log.scores.map(s => s.physicality.intro).join(', ')}, Outro ${log.scores.map(s => s.physicality.outro).join(', ')}
- Minimalism: Intro ${log.scores.map(s => s.minimalism.intro).join(', ')}, Outro ${log.scores.map(s => s.minimalism.outro).join(', ')}
- Absurdity: Intro ${log.scores.map(s => s.absurdity.intro).join(', ')}, Outro ${log.scores.map(s => s.absurdity.outro).join(', ')}
- Storylessness: Intro ${log.scores.map(s => s.storylessness.intro).join(', ')}, Outro ${log.scores.map(s => s.storylessness.outro).join(', ')}
- Gold Standard Match: ${log.scores.map(s => s.goldStandardMatch.toFixed(2)).join(', ')}
- Consistency: ${log.scores.map(s => s.consistency.toFixed(2)).join(', ')}

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

// Main optimization loop
async function optimizePrompt(initialPrompt: string, maxIterations: number = 10, batchNumber: number = 1) {
  let currentPrompt = initialPrompt;
  let iteration = 1;
  let bestBumpers: { bumper: Bumper; score: BumperScore }[] = [];

  // First iteration is always base iteration
  console.log(`Running base iteration for batch ${batchNumber}...`);
  
  // Generate batch of bumpers for base iteration
  const baseResponse = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      { role: "system", content: initialPrompt },
      { role: "user", content: "Generate exactly 5 entries. Each entry must be exactly 2 lines: an intro line starting with 'They are' or 'They have', and an outro line starting with 'The coaches have'. Separate entries with blank lines." }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });

  const baseContent = baseResponse.choices[0]?.message?.content || '';
  const baseBumpers = parseBumpers(baseContent);
  
  if (baseBumpers.length > 0) {
    const scoredBaseBumpers = baseBumpers.map(bumper => ({
      bumper,
      score: scoreBumper(bumper)
    }));
    
    const bestBaseBumper = scoredBaseBumpers.reduce((a, b) => {
      const scoreA = a.score.physicality.intro + a.score.physicality.outro + a.score.minimalism.intro + a.score.minimalism.outro + a.score.absurdity.intro + a.score.absurdity.outro + a.score.storylessness.intro + a.score.storylessness.outro;
      const scoreB = b.score.physicality.intro + b.score.physicality.outro + b.score.minimalism.intro + b.score.minimalism.outro + b.score.absurdity.intro + b.score.absurdity.outro + b.score.storylessness.intro + b.score.storylessness.outro;
      return scoreA > scoreB ? a : b;
    });

    bestBumpers.push(bestBaseBumper);

    // Log base iteration
    logIteration({
      iteration: 1,
      prompt: initialPrompt,
      scores: scoredBaseBumpers.map(s => s.score),
      bestExample: bestBaseBumper.bumper,
      goldStandardMatch: findGoldStandardMatch(bestBaseBumper.bumper)
    }, batchNumber);

    // Update current prompt for next iterations
    currentPrompt = modifyPrompt(initialPrompt, scoredBaseBumpers);
  }

  // Continue with remaining iterations
  iteration = 2;
  while (iteration <= maxIterations) {
    console.log(`Running iteration ${iteration}...`);
    
    // Generate batch of bumpers
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: currentPrompt },
        { role: "user", content: "Generate exactly 5 entries. Each entry must be exactly 2 lines: an intro line starting with 'They are' or 'They have', and an outro line starting with 'The coaches have'. Separate entries with blank lines." }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    console.log('Got response from OpenAI');
    const content = response.choices[0]?.message?.content || '';
    console.log('Content:', content);

    // Parse and score the bumpers
    const bumpers = parseBumpers(content);
    console.log(`Parsed ${bumpers.length} bumpers`);

    if (bumpers.length === 0) {
      console.log('No valid bumpers found in response, retrying...');
      continue;
    }

    // Score original bumpers
    const scoredBumpers = bumpers.map(bumper => ({
      bumper,
      score: scoreBumper(bumper)
    }));

    // Find high-quality bumpers
    const highQualityBumpers = scoredBumpers.filter(s => isHighQuality(s.score));
    console.log(`Found ${highQualityBumpers.length} high-quality bumpers`);

    // For each high-quality bumper, ask GPT to generate refined variants
    const allVariants: { bumper: Bumper; score: BumperScore }[] = [];
    
    for (const scoredBumper of highQualityBumpers) {
      console.log('Generating variants for:', scoredBumper.bumper.intro);
      
      const variantResponse = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { 
            role: "system", 
            content: `You are a dry, detached field-note observer of startup absurdities.
            Generate 4 variations of this scene, each with a slight change to either:
            - The physical action (e.g., poking → stacking)
            - The location (e.g., minimalist cubes → glass-walled offices)
            - The outro drift (e.g., dispersed → vanished)
            - The object detail (e.g., staplers → chairs)
            
            Keep the same minimal, dry tone. No new narrative elements.
            Each variation must be exactly 2 lines: an intro starting with "They are" or "They have",
            and an outro starting with "The coaches have".
            
            Original scene:
            ${scoredBumper.bumper.intro}
            ${scoredBumper.bumper.outro}`
          },
          { role: "user", content: "Generate 4 variations, separated by blank lines." }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const variantContent = variantResponse.choices[0]?.message?.content || '';
      const variantBumpers = parseBumpers(variantContent);
      
      // Score the variants
      const scoredVariants = variantBumpers.map(bumper => ({
        bumper,
        score: scoreBumper(bumper)
      }));
      
      allVariants.push(...scoredVariants);
    }

    // Combine original high-quality bumpers with their variants
    const allCandidates = [...highQualityBumpers, ...allVariants];

    // Find best example and its gold standard match
    const bestBumper = allCandidates.reduce((a, b) => {
      const scoreA = a.score.physicality.intro + a.score.physicality.outro + a.score.minimalism.intro + a.score.minimalism.outro + a.score.absurdity.intro + a.score.absurdity.outro + a.score.storylessness.intro + a.score.storylessness.outro;
      const scoreB = b.score.physicality.intro + b.score.physicality.outro + b.score.minimalism.intro + b.score.minimalism.outro + b.score.absurdity.intro + b.score.absurdity.outro + b.score.storylessness.intro + b.score.storylessness.outro;
      return scoreA > scoreB ? a : b;
    });

    // Keep track of best bumpers
    bestBumpers.push(bestBumper);

    // Log this iteration
    logIteration({
      iteration,
      prompt: currentPrompt,
      scores: allCandidates.map(s => s.score),
      bestExample: bestBumper.bumper,
      goldStandardMatch: findGoldStandardMatch(bestBumper.bumper)
    }, batchNumber);

    // Send best bumpers to GPT for next iteration
    const bestExamples = bestBumpers.map(b => `${b.bumper.intro}\n${b.bumper.outro}`).join('\n\n');
    const nextPrompt = `${currentPrompt}\n\nBest examples from previous iterations:\n${bestExamples}`;

    // Modify prompt based on scores
    currentPrompt = modifyPrompt(nextPrompt, allCandidates);
    iteration++;
  }

  console.log(`Completed ${maxIterations} iterations.`);
  return currentPrompt;
}

// Helper functions
function parseBumpers(content: string): Bumper[] {
  const bumpers: Bumper[] = [];
  const scenes = content.split('\n\n').filter(s => s.trim());
  
  for (const scene of scenes) {
    const lines = scene.split('\n').filter(l => l.trim());
    if (lines.length >= 2) {  // Changed from 3 to 2 since we only need intro and outro
      bumpers.push({
        intro: lines[0],
        outro: lines[1]
      });
    }
  }
  
  console.log('Parsed bumpers:', bumpers);
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
    physicality: {
      intro: acc.physicality.intro + curr.score.physicality.intro,
      outro: acc.physicality.outro + curr.score.physicality.outro
    },
    minimalism: {
      intro: acc.minimalism.intro + curr.score.minimalism.intro,
      outro: acc.minimalism.outro + curr.score.minimalism.outro
    },
    absurdity: {
      intro: acc.absurdity.intro + curr.score.absurdity.intro,
      outro: acc.absurdity.outro + curr.score.absurdity.outro
    },
    storylessness: {
      intro: acc.storylessness.intro + curr.score.storylessness.intro,
      outro: acc.storylessness.outro + curr.score.storylessness.outro
    }
  }), { physicality: { intro: 0, outro: 0 }, minimalism: { intro: 0, outro: 0 }, absurdity: { intro: 0, outro: 0 }, storylessness: { intro: 0, outro: 0 } });
  
  const count = Math.max(scoredBumpers.length, 1); // Prevent division by zero
  avgScores.physicality.intro /= count;
  avgScores.physicality.outro /= count;
  avgScores.minimalism.intro /= count;
  avgScores.minimalism.outro /= count;
  avgScores.absurdity.intro /= count;
  avgScores.absurdity.outro /= count;
  avgScores.storylessness.intro /= count;
  avgScores.storylessness.outro /= count;
  
  // Modify prompt based on lowest scores
  let newPrompt = currentPrompt;
  
  if (avgScores.physicality.intro < 4) {
    newPrompt += '\n- Focus on tiny physical actions: poking, stacking, balancing, tapping.';
  }
  
  if (avgScores.minimalism.intro < 4) {
    newPrompt += '\n- Use shorter sentences. Remove adjectives. No conjunctions.';
  }
  
  if (avgScores.absurdity.intro < 4) {
    newPrompt += '\n- Emphasize low-stakes absurdities: tangled cables, mismatched socks, blinking lights.';
  }
  
  if (avgScores.storylessness.intro < 4) {
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
  const allIterations: { 
    batch: number; 
    iteration: number; 
    score: BumperScore; 
    examples: Bumper[];  // Changed from single example to array of examples
    prompt: string;
  }[] = [];

  // Read all log files
  for (let i = 1; i <= numBatches; i++) {
    const logFileName = `prompt-optimization-batch${i}.log`;
    if (fs.existsSync(logFileName)) {
      const content = fs.readFileSync(logFileName, 'utf-8');
      const iterations = content.split('=== Iteration').slice(1);
      
      for (const iter of iterations) {
        const lines = iter.split('\n');
        const iterationNum = parseInt(lines[0].trim());
        const prompt = lines.slice(2, lines.indexOf('Scores:')).join('\n').trim();
        
        // Parse scores
        const scores = {
          physicality: { 
            intro: parseFloat(lines.find(l => l.includes('Physicality: Intro'))?.split(',')[0].split(':')[1].trim() || '0'),
            outro: parseFloat(lines.find(l => l.includes('Physicality: Outro'))?.split(',')[0].split(':')[1].trim() || '0')
          },
          minimalism: {
            intro: parseFloat(lines.find(l => l.includes('Minimalism: Intro'))?.split(',')[0].split(':')[1].trim() || '0'),
            outro: parseFloat(lines.find(l => l.includes('Minimalism: Outro'))?.split(',')[0].split(':')[1].trim() || '0')
          },
          absurdity: {
            intro: parseFloat(lines.find(l => l.includes('Absurdity: Intro'))?.split(',')[0].split(':')[1].trim() || '0'),
            outro: parseFloat(lines.find(l => l.includes('Absurdity: Outro'))?.split(',')[0].split(':')[1].trim() || '0')
          },
          storylessness: {
            intro: parseFloat(lines.find(l => l.includes('Storylessness: Intro'))?.split(',')[0].split(':')[1].trim() || '0'),
            outro: parseFloat(lines.find(l => l.includes('Storylessness: Outro'))?.split(',')[0].split(':')[1].trim() || '0')
          },
          goldStandardMatch: parseFloat(lines.find(l => l.includes('Gold Standard Match:'))?.split(':')[1].trim() || '0'),
          consistency: parseFloat(lines.find(l => l.includes('Consistency:'))?.split(':')[1].trim() || '0')
        };

        // Parse all examples from the iteration
        const examples: Bumper[] = [];
        const exampleStart = lines.findIndex(l => l.includes('Best example:'));
        if (exampleStart !== -1) {
          // Get the best example
          examples.push({
            intro: lines[exampleStart + 1].replace('Intro:', '').trim(),
            outro: lines[exampleStart + 2].replace('Outro:', '').trim()
          });

          // Look for additional examples in the content
          const content = lines.join('\n');
          const exampleMatches = content.match(/Intro: (.*?)\nOutro: (.*?)(?=\n|$)/g) || [];
          for (const match of exampleMatches.slice(0, 4)) { // Get up to 4 more examples
            const [intro, outro] = match.split('\n');
            examples.push({
              intro: intro.replace('Intro:', '').trim(),
              outro: outro.replace('Outro:', '').trim()
            });
          }
        }

        allIterations.push({
          batch: i,
          iteration: iterationNum,
          score: scores,
          examples,
          prompt
        });
      }
    }
  }

  // Calculate weighted score for each iteration
  const weightedScores = allIterations.map(iter => {
    const score = iter.score;
    const weightedScore = (
      (score.physicality.intro + score.physicality.outro) * 0.3 +
      (score.minimalism.intro + score.minimalism.outro) * 0.2 +
      (score.absurdity.intro + score.absurdity.outro) * 0.2 +
      (score.storylessness.intro + score.storylessness.outro) * 0.2 +
      score.goldStandardMatch * 0.05 +
      score.consistency * 0.05
    ) / 2; // Divide by 2 to normalize to 0-5 scale

    return { ...iter, weightedScore };
  });

  // Sort by weighted score and get top 10
  const top10 = weightedScores
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, 10);

  // Log top 10 with all examples
  const top10Log = `
=== Top 10 Iterations ===
${top10.map((iter, i) => `
${i + 1}. Batch ${iter.batch}, Iteration ${iter.iteration}
Weighted Score: ${iter.weightedScore.toFixed(2)}
Physicality: ${(iter.score.physicality.intro + iter.score.physicality.outro) / 2}
Minimalism: ${(iter.score.minimalism.intro + iter.score.minimalism.outro) / 2}
Absurdity: ${(iter.score.absurdity.intro + iter.score.absurdity.outro) / 2}
Storylessness: ${(iter.score.storylessness.intro + iter.score.storylessness.outro) / 2}
Gold Standard Match: ${iter.score.goldStandardMatch}
Consistency: ${iter.score.consistency}

Prompt:
${iter.prompt}

Examples:
${iter.examples.map((ex, j) => `
${j + 1}. ${ex.intro}
   ${ex.outro}`).join('\n')}
`).join('\n')}
`;

  fs.writeFileSync('top-10-iterations.log', top10Log);
  console.log('Top 10 iterations have been logged to top-10-iterations.log');
}

// Add call to findTopIterations after all batches complete
async function runAllBatches() {
  console.log("Starting first set of batches with subtle variations...");
  await runMultipleBatches(10, false);
  
  console.log("\nStarting second set of batches with significant variations...");
  await runMultipleBatches(10, true);
  
  console.log("\nFinding top 10 iterations...");
  await findTopIterations();
  
  console.log("\nAll batches completed!");
}

// Replace the existing execution code with this
runAllBatches().catch(console.error);
