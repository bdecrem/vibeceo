#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the data file
const dataPath = path.join(__dirname, '../data/af_daily_messages.json');

console.log('🔧 Starting curly quotes cleanup...');

try {
  // Read the file
  const fileContent = fs.readFileSync(dataPath, 'utf8');
  console.log(`📖 Read ${dataPath}`);
  
  // Replace curly quotes with straight quotes
  let cleanedContent = fileContent
    // Curly single quotes to straight apostrophes
    .replace(/['']/g, "'")
    // Curly double quotes to straight quotes  
    .replace(/[""]/g, '"')
    // Em dashes to regular dashes (optional - em dashes usually work fine)
    .replace(/—/g, '—'); // Keep em dashes as they're usually fine in SMS
  
  // Check if any changes were made
  const hasChanges = cleanedContent !== fileContent;
  
  console.log(`✨ ${hasChanges ? 'Fixed curly quotes' : 'No curly quotes found'}`);
  
  if (hasChanges) {
    // Backup original file
    const backupPath = dataPath + '.backup.' + new Date().toISOString().split('T')[0];
    fs.writeFileSync(backupPath, fileContent);
    console.log(`💾 Backed up original to: ${backupPath}`);
    
    // Write cleaned content
    fs.writeFileSync(dataPath, cleanedContent);
    console.log(`✅ Updated ${dataPath} with straight quotes`);
    
    // Show examples of changes
    console.log('\n📝 Changes made:');
    console.log('  - Converted curly apostrophes to straight apostrophes');
    console.log('  - Converted curly quotes to straight quotes');
  } else {
    console.log('✅ No curly quotes found - file is already clean!');
  }
  
  console.log('\n🎉 Curly quotes cleanup completed successfully!');
  
} catch (error) {
  console.error('❌ Error during cleanup:', error.message);
  process.exit(1);
} 