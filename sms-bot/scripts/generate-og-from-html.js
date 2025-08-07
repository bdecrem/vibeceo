import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
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
    }
    catch (error) {
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
async function generateOGImage(htmlFilePath, outputFileName) {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log('🎨 Generating OG Image from HTML');
        console.log(`${'='.repeat(60)}\n`);
        // Read the HTML file - handle both relative and absolute paths
        let fullPath;
        if (path.isAbsolute(htmlFilePath)) {
            fullPath = htmlFilePath;
        }
        else if (htmlFilePath.startsWith('web/')) {
            // Path relative to project root
            fullPath = path.join(__dirname, '../../..', htmlFilePath);
        }
        else {
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
                device_scale: 2 // Higher quality
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
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
    }
    catch (error) {
        console.error('❌ Error generating OG image:', error.message);
        throw error;
    }
}
async function processFolder(folderPath) {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log('📂 Processing folder for OG images');
        console.log(`${'='.repeat(60)}\n`);
        // Resolve the folder path
        let fullFolderPath;
        if (path.isAbsolute(folderPath)) {
            fullFolderPath = folderPath;
        }
        else if (folderPath.startsWith('web/')) {
            fullFolderPath = path.join(__dirname, '../../..', folderPath);
        }
        else {
            fullFolderPath = path.join(__dirname, '../..', folderPath);
        }
        console.log(`📁 Reading folder: ${fullFolderPath}`);
        // Check if path exists and is a directory
        const stats = await fs.stat(fullFolderPath);
        if (!stats.isDirectory()) {
            throw new Error(`Path is not a directory: ${fullFolderPath}`);
        }
        // Get all files in the folder
        const files = await fs.readdir(fullFolderPath);
        const htmlFiles = files.filter(file => file.endsWith('.html') || file.endsWith('.htm'));
        if (htmlFiles.length === 0) {
            console.log('⚠️  No HTML files found in the specified folder');
            return;
        }
        console.log(`Found ${htmlFiles.length} HTML files to process:\n`);
        htmlFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file}`);
        });
        console.log('\n' + '='.repeat(60));
        console.log('🚀 Starting batch processing...');
        console.log('='.repeat(60));
        const results = [];
        let successCount = 0;
        let failCount = 0;
        for (let i = 0; i < htmlFiles.length; i++) {
            const file = htmlFiles[i];
            const filePath = path.join(fullFolderPath, file);
            console.log(`\n[${i + 1}/${htmlFiles.length}] Processing: ${file}`);
            console.log('-'.repeat(40));
            try {
                const result = await generateOGImage(filePath);
                results.push({ file, success: true, ...result });
                successCount++;
                console.log(`✅ Success: ${file}`);
            }
            catch (error) {
                results.push({ file, success: false, error: error.message });
                failCount++;
                console.log(`❌ Failed: ${file} - ${error.message}`);
            }
            // Add a small delay between API calls to avoid rate limiting
            if (i < htmlFiles.length - 1) {
                console.log('⏳ Waiting 2 seconds before next image...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 Batch Processing Summary');
        console.log('='.repeat(60));
        console.log(`✅ Successful: ${successCount}/${htmlFiles.length}`);
        console.log(`❌ Failed: ${failCount}/${htmlFiles.length}`);
        if (failCount > 0) {
            console.log('\n❌ Failed files:');
            results
                .filter(r => !r.success)
                .forEach(r => console.log(`  - ${r.file}: ${r.error}`));
        }
        console.log('\n🎉 Batch processing complete!');
        return results;
    }
    catch (error) {
        console.error('❌ Error processing folder:', error.message);
        throw error;
    }
}
// CLI usage
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Usage:');
    console.log('  npm run generate:og-html <html-file-path|folder-path> [output-name]');
    console.log('');
    console.log('Examples:');
    console.log('  npm run generate:og-html web/UPLOADS/games.html');
    console.log('  npm run generate:og-html web/UPLOADS/games.html custom-games-og.png');
    console.log('  npm run generate:og-html web/UPLOADS/  # Process all HTML files in folder');
    console.log('');
    console.log('The generated images will be saved to web/UPLOADS/');
    console.log('When processing a folder, each file gets its own og-<filename>.png');
    process.exit(1);
}
const [inputPath, outputName] = args;
// Check if input is a directory or file
(async () => {
    try {
        const stats = await fs.stat(inputPath).catch(() => null);
        if (stats && stats.isDirectory()) {
            // Process folder
            await processFolder(inputPath);
        }
        else {
            // Process single file
            await generateOGImage(inputPath, outputName);
        }
    }
    catch (error) {
        console.error(error);
        process.exit(1);
    }
})();
export { generateOGImage };
