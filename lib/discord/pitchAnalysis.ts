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

// New GPT-based analysis interface
export interface GPTAnalysis {
  joke_level: number;
  development: number;
  quality: number;
  novelty: number;
  rationale: {
    joke_level: string;
    development: string;
    quality: string;
    novelty: string;
  };
}

// Original interface maintained for backward compatibility
export interface PitchAnalysis {
  jokeScore: number;      // 1-10: How much is this a joke?
  developmentScore: number; // 1-10: How well developed is the idea?
  feasibilityScore: number; // 1-10: How feasible is the execution?
  noveltyScore: number;    // 1-10: How novel/unique is the idea?
  
  // New GPT-based analysis
  gptAnalysis?: GPTAnalysis;
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

// Update the GPT analysis prompt template
const GPT_ANALYSIS_PROMPT = `You are an expert startup analyst. For any startup pitch, you will evaluate four things on a scale from 1 to 10:

1. Joke Level – How humorous, satirical, or unserious this pitch is
2. Development – How fleshed out and clearly articulated the idea is
3. Quality – How strong the idea is in terms of viability, market potential, and founder credibility
4. Novelty – How unique or original the concept is

Respond with ONLY a JSON object in this exact format:
{
  "joke_level": number,
  "development": number,
  "quality": number,
  "novelty": number,
  "rationale": {
    "joke_level": "one sentence explanation",
    "development": "one sentence explanation",
    "quality": "one sentence explanation",
    "novelty": "one sentence explanation"
  }
}`;

// Cache for GPT analysis
interface CachedGPTAnalysis {
  analysis: GPTAnalysis;
  timestamp: number;
}
const gptAnalysisCache = new Map<string, CachedGPTAnalysis>();

// Function to analyze pitch using GPT
async function analyzePitchWithGPT(pitch: string): Promise<GPTAnalysis> {
  // Check cache first
  const cached = gptAnalysisCache.get(pitch);
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    return cached.analysis;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: GPT_ANALYSIS_PROMPT
        },
        {
          role: "user",
          content: pitch
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in GPT response');
    }

    const analysis = JSON.parse(content) as GPTAnalysis;
    
    // Validate scores are between 1-10
    const validatedAnalysis = {
      joke_level: Math.min(Math.max(analysis.joke_level, 1), 10),
      development: Math.min(Math.max(analysis.development, 1), 10),
      quality: Math.min(Math.max(analysis.quality, 1), 10),
      novelty: Math.min(Math.max(analysis.novelty, 1), 10),
      rationale: analysis.rationale
    };
    
    // Cache the result
    gptAnalysisCache.set(pitch, {
      analysis: validatedAnalysis,
      timestamp: Date.now()
    });

    return validatedAnalysis;
  } catch (error) {
    console.error('GPT analysis failed:', error);
    // Fallback to basic analysis
    return {
      joke_level: detectJokePatterns(pitch),
      development: analyzeLength(pitch),
      quality: 5,
      novelty: checkNovelty(pitch),
      rationale: {
        joke_level: "Fallback analysis due to GPT error",
        development: "Fallback analysis due to GPT error",
        quality: "Fallback analysis due to GPT error",
        novelty: "Fallback analysis due to GPT error"
      }
    };
  }
}

// Update analyzePitch function
export async function analyzePitch(pitch: string): Promise<PitchAnalysis> {
  // Get GPT analysis
  const gptAnalysis = await analyzePitchWithGPT(pitch);
  
  // Map GPT scores to original scores for backward compatibility
  const analysis: PitchAnalysis = {
    jokeScore: gptAnalysis.joke_level,
    developmentScore: gptAnalysis.development,
    feasibilityScore: gptAnalysis.quality,
    noveltyScore: gptAnalysis.novelty,
    gptAnalysis
  };

  // Log results
  const logPath = path.join(process.cwd(), 'pitch-scores.log');
  const logEntry = `[Pitch Analysis] "${pitch}": ${JSON.stringify(analysis, null, 2)}\n`;
  fs.appendFileSync(logPath, logEntry);

  return analysis;
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