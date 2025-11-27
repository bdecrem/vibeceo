/**
 * Code Generator
 * Generates formatted TypeScript/JSON code from workflow definitions
 */

import type { AgentDefinition } from '@vibeceo/shared-types';
import type { WorkflowDefinition } from './workflow-types';
import { workflowToAgentDefinition } from './workflow-converter';

export type CodeFormat = 'typescript' | 'json';

/**
 * Generate formatted code from workflow
 */
export function generateCode(workflow: WorkflowDefinition, format: CodeFormat = 'typescript'): string {
  const agentDef = workflowToAgentDefinition(workflow);

  if (format === 'json') {
    return generateJSON(agentDef);
  } else {
    return generateTypeScript(agentDef);
  }
}

/**
 * Generate formatted JSON representation
 */
function generateJSON(agentDef: AgentDefinition): string {
  return JSON.stringify(agentDef, null, 2);
}

/**
 * Generate TypeScript code representation
 */
function generateTypeScript(agentDef: AgentDefinition): string {
  const lines: string[] = [];

  // Header
  lines.push(`import type { AgentDefinition } from '@vibeceo/shared-types';`);
  lines.push('');
  lines.push('/**');
  lines.push(` * ${agentDef.metadata.name}`);
  lines.push(` * ${agentDef.metadata.description}`);
  lines.push(' */');
  lines.push('export const agentDefinition: AgentDefinition = {');
  lines.push('  metadata: {');
  lines.push(`    name: '${agentDef.metadata.name}',`);
  lines.push(`    slug: '${agentDef.metadata.slug}',`);
  lines.push(`    description: '${agentDef.metadata.description}',`);
  lines.push(`    category: '${agentDef.metadata.category}',`);
  lines.push(`    tags: ${JSON.stringify(agentDef.metadata.tags)},`);
  lines.push(`    version: '${agentDef.metadata.version}',`);
  if (agentDef.metadata.icon) {
    lines.push(`    icon: '${agentDef.metadata.icon}',`);
  }
  lines.push('  },');
  lines.push('');

  // Triggers
  lines.push('  triggers: {');
  if (agentDef.triggers.commands && agentDef.triggers.commands.length > 0) {
    lines.push('    commands: [');
    agentDef.triggers.commands.forEach((cmd, idx) => {
      const comma = idx < agentDef.triggers.commands!.length - 1 ? ',' : '';
      lines.push(`      { keyword: '${cmd.keyword}', description: '${cmd.description}' }${comma}`);
    });
    lines.push('    ],');
  } else {
    lines.push('    commands: [],');
  }

  if (agentDef.triggers.schedule) {
    lines.push('    schedule: {');
    lines.push(`      enabled: ${agentDef.triggers.schedule.enabled},`);
    lines.push(`      cron: '${agentDef.triggers.schedule.cron}',`);
    lines.push('    },');
  }
  lines.push('  },');
  lines.push('');

  // Sources
  lines.push('  sources: [');
  agentDef.sources.forEach((source, idx) => {
    const comma = idx < agentDef.sources.length - 1 ? ',' : '';

    if (source.kind === 'builtin') {
      const builtin = source as any;
      lines.push('    {');
      lines.push(`      kind: 'builtin',`);
      lines.push(`      sourceType: '${builtin.sourceType}',`);

      // Add source-specific properties
      if (builtin.feedUrl) lines.push(`      feedUrl: '${builtin.feedUrl}',`);
      if (builtin.url) lines.push(`      url: '${builtin.url}',`);
      if (builtin.query) lines.push(`      query: '${builtin.query}',`);
      if (builtin.method) lines.push(`      method: '${builtin.method}',`);
      if (builtin.jsonPath) lines.push(`      jsonPath: '${builtin.jsonPath}',`);
      if (builtin.extractMode) lines.push(`      extractMode: '${builtin.extractMode}',`);
      if (builtin.headers) lines.push(`      headers: ${JSON.stringify(builtin.headers)},`);
      if (builtin.selectors) lines.push(`      selectors: ${JSON.stringify(builtin.selectors)},`);

      lines.push(`      maxItems: ${builtin.maxItems || 10},`);
      lines.push(`    }${comma}`);
    } else {
      lines.push(`    ${JSON.stringify(source)}${comma}`);
    }
  });
  lines.push('  ],');
  lines.push('');

  // Collation
  lines.push('  collation: {');
  lines.push(`    strategy: '${agentDef.collation.strategy}',`);
  lines.push(`    maxTotalItems: ${agentDef.collation.maxTotalItems},`);
  lines.push('  },');
  lines.push('');

  // Pipeline
  lines.push('  pipeline: [');
  agentDef.pipeline.forEach((step, idx) => {
    const comma = idx < agentDef.pipeline.length - 1 ? ',' : '';
    const stepStr = JSON.stringify(step, null, 2)
      .split('\n')
      .map((line, i) => (i === 0 ? `    ${line}` : `    ${line}`))
      .join('\n');
    lines.push(`${stepStr}${comma}`);
  });
  lines.push('  ],');
  lines.push('');

  // Output
  lines.push('  output: {');

  if (agentDef.output.sms) {
    lines.push('    sms: {');
    lines.push(`      enabled: ${agentDef.output.sms.enabled},`);
    lines.push(`      template: '${agentDef.output.sms.template}',`);
    lines.push(`      maxLength: ${agentDef.output.sms.maxLength},`);
    lines.push('    },');
  }

  if (agentDef.output.email) {
    const email = agentDef.output.email as any;
    lines.push('    email: {');
    lines.push(`      enabled: ${email.enabled},`);
    lines.push(`      to: '${email.to}',`);
    lines.push(`      subject: '${email.subject}',`);
    lines.push(`      template: '${email.template || email.body || ''}',`);
    lines.push('    },');
  }

  if (agentDef.output.webhook) {
    const webhook = agentDef.output.webhook as any;
    lines.push('    webhook: {');
    lines.push(`      enabled: ${webhook.enabled},`);
    lines.push(`      url: '${webhook.url}',`);
    lines.push(`      method: '${webhook.method || 'POST'}',`);
    lines.push('    },');
  }

  if (agentDef.output.slack) {
    const slack = agentDef.output.slack as any;
    lines.push('    slack: {');
    lines.push(`      enabled: ${slack.enabled},`);
    lines.push(`      channel: '${slack.channel}',`);
    lines.push(`      template: '${slack.template || slack.message || ''}',`);
    lines.push('    },');
  }

  if (agentDef.output.discord) {
    const discord = agentDef.output.discord as any;
    lines.push('    discord: {');
    lines.push(`      enabled: ${discord.enabled},`);
    lines.push(`      webhookUrl: '${discord.webhookUrl}',`);
    lines.push(`      template: '${discord.template || discord.message || ''}',`);
    lines.push('    },');
  }

  if (agentDef.output.twitter) {
    const twitter = agentDef.output.twitter as any;
    lines.push('    twitter: {');
    lines.push(`      enabled: ${twitter.enabled},`);
    lines.push(`      template: '${twitter.template || twitter.tweet || ''}',`);
    lines.push('    },');
  }

  if (agentDef.output.notification) {
    lines.push('    notification: {');
    lines.push(`      enabled: ${agentDef.output.notification.enabled},`);
    lines.push(`      title: '${agentDef.output.notification.title}',`);
    lines.push(`      body: '${agentDef.output.notification.body}',`);
    lines.push('    },');
  }

  if (agentDef.output.database) {
    lines.push('    database: {');
    lines.push(`      enabled: ${agentDef.output.database.enabled},`);
    lines.push(`      table: '${agentDef.output.database.table}',`);
    lines.push(`      connectionString: '${agentDef.output.database.connectionString}',`);
    lines.push('    },');
  }

  if (agentDef.output.sheets) {
    lines.push('    sheets: {');
    lines.push(`      enabled: ${agentDef.output.sheets.enabled},`);
    lines.push(`      spreadsheetId: '${agentDef.output.sheets.spreadsheetId}',`);
    lines.push(`      sheetName: '${agentDef.output.sheets.sheetName}',`);
    lines.push('    },');
  }

  if (agentDef.output.file) {
    const file = agentDef.output.file as any;
    lines.push('    file: {');
    lines.push(`      enabled: ${file.enabled},`);
    lines.push(`      format: '${file.format}',`);
    lines.push(`      filename: '${file.filename || file.path || 'output'}',`);
    lines.push('    },');
  }

  lines.push('  },');
  lines.push('};');

  return lines.join('\n');
}

/**
 * Get language identifier for Monaco Editor
 */
export function getLanguage(format: CodeFormat): 'typescript' | 'json' {
  return format === 'typescript' ? 'typescript' : 'json';
}
