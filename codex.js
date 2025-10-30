#!/usr/bin/env node
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const cwd = process.cwd();
const agentFile = path.join(cwd, "agents.md");
const tmpFile = path.join(os.tmpdir(), `codex-system-${Date.now()}.txt`);

let systemPrompt = "";
if (fs.existsSync(agentFile)) {
  systemPrompt = fs.readFileSync(agentFile, "utf8").trim();
  fs.writeFileSync(tmpFile, systemPrompt, "utf8");
  console.log("🧠 Loaded agents.md into Codex system prompt.");
} else {
  console.warn("⚠️ No agents.md found. Running without a system prompt.");
}

// 1) Resolve Codex command
const candidates = [
  process.env.CODEX_CMD,           // allow override, e.g. "codex run"
  "codex",
  "npx -y codex",
  "bunx codex",
  "pnpm dlx codex"
].filter(Boolean);

function tryRun(cmdStr, args, opts = {}) {
  // Split only the first token as binary; keep the rest as args
  const [bin, ...binArgs] = cmdStr.split(" ");
  const result = spawnSync(bin, [...binArgs, ...args], {
    stdio: "inherit",
    shell: false,
    ...opts
  });
  return result;
}

function exists(cmdStr) {
  const res = tryRun(cmdStr, ["--version"], { stdio: "ignore" });
  return res.status === 0;
}

const codexCmd = candidates.find(exists);
if (!codexCmd) {
  console.error(
    "❌ Could not find a working Codex CLI.\n" +
    "Set CODEX_CMD or install one of: codex | npx codex | bunx codex | pnpm dlx codex"
  );
  process.exit(1);
}

// 2) Try common flags for passing a system prompt
const flagTrials = [
  (f) => ["--system", fs.readFileSync(f, "utf8")], // pass content directly
  (f) => ["--system-file", f],                      // if CLI supports file
  (f) => ["--system-prompt", fs.readFileSync(f, "utf8")],
  (f) => ["--prompt", fs.readFileSync(f, "utf8")]   // generic prompt flag
];

let launched = false;
let lastStatus = 1;

for (const buildArgs of flagTrials) {
  const args = buildArgs(tmpFile);
  // If agents.md absent, run without system args
  const runArgs = systemPrompt ? args : [];
  const res = tryRun(codexCmd, runArgs);
  lastStatus = res.status;
  if (res.status === 0 || res.status === null) {
    launched = true;
    break;
  }
  console.log(`↩︎ Flag trial failed with exit code ${res.status}. Trying next…`);
}

if (!launched) {
  console.error(
    "❌ Unable to launch Codex with any known system prompt flag.\n" +
    "Tried: --system, --system-file, --system-prompt, --prompt\n" +
    "Tip: set CODEX_CMD to your exact invocation (e.g., 'codex run'),\n" +
    "or check 'codex --help' for the correct flag to set the system prompt."
  );
  process.exit(lastStatus || 1);
}