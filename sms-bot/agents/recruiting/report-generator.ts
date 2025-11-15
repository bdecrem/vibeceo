import { storeAgentReport, type StoredReportMetadata } from '../report-storage.js';
import { createShortLink } from '../../lib/utils/shortlink-service.js';
import { buildReportViewerUrl } from '../../lib/utils/report-viewer-link.js';
import type { Candidate } from '../../commands/recruit.js';

/**
 * Minimal project data needed for report generation
 */
interface ReportProjectData {
  query: string;
  refinedSpec?: {
    specText?: string;
  };
  approvedChannels?: any[];
  learnedProfile?: any;
}

interface RecruitingReportInput {
  project: ReportProjectData;
  candidates: Candidate[];
  date: string;
  reportType: 'setup' | 'daily';
}

export interface RecruitingReportResult {
  markdown: string;
  summary: string;
  stored: StoredReportMetadata;
  shortLink: string | null;
}

/**
 * Generate markdown report for recruiting candidates
 */
function generateRecruitingMarkdown(input: RecruitingReportInput): string {
  const { project, candidates, date, reportType } = input;

  // Title
  const title = reportType === 'setup'
    ? `🎯 Talent Radar: Initial Candidate Report`
    : `🎯 Talent Radar: Daily Candidate Report`;

  // Format date nicely
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let markdown = `# ${title}\n\n`;
  markdown += `**Date**: ${formattedDate}\n\n`;
  markdown += `---\n\n`;

  // Job Description
  markdown += `## 📋 Position Overview\n\n`;
  markdown += `**Original Query**: ${project.query}\n\n`;

  if (project.refinedSpec?.specText) {
    markdown += `### Detailed Specification\n\n`;
    markdown += `${project.refinedSpec.specText}\n\n`;
  }

  markdown += `---\n\n`;

  // Search Focus
  markdown += `## 🔍 Search Focus\n\n`;

  if (project.learnedProfile && Object.keys(project.learnedProfile).length > 0) {
    markdown += `Based on your feedback, we're focusing on candidates with:\n\n`;

    if (project.learnedProfile.preferred_seniority) {
      markdown += `**Seniority**: ${Array.isArray(project.learnedProfile.preferred_seniority)
        ? project.learnedProfile.preferred_seniority.join(', ')
        : project.learnedProfile.preferred_seniority}\n\n`;
    }

    if (project.learnedProfile.preferred_company_sizes) {
      markdown += `**Company Size**: ${Array.isArray(project.learnedProfile.preferred_company_sizes)
        ? project.learnedProfile.preferred_company_sizes.join(', ')
        : project.learnedProfile.preferred_company_sizes}\n\n`;
    }

    if (project.learnedProfile.preferred_skills) {
      markdown += `**Key Skills**: ${Array.isArray(project.learnedProfile.preferred_skills)
        ? project.learnedProfile.preferred_skills.join(', ')
        : project.learnedProfile.preferred_skills}\n\n`;
    }

    if (project.learnedProfile.preferred_backgrounds) {
      markdown += `**Background**: ${Array.isArray(project.learnedProfile.preferred_backgrounds)
        ? project.learnedProfile.preferred_backgrounds.join(', ')
        : project.learnedProfile.preferred_backgrounds}\n\n`;
    }

    if (project.learnedProfile.avoid) {
      markdown += `**Avoiding**: ${Array.isArray(project.learnedProfile.avoid)
        ? project.learnedProfile.avoid.join(', ')
        : project.learnedProfile.avoid}\n\n`;
    }
  } else {
    markdown += `Looking for candidates matching the position requirements above.\n\n`;
  }

  markdown += `---\n\n`;

  // Channels Used
  if (project.approvedChannels && project.approvedChannels.length > 0) {
    markdown += `## 📡 Channels Searched\n\n`;
    markdown += `Searched ${project.approvedChannels.length} approved channel${project.approvedChannels.length > 1 ? 's' : ''}:\n\n`;

    project.approvedChannels.forEach((channel, i) => {
      markdown += `${i + 1}. **${channel.name}** (${channel.channelType})\n`;
      markdown += `   - ${channel.description}\n`;
      if (channel.searchQuery) {
        markdown += `   - Search: \`${channel.searchQuery}\`\n`;
      }
      markdown += `\n`;
    });

    markdown += `---\n\n`;
  }

  // Candidates
  markdown += `## 👥 Candidates (${candidates.length})\n\n`;

  if (candidates.length === 0) {
    markdown += `No candidates found in this search.\n\n`;
  } else {
    candidates.forEach((candidate, i) => {
      markdown += `### ${i + 1}. ${candidate.name}\n\n`;

      // Location
      if (candidate.location) {
        markdown += `📍 **Location**: ${candidate.location}\n\n`;
      }

      // Profile links
      markdown += `🔗 **Links**:\n`;
      markdown += `- [Primary Profile](${candidate.profileUrl})\n`;
      if (candidate.githubUrl) {
        markdown += `- [GitHub](${candidate.githubUrl})\n`;
      }
      if (candidate.portfolioUrl) {
        markdown += `- [Portfolio](${candidate.portfolioUrl})\n`;
      }
      if (candidate.twitterUrl) {
        markdown += `- [Twitter](${candidate.twitterUrl})\n`;
      }
      markdown += `\n`;

      // Bio
      markdown += `**About**:\n${candidate.bio}\n\n`;

      // Match score and reason
      markdown += `**AI Match Score**: ${candidate.score}/10\n\n`;
      markdown += `**Why Selected**: ${candidate.matchReason}\n\n`;

      // Channel source
      markdown += `**Found via**: ${candidate.channelSource}\n\n`;

      // User score if provided
      if (candidate.userScore !== undefined) {
        markdown += `**Your Score**: ${candidate.userScore}/5 ⭐\n\n`;
      }

      // User notes if provided
      if (candidate.userNotes) {
        markdown += `**Your Notes**: ${candidate.userNotes}\n\n`;
      }

      markdown += `---\n\n`;
    });
  }

  // Footer
  markdown += `\n\n*Generated by Talent Radar on ${formattedDate}*\n`;

  return markdown;
}

/**
 * Generate and store recruiting report with short link
 */
export async function generateAndStoreRecruitingReport(
  input: RecruitingReportInput
): Promise<RecruitingReportResult> {
  // Generate markdown
  const markdown = generateRecruitingMarkdown(input);

  // Create summary (first line of bio from top candidate, or generic)
  const summary = input.candidates.length > 0
    ? `Found ${input.candidates.length} candidate${input.candidates.length > 1 ? 's' : ''} for: ${input.project.query}`
    : `Talent search for: ${input.project.query}`;

  // Store report in Supabase
  const stored = await storeAgentReport({
    agent: 'recruiting',
    date: input.date,
    markdown,
    summary,
  });

  // Create short link to report viewer (like crypto agent does)
  let shortLink: string | null = null;
  if (stored.reportPath) {
    try {
      // Build report viewer URL from storage path
      const viewerUrl = buildReportViewerUrl({
        path: stored.reportPath,
        title: 'Talent Radar Report',
        agentSlug: 'recruiting',
      });

      shortLink = await createShortLink(viewerUrl, {
        context: 'recruiting-report-viewer',
        createdBy: 'sms-bot',
        createdFor: 'talent-radar',
      });
    } catch (error) {
      console.warn('[Recruiting] Failed to create short link:', error);
    }
  }

  return {
    markdown,
    summary,
    stored,
    shortLink,
  };
}
