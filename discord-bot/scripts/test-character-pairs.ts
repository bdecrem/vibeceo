import { setWatercoolerPairConfig, getRandomCharactersWithPairConfig } from '../lib/discord/characterPairs.js';

async function testCharacterPairs() {
  console.log('Setting up Donte and Kailey to appear together 100% of the time, with Kailey speaking first...');
  
  setWatercoolerPairConfig({
    coach1: 'donte',
    coach2: 'kailey',
    probability: 1.0,
    order: {
      first: 'kailey',  // Kailey speaks first
      second: 'donte'   // Donte responds
    }
  });

  // Run 5 tests to demonstrate
  console.log('\nRunning 5 character selections to verify:');
  for (let i = 0; i < 5; i++) {
    const selected = getRandomCharactersWithPairConfig(3);
    console.log(`\nSelection ${i + 1}:`);
    console.log('Selected characters:', selected.join(', '));
    console.log('Donte and Kailey both present:', selected.includes('donte') && selected.includes('kailey'));
    console.log('Kailey is first speaker:', selected[0] === 'kailey');
    console.log('Donte is second speaker:', selected[1] === 'donte');
  }

  console.log('\nTest complete!');
}

// Run the test
testCharacterPairs().catch(console.error); 