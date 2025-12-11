import {
  createSdkMcpServer,
  Options,
  query,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { expandTopicToSearchTerms } from "./topic-mappings.js";

// GitHub API configuration
const GITHUB_API_BASE = "https://api.github.com";

// Load prompts from files (will be created during build)
const loadPrompt = (filename: string): string => {
  try {
    return readFileSync(
      join(process.cwd(), "dist", "content", "github-insights", filename),
      "utf8"
    );
  } catch (error) {
    console.warn(`Could not load prompt file ${filename}, using fallback`);
    return getFallbackPrompt(filename);
  }
};

// Fallback prompts (for development/testing)
const getFallbackPrompt = (filename: string): string => {
  const prompts: Record<string, string> = {
    "trending-prompt.txt": `Help developers discover tools that solve real problems.
Explain benefits, not metrics. Plain language. Include URLs.`,
    "repo-prompt.txt": `Tell if this repo is worth their time.
Simple language. Include URL.`,
    "search-prompt.txt": `Help them choose the best option.
Focus on which solves their problem best.`,
  };
  return prompts[filename] || "Help developers find useful tools.";
};

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  language: string;
  created_at: string;
  pushed_at: string;
  open_issues_count?: number;
  forks_count?: number;
  owner?: {
    login: string;
    type: string;
  };
  topics?: string[];
}

// Helper to clean markdown from text
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*+/g, "")
    .replace(/#+\s*/g, "")
    .replace(/^[-•]\s*/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`+/g, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Extract owner/repo from various GitHub URL formats
function parseGitHubUrl(input: string): string | null {
  // Already in owner/repo format
  if (/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(input)) {
    return input;
  }

  // Try to extract from URL
  const patterns = [
    /github\.com\/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/, // github.com/owner/repo
    /https?:\/\/github\.com\/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/, // https://github.com/owner/repo
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      // Remove trailing slashes, .git, etc
      return match[1]
        .replace(/\.git$/, "")
        .replace(/\/$/, "")
        .split(/[?#]/)[0];
    }
  }

  return null;
}

// Fetch trending repositories
async function fetchTrendingRepos(
  topic?: string,
  limit: number = 20
): Promise<string> {
  try {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const dateStr = date.toISOString().split("T")[0];

    let searchQuery = `created:>${dateStr} sort:stars`;

    if (topic) {
      // Use smart topic expansion from mappings
      const expandedTerms = expandTopicToSearchTerms(topic);
      searchQuery = `(${expandedTerms}) ${searchQuery}`;
    }

    const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(
      searchQuery
    )}&per_page=${limit}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Kochi-SMS-Bot",
      },
    });

    if (!response.ok) {
      console.error("GitHub API error:", response.status); // Keep errors
      return "Unable to fetch trending repositories.";
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return topic
        ? `No trending ${topic} repositories found. Try a different search term.`
        : "No trending repositories found.";
    }

    const repos = data.items
      .map((repo: GitHubRepo) => {
        const hoursSinceCreation = Math.floor(
          (Date.now() - new Date(repo.created_at).getTime()) / (1000 * 60 * 60)
        );
        const starsPerHour = Math.round(
          repo.stargazers_count / Math.max(hoursSinceCreation, 1)
        );

        return `[${repo.full_name}, ${
          repo.stargazers_count
        } stars, ${starsPerHour} stars/hour, ${repo.language || "N/A"}, by ${
          repo.owner?.login
        }, ${repo.description || "No description"}, URL: github.com/${
          repo.full_name
        }]`;
      })
      .join("\n");

    return repos;
  } catch (error) {
    console.error("Error fetching GitHub trending:", error);
    return "Failed to fetch trending repositories.";
  }
}

// Fetch specific repository information
async function fetchRepoInfo(repoPath: string): Promise<string> {
  try {
    const repoUrl = `${GITHUB_API_BASE}/repos/${repoPath}`;
    const issuesUrl = `${GITHUB_API_BASE}/repos/${repoPath}/issues?state=open&per_page=5&sort=comments`;
    const prsUrl = `${GITHUB_API_BASE}/repos/${repoPath}/pulls?state=open&per_page=5&sort=updated`;
    const releasesUrl = `${GITHUB_API_BASE}/repos/${repoPath}/releases?per_page=1`;

    const [repoRes, issuesRes, prsRes, releasesRes] = await Promise.all([
      fetch(repoUrl, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Kochi-SMS-Bot",
        },
      }),
      fetch(issuesUrl, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Kochi-SMS-Bot",
        },
      }),
      fetch(prsUrl, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Kochi-SMS-Bot",
        },
      }),
      fetch(releasesUrl, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Kochi-SMS-Bot",
        },
      }),
    ]);

    if (!repoRes.ok) {
      return `Repository ${repoPath} not found or inaccessible.`;
    }

    const repoData = await repoRes.json();
    const issues = issuesRes.ok ? await issuesRes.json() : [];
    const prs = prsRes.ok ? await prsRes.json() : [];
    const releases = releasesRes.ok ? await releasesRes.json() : [];

    let result = `Repository: ${repoData.full_name}\n`;
    result += `URL: github.com/${repoData.full_name}\n`;
    result += `Stars: ${repoData.stargazers_count}, Forks: ${repoData.forks_count}, Open Issues: ${repoData.open_issues_count}\n`;
    result += `Language: ${repoData.language || "Multiple"}\n`;
    result += `Description: ${repoData.description || "No description"}\n`;
    result += `Created: ${repoData.created_at}, Last Push: ${repoData.pushed_at}\n`;
    result += `Topics: ${repoData.topics?.join(", ") || "None"}\n`;

    if (releases.length > 0) {
      result += `Latest Release: ${
        releases[0].name || releases[0].tag_name
      } (${new Date(releases[0].published_at).toLocaleDateString()})\n`;
    }

    if (issues.length > 0) {
      result += `\nHot Issues:\n`;
      issues.slice(0, 3).forEach((issue: any) => {
        result += `Issue ${issue.number}: ${issue.title}, ${issue.comments} comments, by ${issue.user.login}\n`;
      });
    }

    if (prs.length > 0) {
      result += `\nActive Pull Requests:\n`;
      prs.slice(0, 3).forEach((pr: any) => {
        result += `PR ${pr.number}: ${pr.title}, by ${pr.user.login}\n`;
      });
    }

    return result;
  } catch (error) {
    console.error("Error fetching repo info:", error);
    return "Failed to fetch repository information.";
  }
}

// Search GitHub repositories
async function searchGitHub(searchQuery: string): Promise<string> {
  try {
    const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(
      searchQuery
    )}&per_page=15&sort=stars&order=desc`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Kochi-SMS-Bot",
      },
    });

    if (!response.ok) {
      return "Search failed. Please try again.";
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return `No repositories found for "${searchQuery}".`;
    }

    const repos = data.items
      .map((repo: GitHubRepo) => {
        return `[${repo.full_name}, ${repo.stargazers_count} stars, ${
          repo.language || "N/A"
        }, ${repo.description || "No description"}, URL: github.com/${
          repo.full_name
        }]`;
      })
      .join("\n");

    return repos;
  } catch (error) {
    console.error("Error searching GitHub:", error);
    return "Search failed.";
  }
}

