import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { postTweet } = await import('../lib/twitter-client.js');

const result = await postTweet("Hello world.", { account: "intheamber" });
console.log(result);
