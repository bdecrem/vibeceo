import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, ".env.local") });

import {
  handleGitHubTrending,
  handleGitHubRepo,
  handleGitHubSearch,
} from "./dist/agents/github-insights/agent.js";

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

function log(color, label, message) {
  console.log(`\n${color}${colors.bright}${label}${colors.reset}`);
  console.log(`${color}${"=".repeat(60)}${colors.reset}`);
  console.log(message);
  console.log(`${color}${"=".repeat(60)}${colors.reset}\n`);
}

async function runTests() {
  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║          GitHub Insights Agent - Test Suite               ║
║              (User-Facing Output Only)                     ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Test 1: General trending
  log(colors.green, "📊 TEST 1: General Trending", "Command: trending");
  try {
    const result = await handleGitHubTrending();
    console.log(result);
  } catch (error) {
    console.error(`${colors.red}❌ Failed${colors.reset}`);
  }

  await delay(2000);

  // Test 2: AI trending
  log(colors.green, "🤖 TEST 2: AI Trending", "Command: trending ai");
  try {
    const result = await handleGitHubTrending("ai");
    console.log(result);
  } catch (error) {
    console.error(`${colors.red}❌ Failed${colors.reset}`);
  }

  await delay(2000);

  // Test 3: React trending
  log(colors.green, "⚛️  TEST 3: React Trending", "Command: trending react");
  try {
    const result = await handleGitHubTrending("react");
    console.log(result);
  } catch (error) {
    console.error(`${colors.red}❌ Failed${colors.reset}`);
  }

  await delay(2000);

  // Test 4: Repo with owner/name format
  log(
    colors.blue,
    "📦 TEST 4: Repo Info (Simple Format)",
    "Command: repo facebook/react"
  );
  try {
    const result = await handleGitHubRepo("facebook/react");
    console.log(result);
  } catch (error) {
    console.error(`${colors.red}❌ Failed${colors.reset}`);
  }

  await delay(2000);

  // Test 5: Repo with full URL
  log(
    colors.blue,
    "📦 TEST 5: Repo Info (Full URL)",
    "Command: repo https://github.com/microsoft/vscode"
  );
  try {
    const result = await handleGitHubRepo(
      "https://github.com/microsoft/vscode"
    );
    console.log(result);
  } catch (error) {
    console.error(`${colors.red}❌ Failed${colors.reset}`);
  }

  await delay(2000);

  // Test 6: Repo with github.com URL
  log(
    colors.blue,
    "📦 TEST 6: Repo Info (GitHub.com URL)",
    "Command: repo github.com/vercel/next.js"
  );
  try {
    const result = await handleGitHubRepo("github.com/vercel/next.js");
    console.log(result);
  } catch (error) {
    console.error(`${colors.red}❌ Failed${colors.reset}`);
  }

  await delay(2000);

  // Test 7: Search
  log(
    colors.yellow,
    "🔍 TEST 7: Search AI Tools",
    "Command: search repos ai chatbot"
  );
  try {
    const result = await handleGitHubSearch("ai chatbot");
    console.log(result);
  } catch (error) {
    console.error(`${colors.red}❌ Failed${colors.reset}`);
  }

  await delay(2000);

  // Test 8: Invalid repo
  log(
    colors.cyan,
    "🧪 TEST 8: Invalid Repository",
    "Command: repo invalid/doesnotexist123456"
  );
  try {
    const result = await handleGitHubRepo("invalid/doesnotexist123456");
    console.log(result);
  } catch (error) {
    console.error(`${colors.red}❌ Failed${colors.reset}`);
  }

  console.log(`${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════╗
║                  All Tests Complete! ✅                    ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`${colors.bright}
📋 Features Tested:
${colors.green}✓ Trending repos (general, ai, react)
${colors.blue}✓ Repository info with 3 formats:
  - owner/repo (facebook/react)
  - https://github.com/owner/repo
  - github.com/owner/repo
${colors.yellow}✓ Search functionality
${colors.cyan}✓ Error handling
${colors.reset}
`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run all tests
runTests().catch((error) => {
  console.error(
    `${colors.red}${colors.bright}Fatal error:`,
    error,
    colors.reset
  );
  process.exit(1);
});