// Create MCP server with all tools
const githubMcpServer = createSdkMcpServer({
  name: "github_mcp_tool",
  version: "1.0.0",
  tools: [
    tool(
      "fetch_trending",
      "Fetch trending GitHub repositories",
      {
        topic: z
          .string()
          .optional()
          .describe("Optional topic to filter trending repositories"),
      },
      async (args: any) => {
        const topic = args?.topic;
        const response = await fetchTrendingRepos(topic, 20);
        return {
          content: [{ type: "text", text: response }],
        };
      }
    ),
    tool(
      "fetch_repo_info",
      "Fetch detailed information about a specific repository",
      {
        repo: z.string().describe("Repository in owner/repo format"),
      },
      async (args: any) => {
        if (!args?.repo) {
          return {
            content: [
              { type: "text", text: "Provide repository in owner/repo format" },
            ],
          };
        }
        const response = await fetchRepoInfo(args.repo);
        return {
          content: [{ type: "text", text: response }],
        };
      }
    ),
    tool(
      "search_repos",
      "Search GitHub repositories",
      {
        query: z.string().describe("Search query for repositories"),
      },
      async (args: any) => {
        if (!args?.query) {
          return {
            content: [{ type: "text", text: "Provide search query" }],
          };
        }
        const response = await searchGitHub(args.query);
        return {
          content: [{ type: "text", text: response }],
        };
      }
    ),
  ],
});

// USER-FOCUSED HANDLER FOR TRENDING
export async function handleGitHubTrending(topic?: string): Promise<string> {
  try {
    const repoData = await fetchTrendingRepos(topic, 20);

    if (repoData.includes("No trending")) {
      return repoData;
    }

    // USER-FOCUSED prompt - solve real problems
    const agenticPrompt = `You're helping a developer friend discover tools that will actually improve their work.

Analyze these repos and explain in SIMPLE, FRIENDLY terms:
- What real problem does each solve? (not what it is, but what pain it fixes)
- Why should someone care? (practical benefit, not hype)
- Who needs this most?

${
  topic
    ? `Focus on what ${topic} developers actually struggle with daily.`
    : "Focus on universal developer pain points everyone faces."
}

Rules:
- Under 450 chars total
- NO technical jargon or metrics (stars mean nothing to users)
- Write like you're texting a friend who just started coding
- Include github.com URLs for 2-3 best tools
- Make them think "finally, something that helps with that annoying problem!"

Good example:
"Tired of PDFs you can't search? reader3 lets you chat with any document: github.com/karpathy/reader3. And if npm takes forever, pnpm is 3x faster with less disk space: github.com/pnpm/pnpm"

Bad example (never do this):
"reader3 has 1000 stars and uses LLMs for document processing"

Repository data to analyze:
${repoData}`;

    const response = await query({
      prompt: agenticPrompt,
      options: {
        model: "claude-sonnet-4-5",
        mcpServers: {},
        allowedTools: [],
        systemPrompt: `You help developers find tools that solve their actual daily problems.
Talk like a helpful friend, not a tech blogger.
Focus on practical benefits, not technical specs.
Make developers excited to try these tools.`,
      },
    });

    let result = "";
    for await (const message of response) {
      if ("result" in message && message.result) {
        result = String(message.result);
      }
      if ("text" in message && message.text) {
        result = String(message.text);
      }
    }

    result = cleanMarkdown(result);

    if (result.length > 500) {
      result = result.substring(0, 497) + "...";
    }

    if (!result.includes("github.com/")) {
      console.warn("Missing URLs in response, using fallback");
      const lines = repoData.split("\n").slice(0, 2);
      result = "Check out: ";
      lines.forEach((line) => {
        const match = line.match(/\[([^,]+).*URL: (.+?)\]/);
        if (match) result += `${match[1]} at ${match[2]}. `;
      });
    }

    return result;
  } catch (error) {
    console.error("[GitHub Agent] Trending failed:", error);
    return "Having trouble finding trending repos. Try again?";
  }
}

