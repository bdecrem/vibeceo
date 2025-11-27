/**
 * File Export Output Handler
 * Export items to CSV, JSON, or Markdown files
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import type { NormalizedItem, AgentMetadata, OutputConfig, EnrichedItem } from '@vibeceo/shared-types';

/**
 * Export items to file (CSV/JSON/Markdown)
 */
export async function exportToFile(
  items: NormalizedItem[],
  config: OutputConfig['file'],
  agentMetadata: AgentMetadata
): Promise<boolean> {
  if (!config || !config.enabled) {
    console.log('   File export is disabled');
    return false;
  }

  const format = config.format || 'json';
  console.log(`📁 Exporting ${items.length} item(s) to ${format.toUpperCase()} file...`);

  try {
    // Generate filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = config.filename || `agent-export-${agentMetadata.slug}-${timestamp}.${format}`;

    // Determine export directory
    const exportDir = process.env.AGENT_EXPORT_DIR || './exports';
    const filepath = join(exportDir, filename);

    // Generate file content based on format
    let content: string;
    switch (format) {
      case 'csv':
        content = exportToCSV(items, agentMetadata);
        break;
      case 'json':
        content = exportToJSON(items, agentMetadata);
        break;
      case 'markdown':
        content = exportToMarkdown(items, agentMetadata);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Write to file
    await writeFile(filepath, content, 'utf-8');

    console.log(`   ✅ Exported to: ${filepath}`);
    return true;

  } catch (error: any) {
    console.error(`   ❌ File export failed: ${error.message}`);
    return false;
  }
}

/**
 * Export items to CSV format
 */
function exportToCSV(items: NormalizedItem[], metadata: AgentMetadata): string {
  // CSV header
  const headers = [
    'Title',
    'Summary',
    'URL',
    'Author',
    'Published At',
    'Score',
    'Relevance Reason',
    'Key Points',
    'Agent Name',
    'Exported At',
  ];

  // CSV rows
  const rows = items.map(item => {
    const enriched = item as EnrichedItem;
    return [
      escapeCSV(item.title || ''),
      escapeCSV(item.summary || ''),
      escapeCSV(item.url || ''),
      escapeCSV(item.author || ''),
      escapeCSV(item.publishedAt || ''),
      escapeCSV(String(enriched.score || '')),
      escapeCSV(enriched.relevanceReason || ''),
      escapeCSV(enriched.keyPoints?.join('; ') || ''),
      escapeCSV(metadata.name),
      escapeCSV(new Date().toISOString()),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export items to JSON format
 */
function exportToJSON(items: NormalizedItem[], metadata: AgentMetadata): string {
  const data = {
    agent: {
      name: metadata.name,
      description: metadata.description,
      category: metadata.category,
    },
    exportedAt: new Date().toISOString(),
    itemCount: items.length,
    items: items.map(item => {
      const enriched = item as EnrichedItem;
      return {
        id: item.id,
        title: item.title,
        summary: item.summary,
        url: item.url,
        author: item.author,
        publishedAt: item.publishedAt,
        score: enriched.score,
        relevanceReason: enriched.relevanceReason,
        categories: enriched.categories,
        keyPoints: enriched.keyPoints,
        sentiment: enriched.sentiment,
      };
    }),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Export items to Markdown format
 */
function exportToMarkdown(items: NormalizedItem[], metadata: AgentMetadata): string {
  let markdown = `# ${metadata.name}\n\n`;
  markdown += `${metadata.description}\n\n`;
  markdown += `**Exported**: ${new Date().toLocaleString()}\n`;
  markdown += `**Items**: ${items.length}\n\n`;
  markdown += `---\n\n`;

  for (const item of items) {
    const enriched = item as EnrichedItem;

    markdown += `## ${item.title || 'Untitled'}\n\n`;

    if (item.author) {
      markdown += `**Author**: ${item.author}\n`;
    }

    if (item.publishedAt) {
      markdown += `**Published**: ${new Date(item.publishedAt).toLocaleDateString()}\n`;
    }

    if (item.url) {
      markdown += `**URL**: ${item.url}\n`;
    }

    if (enriched.score !== undefined) {
      markdown += `**Score**: ${enriched.score}\n`;
    }

    markdown += `\n`;

    if (item.summary) {
      markdown += `${item.summary}\n\n`;
    }

    if (enriched.relevanceReason) {
      markdown += `**Why Relevant**: ${enriched.relevanceReason}\n\n`;
    }

    if (enriched.keyPoints && enriched.keyPoints.length > 0) {
      markdown += `**Key Points**:\n`;
      for (const point of enriched.keyPoints) {
        markdown += `- ${point}\n`;
      }
      markdown += `\n`;
    }

    markdown += `---\n\n`;
  }

  return markdown;
}

/**
 * Escape string for CSV (handle quotes and commas)
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
