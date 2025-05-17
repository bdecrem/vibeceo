// Import the necessary modules
const { sendEventMessage } = require('../dist/lib/discord/eventMessages.js');
const { initializeMicroEventMessages } = require('../dist/lib/discord/microPosts.js');

// Mock the TextChannel for testing
const mockChannel = {
  send: async (message) => {
    console.log('[MOCK] Channel.send called with message:');
    console.log(message);
    return { id: 'mock-message-id' };
  },
  client: {
    channels: {
      fetch: async () => mockChannel
    }
  }
};

// Main test function
async function testMicroPostIntro() {
  console.log('=== Testing Micropost Intro Messages ===');
  
  // Initialize the micro event messages (similar to scheduler initialization)
  initializeMicroEventMessages();
  
  // Get current time for the event message
  const now = new Date();
  const gmtHour = now.getUTCHours();
  const gmtMinutes = now.getUTCMinutes();
  
  // Test each of the micropost services
  const micropostServices = [
    'coachquotes',
    'crowdfaves',
    'microclass',
    'upcomingevent'
  ];
  
  // Test intro messages for each service
  for (const service of micropostServices) {
    console.log(`\n--- Testing ${service} intro message ---`);
    await sendEventMessage(
      mockChannel,
      service,
      true, // isIntro
      gmtHour,
      gmtMinutes
    );
  }
  
  console.log('\n=== Testing Complete ===');
}

// Run the test
testMicroPostIntro()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed with error:', error);
    process.exit(1);
  }); 