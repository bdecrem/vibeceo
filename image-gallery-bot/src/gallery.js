const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

class GalleryGenerator {
  constructor() {
    this.galleriesDir = path.join(__dirname, '..', 'galleries');
    fs.ensureDirSync(this.galleriesDir);
  }

  generateModernTemplate(title, images) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Image Gallery</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0a0a0a;
            color: #e0e0e0;
            line-height: 1.6;
            min-height: 100vh;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            text-align: center;
            padding: 60px 20px 40px;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border-radius: 20px;
            margin-bottom: 50px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        h1 {
            font-size: 3em;
            font-weight: 300;
            letter-spacing: -2px;
            margin-bottom: 10px;
            background: linear-gradient(135deg, #fff 0%, #888 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            color: #888;
            font-size: 1.2em;
            font-weight: 300;
        }

        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin-bottom: 60px;
        }

        .image-card {
            position: relative;
            overflow: hidden;
            border-radius: 15px;
            background: #1a1a1a;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            cursor: pointer;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        }

        .image-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
        }

        .image-card img {
            width: 100%;
            height: 300px;
            object-fit: cover;
            display: block;
            transition: transform 0.3s ease;
        }

        .image-card:hover img {
            transform: scale(1.05);
        }

        .image-info {
            padding: 20px;
            background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            transform: translateY(100%);
            transition: transform 0.3s ease;
        }

        .image-card:hover .image-info {
            transform: translateY(0);
        }

        .image-description {
            font-size: 0.9em;
            margin-bottom: 10px;
            color: #ddd;
        }

        .image-credit {
            font-size: 0.85em;
            color: #888;
        }

        .image-credit a {
            color: #4a9eff;
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .image-credit a:hover {
            color: #7ab8ff;
            text-decoration: underline;
        }

        footer {
            text-align: center;
            padding: 40px 20px;
            color: #666;
            border-top: 1px solid #333;
        }

        .timestamp {
            font-size: 0.9em;
            color: #555;
            margin-top: 10px;
        }

        /* Lightbox */
        .lightbox {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 1000;
            cursor: pointer;
            animation: fadeIn 0.3s ease;
        }

        .lightbox.active {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .lightbox img {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            animation: scaleIn 0.3s ease;
        }

        .close-lightbox {
            position: absolute;
            top: 30px;
            right: 30px;
            font-size: 3em;
            color: #fff;
            cursor: pointer;
            transition: transform 0.2s ease;
        }

        .close-lightbox:hover {
            transform: rotate(90deg);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes scaleIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }

        @media (max-width: 768px) {
            h1 { font-size: 2em; }
            .gallery { grid-template-columns: 1fr; gap: 20px; }
            .container { padding: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>${title}</h1>
            <p class="subtitle">A curated collection of ${images.length} images</p>
        </header>

        <div class="gallery">
            ${images.map((image, index) => this.generateImageCard(image, index)).join('')}
        </div>

        <footer>
            <p>Images sourced from <a href="https://unsplash.com" target="_blank" style="color: #4a9eff;">Unsplash</a></p>
            <p class="timestamp">Generated on ${new Date().toLocaleString()}</p>
        </footer>
    </div>

    <div class="lightbox" id="lightbox">
        <span class="close-lightbox">&times;</span>
        <img src="" alt="">
    </div>

    <script>
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = lightbox.querySelector('img');
        const closeBtn = lightbox.querySelector('.close-lightbox');

        document.querySelectorAll('.image-card').forEach(card => {
            card.addEventListener('click', function() {
                const imgSrc = this.querySelector('img').src;
                const imgAlt = this.querySelector('img').alt;
                lightboxImg.src = imgSrc;
                lightboxImg.alt = imgAlt;
                lightbox.classList.add('active');
            });
        });

        function closeLightbox() {
            lightbox.classList.remove('active');
        }

        lightbox.addEventListener('click', closeLightbox);
        closeBtn.addEventListener('click', closeLightbox);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeLightbox();
        });
    </script>
</body>
</html>`;
  }

  generateImageCard(image, index) {
    // For local serving, use relative paths
    const imageUrl = image.filename ? `/images/${image.filename}` : (image.url || image.filepath || '');
    const description = image.description || 'Beautiful image';
    const authorName = image.author?.name || 'Unknown Artist';
    const authorUrl = image.author?.profileUrl || '#';

    return `
        <div class="image-card" data-index="${index}">
            <img src="${imageUrl}" alt="${description}" loading="lazy">
            <div class="image-info">
                <p class="image-description">${description}</p>
                <p class="image-credit">
                    Photo by <a href="${authorUrl}" target="_blank" rel="noopener">${authorName}</a>
                </p>
            </div>
        </div>`;
  }

  async generateGallery(topic, images, template = 'modern') {
    try {
      const timestamp = Date.now();
      const sanitizedTopic = topic.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const filename = `${sanitizedTopic}-${timestamp}.html`;
      const filepath = path.join(this.galleriesDir, filename);

      logger.logActivity(`Generating gallery: ${filename}`, { 
        topic, 
        imageCount: images.length,
        template 
      });

      let html;
      switch (template) {
        case 'modern':
        default:
          html = this.generateModernTemplate(topic, images);
          break;
      }

      await fs.writeFile(filepath, html);
      
      logger.logSuccess(`Gallery generated: ${filename}`, { 
        size: Buffer.byteLength(html),
        path: filepath 
      });

      return {
        filename,
        filepath,
        url: `/galleries/${filename}`,
        topic,
        imageCount: images.length,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.logError('Failed to generate gallery', error, { topic });
      throw error;
    }
  }

  async getGalleries() {
    try {
      const files = await fs.readdir(this.galleriesDir);
      const galleries = [];

      for (const file of files.filter(f => f.endsWith('.html'))) {
        const filepath = path.join(this.galleriesDir, file);
        const stats = await fs.stat(filepath);
        
        galleries.push({
          filename: file,
          filepath,
          createdAt: stats.birthtime,
          size: stats.size
        });
      }

      return galleries.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      logger.logError('Failed to list galleries', error);
      return [];
    }
  }

  async generateIndexPage() {
    try {
      const galleries = await this.getGalleries();
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gallery Index</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0a0a0a;
            color: #e0e0e0;
            padding: 40px 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            text-align: center;
            margin-bottom: 40px;
            font-weight: 300;
            font-size: 3em;
        }
        .gallery-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .gallery-item {
            background: #1a1a1a;
            padding: 20px;
            border-radius: 10px;
            transition: transform 0.2s ease;
        }
        .gallery-item:hover {
            transform: translateY(-5px);
        }
        .gallery-item a {
            color: #4a9eff;
            text-decoration: none;
            font-size: 1.2em;
        }
        .gallery-meta {
            color: #888;
            font-size: 0.9em;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <h1>Image Galleries</h1>
    <div class="gallery-list">
        ${galleries.map(g => `
            <div class="gallery-item">
                <a href="${g.filename}">${g.filename.replace('.html', '')}</a>
                <div class="gallery-meta">
                    Created: ${g.createdAt.toLocaleString()}<br>
                    Size: ${(g.size / 1024).toFixed(1)} KB
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>`;

      await fs.writeFile(path.join(this.galleriesDir, 'index.html'), html);
      logger.logSuccess('Generated gallery index page');
    } catch (error) {
      logger.logError('Failed to generate index page', error);
    }
  }
}

module.exports = new GalleryGenerator();