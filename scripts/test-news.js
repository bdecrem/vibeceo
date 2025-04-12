import { getNewsDiscussionTopic } from '../lib/discord/news.js';

async function testNewsFetching() {
    console.log('Testing news fetching...');
    try {
        const topic = await getNewsDiscussionTopic();
        if (topic) {
            console.log('\nSelected Topic:');
            console.log('Title:', topic.title);
            console.log('Description:', topic.description);
            console.log('URL:', topic.url);
            console.log('Published At:', topic.publishedAt);
            console.log('Score:', topic.score);
        } else {
            console.log('No suitable topic found');
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testNewsFetching(); 