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
  if (watercoolerPairConfig && Math.random() < watercoolerPairConfig.probability) {
    const slots: (string | null)[] = Array(count).fill(null);
    const assigned = new Set<string>();
    
    // Always enforce second speaker if specified
    if (watercoolerPairConfig.order.second) {
      slots[1] = watercoolerPairConfig.order.second;
      assigned.add(watercoolerPairConfig.order.second);
    }
    
    // Then handle first speaker
    if (watercoolerPairConfig.order.first !== 'any') {
      slots[0] = watercoolerPairConfig.order.first;
      assigned.add(watercoolerPairConfig.order.first);
    }
    
    // Fill remaining slots with random characters not already assigned
    for (let i = 0; i < slots.length; i++) {
      if (!slots[i]) {
        const available = ceos.filter(c => !assigned.has(c.id));
        const pick = available[Math.floor(Math.random() * available.length)];
        slots[i] = pick.id;
        assigned.add(pick.id);
      }
    }
    return slots as string[];
  }
  // Otherwise use random selection, ensuring uniqueness
  return [...ceos]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map((c: CEO) => c.id);
} 