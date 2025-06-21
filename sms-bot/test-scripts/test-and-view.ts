import { generateCompletePrompt, callClaude } from '../engine/wtaf-processor.js';
import { extractCodeBlocks } from '../engine/shared/utils.js';
import { writeFile } from 'fs/promises';

async function testAndView() {
  console.log('Testing new WTAF processor...');
  console.log('='.repeat(50));
  
  const testInput = "wtaf -rohan- build me a bio page about myself";
  console.log(`\n🧪 Testing input: ${testInput}`);
  console.log('-'.repeat(30));
  
  try {
    // Test the processor with sample input
    const expandedPrompt = await generateCompletePrompt(testInput, {
        classifierModel: 'gpt-4o',
        classifierMaxTokens: 1000,
        classifierTemperature: 0.7
    });
    const htmlResult = await callClaude("", expandedPrompt, {
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 8192,
        temperature: 0.7
    });
    
    console.log('AI Result length:', htmlResult.length, 'chars');
    
    // Extract HTML using the same utility as controller.ts
    const html = extractCodeBlocks(htmlResult);
    if (html.trim()) {
      const fileName = 'logs/test-output.html';
      
      await writeFile(fileName, html, 'utf8');
      console.log(`\n✅ HTML saved to: ${fileName}`);
      console.log('🌐 Open this file in your browser to view the page!');
    } else {
      console.log('❌ No HTML found in result');
      console.log('Raw result preview:', htmlResult.slice(0, 200) + '...');
    }
    
    console.log('='.repeat(50));
    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAndView(); 