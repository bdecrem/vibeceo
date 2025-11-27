/**
 * Email Output Handler
 * Sends email output using Handlebars templates
 */

import Handlebars from 'handlebars';
import type { NormalizedItem, AgentMetadata, OutputConfig, EnrichedItem } from '@vibeceo/shared-types';

/**
 * Send email to recipients with template rendering
 */
export async function sendEmail(
  items: NormalizedItem[],
  config: OutputConfig['email'],
  agentMetadata: AgentMetadata
): Promise<boolean> {
  if (!config || !config.enabled) {
    console.log('   Email output is disabled');
    return false;
  }

  console.log(`📧 Sending email to ${config.to.length} recipient(s)...`);

  // Check for required credentials
  const sendgridKey = process.env.SENDGRID_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!sendgridKey && !(smtpHost && smtpUser && smtpPass)) {
    console.log('   ⚠️  Missing email credentials (SENDGRID_API_KEY or SMTP_* env vars)');
    return false;
  }

  try {
    // Compile Handlebars template
    const template = Handlebars.compile(config.template);

    // Prepare template data
    const data = {
      agentName: agentMetadata.name,
      agentDescription: agentMetadata.description,
      count: items.length,
      items: items.map(item => ({
        title: item.title || 'Untitled',
        summary: item.summary || '',
        url: item.url || '',
        author: item.author || '',
        publishedAt: item.publishedAt ? formatDate(item.publishedAt) : '',
        score: (item as EnrichedItem).score,
        relevanceReason: (item as EnrichedItem).relevanceReason,
        keyPoints: (item as EnrichedItem).keyPoints || [],
      })),
      generatedAt: new Date().toISOString(),
    };

    // Render email body
    const emailBody = template(data);

    // Send via SendGrid or SMTP
    if (sendgridKey) {
      await sendViaSendGrid(sendgridKey, config.to, config.subject, emailBody);
    } else {
      await sendViaSMTP(
        { host: smtpHost!, user: smtpUser!, pass: smtpPass! },
        config.to,
        config.subject,
        emailBody
      );
    }

    console.log('   ✅ Email sent successfully');
    return true;

  } catch (error: any) {
    console.error(`   ❌ Email send failed: ${error.message}`);
    return false;
  }
}

/**
 * Send email via SendGrid API
 */
async function sendViaSendGrid(
  apiKey: string,
  to: string[],
  subject: string,
  html: string
): Promise<void> {
  const sgMail = await import('@sendgrid/mail');
  sgMail.default.setApiKey(apiKey);

  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@kochi.to',
    subject,
    html,
  };

  await sgMail.default.send(msg);
}

/**
 * Send email via SMTP (using Nodemailer)
 */
async function sendViaSMTP(
  smtp: { host: string; user: string; pass: string },
  to: string[],
  subject: string,
  html: string
): Promise<void> {
  const nodemailer = await import('nodemailer');

  const transporter = nodemailer.default.createTransport({
    host: smtp.host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM_EMAIL || 'noreply@kochi.to',
    to: to.join(', '),
    subject,
    html,
  });
}

/**
 * Format date for email display
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
