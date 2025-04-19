// Pitch analysis module for categorizing and scoring pitches

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Development analysis prompt template
const DEVELOPMENT_PROMPT = `Analyze this business pitch for its level of development. Consider:
1. Market Understanding (target audience, market size, competition)
2. Technical Detail (implementation approach, technology stack)
3. Business Model (revenue streams, pricing, cost structure)
4. Implementation Plan (timeline, resources, milestones)
5. Risk Assessment (potential challenges, mitigation strategies)

Return ONLY a number from 1-10 where:
1 = Just an idea with no details
3 = Basic concept with some market understanding
5 = Clear value proposition with rough implementation plan
7 = Detailed plan with market research and technical approach
10 = Comprehensive business plan with clear execution strategy

Pitch: "{pitch}"`;

export interface PitchAnalysis {
  jokeScore: number;      // 1-10: How much is this a joke?
  developmentScore: number; // 1-10: How well developed is the idea?
  feasibilityScore: number; // 1-10: How feasible is the execution?
  noveltyScore: number;    // 1-10: How novel/unique is the idea?
}

// Length-based analysis
function analyzeLength(pitch: string): number {
  const words = pitch.split(' ').length;
  if (words <= 2) return 9; // Very likely underdeveloped (e.g., "waffle stand")
  if (words <= 5) return 7; // Probably needs more detail
  if (words >= 50) return 3; // Probably well-developed
  return 5; // Neutral
}

// Joke pattern detection
function detectJokePatterns(pitch: string): number {
  const jokePatterns = [
    /needs \$1000/i,  // Ridiculous funding amounts
    /in a weekend/i,  // Unrealistic timelines
    /for dogs/i,      // Common joke topics
    /but for X/i,     // "X but for Y" pattern
    /AI-powered toaster/i, // Absurd combinations
    /rocket to mars/i, // Common joke scenarios
    /time machine/i,
    /teleport/i,
    /perpetual motion/i,
    /free energy/i
  ];
  
  return jokePatterns.some(pattern => pattern.test(pitch)) ? 8 : 2;
}

// Feasibility check
function checkFeasibility(pitch: string): number {
  const impossibleKeywords = [
    'mars', 'rocket', 'teleport', 'time travel',
    'perpetual motion', 'free energy', 'teleportation',
    'infinite energy', 'faster than light', 'quantum computing for',
    'cold fusion', 'anti-gravity'
  ];
  
  return impossibleKeywords.some(keyword => 
    pitch.toLowerCase().includes(keyword)
  ) ? 1 : 5;
}

// Novelty check
function checkNovelty(pitch: string): number {
  const commonPatterns = [
    'social network',
    'AI-powered',
    'blockchain',
    'Uber for',
    'Tinder for',
    'marketplace for',
    'platform for',
    'app for',
    'website for',
    'service for'
  ];
  
  return commonPatterns.some(pattern => 
    pitch.toLowerCase().includes(pattern)
  ) ? 3 : 6;
}

// Cache for development scores
interface CachedScore {
  score: number;
  timestamp: number;
}
const developmentCache = new Map<string, CachedScore>();

// Function to analyze development using GPT
async function analyzeDevelopmentWithGPT(pitch: string): Promise<number> {
  // Check cache first
  const cached = developmentCache.get(pitch);
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    return cached.score;
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a business analyst evaluating pitch ideas. Return ONLY a number from 1-10.'
        },
        {
          role: 'user',
          content: DEVELOPMENT_PROMPT.replace('{pitch}', pitch)
        }
      ],
      temperature: 0.3,
      max_tokens: 10
    });

    const score = parseInt(response.choices[0]?.message?.content || '5');
    
    // Validate score is between 1-10
    const validatedScore = Math.min(Math.max(score, 1), 10);
    
    // Cache the result
    developmentCache.set(pitch, {
      score: validatedScore,
      timestamp: Date.now()
    });

    return validatedScore;
  } catch (error) {
    console.error('GPT analysis failed:', error);
    // Fallback to word count analysis
    return analyzeLength(pitch);
  }
}

// Update analyzePitch to be async and use GPT analysis
export async function analyzePitch(pitch: string): Promise<PitchAnalysis> {
  const words = pitch.toLowerCase().split(/\s+/);
  
  // Calculate scores
  const jokeScore = detectJokePatterns(pitch);
  const noveltyScore = checkNovelty(pitch);
  const feasibilityScore = checkFeasibility(pitch);
  const developmentScore = await analyzeDevelopmentWithGPT(pitch);

  // Log results
  const logPath = path.join(process.cwd(), 'pitch-scores.log');
  const logEntry = `[Pitch Analysis] "${pitch}": {
    jokeScore: ${jokeScore},
    developmentScore: ${developmentScore},
    feasibilityScore: ${feasibilityScore},
    noveltyScore: ${noveltyScore}
  }\n`;
  fs.appendFileSync(logPath, logEntry);

  return {
    jokeScore,
    developmentScore,
    feasibilityScore,
    noveltyScore
  };
}

// Test cases
export const testCases = [
  {
    pitch: "waffle stand",
    expected: {
      jokeScore: 2,
      developmentScore: 9,
      feasibilityScore: 8,
      noveltyScore: 3
    }
  },
  {
    pitch: "send a man to mars, needs $1000 in startup funding",
    expected: {
      jokeScore: 8,
      developmentScore: 7,
      feasibilityScore: 1,
      noveltyScore: 3
    }
  },
  {
    pitch: "AI-powered toaster that writes poetry",
    expected: {
      jokeScore: 8,
      developmentScore: 6,
      feasibilityScore: 5,
      noveltyScore: 8
    }
  },
  {
    pitch: "B2B SaaS platform for enterprise AI integration with real-time analytics and customizable dashboards",
    expected: {
      jokeScore: 2,
      developmentScore: 3,
      feasibilityScore: 6,
      noveltyScore: 4
    }
  }
]; 