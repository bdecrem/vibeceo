// sms-bot/agents/github/agent.ts

const GITHUB_API_BASE = "https://api.github.com";

type SummaryParams = {
  owner: string;
  repo: string;
};

/**
 * Fetches open pull requests for a repo and returns
 * a human-readable summary string for SMS.
 */
export async function handleGithubPullRequestSummary(
  params: SummaryParams
): Promise<string> {
  const { owner, repo } = params;

  const token = process.env.GITHUB_TOKEN;

  const headers: Record<string, string> = {
    "User-Agent": "vibeceo-github-agent",
    Accept: "application/vnd.github+json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=open&per_page=10`;

  try {
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const text = await res.text();
      console.error("GitHub API error:", res.status, text);
      return `❌ GitHub error ${res.status} fetching PRs for ${owner}/${repo}.`;
    }

    const prs: any[] = await res.json();

    if (!Array.isArray(prs) || prs.length === 0) {
      return `✅ No open pull requests found for ${owner}/${repo}.`;
    }

    // Build a concise SMS-friendly summary (limit to first 5)
    const topPrs = prs.slice(0, 5);

    let message = `🔍 Open PRs for ${owner}/${repo}:\n\n`;

    for (const pr of topPrs) {
      const num = pr.number;
      const title = pr.title;
      const author = pr.user?.login ?? "unknown";
      const created = pr.created_at?.slice(0, 10) ?? "";
      message += `#${num} – ${title}\n👤 ${author} | 📅 ${created}\n${pr.html_url}\n\n`;
    }

    if (prs.length > topPrs.length) {
      message += `…and ${prs.length - topPrs.length} more open PR(s).`;
    }

    return message.trim();
  } catch (err) {
    console.error("Error calling GitHub API:", err);
    return `❌ Could not fetch PRs for ${owner}/${repo}. Please try again.`;
  }
}
