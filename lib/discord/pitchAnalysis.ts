// Pitch analysis module for categorizing and scoring pitches

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

// Main analysis function
export function analyzePitch(pitch: string): PitchAnalysis {
  return {
    jokeScore: detectJokePatterns(pitch),
    developmentScore: analyzeLength(pitch),
    feasibilityScore: checkFeasibility(pitch),
    noveltyScore: checkNovelty(pitch)
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