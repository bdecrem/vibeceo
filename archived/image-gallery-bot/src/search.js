const { createApi } = require('unsplash-js');
const fetch = require('node-fetch');
const logger = require('./logger');

class UnsplashSearcher {
  constructor(accessKey) {
    if (!accessKey || accessKey === 'DEMO_KEY_REPLACE_LATER') {
      logger.logWarning('Using demo mode - no real API calls will be made');
      this.demoMode = true;
    } else {
      this.demoMode = false;
      global.fetch = fetch;
      logger.logActivity('Initializing Unsplash API with key', { 
        keyLength: accessKey.length,
        keyPrefix: accessKey.substring(0, 4) + '...' 
      });
      this.unsplash = createApi({
        accessKey: accessKey,
      });
    }
  }

  // Generate demo data for testing
  generateDemoData(query, count) {
    const demoImages = [];
    for (let i = 0; i < count; i++) {
      demoImages.push({
        id: `demo-${Date.now()}-${i}`,
        urls: {
          regular: `https://picsum.photos/800/600?random=${Date.now()}-${i}`,
          small: `https://picsum.photos/400/300?random=${Date.now()}-${i}`,
          thumb: `https://picsum.photos/200/150?random=${Date.now()}-${i}`
        },
        user: {
          name: `Demo User ${i + 1}`,
          username: `demouser${i + 1}`,
          links: {
            html: 'https://unsplash.com'
          }
        },
        description: `Demo image for ${query}`,
        alt_description: `Placeholder image for ${query}`,
        links: {
          download: `https://via.placeholder.com/800x600?text=${encodeURIComponent(query + ' ' + (i + 1))}`
        }
      });
    }
    return demoImages;
  }

  async searchImages(query, count = 6) {
    try {
      logger.logActivity(`Searching for images: "${query}"`, { count });

      if (this.demoMode) {
        const demoData = this.generateDemoData(query, count);
        logger.logSuccess(`Demo mode: Generated ${demoData.length} placeholder images`);
        return this.formatImageData(demoData);
      }

      const result = await this.unsplash.search.getPhotos({
        query: query,
        perPage: count,
        orientation: 'landscape'
      });

      if (result.errors) {
        throw new Error(result.errors.join(', '));
      }

      const images = result.response.results;
      logger.logSuccess(`Found ${images.length} images for "${query}"`);
      
      return this.formatImageData(images);
    } catch (error) {
      logger.logError(`Failed to search images for "${query}"`, error);
      throw error;
    }
  }

  formatImageData(images) {
    return images.map(image => ({
      id: image.id,
      url: image.urls.regular,
      thumbUrl: image.urls.small,
      downloadUrl: image.links.download,
      author: {
        name: image.user.name,
        username: image.user.username,
        profileUrl: image.user.links.html
      },
      description: image.description || image.alt_description || 'No description',
      width: image.width,
      height: image.height
    }));
  }

  // Get a random image from search results
  async getRandomImage(query) {
    try {
      const images = await this.searchImages(query, 20);
      if (images.length === 0) {
        throw new Error('No images found');
      }
      const randomIndex = Math.floor(Math.random() * images.length);
      return images[randomIndex];
    } catch (error) {
      logger.logError(`Failed to get random image for "${query}"`, error);
      throw error;
    }
  }
}

module.exports = UnsplashSearcher;