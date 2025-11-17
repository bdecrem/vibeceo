import type { TwilioClient } from './webhooks.js';
import { registerDailyJob } from '../scheduler/index.js';
import { getRecruitingPreferences, updateRecruitingPreferences, type RecruitingProject } from '../../commands/recruit.js';
import { getActiveSubscribers } from '../subscribers.js';
import type { Candidate } from '../../commands/recruit.js';
import { countUCS2CodeUnits, MAX_SMS_CODE_UNITS } from '../utils/sms-length.js';

const DEFAULT_SEND_HOUR = Number(process.env.RECRUITING_SEND_HOUR || 11); // 11am PT
const DEFAULT_SEND_MINUTE = Number(process.env.RECRUITING_SEND_MINUTE || 0);
const BROADCAST_DELAY_MS = Number(process.env.RECRUITING_PER_MESSAGE_DELAY_MS || 200);

const pacificDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' });

function hasReceivedToday(lastSentAt: string | null | undefined, todayKey: string): boolean {
  if (!lastSentAt) {
    return false;
  }

  const lastSentDate = new Date(lastSentAt);
  const lastSentKey = pacificDateFormatter.format(lastSentDate);
  return lastSentKey === todayKey;
}

async function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

/**
 * Format candidates for SMS - ONLY sends top candidate + shortlink to stay under SMS limits
 * Based on proven format from sms-bot/agents/recruiting/index.ts:253-268
 */
function formatCandidatesForScoring(candidates: Candidate[], shortLink?: string | null): string {
  if (candidates.length === 0) {
    return '🎯 No new candidates found today.';
  }

  // Send ONLY top candidate details to stay under 670 UCS-2 code units
  const topCandidate = candidates[0];

  let message = `🎯 Talent Radar: Found ${candidates.length} new candidate${candidates.length > 1 ? 's' : ''}!\n\n`;
  message += `Top Match:\n`;
  message += `${topCandidate.name}\n`;

  // Add location and bio
  if (topCandidate.location) {
    message += `${topCandidate.location}\n`;
  }

  // Add short bio (max 120 chars)
  const shortBio = topCandidate.bio.substring(0, 120);
  message += `${shortBio}${topCandidate.bio.length > 120 ? '...' : ''}\n\n`;

  // Add shortlink to full report if available
  if (shortLink) {
    message += `View all ${candidates.length}: ${shortLink}\n\n`;
  }

  message += `Score: SCORE 1:5 2:3 ...`;

  // Safety check: Ensure message is under SMS limits
  const codeUnits = countUCS2CodeUnits(message);
  if (codeUnits > MAX_SMS_CODE_UNITS) {
    console.warn(`[Recruiting Scheduler] Message exceeds SMS limit (${codeUnits} > ${MAX_SMS_CODE_UNITS}), truncating bio`);
    // If still too long, truncate bio further
    const truncatedBio = topCandidate.bio.substring(0, 80);
    message = `🎯 Talent Radar: Found ${candidates.length} new candidate${candidates.length > 1 ? 's' : ''}!\n\n`;
    message += `Top Match:\n${topCandidate.name}\n`;
    if (topCandidate.location) message += `${topCandidate.location}\n`;
    message += `${truncatedBio}...\n\n`;
    if (shortLink) message += `View all ${candidates.length}: ${shortLink}\n\n`;
    message += `Score: SCORE 1:5 2:3 ...`;
  }

  return message;
}

async function collectNewCandidatesForProject(
  refinedSpec: string,
  channels: any[]
): Promise<Candidate[]> {
  // Import the collector function from recruit command
  const { spawn } = await import('node:child_process');
  const path = await import('node:path');
  const crypto = await import('node:crypto');

  const PYTHON_BIN = process.env.PYTHON_BIN || path.join(process.cwd(), '..', '.venv', 'bin', 'python3');
  const AGENT_SCRIPT = path.join(process.cwd(), 'agents', 'recruiting', 'collect-candidates-agent.py');

  return new Promise((resolve, reject) => {
    const args = [
      AGENT_SCRIPT,
      '--spec', refinedSpec,
      '--channels', JSON.stringify(channels),
    ];

    const agentProcess = spawn(PYTHON_BIN, args);
    let stdout = '';
    let stderr = '';

    agentProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`[Recruiting Scheduler - Agent] ${data.toString().trim()}`);
    });

    agentProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`[Recruiting Scheduler - Agent Error] ${data.toString().trim()}`);
    });

    agentProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Agent exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const lines = stdout.split(/\r?\n/).filter(l => l.trim());
        const lastLine = lines[lines.length - 1];
        const result = JSON.parse(lastLine);

        if (result.status === 'error') {
          reject(new Error(result.error));
          return;
        }

        // Convert raw candidates to Candidate objects with IDs
        const candidates: Candidate[] = (result.candidates || []).map((c: any) => ({
          id: crypto.randomUUID(),
          name: c.name,
          profileUrl: c.profileUrl,
          channelSource: c.channelSource,
          bio: c.bio,
          githubUrl: c.githubUrl,
          portfolioUrl: c.portfolioUrl,
          twitterUrl: c.twitterUrl,
          location: c.location,
          score: c.score,
          matchReason: c.matchReason,
          status: 'pending' as const,
          addedAt: new Date().toISOString(),
        }));

        resolve(candidates);
      } catch (e) {
        reject(new Error(`Failed to parse agent output: ${e}`));
      }
    });
  });
}

