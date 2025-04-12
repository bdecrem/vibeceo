import { startDiscussion, addToDiscussion, testHelpers } from './index.js';

async function testDiscussionFlow() {
    console.log('Testing discussion flow...');

    // Reset discussion state
    testHelpers.resetDiscussionState();

    // Mock news story
    const mockStory = {
        title: "AI Startup Raises $100M in Series B",
        description: "Revolutionary AI company secures major funding round led by top VCs.",
        url: "https://example.com/news",
        publishedAt: new Date().toISOString()
    };

    try {
        // Start discussion
        console.log('\nStarting discussion...');
        const started = await startDiscussion(mockStory);
        console.log('Discussion started:', started);

        // Simulate coach participation
        const coaches = ['donte', 'alex', 'rohan', 'venus', 'eljas', 'kailey'];
        
        // Each coach participates twice
        for (let round = 0; round < 2; round++) {
            for (const coach of coaches) {
                console.log(`\nAdding message from ${coach}...`);
                await addToDiscussion(coach);
                
                // Get current state
                const state = testHelpers.getDiscussionState();
                console.log('Current participation:', state.participationCount);
                console.log('Total messages:', state.messageCount);
            }
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testDiscussionFlow(); 