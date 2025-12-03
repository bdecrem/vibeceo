const ImageGalleryBot = require('./src/main');

async function test() {
  console.log('Creating bot...');
  const bot = new ImageGalleryBot();
  
  console.log('Loading config...');
  await bot.loadConfig();
  
  console.log('Config loaded:', {
    topic: bot.config.currentTopic,
    hasKey: bot.config.unsplashAccessKey !== 'DEMO_KEY_REPLACE_LATER'
  });
  
  console.log('Running bot...');
  await bot.run();
  
  console.log('Done!');
}

test().catch(console.error);