async function runRecruitingBroadcast(twilioClient: TwilioClient): Promise<void> {
  const now = new Date();
  const todayKey = pacificDateFormatter.format(now);

  console.log('[Recruiting Scheduler] Starting daily candidate collection...');

  // Get all active subscribers
  const allSubscribers = await getActiveSubscribers();

  for (const subscriber of allSubscribers) {
    try {
      const prefs = await getRecruitingPreferences(subscriber.id);

      // Skip if no projects or no notification time set
      if (!prefs.projects || Object.keys(prefs.projects).length === 0) {
        continue;
      }

      // Process each active recruiting project
      for (const [projectId, project] of Object.entries(prefs.projects)) {
        const typedProject = project as RecruitingProject;

        // Skip if setup not complete or no approved channels
        if (!typedProject.setupComplete || !typedProject.approvedChannels || typedProject.approvedChannels.length === 0) {
          continue;
        }

        // Skip if already sent today
        if (hasReceivedToday(typedProject.lastCandidateSentAt, todayKey)) {
          console.log(`[Recruiting Scheduler] Project ${projectId} already received candidates today`);
          continue;
        }

        // Check if project is still active (has days remaining)
        const startDate = typedProject.startedAt ? new Date(typedProject.startedAt) : new Date();
        const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = (typedProject.durationDays || 7) - daysElapsed;

        if (daysRemaining <= 0) {
          console.log(`[Recruiting Scheduler] Project ${projectId} has expired (${typedProject.durationDays || 7} days)`);
          continue;
        }

        console.log(`[Recruiting Scheduler] Collecting candidates for project ${projectId} (${daysRemaining} days remaining)`);

        try {
          // Collect new candidates from approved channels
          const newCandidates = await collectNewCandidatesForProject(
            typedProject.refinedSpec?.specText || typedProject.query || '',
            typedProject.approvedChannels
          );

          if (newCandidates.length === 0) {
            console.log(`[Recruiting Scheduler] No new candidates found for project ${projectId}`);
            // Still update last sent date to avoid retrying same channels every hour
            typedProject.lastCandidateSentAt = new Date().toISOString();
            await updateRecruitingPreferences(subscriber.id, prefs);
            continue;
          }

          console.log(`[Recruiting Scheduler] Found ${newCandidates.length} new candidates for project ${projectId}`);

          // Add new candidates to existing list
          const existingCandidates = typedProject.candidates || [];
          const allCandidates = [...existingCandidates, ...newCandidates];

          // Generate and store daily report
          let reportShortLink: string | null = null;
          try {
            const { generateAndStoreRecruitingReport } = await import('../../agents/recruiting/report-generator.js');

            const reportResult = await generateAndStoreRecruitingReport({
              project: typedProject,
              candidates: newCandidates,
              date: todayKey,
              reportType: 'daily',
            });

            reportShortLink = reportResult.shortLink;

            // Store report link in project
            typedProject.lastReportUrl = reportResult.stored.publicUrl || null;
            typedProject.lastReportShortLink = reportShortLink;

            console.log(`[Recruiting Scheduler] Report generated: ${reportShortLink || reportResult.stored.publicUrl}`);
          } catch (error) {
            console.error(`[Recruiting Scheduler] Failed to generate report:`, error);
            // Continue even if report generation fails
          }

          // Format message with top candidate + shortlink (stays under SMS limits)
          const message = formatCandidatesForScoring(newCandidates, reportShortLink);

          // Final safety check before sending
          const finalCodeUnits = countUCS2CodeUnits(message);
          if (finalCodeUnits > MAX_SMS_CODE_UNITS) {
            console.error(`[Recruiting Scheduler] CRITICAL: Message still exceeds limit after formatting (${finalCodeUnits} > ${MAX_SMS_CODE_UNITS})`);
            throw new Error(`SMS message too long: ${finalCodeUnits} code units`);
          }

          console.log(`[Recruiting Scheduler] Message length: ${finalCodeUnits}/${MAX_SMS_CODE_UNITS} code units`);

          // Send SMS
          const fromNumber = process.env.TWILIO_PHONE_NUMBER;
          if (fromNumber) {
            await twilioClient.messages.create({
              body: message,
              to: subscriber.phone_number,
              from: fromNumber,
            });

            console.log(`[Recruiting Scheduler] Sent ${newCandidates.length} candidates to ${subscriber.phone_number}`);

            // Update project with new candidates
            typedProject.candidates = allCandidates;
            typedProject.pendingCandidates = newCandidates; // All new candidates are pending scoring
            typedProject.lastCandidateSentAt = new Date().toISOString();

            await updateRecruitingPreferences(subscriber.id, prefs);

            // Rate limiting between messages
            await delay(BROADCAST_DELAY_MS);
          }
        } catch (error) {
          console.error(`[Recruiting Scheduler] Failed to collect candidates for project ${projectId}:`, error);
          // Continue to next project even if this one fails
        }
      }
    } catch (error) {
      console.error(`[Recruiting Scheduler] Failed to process subscriber ${subscriber.phone_number}:`, error);
      // Continue to next subscriber even if this one fails
    }
  }

  console.log('[Recruiting Scheduler] Daily candidate collection complete');
}

export function registerRecruitingJob(twilioClient: TwilioClient): void {
  registerDailyJob({
    name: 'recruiting-daily-candidates',
    hour: DEFAULT_SEND_HOUR,
    minute: DEFAULT_SEND_MINUTE,
    timezone: 'America/Los_Angeles',
    run: () => runRecruitingBroadcast(twilioClient),
    onError: (error) => {
      console.error('[Recruiting Scheduler] Daily job failed:', error);
    },
  });

  console.log(`[Recruiting Scheduler] Registered daily job for ${DEFAULT_SEND_HOUR}:${String(DEFAULT_SEND_MINUTE).padStart(2, '0')} PT`);
}
