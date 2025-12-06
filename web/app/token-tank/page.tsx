import TokenTankClient from './TokenTankClient';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/bdecrem/vibeceo/main/incubator';

async function getMarkdownContent() {
  try {
    const response = await fetch(`${GITHUB_RAW_BASE}/CLAUDE.md`, {
      next: { revalidate: 60 } // Cache for 60 seconds
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.text();
  } catch (error) {
    console.error('Error fetching CLAUDE.md:', error);
    return '# Token Tank\n\nRules document not found.';
  }
}

async function getBlogContent() {
  try {
    const response = await fetch(`${GITHUB_RAW_BASE}/BLOG.md`, {
      next: { revalidate: 60 }
    });
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.text();
  } catch (error) {
    console.error('Error fetching BLOG.md:', error);
    return '# Token Tank Blog\n\nNo blog posts yet.';
  }
}

async function getAgentUsage() {
  const agents = ['i1', 'i2', 'i3', 'i4'];
  const usage: Record<string, string> = {};

  await Promise.all(
    agents.map(async (agent) => {
      try {
        const response = await fetch(`${GITHUB_RAW_BASE}/${agent}/usage.md`, {
          next: { revalidate: 60 }
        });
        if (!response.ok) throw new Error('Failed to fetch');
        usage[agent] = await response.text();
      } catch (error) {
        usage[agent] = `# ${agent}\n\nNo usage data yet.`;
      }
    })
  );

  return usage;
}

export default async function TokenTankPage() {
  const [rulesContent, blogContent, agentUsage] = await Promise.all([
    getMarkdownContent(),
    getBlogContent(),
    getAgentUsage()
  ]);

  return <TokenTankClient rulesContent={rulesContent} blogContent={blogContent} agentUsage={agentUsage} />;
}

export const dynamic = 'force-dynamic';
