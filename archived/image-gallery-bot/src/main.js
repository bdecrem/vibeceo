const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');
const UnsplashSearcher = require('./search');
const downloader = require('./download');
const gallery = require('./gallery');

class ImageGalleryBot {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.configPath = path.join(this.projectRoot, 'config.json');
    this.config = null;
    this.searcher = null;
  }

  async loadConfig() {
    try {
      this.config = await fs.readJson(this.configPath);
      
      // Load API key from .env.local if it exists
      const envPath = path.join(this.projectRoot, '.env.local');
      if (await fs.pathExists(envPath)) {
        const envContent = await fs.readFile(envPath, 'utf8');
        const match = envContent.match(/UNSPLASH_ACCESS_KEY=(.+)/);
        if (match && match[1]) {
          this.config.unsplashAccessKey = match[1].trim();
          logger.logActivity('Loaded API key from .env.local');
        }
      }
      
      logger.logActivity('Configuration loaded', { 
        currentTopic: this.config.currentTopic,
        queueLength: this.config.topicQueue.length,
        hasApiKey: this.config.unsplashAccessKey !== 'DEMO_KEY_REPLACE_LATER'
      });
      return this.config;
    } catch (error) {
      logger.logError('Failed to load configuration', error);
      throw new Error('Cannot proceed without valid configuration');
    }
  }

  async saveConfig() {
    try {
      await fs.writeJson(this.configPath, this.config, { spaces: 2 });
      logger.logActivity('Configuration saved');
    } catch (error) {
      logger.logError('Failed to save configuration', error);
      throw error;
    }
  }

  rotateTopic() {
    if (!this.config.topicQueue || this.config.topicQueue.length === 0) {
      logger.logWarning('Topic queue is empty, keeping current topic');
      return;
    }

    // Move current topic to end of queue
    this.config.topicQueue.push(this.config.currentTopic);
    
    // Set new current topic from front of queue
    this.config.currentTopic = this.config.topicQueue.shift();
    
    logger.logActivity('Topic rotated', { 
      newTopic: this.config.currentTopic,
      queueLength: this.config.topicQueue.length 
    });
  }

  async run() {
    try {
      logger.logActivity('=== Starting Image Gallery Bot ===');
      
      // Load configuration
      await this.loadConfig();
      
      // Initialize Unsplash searcher
      this.searcher = new UnsplashSearcher(this.config.unsplashAccessKey);
      
      // Log current topic
      logger.logActivity(`Processing topic: "${this.config.currentTopic}"`);
      
      // Search for images
      const searchResults = await this.searcher.searchImages(
        this.config.currentTopic, 
        this.config.maxImages || 6
      );
      
      if (searchResults.length === 0) {
        logger.logWarning('No images found for current topic');
        this.rotateTopic();
        await this.saveConfig();
        return;
      }
      
      // Download images
      const downloadResults = await downloader.downloadBatch(
        searchResults, 
        this.config.currentTopic
      );
      
      if (downloadResults.succeeded.length === 0) {
        logger.logError('No images were successfully downloaded');
        return;
      }
      
      // Generate gallery
      const galleryResult = await gallery.generateGallery(
        this.config.currentTopic,
        downloadResults.succeeded,
        this.config.galleryTemplate || 'modern'
      );
      
      // Generate index page
      await gallery.generateIndexPage();
      
      // Update configuration
      this.config.lastRun = new Date().toISOString();
      this.rotateTopic();
      await this.saveConfig();
      
      // Cleanup old images (optional)
      const cleanedUp = await downloader.cleanupOldImages(7);
      if (cleanedUp > 0) {
        logger.logActivity(`Cleaned up ${cleanedUp} old images`);
      }
      
      // Final summary
      logger.logSuccess('=== Bot Run Completed Successfully ===', {
        topic: galleryResult.topic,
        imagesDownloaded: downloadResults.succeeded.length,
        galleryFile: galleryResult.filename,
        nextTopic: this.config.currentTopic
      });
      
      return galleryResult;
    } catch (error) {
      logger.logError('Bot run failed', error);
      throw error;
    }
  }

  async runContinuously(intervalMinutes = 60) {
    logger.logActivity(`Starting continuous operation (interval: ${intervalMinutes} minutes)`);
    
    // Run immediately
    await this.run();
    
    // Schedule future runs
    setInterval(async () => {
      try {
        await this.run();
      } catch (error) {
        logger.logError('Scheduled run failed', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  // Utility method to add new topics
  async addTopic(topic) {
    await this.loadConfig();
    if (!this.config.topicQueue.includes(topic)) {
      this.config.topicQueue.push(topic);
      await this.saveConfig();
      logger.logActivity(`Added new topic to queue: "${topic}"`);
    }
  }

  // Utility method to check status
  async getStatus() {
    await this.loadConfig();
    const galleries = await gallery.getGalleries();
    const recentImages = await downloader.getDownloadedImages();
    
    return {
      currentTopic: this.config.currentTopic,
      topicQueue: this.config.topicQueue,
      lastRun: this.config.lastRun,
      totalGalleries: galleries.length,
      recentGalleries: galleries.slice(0, 5),
      totalImages: recentImages.length
    };
  }
}

// Main execution
if (require.main === module) {
  const bot = new ImageGalleryBot();
  
  // Add unhandled rejection handler
  process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    process.exit(1);
  });
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'continuous':
      const interval = parseInt(args[1]) || 60;
      bot.runContinuously(interval).catch(console.error);
      break;
      
    case 'add-topic':
      if (args[1]) {
        bot.addTopic(args[1])
          .then(() => process.exit(0))
          .catch(error => {
            console.error(error);
            process.exit(1);
          });
      } else {
        console.error('Please provide a topic to add');
        process.exit(1);
      }
      break;
      
    case 'status':
      bot.getStatus()
        .then(status => {
          console.log('Bot Status:', JSON.stringify(status, null, 2));
          process.exit(0);
        })
        .catch(error => {
          console.error(error);
          process.exit(1);
        });
      break;
      
    default:
      // Run once
      bot.run()
        .then(() => {
          logger.logActivity('Bot execution completed');
          process.exit(0);
        })
        .catch(error => {
          logger.logError('Bot execution failed', error);
          process.exit(1);
        });
  }
}

module.exports = ImageGalleryBot;