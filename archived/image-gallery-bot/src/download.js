const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

class ImageDownloader {
  constructor() {
    this.imagesDir = path.join(__dirname, '..', 'images');
    fs.ensureDirSync(this.imagesDir);
  }

  sanitizeFilename(filename) {
    // Remove or replace characters that might cause issues in filenames
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }

  generateFilename(topic, imageId, index) {
    const timestamp = Date.now();
    const sanitizedTopic = this.sanitizeFilename(topic);
    return `${sanitizedTopic}-${index}-${imageId}-${timestamp}.jpg`;
  }

  async downloadImage(imageData, topic, index) {
    const filename = this.generateFilename(topic, imageData.id, index);
    const filepath = path.join(this.imagesDir, filename);

    try {
      logger.logActivity(`Downloading image ${index + 1}: ${imageData.id}`);

      // For demo/placeholder images, just save the URL reference
      if (imageData.url.includes('placeholder')) {
        const metadata = {
          ...imageData,
          downloadedAt: new Date().toISOString(),
          topic,
          filename
        };
        await fs.writeJson(filepath.replace('.jpg', '.json'), metadata, { spaces: 2 });
        logger.logSuccess(`Saved placeholder metadata: ${filename}`);
        return { ...metadata, filepath };
      }

      // Download actual image
      const response = await axios({
        method: 'GET',
        url: imageData.url,
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'ImageGalleryBot/1.0'
        }
      });

      // Create write stream
      const writer = fs.createWriteStream(filepath);

      // Pipe the response data to the file
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', async () => {
          logger.logSuccess(`Downloaded: ${filename}`, { size: writer.bytesWritten });
          
          // Save metadata
          const metadata = {
            ...imageData,
            downloadedAt: new Date().toISOString(),
            topic,
            filename,
            fileSize: writer.bytesWritten
          };
          
          await fs.writeJson(filepath.replace('.jpg', '.json'), metadata, { spaces: 2 });
          
          resolve({
            ...metadata,
            filepath
          });
        });

        writer.on('error', error => {
          logger.logError(`Failed to write image: ${filename}`, error);
          reject(error);
        });
      });
    } catch (error) {
      logger.logError(`Failed to download image ${index + 1}`, error, { 
        imageId: imageData.id,
        url: imageData.url 
      });
      throw error;
    }
  }

  async downloadBatch(imagesData, topic) {
    const results = [];
    const errors = [];

    logger.logActivity(`Starting batch download of ${imagesData.length} images for topic: ${topic}`);

    for (let i = 0; i < imagesData.length; i++) {
      try {
        const result = await this.downloadImage(imagesData[i], topic, i);
        results.push(result);
        
        // Small delay between downloads to be respectful
        if (i < imagesData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        errors.push({ index: i, error: error.message });
        logger.logWarning(`Skipping image ${i + 1} due to error`);
      }
    }

    logger.logSuccess(`Batch download completed: ${results.length} succeeded, ${errors.length} failed`);
    
    return {
      succeeded: results,
      failed: errors,
      totalRequested: imagesData.length
    };
  }

  async cleanupOldImages(daysToKeep = 7) {
    try {
      const files = await fs.readdir(this.imagesDir);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filepath = path.join(this.imagesDir, file);
        const stats = await fs.stat(filepath);
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.remove(filepath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.logActivity(`Cleaned up ${deletedCount} old images`);
      }
      
      return deletedCount;
    } catch (error) {
      logger.logError('Failed to cleanup old images', error);
      return 0;
    }
  }

  async getDownloadedImages(topic = null) {
    try {
      const files = await fs.readdir(this.imagesDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      const images = [];

      for (const file of jsonFiles) {
        const metadata = await fs.readJson(path.join(this.imagesDir, file));
        if (!topic || metadata.topic === topic) {
          images.push(metadata);
        }
      }

      return images.sort((a, b) => 
        new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
      );
    } catch (error) {
      logger.logError('Failed to get downloaded images', error);
      return [];
    }
  }
}

module.exports = new ImageDownloader();