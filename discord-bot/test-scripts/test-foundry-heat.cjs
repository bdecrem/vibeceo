// Import necessary modules
const { triggerMicroPost } = require('../dist/lib/discord/microPosts.js');

// Mock Discord client
const mockClient = {
  channels: {
    cache: new Map(),
    fetch: async () => ({})
  }
};

// Test each micropost type
async function testFoundryHeatMessages() {
  console.log('=== Testing Foundry Heat Message Format ===\n');
  
  // Test each micropost type
  const micropostTypes = [
    "coach-quotes",
    "crowd-faves",
    "microclass",
    "upcoming-events"
  ];
  
  for (const postType of micropostTypes) {
    console.log(`\n--- Testing ${postType} ---`);
    
    // Mock the webhook send function for testing
    const originalSend = global.WebhookClient.prototype.send;
    global.WebhookClient.prototype.send = function(options) {
      console.log('Foundry Heat message:');
      console.log(options.content);
      return Promise.resolve({ id: 'mock-message-id' });
    };
    
    // Generate the post
    try {
      await triggerMicroPost(postType, "dummy-channel", mockClient);
    } catch (error) {
      console.error(`Error testing ${postType}:`, error);
    }
    
    // Restore the original send function
    global.WebhookClient.prototype.send = originalSend;
  }
  
  console.log('\n=== Testing Complete ===');
}

// Mock the WebhookClient class
global.WebhookClient = class WebhookClient {
  constructor() {}
  send(options) {
    return Promise.resolve({ id: 'mock-message-id' });
  }
};

// Run the tests
testFoundryHeatMessages()
  .then(() => console.log('All tests completed'))
  .catch(error => console.error('Test failed:', error)); 