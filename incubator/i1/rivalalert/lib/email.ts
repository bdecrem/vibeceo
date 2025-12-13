/**
 * RivalAlert Email Digest
 *
 * Generates and sends email digests to users about competitor changes.
 */

import sgMail from '@sendgrid/mail';
import type { RaUser, RaChange, CompetitorWithChanges, DigestData } from './types.js';
import * as db from './db.js';

// ============================================================================
// Configuration
// ============================================================================

const FROM_EMAIL = process.env.RIVALALERT_FROM_EMAIL || 'alerts@rivalalert.ai';
const FROM_NAME = 'RivalAlert';

function initSendGrid(): void {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is required');
  }
  sgMail.setApiKey(apiKey);
}

// ============================================================================
// Email Templates
// ============================================================================

function generateDigestHtml(data: DigestData): string {
  const competitorsWithChanges = data.competitors.filter((c) => c.changes.length > 0);

  if (competitorsWithChanges.length === 0) {
    return generateNoChangesHtml(data);
  }

  const changesHtml = competitorsWithChanges
    .map((competitor) => generateCompetitorSection(competitor))
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RivalAlert Daily Digest</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
      color: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
    }
    .header p {
      margin: 0;
      opacity: 0.9;
    }
    .competitor-section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .competitor-name {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 12px 0;
      color: #1a1a1a;
    }
    .competitor-url {
      font-size: 12px;
      color: #666;
      text-decoration: none;
    }
    .change-item {
      background: white;
      border-left: 4px solid #ff6b35;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 0 4px 4px 0;
    }
    .change-type {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: #ff6b35;
      margin-bottom: 4px;
    }
    .change-summary {
      font-size: 14px;
      color: #333;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
    }
    .cta-button {
      display: inline-block;
      background: #ff6b35;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔔 RivalAlert Daily Digest</h1>
    <p>${formatDate(data.generated_at)} • ${countTotalChanges(competitorsWithChanges)} change(s) detected</p>
  </div>

  ${changesHtml}

  <div class="footer">
    <p>You're receiving this because you're subscribed to RivalAlert.</p>
    <p>Manage your competitors at <a href="https://rivalalert.ai/dashboard">rivalalert.ai/dashboard</a></p>
  </div>
</body>
</html>
  `.trim();
}

function generateNoChangesHtml(data: DigestData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RivalAlert Daily Digest</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
      color: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; }
    .header p { margin: 0; opacity: 0.9; }
    .content {
      background: #f8f9fa;
      padding: 24px;
      border-radius: 8px;
      text-align: center;
    }
    .content h2 { color: #28a745; margin-bottom: 8px; }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔔 RivalAlert Daily Digest</h1>
    <p>${formatDate(data.generated_at)}</p>
  </div>

  <div class="content">
    <h2>✅ All Quiet</h2>
    <p>No changes detected from your ${data.competitors.length} tracked competitor(s) in the last 24 hours.</p>
    <p>We'll let you know when something happens.</p>
  </div>

  <div class="footer">
    <p>You're receiving this because you're subscribed to RivalAlert.</p>
  </div>
</body>
</html>
  `.trim();
}

function generateCompetitorSection(competitor: CompetitorWithChanges): string {
  const changesHtml = competitor.changes
    .map(
      (change) => `
      <div class="change-item">
        <div class="change-type">${formatChangeType(change.change_type)}</div>
        <div class="change-summary">${escapeHtml(change.summary || 'Change detected')}</div>
      </div>
    `
    )
    .join('');

  return `
    <div class="competitor-section">
      <h3 class="competitor-name">${escapeHtml(competitor.name)}</h3>
      <a class="competitor-url" href="${competitor.website_url}">${competitor.website_url}</a>
      ${changesHtml}
    </div>
  `;
}

function generateDigestText(data: DigestData): string {
  const competitorsWithChanges = data.competitors.filter((c) => c.changes.length > 0);

  if (competitorsWithChanges.length === 0) {
    return `RivalAlert Daily Digest - ${formatDate(data.generated_at)}

All Quiet! No changes detected from your ${data.competitors.length} tracked competitor(s).

We'll let you know when something happens.

---
RivalAlert - https://rivalalert.ai`;
  }

  const sections = competitorsWithChanges.map((competitor) => {
    const changes = competitor.changes
      .map((c) => `  • [${formatChangeType(c.change_type)}] ${c.summary}`)
      .join('\n');
    return `${competitor.name} (${competitor.website_url})\n${changes}`;
  });

  return `RivalAlert Daily Digest - ${formatDate(data.generated_at)}

${countTotalChanges(competitorsWithChanges)} change(s) detected:

${sections.join('\n\n')}

---
RivalAlert - https://rivalalert.ai`;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatChangeType(type: string): string {
  const labels: Record<string, string> = {
    pricing: 'Pricing Change',
    feature: 'Feature Update',
    job_posting: 'New Job Posting',
    content: 'Content Change',
  };
  return labels[type] || type;
}

function countTotalChanges(competitors: CompetitorWithChanges[]): number {
  return competitors.reduce((sum, c) => sum + c.changes.length, 0);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// Main Send Functions
// ============================================================================

export async function sendDigestToUser(user: RaUser, since: Date): Promise<boolean> {
  try {
    initSendGrid();

    // Get competitors with recent changes
    const competitors = await db.getCompetitorsWithRecentChanges(user.id, since);

    const digestData: DigestData = {
      user,
      competitors,
      generated_at: new Date().toISOString(),
    };

    const msg = {
      to: user.email,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: generateSubject(competitors),
      text: generateDigestText(digestData),
      html: generateDigestHtml(digestData),
    };

    await sgMail.send(msg);

    // Mark changes as notified
    const changeIds = competitors.flatMap((c) => c.changes.map((ch) => ch.id));
    await db.markChangesNotified(changeIds);

    console.log(`  📧 Digest sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to send digest to ${user.email}:`, error);
    return false;
  }
}

function generateSubject(competitors: CompetitorWithChanges[]): string {
  const totalChanges = countTotalChanges(competitors);

  if (totalChanges === 0) {
    return 'RivalAlert: All quiet today';
  }

  const competitorsWithChanges = competitors.filter((c) => c.changes.length > 0);

  if (competitorsWithChanges.length === 1) {
    return `🔔 ${competitorsWithChanges[0].name}: ${totalChanges} change(s) detected`;
  }

  return `🔔 RivalAlert: ${totalChanges} change(s) from ${competitorsWithChanges.length} competitors`;
}

export async function sendAllDigests(): Promise<{ sent: number; failed: number }> {
  const users = await db.getAllUsers();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

  console.log(`\n=== Sending RivalAlert Digests to ${users.length} users ===\n`);

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const success = await sendDigestToUser(user, since);
    if (success) {
      sent++;
    } else {
      failed++;
    }

    // Small delay between emails
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`\n=== Digests Complete: ${sent} sent, ${failed} failed ===\n`);

  return { sent, failed };
}
