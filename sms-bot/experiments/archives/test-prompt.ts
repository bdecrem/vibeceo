import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function loadPromptTemplate(): Promise<string> {
  const promptPath = path.join(__dirname, 'prompt.txt');
  try {
    const promptContent = fs.readFileSync(promptPath, 'utf-8');
    return promptContent;
  } catch (error) {
    console.error('Error reading prompt.txt:', error);
    process.exit(1);
  }
}

async function generateHTMLApp(userRequest: string, promptTemplate: string): Promise<string> {
  // Replace the [USER REQUEST] placeholder with actual user input
  const systemPrompt = promptTemplate.replace(/\[USER REQUEST\]/g, userRequest);
  
  console.log('\n🤖 Sending request to GPT-4...');
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Build: ${userRequest}`
        }
      ],
      max_tokens: 4000,
      temperature: 0.7
    });

    const htmlContent = response.choices[0]?.message?.content;
    
    if (!htmlContent) {
      throw new Error('No content returned from GPT-4');
    }

    return htmlContent;
  } catch (error) {
    console.error('Error calling GPT-4:', error);
    throw error;
  }
}

function extractHTMLFromResponse(response: string): string {
  // Look for HTML content within code blocks or extract if it's already pure HTML
  const htmlMatch = response.match(/```html\n([\s\S]*?)\n```/i) || 
                   response.match(/```\n([\s\S]*?)\n```/i);
  
  if (htmlMatch) {
    return htmlMatch[1];
  }
  
  // If no code blocks found, check if the response starts with HTML
  if (response.trim().toLowerCase().startsWith('<!doctype html') || 
      response.trim().toLowerCase().startsWith('<html')) {
    return response.trim();
  }
  
  // If it looks like HTML but doesn't have proper structure, return as-is
  if (response.includes('<html') || response.includes('<!DOCTYPE')) {
    return response;
  }
  
  // Otherwise, wrap it in a basic HTML structure
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated App</title>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
</head>
<body>
${response}
</body>
</html>`;
}

function saveHTMLFile(htmlContent: string, userRequest: string): string {
  // Create a safe filename from the user request
  const safeFileName = userRequest
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${safeFileName}-${timestamp}.html`;
  const filePath = path.join(__dirname, fileName);
  
  try {
    fs.writeFileSync(filePath, htmlContent, 'utf-8');
    return fileName;
  } catch (error) {
    console.error('Error saving HTML file:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 WTAF Zero-Admin App Generator');
  console.log('=====================================');
  
  try {
    // Load the prompt template
    console.log('📖 Loading prompt template...');
    const promptTemplate = await loadPromptTemplate();
    
    // Get user input
    const userRequest = await askQuestion('\n💭 What would you like to build? ');
    
    if (!userRequest.trim()) {
      console.log('❌ Please provide a valid request.');
      rl.close();
      return;
    }
    
    console.log(`\n🎯 Building: "${userRequest}"`);
    
    // Generate the HTML app
    const response = await generateHTMLApp(userRequest, promptTemplate);
    
    // Extract HTML from the response
    const htmlContent = extractHTMLFromResponse(response);
    
    // Save the HTML file
    const fileName = saveHTMLFile(htmlContent, userRequest);
    
    console.log('\n✅ Success!');
    console.log(`📁 HTML file saved as: ${fileName}`);
    console.log(`📍 Location: ${path.join(__dirname, fileName)}`);
    console.log('\n💡 You can now open this file in your browser to test the app!');
    
    // Show some debugging info
    console.log('\n🔍 App Features:');
    console.log('- Zero-admin authentication system');
    console.log('- Supabase database integration');
    console.log('- Support for 1-5 users');
    console.log('- Real-time collaborative features');
    console.log('- WTAF design system');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    rl.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

// Run the script
main().catch(console.error); 