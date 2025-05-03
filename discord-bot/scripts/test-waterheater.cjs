const { setWatercoolerPairConfig } = require('../dist/lib/discord/characterPairs.js');

async function testWaterheater() {
  console.log('Setting up Donte as first speaker for waterheater chat...');
  
  // Set up character pair configuration
  setWatercoolerPairConfig({
    coach1: 'donte',
    coach2: 'donte',  // Using same character since we only care about first speaker
    probability: 1.0,  // 100% chance to use this configuration
    order: {
      first: 'donte',  // Donte must speak first
      second: 'any'    // Don't care about second speaker
    }
  });

  console.log('\nCharacter configuration complete!');
  console.log('\nNow you need to:');
  console.log('1. Go to Discord');
  console.log('2. Type: !waterheater-admin My dog is staying with me for a week and disrupting my carefully controlled environment. How do you handle unexpected chaos?');
  console.log('3. Then type: !waterheater');
  console.log('\nThis will start a conversation where:');
  console.log('- Donte will speak first, initiating the topic about his dog situation');
  console.log('- Two other coaches will respond to Donte\'s question about handling disruptions');
  console.log('- Then there will be a second round of conversation');
  console.log('\nThe conversation will have 6 messages total (2 rounds of 3 messages each).');
}

testWaterheater().catch(console.error); 