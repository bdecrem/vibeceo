const fs = require('fs');
const path = require('path');

console.log('🔄 Transforming af_daily_inspirations.json to new format...');

try {
  // Read current file
  const inputPath = path.join(__dirname, '../data/af_daily_inspirations.json');
  const outputPath = path.join(__dirname, '../data/af_daily_inspirations_new.json');
  
  console.log(`📖 Reading from: ${inputPath}`);
  const currentData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  
  console.log(`📊 Found ${currentData.length} entries to transform`);
  
  // Transform each entry
  const newData = currentData.map((entry, index) => ({
    item: index + 1,                    // Sequential numbering 1-60
    type: "inspiration",                // All are inspirations
    "quotation-marks": "yes",          // All get quotes
    prepend: "💬 ",                    // All get bubble emoji
    text: entry.text,                  // Keep existing text
    author: entry.author               // Keep existing author
    // Remove old "day" field
  }));
  
  // Write new file
  console.log(`💾 Writing to: ${outputPath}`);
  fs.writeFileSync(outputPath, JSON.stringify(newData, null, 2));
  
  console.log('✅ Transformation complete!');
  console.log(`📁 New file created: af_daily_inspirations_new.json`);
  console.log(`📝 Transformed ${newData.length} inspirations`);
  console.log('');
  console.log('📋 Sample of first entry:');
  console.log(JSON.stringify(newData[0], null, 2));
  
} catch (error) {
  console.error('❌ Error during transformation:', error.message);
  process.exit(1);
} 