// USER-FOCUSED HANDLER FOR REPO INFO
export async function handleGitHubRepo(repoInput: string): Promise<string> {
  try {
    // Parse GitHub URL or owner/repo format
    const repoPath = parseGitHubUrl(repoInput);

    if (!repoPath) {
      return "Please provide a valid GitHub repo (owner/name or github.com/owner/name)";
    }

    const repoInfo = await fetchRepoInfo(repoPath);

    if (repoInfo.includes("not found")) {
      return `Can't find ${repoPath}. Check the name?`;
    }

    const agenticPrompt = `Someone wants to know if ${repoPath} is worth their time.

Answer in simple, friendly terms:
- What problem does it solve? (in plain English)
- Is it ready to use or still experimental?
- Who should use it?
- One compelling reason to try it

Under 200 chars, conversational tone, include github.com/${repoPath}
Focus on practical value, not technical details.

Repository info:
${repoInfo}`;

    const response = await query({
      prompt: agenticPrompt,
      options: {
        model: "claude-haiku-4-5",
        mcpServers: {},
        allowedTools: [],
        systemPrompt:
          "Help developers quickly decide if a tool is worth trying. Be practical and friendly.",
      },
    });

    let summary = "";
    for await (const message of response) {
      if ("result" in message && message.result) {
        summary = String(message.result);
      }
      if ("text" in message && message.text) {
        summary = String(message.text);
      }
    }

    summary = cleanMarkdown(summary);

    if (summary.length > 200) {
      summary = summary.substring(0, 197) + "...";
    }

    if (!summary.includes("github.com")) {
      summary += ` github.com/${repoPath}`;
    }

    return summary || `Check out ${repoPath}: github.com/${repoPath}`;
  } catch (error) {
    console.error("[GitHub Agent] Repo info failed:", error);
    return "Couldn't get repo details. Try again?";
  }
}

// USER-FOCUSED HANDLER FOR SEARCH
export async function handleGitHubSearch(searchQuery: string): Promise<string> {
  try {
    const searchResults = await searchGitHub(searchQuery);

    if (searchResults.includes("No repositories found")) {
      return `Nothing found for "${searchQuery}". Try different keywords?`;
    }

    const agenticPrompt = `Someone searched "${searchQuery}" because they need to solve a specific problem.

From these results, recommend 2-3 tools in friendly terms:
- Which is easiest to get started with?
- Which is most reliable for production?
- Any that solve the problem in a unique way?

Help them choose based on their needs, don't just list options.
Under 450 chars, conversational, include github.com URLs.

Search results:
${searchResults}`;

    const response = await query({
      prompt: agenticPrompt,
      options: {
        model: "claude-haiku-4-5",
        mcpServers: {},
        allowedTools: [],
        systemPrompt:
          "Help developers choose the right tool for their needs. Be practical and decisive.",
      },
    });

    let formatted = "";
    for await (const message of response) {
      if ("result" in message && message.result) {
        formatted = String(message.result);
      }
      if ("text" in message && message.text) {
        formatted = String(message.text);
      }
    }

    formatted = cleanMarkdown(formatted);

    if (formatted.length > 500) {
      formatted = formatted.substring(0, 497) + "...";
    }

    return formatted || searchResults;
  } catch (error) {
    console.error("[GitHub Agent] Search failed:", error);
    return "Search had issues. Try again?";
  }
}

// Main command router (keeping for compatibility)
export async function handleGitHubCommand(command: string): Promise<string> {
  const parts = command.trim().split(/\s+/);
  const subCommand = parts[0]?.toLowerCase();

  if (subCommand === "trending") {
    const topic = parts.slice(1).join(" ");
    return handleGitHubTrending(topic);
  } else if (subCommand === "repo" && parts[1]) {
    return handleGitHubRepo(parts[1]);
  } else if (subCommand === "search" && parts.length > 1) {
    const query = parts.slice(1).join(" ");
    return handleGitHubSearch(query);
  }

  return "Try: trending, repos owner/name, search repos <query>";
}
