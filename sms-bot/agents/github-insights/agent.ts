import {
  createSdkMcpServer,
  Options,
  query,
  tool,
} from "@anthropic-ai/claude-agent-sdk";

// GitHub API configuration
const GITHUB_API_BASE = "https://api.github.com";

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
}

// Fetch trending repositories
async function fetchTrendingRepos(topic?: string): Promise<string> {
  try {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const dateStr = date.toISOString().split('T')[0];

    let searchQuery = `created:>${dateStr} sort:stars`;
    if (topic) {
      const topicMappings: Record<string, string> = {
        'ai': 'artificial-intelligence OR machine-learning OR llm OR gpt',
        'ml': 'machine-learning',
        'web3': 'blockchain OR crypto OR web3',
        'rust': 'language:rust',
        'python': 'language:python',
        'typescript': 'language:typescript',
        'javascript': 'language:javascript',
      };

      const mappedTopic = topicMappings[topic.toLowerCase()] || topic;
      searchQuery = `${mappedTopic} ${searchQuery}`;
    }

    const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(searchQuery)}&per_page=3`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Kochi-SMS-Bot'
      }
    });

    if (!response.ok) {
      return "Unable to fetch trending repositories.";
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return topic ? `No trending ${topic} repositories in the last 24 hours.` : "No trending repositories found.";
    }

    const repos = data.items.slice(0, 3).map((repo: GitHubRepo) => {
      return `[${repo.full_name}, ${repo.stargazers_count} stars, ${repo.description || 'No description'}, ${repo.html_url}]`;
    }).join("\n");

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
    const issuesUrl = `${GITHUB_API_BASE}/repos/${repoPath}/issues?state=open&per_page=3&sort=comments`;
    const prsUrl = `${GITHUB_API_BASE}/repos/${repoPath}/pulls?state=open&per_page=3&sort=updated`;

    const [repoRes, issuesRes, prsRes] = await Promise.all([
      fetch(repoUrl, { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Kochi-SMS-Bot' } }),
      fetch(issuesUrl, { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Kochi-SMS-Bot' } }),
      fetch(prsUrl, { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Kochi-SMS-Bot' } })
    ]);

    if (!repoRes.ok) {
      return `Repository ${repoPath} not found or inaccessible.`;
    }

    const repoData = await repoRes.json();
    const issues = issuesRes.ok ? await issuesRes.json() : [];
    const prs = prsRes.ok ? await prsRes.json() : [];

    // Format for LLM to summarize
    let result = `Repository: ${repoData.full_name}\n`;
    result += `Stars: ${repoData.stargazers_count}, Forks: ${repoData.forks_count}, Open Issues: ${repoData.open_issues_count}\n`;
    result += `Language: ${repoData.language || 'Multiple'}\n`;
    result += `Description: ${repoData.description || 'No description'}\n`;
    result += `Created: ${repoData.created_at}, Last Push: ${repoData.pushed_at}\n`;

    if (issues.length > 0) {
      result += `\nTop Issues:\n`;
      issues.slice(0, 3).forEach((issue: any) => {
        result += `[#${issue.number}: ${issue.title}, ${issue.comments} comments, by ${issue.user.login}]\n`;
      });
    }

    if (prs.length > 0) {
      result += `\nRecent Pull Requests:\n`;
      prs.slice(0, 3).forEach((pr: any) => {
        result += `[#${pr.number}: ${pr.title}, by ${pr.user.login}]\n`;
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
    const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(searchQuery)}&per_page=5&sort=stars&order=desc`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Kochi-SMS-Bot'
      }
    });

    if (!response.ok) {
      return "Search failed. Please try again.";
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return `No repositories found for "${searchQuery}".`;
    }

    const repos = data.items.slice(0, 5).map((repo: GitHubRepo) => {
      return `[${repo.full_name}, ${repo.stargazers_count} stars, ${repo.language || 'N/A'}, ${repo.description || 'No description'}]`;
    }).join("\n");

    return `Search results for "${searchQuery}":\n${repos}`;
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
    tool("fetch_trending", "Fetch trending GitHub repositories from the last 24 hours", {}, async (args) => {
      const response = await fetchTrendingRepos();
      return {
        content: [{ type: "text", text: response }],
      };
    }),
    tool("fetch_repo_info", "Fetch detailed information about a specific repository", {}, async (args) => {
      // Will be called with repo path from prompt
      return {
        content: [{ type: "text", text: "Provide repository in owner/repo format" }],
      };
    }),
    tool("search_repos", "Search GitHub repositories", {}, async (args) => {
      // Will be called with search query from prompt
      return {
        content: [{ type: "text", text: "Provide search query" }],
      };
    }),
  ],
});

// Agent options for trending
export const trendingAgentOptions: Options = {
  model: "claude-haiku-4-5",
  mcpServers: { github_mcp_tool: githubMcpServer },
  allowedTools: ["mcp__github_mcp_tool__fetch_trending"],
  systemPrompt: `
    You are a GitHub trending digest agent that curates the most important new repositories from the last 24 hours.
    You will receive repository data in format: [owner/name, star count, description, url]
    
    Create a concise SMS-friendly digest with EXACTLY 3 repositories.
    
    Format your response like this:
    ��� GitHub Trending
    
    1. owner/repo (⭐ X)
    One-sentence explanation of what it does.
    
    2. owner/repo (⭐ Y)  
    One-sentence explanation of what it does.
    
    3. owner/repo (⭐ Z)
    One-sentence explanation of what it does.
    
    Keep each summary under 100 characters for SMS.
  `,
};

// Handler for gh trending command
export async function handleGitHubTrending(topic?: string): Promise<string> {
  try {
    const prompt = topic
      ? `Get trending ${topic} repositories from GitHub`
      : "Get trending repositories from GitHub";

    const response = await query({
      prompt,
      options: trendingAgentOptions,
    });

    let lastResult: string | undefined;
    for await (const message of response) {
      if ("result" in message && message.result) {
        lastResult = String(message.result);
      }
      if ("text" in message && message.text) {
        lastResult = String(message.text);
      }
    }

    return lastResult?.trim() || "❌ Could not retrieve trending repositories.";
  } catch (error) {
    console.error("[GitHub Agent] Trending failed:", error);
    return "❌ GitHub trending search failed.";
  }
}

// Handler for gh repo command
export async function handleGitHubRepo(repoPath: string): Promise<string> {
  try {
    const repoInfo = await fetchRepoInfo(repoPath);

    if (repoInfo.includes("not found")) {
      return repoInfo;
    }

    // Use Claude to summarize the repo info for SMS
    const summaryOptions: Options = {
      model: "claude-haiku-4-5",
      mcpServers: {},
      allowedTools: [],
      systemPrompt: `
        Summarize this GitHub repository information for SMS in under 160 characters.
        Include: name, stars, main purpose, and mention if there are active issues/PRs.
        Be very concise but informative.
      `,
    };

    const response = await query({
      prompt: `Summarize this repository info for SMS:\n${repoInfo}`,
      options: summaryOptions,
    });

    let summary: string | undefined;
    for await (const message of response) {
      if ("result" in message && message.result) {
        summary = String(message.result);
      }
      if ("text" in message && message.text) {
        summary = String(message.text);
      }
    }

    // Also include top issues and PRs in a structured format
    const lines = repoInfo.split('\n');
    let result = summary || `��� ${repoPath}`;

    // Add key issues/PRs if present
    const issueStart = lines.findIndex(l => l.includes('Top Issues:'));
    const prStart = lines.findIndex(l => l.includes('Recent Pull Requests:'));

    if (issueStart > -1) {
      result += '\n\n��� Top Issues:';
      for (let i = issueStart + 1; i < Math.min(issueStart + 4, lines.length); i++) {
        if (lines[i].startsWith('[')) {
          const match = lines[i].match(/#(\d+): ([^,]+)/);
          if (match) {
            result += `\n• #${match[1]}: ${match[2].substring(0, 30)}`;
          }
        }
      }
    }

    if (prStart > -1) {
      result += '\n\n��� Recent PRs:';
      for (let i = prStart + 1; i < Math.min(prStart + 4, lines.length); i++) {
        if (lines[i].startsWith('[')) {
          const match = lines[i].match(/#(\d+): ([^,]+)/);
          if (match) {
            result += `\n• #${match[1]}: ${match[2].substring(0, 30)}`;
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error("[GitHub Agent] Repo info failed:", error);
    return "❌ Failed to fetch repository information.";
  }
}

// Handler for gh search command
export async function handleGitHubSearch(searchQuery: string): Promise<string> {
  try {
    const searchResults = await searchGitHub(searchQuery);

    if (searchResults.includes("No repositories found")) {
      return searchResults;
    }

    // Use Claude to format search results for SMS
    const formatOptions: Options = {
      model: "claude-haiku-4-5",
      mcpServers: {},
      allowedTools: [],
      systemPrompt: `
        Format these GitHub search results for SMS. Show top 5 repos.
        For each: name (stars) - very brief description (max 50 chars)
        Keep total under 500 chars for SMS.
      `,
    };

    const response = await query({
      prompt: `Format for SMS:\n${searchResults}`,
      options: formatOptions,
    });

    let formatted: string | undefined;
    for await (const message of response) {
      if ("result" in message && message.result) {
        formatted = String(message.result);
      }
      if ("text" in message && message.text) {
        formatted = String(message.text);
      }
    }

    return formatted || searchResults;
  } catch (error) {
    console.error("[GitHub Agent] Search failed:", error);
    return "❌ GitHub search failed.";
  }
}

// Main command router
export async function handleGitHubCommand(command: string): Promise<string> {
  const parts = command.trim().split(/\s+/);
  const subCommand = parts[0]?.toLowerCase();

  if (subCommand === 'trending') {
    const topic = parts.slice(1).join(' ');
    return handleGitHubTrending(topic);
  } else if (subCommand === 'repo' && parts[1]) {
    return handleGitHubRepo(parts[1]);
  } else if (subCommand === 'search' && parts.length > 1) {
    const query = parts.slice(1).join(' ');
    return handleGitHubSearch(query);
  }

  return "Usage: gh trending [topic], gh repo owner/repo, gh search <query>";
}
