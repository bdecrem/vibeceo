const { setWatercoolerPairConfig } = require('../lib/discord/characterPairs');

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
  console.log('2. Type: !waterheater-admin Donte\'s dog is staying with him for a week and it\'s interrupting his sense of control.');
  console.log('3. Then type: !waterheater');
  console.log('\nThis will start the conversation with Donte speaking first about his dog situation.');
}

testWaterheater().catch(console.error); 