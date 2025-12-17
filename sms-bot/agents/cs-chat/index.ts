/**
 * CS Chat Agent - TypeScript Orchestrator
 *
 * Runs Python agent with Claude Agent SDK for agentic search
 * over the CS (Content Sharing) link repository.
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Python scripts are in source directory, not dist
const PYTHON_SCRIPTS_DIR = __dirname.includes("/dist/")
  ? path.join(__dirname.replace("/dist/", "/"), "../../agents/cs-chat")
  : __dirname;

export interface CSChatResult {
  answer: string;
  toolCalls?: number;
}

/**
 * Run CS chat using Claude Agent SDK
 *
 * @param question User's natural language question
 * @returns Answer and metadata
 */
export async function runCSChat(question: string): Promise<CSChatResult> {
  console.log("[CS Chat] Starting query:", question);

  // Use system Python
  const pythonPath = process.env.PYTHON_BIN || "python3";
  const agentScript = path.join(PYTHON_SCRIPTS_DIR, "agent.py");

  console.log("[CS Chat] Python path:", pythonPath);
  console.log("[CS Chat] Agent script:", agentScript);

  // Prepare input for agent
  const agentInput = { question };

  // Environment for Python process - pass all env vars
  const sdkToken =
    process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.CLAUDE_CODE_OAUTH_TOKEN;

  // Build env from process.env, filtering out undefined values
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  // Override specific values
  if (sdkToken) {
    env.CLAUDE_CODE_OAUTH_TOKEN = sdkToken;
  }

  // Log what we're passing (masked)
  console.log("[CS Chat] Env check - SUPABASE_URL:", env.SUPABASE_URL ? "SET" : "MISSING");
  console.log("[CS Chat] Env check - SUPABASE_SERVICE_KEY:", env.SUPABASE_SERVICE_KEY ? "SET" : "MISSING");
  console.log("[CS Chat] Env check - ANTHROPIC_API_KEY:", env.ANTHROPIC_API_KEY ? "SET" : "MISSING");

  return new Promise((resolve, reject) => {
    const proc = spawn(
      pythonPath,
      [agentScript, "--input", JSON.stringify(agentInput)],
      { env }
    );

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
      // Always log stderr for debugging
      console.log("[CS Chat stderr]:", data.toString().trim());
    });

    proc.on("close", (code) => {
      if (code === 0) {
        const answer = stdout.trim();
        if (answer) {
          console.log("[CS Chat] Response generated successfully");
          resolve({ answer });
        } else {
          console.error("[CS Chat] Empty response from agent");
          reject(new Error("Agent returned empty response"));
        }
      } else {
        console.error("[CS Chat] Process exited with code", code);
        console.error("[CS Chat] stderr:", stderr);
        reject(new Error(`Agent failed with code ${code}: ${stderr}`));
      }
    });

    proc.on("error", (error) => {
      console.error("[CS Chat] Process error:", error);
      reject(error);
    });

    // Timeout after 2 minutes
    const timeout = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("Agent timeout after 120 seconds"));
    }, 120000);

    proc.on("exit", () => {
      clearTimeout(timeout);
    });
  });
}
