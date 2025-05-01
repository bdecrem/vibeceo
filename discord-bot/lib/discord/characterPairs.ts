import { ceos, CEO } from '../../data/ceos.js';

interface CharacterPairConfig {
  coach1: string;  // First speaker
  coach2: string;  // Second speaker
  probability: number;  // 0-1 probability of them appearing together
  order: {
    first: string;  // ID of coach who should speak first
    second: string; // ID of coach who should speak second
  };
}

// Default to empty config (full random selection)
let watercoolerPairConfig: CharacterPairConfig | null = null;

export function setWatercoolerPairConfig(config: CharacterPairConfig | null) {
  watercoolerPairConfig = config;
}

export function getWatercoolerPairConfig(): CharacterPairConfig | null {
  return watercoolerPairConfig;
}

export function getRandomCharactersWithPairConfig(count: number): string[] {
  // If we have a pair config and random number is less than probability
  if (watercoolerPairConfig && Math.random() < watercoolerPairConfig.probability) {
    // Force include both coaches in the correct order
    const selected = [
      watercoolerPairConfig.order.first,  // First speaker
      watercoolerPairConfig.order.second, // Second speaker
    ];
    
    // Fill remaining slots randomly
    const remainingCoaches = ceos.filter((c: CEO) => {
      const config = watercoolerPairConfig!; // We know it's not null here due to the if check above
      return c.id !== config.coach1 && c.id !== config.coach2;
    });
    while (selected.length < count) {
      const randomCoach = remainingCoaches[Math.floor(Math.random() * remainingCoaches.length)];
      if (!selected.includes(randomCoach.id)) {
        selected.push(randomCoach.id);
      }
    }
    return selected;
  }
  
  // Otherwise use random selection
  return [...ceos]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((c: CEO) => c.id);
} 