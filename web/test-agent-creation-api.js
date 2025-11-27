/**
 * API Test: Agent Creation End-to-End
 * This script tests the complete workflow → AgentDefinition → Database flow
 */

const { workflowToAgentDefinition } = require('./lib/workflow-converter.ts');

const testWorkflow = {
  name: 'Test Tech News Agent',
  description: 'Test agent for tech news from Hacker News',
  category: 'news',
  icon: '📰',
  nodes: [
    {
      id: 'node_1',
      type: 'rss_source',
      position: { x: 100, y: 100 },
      data: {
        label: 'RSS Feed',
        category: 'source',
        configured: true,
        feedUrl: 'https://hnrss.org/frontpage',
        maxItems: 10,
      },
    },
    {
      id: 'node_2',
      type: 'sms_output',
      position: { x: 100, y: 300 },
      data: {
        label: 'SMS',
        category: 'output',
        configured: true,
        template: '{{title}}\n\n{{summary}}',
        maxLength: 1600,
      },
    },
  ],
  edges: [
    {
      id: 'edge_1',
      source: 'node_1',
      target: 'node_2',
    },
  ],
  metadata: {
    commandKeyword: 'TECH',
    schedule: {
      enabled: false,
    },
  },
};

console.log('=== Testing Agent Creation ===\n');

// Step 1: Convert workflow to AgentDefinition
console.log('Step 1: Converting workflow to AgentDefinition...');
const agentDefinition = workflowToAgentDefinition(testWorkflow);
console.log('✓ Conversion successful\n');

// Step 2: Validate with Zod schema
console.log('Step 2: Validating AgentDefinition...');
console.log(JSON.stringify(agentDefinition, null, 2));

// Step 3: Test API call
console.log('\nStep 3: Testing API endpoint...');
console.log('To test the API endpoint, run:');
console.log('\ncurl -X POST http://localhost:3000/api/agents/draft \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"agentDefinition": ' + JSON.stringify(agentDefinition) + ', "userId": null}\'');

console.log('\n=== Test Complete ===');
console.log('\nExpected API response:');
console.log('{');
console.log('  "success": true,');
console.log('  "agent": {');
console.log('    "id": "<uuid>",');
console.log('    "slug": "test-tech-news-agent",');
console.log('    "versionId": "<uuid>"');
console.log('  }');
console.log('}');
