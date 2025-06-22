import { join } from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';
import { generateCompletePrompt, callClaude } from '../engine/wtaf-processor.js';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

async function testSimplifiedZadSystem() {
  console.log('🧪 Testing Simplified ZAD System...\n');
  
  try {
    // Test input: user wants a chat app
    const testInput = "build me a chat app for me and my friends";
    
    console.log(`📥 User Input: "${testInput}"`);
    console.log('\n🔄 Processing through WTAF engine...\n');
    
    // Step 1: Generate expanded prompt using classifier
    const expandedPrompt = await generateCompletePrompt(testInput, {
      classifierModel: 'gpt-4o',
      classifierMaxTokens: 1000,
      classifierTemperature: 0.7
    });
    
    console.log('📋 Classifier stage complete');
    
    // Step 2: Generate HTML using builder
    const htmlContent = await callClaude('', expandedPrompt, {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 8192,
      temperature: 0.7
    });
    
    const result = { success: true, content: htmlContent };
    
    console.log('📤 Result Status:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    
    if (result.success && result.content) {
      console.log('\n📊 Generated Content Preview:');
      console.log('─'.repeat(50));
      
      // Show first 500 characters
      const preview = result.content.substring(0, 500);
      console.log(preview + (result.content.length > 500 ? '...' : ''));
      console.log('─'.repeat(50));
      
      // Check for key ZAD elements
      const hasSupabase = result.content.includes('@supabase/supabase-js');
      const hasUserLabels = result.content.includes('User 1') && result.content.includes('User 5');
      const hasPasscodes = result.content.includes('passcode') || result.content.includes('code');
      const hasWtafTable = result.content.includes('wtaf_zero_admin_collaborative');
      const hasPunkAesthetic = result.content.includes('gradient') && result.content.includes('#FF2E93');
      const hasFloatingEmojis = result.content.includes('floating-emoji');
      
      console.log('\n🔍 ZAD Feature Detection:');
      console.log(`  ✅ Supabase Integration: ${hasSupabase ? '✅' : '❌'}`);
      console.log(`  ✅ User 1-5 System: ${hasUserLabels ? '✅' : '❌'}`);
      console.log(`  ✅ Passcode Auth: ${hasPasscodes ? '✅' : '❌'}`);
      console.log(`  ✅ WTAF Database: ${hasWtafTable ? '✅' : '❌'}`);
      console.log(`  ✅ Punk Aesthetic: ${hasPunkAesthetic ? '✅' : '❌'}`);
      console.log(`  ✅ Floating Emojis: ${hasFloatingEmojis ? '✅' : '❌'}`);
      
      const allFeaturesPresent = hasSupabase && hasUserLabels && hasPasscodes && hasWtafTable && hasPunkAesthetic && hasFloatingEmojis;
      
      console.log(`\n🎯 Overall ZAD Quality: ${allFeaturesPresent ? '🔥 PERFECT!' : '⚠️  Needs improvement'}`);
      
      // Save output for inspection
      const outputPath = join(process.cwd(), 'sms-bot', 'test-scripts', 'zad-system-output.html');
      fs.writeFileSync(outputPath, result.content);
      console.log(`\n💾 Full output saved to: ${outputPath}`);
      
    } else {
      console.log('\n❌ No content generated');
    }
    
  } catch (error) {
    console.error('\n💥 Test failed with error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run the test
testSimplifiedZadSystem().catch(console.error); 