// Simple script to check process.cwd()
console.log('Current working directory:', process.cwd());
console.log('File being executed:', __filename);
console.log('Directory name:', __dirname);

// Try to access the story-arcs.json file
const fs = require('fs');
const path = require('path');

const storyArcsPath = path.join(process.cwd(), 'data', 'story-themes', 'story-arcs.json');
console.log('Expected path to story-arcs.json:', storyArcsPath);

try {
  const fileContent = fs.readFileSync(storyArcsPath, 'utf8');
  const data = JSON.parse(fileContent);
  console.log('Successfully read story-arcs.json');
  console.log('Current irritation data:');
  console.log(data.currentIrritation);
} catch (error) {
  console.error('Error reading story-arcs.json:', error.message);
} 