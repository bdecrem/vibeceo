/**
 * Parse CTRL SHIFT Applications
 *
 * Extracts structured data from raw applications and generates CSV
 */

import * as fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic();

interface ParsedApplication {
  name: string;
  email: string;
  date: string;
  pitch: string;
  projectLinks: string[];
  twitterLinkedin: string;
  availability: string;
  // AI-extracted fields
  summary?: string;
  focusArea?: string;
  stage?: string;
}

function extractFromContent(content: string): Partial<ParsedApplication> {
  const result: Partial<ParsedApplication> = {};

  // Extract name and email from "From: Name <email>"
  const fromMatch = content.match(/From:\s*(.+?)\s*<([^>]+)>/);
  if (fromMatch) {
    result.name = fromMatch[1].trim();
    result.email = fromMatch[2].trim();
  }

  // Extract WHO & WHY section (the pitch)
  const whoWhyMatch = content.match(/(?:WHO & WHY:|Message:)\s*([\s\S]*?)(?=PROJECT LINK:|AVAILABILITY:|TWITTER|$)/i);
  if (whoWhyMatch) {
    result.pitch = whoWhyMatch[1].trim().replace(/\n+/g, ' ').substring(0, 2000);
  }

  // Extract project links
  const projectMatch = content.match(/PROJECT LINK:\s*([\s\S]*?)(?=AVAILABILITY:|TWITTER|$)/i);
  if (projectMatch) {
    // Find actual URLs (not sendgrid tracking links)
    const urls = projectMatch[1].match(/https?:\/\/[^\s]+/g) || [];
    result.projectLinks = urls.slice(0, 3); // Keep first 3
  }

  // Extract availability
  const availMatch = content.match(/AVAILABILITY:\s*(Yes|No|[\w\s]+?)(?=\n|TWITTER|$)/i);
  if (availMatch) {
    result.availability = availMatch[1].trim();
  }

  // Extract Twitter/LinkedIn
  const socialMatch = content.match(/TWITTER\/LINKEDIN:\s*([\s\S]*?)(?=$)/i);
  if (socialMatch) {
    const urls = socialMatch[1].match(/https?:\/\/[^\s]+/g) || [];
    result.twitterLinkedin = urls[0] || '';
  }

  return result;
}

async function summarizeWithClaude(applications: ParsedApplication[]): Promise<ParsedApplication[]> {
  console.log('\nSummarizing applications with Claude...');

  for (let i = 0; i < applications.length; i++) {
    const app = applications[i];
    process.stdout.write(`\rProcessing ${i + 1}/${applications.length}: ${app.name}...`);

    if (!app.pitch || app.pitch.length < 50) {
      app.summary = 'Insufficient content';
      app.focusArea = 'Unknown';
      app.stage = 'Unknown';
      continue;
    }

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Analyze this founder award application and respond with EXACTLY this JSON format (no other text):
{"summary": "1-2 sentence summary of what they're building", "focusArea": "one of: Consumer AI, Enterprise AI, AI Tools, Research, Other", "stage": "one of: Idea, Prototype, Launched, Growing"}

Application from ${app.name}:
${app.pitch.substring(0, 1500)}`
        }]
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      try {
        const parsed = JSON.parse(text);
        app.summary = parsed.summary || '';
        app.focusArea = parsed.focusArea || 'Other';
        app.stage = parsed.stage || 'Unknown';
      } catch {
        app.summary = text.substring(0, 200);
        app.focusArea = 'Other';
        app.stage = 'Unknown';
      }
    } catch (error: any) {
      console.error(`\nError processing ${app.name}: ${error.message}`);
      app.summary = 'Error processing';
      app.focusArea = 'Unknown';
      app.stage = 'Unknown';
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\nDone summarizing!');
  return applications;
}

function generateCSV(applications: ParsedApplication[]): string {
  const headers = ['Name', 'Email', 'Date', 'Focus Area', 'Stage', 'Summary', 'Availability', 'Social', 'Project Links'];

  const escapeCSV = (str: string) => {
    if (!str) return '';
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = applications.map(app => [
    escapeCSV(app.name),
    escapeCSV(app.email),
    escapeCSV(app.date),
    escapeCSV(app.focusArea || ''),
    escapeCSV(app.stage || ''),
    escapeCSV(app.summary || ''),
    escapeCSV(app.availability || ''),
    escapeCSV(app.twitterLinkedin || ''),
    escapeCSV((app.projectLinks || []).join(' | '))
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

async function main() {
  // Find most recent raw applications file
  const dataDir = '/Users/bart/Documents/code/vibeceo/sms-bot/data/ctrl-shift-applications';
  const files = fs.readdirSync(dataDir).filter(f => f.startsWith('raw_applications_')).sort().reverse();

  if (files.length === 0) {
    console.error('No raw applications found. Run fetch-ctrl-shift-applications.ts first.');
    process.exit(1);
  }

  const latestFile = `${dataDir}/${files[0]}`;
  console.log(`Loading: ${latestFile}`);

  const rawApps = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
  console.log(`Found ${rawApps.length} applications`);

  // Parse each application
  const parsed: ParsedApplication[] = rawApps.map((app: any) => {
    const extracted = extractFromContent(app.rawContent);
    return {
      name: extracted.name || app.fromName || 'Unknown',
      email: extracted.email || app.fromEmail || '',
      date: new Date(app.date).toLocaleDateString(),
      pitch: extracted.pitch || '',
      projectLinks: extracted.projectLinks || [],
      twitterLinkedin: extracted.twitterLinkedin || '',
      availability: extracted.availability || '',
    };
  });

  // Summarize with Claude
  const summarized = await summarizeWithClaude(parsed);

  // Save parsed JSON
  const parsedPath = `${dataDir}/parsed_applications.json`;
  fs.writeFileSync(parsedPath, JSON.stringify(summarized, null, 2));
  console.log(`\nSaved parsed data to: ${parsedPath}`);

  // Generate and save CSV
  const csv = generateCSV(summarized);
  const csvPath = `${dataDir}/applications.csv`;
  fs.writeFileSync(csvPath, csv);
  console.log(`Saved CSV to: ${csvPath}`);

  // Print summary table
  console.log('\n=== APPLICATION SUMMARY ===\n');
  console.log('| Name | Focus Area | Stage | Summary |');
  console.log('|------|------------|-------|---------|');
  summarized.forEach(app => {
    const name = app.name.substring(0, 20).padEnd(20);
    const focus = (app.focusArea || '').substring(0, 12).padEnd(12);
    const stage = (app.stage || '').substring(0, 10).padEnd(10);
    const summary = (app.summary || '').substring(0, 50);
    console.log(`| ${name} | ${focus} | ${stage} | ${summary} |`);
  });

  console.log(`\nTotal: ${summarized.length} applications`);
  console.log(`CSV ready at: ${csvPath}`);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
