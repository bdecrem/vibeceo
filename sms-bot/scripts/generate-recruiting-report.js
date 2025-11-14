#!/usr/bin/env node
/**
 * Generate a recruiting report for collected candidates
 * Usage: node scripts/generate-recruiting-report.js
 */

import { generateAndStoreRecruitingReport } from '../dist/agents/recruiting/report-generator.js';
import fs from 'fs';

const candidatesFile = '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/data/recruiting-candidates/candidates_20251114_143046.json';
const candidatesData = JSON.parse(fs.readFileSync(candidatesFile, 'utf8'));

// Create project object
const project = {
  query: "CS student with AI projects and GitHub portfolio",
  refinedSpec: {
    specText: `Looking for computer science students with:
- Active AI/ML projects on GitHub
- Portfolio website showcasing work
- Located in USA or Canada
- Interest in remote work opportunities
- Recent graduation or currently enrolled`,
    createdAt: new Date().toISOString(),
  },
  approvedChannels: [
    {
      name: "GitHub - CS Students with AI Projects",
      channelType: "github-users",
      description: "Computer science students with active AI/ML repositories",
      searchQuery: "cs student ai machine learning",
      example: {
        name: "Sample User",
        url: "https://github.com/sample"
      }
    }
  ],
  learnedProfile: {},
  setupComplete: true,
  sourcesApproved: true,
  channelsApproved: true,
  notificationTime: "11:00",
  active: true,
  createdAt: new Date().toISOString(),
  durationDays: 7,
  startedAt: new Date().toISOString(),
};

// Convert candidates to proper format
const candidates = candidatesData.candidates.map(c => ({
  id: Math.random().toString(36).substr(2, 9),
  name: c.name,
  profileUrl: c.profileUrl,
  channelSource: c.channelSource,
  bio: c.bio,
  githubUrl: c.githubUrl,
  portfolioUrl: c.portfolioUrl,
  twitterUrl: c.twitterUrl || undefined,
  location: c.location,
  score: c.score,
  matchReason: c.matchReason,
  status: 'pending',
  addedAt: new Date().toISOString(),
}));

const today = new Date().toISOString().split('T')[0];

console.log('Generating recruiting report...');
console.log(`Date: ${today}`);
console.log(`Candidates: ${candidates.length}`);
console.log('');

try {
  const result = await generateAndStoreRecruitingReport({
    project,
    candidates,
    date: today,
    reportType: 'setup',
  });

  console.log('✅ Report generated successfully!');
  console.log('');
  console.log('Report URL:', result.stored.publicUrl);
  console.log('Short Link:', result.shortLink || '(not created)');
  console.log('');
  console.log('Report stored at:', result.stored.reportPath);
  console.log('');
  console.log('--- MARKDOWN PREVIEW ---');
  console.log(result.markdown.substring(0, 1500) + '...\n[truncated]');
} catch (error) {
  console.error('❌ Failed to generate report:', error);
  process.exit(1);
}
