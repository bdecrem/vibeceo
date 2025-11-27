/**
 * Report Output Generator
 * Generates markdown, HTML, or JSON reports
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedItem, AgentDefinition, EnrichedItem } from '@vibeceo/shared-types';

interface ReportConfig {
  format: 'markdown' | 'html' | 'json';
}

/**
 * Generate and upload report
 */
export async function generateAndUploadReport(
  items: NormalizedItem[],
  definition: AgentDefinition,
  supabase: SupabaseClient,
  agentVersionId: string,
  aiSummary?: string
): Promise<string> {
  console.log(`📄 Generating ${definition.output.report?.format || 'markdown'} report...`);

  const format = definition.output.report?.format || 'markdown';
  let content: string;

  switch (format) {
    case 'markdown':
      content = generateMarkdownReport(items, definition, aiSummary);
      break;
    case 'html':
      content = generateHTMLReport(items, definition, aiSummary);
      break;
    case 'json':
      content = generateJSONReport(items, definition);
      break;
    default:
      content = generateMarkdownReport(items, definition, aiSummary);
  }

  console.log(`   Generated report: ${content.length} characters`);

  // Upload to Supabase storage
  const reportUrl = await uploadReport(supabase, agentVersionId, content, format);
  console.log(`   Uploaded report: ${reportUrl}`);

  return reportUrl;
}

/**
 * Generate Markdown report
 */
export function generateMarkdownReport(
  items: NormalizedItem[],
  definition: AgentDefinition,
  aiSummary?: string
): string {
  const { metadata } = definition;

  let report = `# ${metadata.name}\n\n`;
  report += `${metadata.description}\n\n`;
  report += `**Generated**: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST\n\n`;
  report += `---\n\n`;

  // AI Summary section if available
  if (aiSummary) {
    report += `## AI Summary\n\n${aiSummary}\n\n---\n\n`;
  }

  // Items section
  report += `## Items (${items.length})\n\n`;

  for (const item of items) {
    const enriched = item as EnrichedItem;

    report += `### ${item.title || 'Untitled'}\n\n`;

    if (item.author) {
      report += `**Author**: ${item.author}\n`;
    }

    if (item.publishedAt) {
      report += `**Published**: ${new Date(item.publishedAt).toLocaleDateString()}\n`;
    }

    if (item.url) {
      report += `**URL**: ${item.url}\n`;
    }

    if (enriched.score !== undefined) {
      report += `**Relevance Score**: ${(enriched.score * 100).toFixed(1)}%\n`;
    }

    report += `\n`;

    if (item.summary) {
      report += `${item.summary}\n\n`;
    }

    if (enriched.keyPoints && enriched.keyPoints.length > 0) {
      report += `**Key Points**:\n`;
      for (const point of enriched.keyPoints) {
        report += `- ${point}\n`;
      }
      report += `\n`;
    }

    report += `---\n\n`;
  }

  return report;
}

/**
 * Generate HTML report with basic styling
 */
function generateHTMLReport(
  items: NormalizedItem[],
  definition: AgentDefinition,
  aiSummary?: string
): string {
  const { metadata } = definition;
  const markdown = generateMarkdownReport(items, definition, aiSummary);

  // Simple markdown to HTML conversion
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    h3 { color: #555; margin-top: 25px; }
    hr { border: none; border-top: 1px solid #ddd; margin: 30px 0; }
    a { color: #3498db; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .meta { color: #777; font-size: 0.9em; }
    .summary { background: #f8f9fa; padding: 15px; border-left: 3px solid #3498db; margin: 15px 0; }
    ul { margin: 10px 0; }
  </style>
</head>
<body>
${markdown.replace(/^# (.*)/gm, '<h1>$1</h1>')
          .replace(/^## (.*)/gm, '<h2>$1</h2>')
          .replace(/^### (.*)/gm, '<h3>$1</h3>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/^---$/gm, '<hr>')
          .replace(/^\- (.*)/gm, '<li>$1</li>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/^(.+)$/gm, '<p>$1</p>')
          .replace(/<p><h/g, '<h')
          .replace(/<\/h1><\/p>/g, '</h1>')
          .replace(/<\/h2><\/p>/g, '</h2>')
          .replace(/<\/h3><\/p>/g, '</h3>')
          .replace(/<p><hr><\/p>/g, '<hr>')
          .replace(/<p><li>/g, '<ul><li>')
          .replace(/<\/li><\/p>/g, '</li></ul>')}
</body>
</html>`;

  return html;
}

/**
 * Generate JSON report
 */
function generateJSONReport(
  items: NormalizedItem[],
  definition: AgentDefinition
): string {
  const report = {
    agent: {
      name: definition.metadata.name,
      description: definition.metadata.description,
      category: definition.metadata.category,
    },
    generated: new Date().toISOString(),
    itemCount: items.length,
    items: items.map(item => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      url: item.url,
      author: item.author,
      publishedAt: item.publishedAt,
      score: (item as EnrichedItem).score,
      relevanceReason: (item as EnrichedItem).relevanceReason,
      categories: (item as EnrichedItem).categories,
      keyPoints: (item as EnrichedItem).keyPoints,
    })),
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Upload report to Supabase storage
 */
async function uploadReport(
  supabase: SupabaseClient,
  agentVersionId: string,
  content: string,
  format: 'markdown' | 'html' | 'json'
): Promise<string> {
  const timestamp = Date.now();
  const extension = format === 'markdown' ? 'md' : format === 'html' ? 'html' : 'json';
  const filename = `agent-reports/${agentVersionId}/${timestamp}.${extension}`;

  const contentType =
    format === 'markdown' ? 'text/markdown' :
    format === 'html' ? 'text/html' :
    'application/json';

  const { data, error } = await supabase.storage
    .from('agent-outputs')
    .upload(filename, content, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload report: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('agent-outputs')
    .getPublicUrl(filename);

  return urlData.publicUrl;
}
