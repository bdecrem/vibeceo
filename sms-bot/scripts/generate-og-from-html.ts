import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPaths = [
  path.join(__dirname, '../.env.local'),
  path.join(__dirname, '../../.env.local'),
];

for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
    console.log(`📍 Loaded env from: ${envPath}`);
    break;
  } catch (error) {
    // Continue to next path
  }
}

// Check for HTMLCSS credentials
const HTMLCSS_USER_ID = process.env.HTMLCSS_USER_ID;
const HTMLCSS_API_KEY = process.env.HTMLCSS_API_KEY;

if (!HTMLCSS_USER_ID || !HTMLCSS_API_KEY) {
  console.error('❌ Missing HTMLCSS_USER_ID or HTMLCSS_API_KEY in environment variables');
  console.log('Please add these to your .env.local file:');
  console.log('  HTMLCSS_USER_ID=your_user_id');
  console.log('  HTMLCSS_API_KEY=your_api_key');
  console.log('\nGet your credentials from: https://htmlcsstoimage.com/dashboard/api-keys');
  process.exit(1);
}

async function generateOGImage(htmlFilePath: string, outputFileName?: string) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log('🎨 Generating OG Image from HTML');
    console.log(`${'='.repeat(60)}\n`);

    // Read the HTML file - handle both relative and absolute paths
    let fullPath: string;
    if (path.isAbsolute(htmlFilePath)) {
      fullPath = htmlFilePath;
    } else if (htmlFilePath.startsWith('web/')) {
      // Path relative to project root
      fullPath = path.join(__dirname, '../../..', htmlFilePath);
    } else {
      // Path relative to sms-bot directory
      fullPath = path.join(__dirname, '../..', htmlFilePath);
    }
      
    console.log(`📁 Reading HTML from: ${fullPath}`);
    const htmlContent = await fs.readFile(fullPath, 'utf-8');
    console.log(`✅ Loaded HTML (${htmlContent.length} characters)`);

    // Extract just the filename without extension for output
    const inputFileName = path.basename(htmlFilePath, path.extname(htmlFilePath));
    const outputName = outputFileName || `og-${inputFileName}.png`;

    // Call HTMLCSS API
    console.log('\n📡 Calling HTMLCSS API...');
    const auth = Buffer.from(`${HTMLCSS_USER_ID}:${HTMLCSS_API_KEY}`).toString('base64');
    
    const response = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        html: htmlContent,
        viewport_width: 1200,
        viewport_height: 630,
        device_scale: 2  // Higher quality
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as any;
    console.log('✅ Image generated successfully!');
    console.log(`🔗 Image URL: ${data.url}`);

    // Download the image
    console.log('\n📥 Downloading image...');
    const imageResponse = await fetch(data.url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
    // Save to UPLOADS folder (project root)
    const outputDir = path.join(__dirname, '../../../web/UPLOADS');
    const outputPath = path.join(outputDir, outputName);
    
    await fs.writeFile(outputPath, imageBuffer);
    console.log(`✅ Image saved to: ${outputPath}`);
    
    // Also save the URL for reference
    const urlFilePath = path.join(outputDir, `${outputName}.url.txt`);
    await fs.writeFile(urlFilePath, data.url);
    console.log(`📝 URL saved to: ${urlFilePath}`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 OG Image Generation Complete!');
    console.log('='.repeat(60));
    console.log(`\nNext steps:`);
    console.log(`1. View the image at: ${outputPath}`);
    console.log(`2. Upload it using: npm run replace-og-from-upload ${outputName}`);
    console.log(`3. Or use directly from URL: ${data.url}`);
    
    return {
      url: data.url,
      localPath: outputPath
    };

  } catch (error: any) {
    console.error('❌ Error generating OG image:', error.message);
    throw error;
  }
}

// CLI usage
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  npm run generate:og-html <html-file-path> [output-name]');
  console.log('');
  console.log('Examples:');
  console.log('  npm run generate:og-html web/UPLOADS/games.html');
  console.log('  npm run generate:og-html web/UPLOADS/games.html custom-games-og.png');
  console.log('');
  console.log('The generated image will be saved to web/UPLOADS/');
  process.exit(1);
}

const [htmlPath, outputName] = args;
generateOGImage(htmlPath, outputName).catch(console.error);

export { generateOGImage };