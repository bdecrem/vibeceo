// Topic abbreviation to full search terms mapping
export const TOPIC_MAPPINGS: Record<string, string[]> = {
  // AI & Machine Learning
  ai: ["artificial-intelligence", "machine-learning", "ai"],
  ml: ["machine-learning", "artificial-intelligence", "deep-learning"],
  dl: ["deep-learning", "neural-networks", "machine-learning"],
  nlp: ["natural-language-processing", "nlp", "language-models"],
  cv: ["computer-vision", "image-processing", "opencv"],
  rl: ["reinforcement-learning", "deep-reinforcement-learning"],
  llm: ["large-language-models", "llm", "language-models"],
  gpt: ["gpt", "language-models", "openai"],

  // Programming Languages
  js: ["javascript", "nodejs", "typescript"],
  ts: ["typescript", "javascript"],
  py: ["python", "python3"],
  go: ["golang", "go"],
  rs: ["rust", "rust-lang"],

  // Development Areas
  db: ["database", "sql", "nosql"],
  api: ["api", "rest-api", "graphql"],
  web: ["web-development", "frontend", "backend"],
  frontend: ["frontend", "react", "vue", "angular"],
  backend: ["backend", "nodejs", "api"],
  mobile: ["mobile-development", "ios", "android"],
  devops: ["devops", "ci-cd", "kubernetes"],
  security: ["security", "cybersecurity", "infosec"],
  blockchain: ["blockchain", "cryptocurrency", "web3"],
  cloud: ["cloud", "aws", "azure", "gcp"],

  // Frameworks & Tools
  react: ["react", "reactjs", "nextjs"],
  vue: ["vue", "vuejs", "nuxt"],
  docker: ["docker", "containers", "kubernetes"],
  k8s: ["kubernetes", "k8s", "docker"],
};

/**
 * Expand a topic into search terms
 * Maps common abbreviations to full terms for better search results
 */
export function expandTopicToSearchTerms(topic: string): string {
  const normalized = topic.toLowerCase().trim();

  // If we have a mapping, use it (max 3 terms to stay under GitHub's OR limit)
  if (TOPIC_MAPPINGS[normalized]) {
    return TOPIC_MAPPINGS[normalized].slice(0, 3).join(" OR ");
  }

  // Otherwise, create basic variations
  return `${topic} OR ${topic}-tools OR awesome-${topic}`;
}
