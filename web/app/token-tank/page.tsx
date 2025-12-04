import { promises as fs } from 'fs';
import path from 'path';
import TokenTankClient from './TokenTankClient';

async function getMarkdownContent() {
  const filePath = path.join(process.cwd(), '..', 'incubator', 'CLAUDE.md');
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    console.error('Error reading CLAUDE.md:', error);
    return '# Token Tank\n\nRules document not found.';
  }
}

async function getAgentUsage() {
  const agents = ['i1', 'i2', 'i3', 'i4'];
  const usage: Record<string, string> = {};

  for (const agent of agents) {
    const filePath = path.join(process.cwd(), '..', 'incubator', agent, 'usage.md');
    try {
      const content = await fs.readFile(filePath, 'utf8');
      usage[agent] = content;
    } catch (error) {
      usage[agent] = `# ${agent}\n\nNo usage data yet.`;
    }
  }

  return usage;
}

export default async function TokenTankPage() {
  const [rulesContent, agentUsage] = await Promise.all([
    getMarkdownContent(),
    getAgentUsage()
  ]);

  return <TokenTankClient rulesContent={rulesContent} agentUsage={agentUsage} />;
}

export const dynamic = 'force-dynamic';
