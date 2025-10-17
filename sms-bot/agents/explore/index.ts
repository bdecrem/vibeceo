import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const DEFAULT_PYTHON_CANDIDATES =
  process.platform === "win32"
    ? ["python", "python3.11", "python3"]
    : ["python3.11", "python3", "python"];

const PYTHON_BIN = resolvePythonBin();

function resolvePythonBin(): string {
  const candidates = [
    process.env.EXPLORE_AGENT_PYTHON_BIN,
    process.env.PYTHON_BIN,
    ...DEFAULT_PYTHON_CANDIDATES,
  ]
    .filter((value): value is string => Boolean(value))
    .filter((value, index, array) => array.indexOf(value) === index);

  for (const candidate of candidates) {
    try {
      const check = spawnSync(candidate, ["--version"], {
        cwd: process.cwd(),
        env: process.env,
        stdio: "ignore",
      });

      if (!check.error && check.status === 0) {
        return candidate;
      }
    } catch (error) {
      // Ignore and continue checking other candidates
    }
  }

  return candidates[0] ?? DEFAULT_PYTHON_CANDIDATES[DEFAULT_PYTHON_CANDIDATES.length - 1];
}
const RUNNER_PATH = path.join(process.cwd(), "agents", "explore", "runner.py");
const STATE_ROOT =
  process.env.EXPLORE_AGENT_STATE_DIR ||
  path.join(process.cwd(), "data", "explore-sessions");
const DEFAULT_TIMEOUT_MS = Number(
  process.env.EXPLORE_AGENT_TIMEOUT_MS || 120000
);

export interface ExploreAgentState {
  last_city?: string;
  last_mode?: string;
  last_filters?: Record<string, string>;
}

export interface ExploreAgentSuccess {
  ok: true;
  message: string;
  state: ExploreAgentState;
  stderr?: string;
}

export interface ExploreAgentFailure {
  ok: false;
  error: string;
  stderr?: string;
}

export type ExploreAgentResult = ExploreAgentSuccess | ExploreAgentFailure;

export function getExploreStatePath(identifier: string): string {
  const hash = createHash("sha1").update(identifier).digest("hex");
  return path.join(STATE_ROOT, `${hash}.json`);
}

function parseAgentJson(raw: string): ExploreAgentResult {
  try {
    const parsed = JSON.parse(raw) as ExploreAgentResult &
      Partial<{ message: string; state: ExploreAgentState; error: string }>;

    if (parsed && typeof parsed === "object" && parsed.ok === true) {
      return {
        ok: true,
        message: parsed.message || "",
        state: parsed.state || {},
      };
    }

    const error =
      typeof parsed?.error === "string" && parsed.error.trim()
        ? parsed.error
        : "Explore agent returned an unknown error.";

    return {
      ok: false,
      error,
    };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to parse explore agent output: ${(error as Error).message}`,
    };
  }
}

export async function runExploreAgent(
  command: string,
  statePath: string,
  options: { timeoutMs?: number } = {}
): Promise<ExploreAgentResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const args = [RUNNER_PATH, "--command", command];

  if (statePath) {
    args.push("--state-path", statePath);
  }

  return new Promise((resolve) => {
    const subprocess = spawn(PYTHON_BIN, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let completed = false;

    const finalize = (result: ExploreAgentResult) => {
      if (completed) {
        return;
      }
      completed = true;
      if (!result.ok) {
        result.stderr = stderr || undefined;
      } else if (stderr) {
        result.stderr = stderr;
      }
      resolve(result);
    };

    subprocess.stdout.setEncoding("utf-8");
    subprocess.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    subprocess.stderr.setEncoding("utf-8");
    subprocess.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    const timer = setTimeout(() => {
      subprocess.kill();
      finalize({
        ok: false,
        error: `Explore agent timed out after ${timeoutMs}ms`,
      });
    }, timeoutMs);

    subprocess.on("error", (error) => {
      clearTimeout(timer);
      finalize({
        ok: false,
        error: `Failed to start explore agent: ${error.message}`,
      });
    });

    subprocess.on("close", () => {
      clearTimeout(timer);
      const trimmed = stdout.trim();
      if (!trimmed) {
        finalize({
          ok: false,
          error: "Explore agent did not return any output.",
        });
        return;
      }

      finalize(parseAgentJson(trimmed));
    });
  });
}



