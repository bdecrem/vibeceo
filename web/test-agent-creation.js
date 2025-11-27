/**
 * Test script to verify agent creation works end-to-end
 */

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
    commandKeyword: 'TEST',
    schedule: {
      enabled: false,
    },
  },
};

console.log('Test Workflow Definition:');
console.log(JSON.stringify(testWorkflow, null, 2));

// Import the converter
const path = require('path');
const converterPath = path.join(__dirname, 'lib', 'workflow-converter.ts');
console.log('\nConverter path:', converterPath);
console.log('\nTo test:');
console.log('1. Open http://localhost:3000/agents/new');
console.log('2. Click "RSS Feed" in the left sidebar');
console.log('3. Click the RSS node and configure:');
console.log('   - Feed URL: https://hnrss.org/frontpage');
console.log('   - Max Items: 10');
console.log('4. Click "SMS" in the left sidebar (Output tab)');
console.log('5. Click the SMS node and configure:');
console.log('   - Template: {{title}}\\n\\n{{summary}}');
console.log('6. Drag from RSS bottom handle to SMS top handle to connect');
console.log('7. Set agent name: "Test Tech News Agent"');
console.log('8. Click Settings button');
console.log('9. Enter command keyword: "test"');
console.log('10. Click Done');
console.log('11. Click "Save Draft"');
console.log('\nExpected result: "Agent saved successfully!" with slug and ID');
