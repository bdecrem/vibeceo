// Fun slug generation for WEBTOYS users
// Matches the SMS bot's slug generation for consistency

// Dictionaries for generating fun slugs
const COLORS = [
  "golden", "crimson", "azure", "emerald", "violet", "silver", "cobalt", "amber",
  "coral", "indigo", "jade", "ruby", "sapphire", "onyx", "pearl", "bronze",
  "copper", "ivory", "scarlet", "teal", "magenta", "navy", "olive", "maroon"
];

const ANIMALS = [
  "fox", "owl", "wolf", "bear", "eagle", "lion", "tiger", "dragon", "phoenix",
  "raven", "hawk", "falcon", "panther", "jaguar", "lynx", "otter", "beaver",
  "badger", "raccoon", "squirrel", "rabbit", "deer", "moose", "elk", "bison"
];

const ACTIONS = [
  "dancing", "flying", "running", "jumping", "swimming", "singing", "playing",
  "dreaming", "thinking", "creating", "building", "exploring", "discovering",
  "learning", "teaching", "sharing", "helping", "growing", "flowing", "glowing"
];

/**
 * Generate a fun slug like "golden-fox-dancing"
 * Matches the SMS bot's generateFunSlug function
 */
export function generateFunSlug(): string {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  return `${color}-${animal}-${action}`;
}