/**
 * Simple Stock Agent Test
 * 
 * Tests the stock agent without requiring database or external APIs
 */

// Mock environment variables
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'mock-key';
process.env.ALPHA_VANTAGE_API_KEY = 'mock-key';

// Mock Twilio client for testing
const mockTwilioClient = {
  messages: {
    create: async (params) => {
      console.log(`📱 MOCK SMS SENT:`);
      console.log(`   To: ${params.to}`);
      console.log(`   From: ${params.from}`);
      console.log(`   Body: ${params.body}`);
      console.log(`   ---`);
      return { sid: `TEST${Date.now()}`, status: 'sent' };
    }
  }
};

// Test phone number
const testPhone = '+1234567890';

// Test cases
const testCases = [
  {
    name: 'Help Command',
    message: 'HELP',
    description: 'Should show available stock commands'
  },
  {
    name: 'Stock Price Query',
    message: 'STOCK AAPL',
    description: 'Should return Apple stock price and 7-day change'
  },
  {
    name: 'Add to Watchlist',
    message: 'WATCH TSLA',
    description: 'Should add Tesla to watchlist'
  },
  {
    name: 'Portfolio View',
    message: 'PORTFOLIO',
    description: 'Should show watched stocks'
  },
  {
    name: 'Stock Analysis',
    message: 'ANALYZE MSFT',
    description: 'Should provide AI analysis of Microsoft'
  },
  {
    name: 'Alerts Management',
    message: 'ALERTS',
    description: 'Should show alert management options'
  },
  {
    name: 'General Stock Question',
    message: 'What stocks should I buy?',
    description: 'Should provide conversational AI response'
  }
];

async function runTests() {
  console.log('🧪 === SIMPLE STOCK AGENT TESTING ===\n');
  
  try {
    // Import the stock agent after setting up mocks
    const { handleStockAgent } = await import('./dist/lib/sms/stock-agent.js');
    
    // Run test cases
    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`);
      console.log(`📝 Description: ${testCase.description}`);
      console.log(`💬 Message: "${testCase.message}"`);
      console.log('─'.repeat(50));
      
      try {
        const startTime = Date.now();
        const handled = await handleStockAgent(testCase.message, mockTwilioClient, testPhone);
        const duration = Date.now() - startTime;
        
        if (handled) {
          console.log(`✅ Test passed (${duration}ms)`);
        } else {
          console.log(`❌ Test failed - command not handled`);
        }
      } catch (error) {
        console.log(`❌ Test failed with error: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
      }
      
      console.log('─'.repeat(50));
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🎉 === TESTING COMPLETE ===');
    console.log('📊 Check the output above to verify stock agent functionality');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
