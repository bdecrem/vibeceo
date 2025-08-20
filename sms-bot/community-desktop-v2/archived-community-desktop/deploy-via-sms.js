#!/usr/bin/env node

/**
 * Deploy Community Desktop via SMS Bot
 * This will properly create ZAD-enabled pages with working APIs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createZadSubmissionForm() {
  console.log('\n📝 Creating ZAD submission form HTML...');
  
  // Create a simplified ZAD form that will work with the SMS bot
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Community Desktop - Add Your App</title>
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: 'Segoe UI', sans-serif;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
        }
        input, textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e8ed;
            border-radius: 10px;
            font-size: 16px;
        }
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 14px 28px;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            width: 100%;
        }
        #status {
            margin-top: 20px;
            padding: 15px;
            border-radius: 10px;
            display: none;
        }
        #status.show { display: block; }
        #status.success { background: #d4edda; color: #155724; }
        #status.error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖥️ Add to Community Desktop</h1>
        <p>Submit your app idea and it will appear on the community desktop!</p>
        
        <form id="appForm">
            <div class="form-group">
                <label>App Name</label>
                <input type="text" id="appName" required>
            </div>
            <div class="form-group">
                <label>What does it do?</label>
                <textarea id="appFunction" required></textarea>
            </div>
            <div class="form-group">
                <label>Your Name (optional)</label>
                <input type="text" id="submitterName" placeholder="Anonymous">
            </div>
            <button type="submit">Add My App</button>
        </form>
        
        <div id="status"></div>
    </div>
    
    <script>
        document.getElementById('appForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const statusDiv = document.getElementById('status');
            const data = {
                appName: document.getElementById('appName').value,
                appFunction: document.getElementById('appFunction').value,
                submitterName: document.getElementById('submitterName').value || 'Anonymous',
                timestamp: new Date().toISOString(),
                status: 'new'
            };
            
            try {
                await save('desktop_app', data);
                statusDiv.className = 'show success';
                statusDiv.textContent = 'Success! Your app will appear soon!';
                document.getElementById('appForm').reset();
            } catch (error) {
                statusDiv.className = 'show error';
                statusDiv.textContent = 'Error submitting app. Please try again.';
            }
        });
    </script>
</body>
</html>`;

  // Save to file for SMS bot to process
  const filePath = path.join(__dirname, 'zad-submission-form.html');
  await fs.writeFile(filePath, html);
  console.log('✅ Created ZAD submission form HTML');
  
  return html;
}

async function deployViaSmsBot() {
  console.log('\n🤖 Deploying via SMS Bot...');
  
  // We need to submit through the SMS bot system to get proper ZAD setup
  // The SMS bot will:
  // 1. Process the HTML
  // 2. Inject ZAD helper functions
  // 3. Generate proper UUIDs
  // 4. Set up the database records
  
  // Create the SMS request
  const smsRequest = {
    sender_phone: '+15555551234', // Mock phone number
    user_slug: 'bart',
    prompt: '--zad-api Create a form to submit apps to the community desktop with fields for app name, what it does, and submitter name',
    timestamp: new Date().toISOString()
  };
  
  console.log('📱 Simulating SMS request:', smsRequest.prompt);
  
  // Option A: Direct database insert (simulates SMS)
  const { error } = await supabase
    .from('wtaf_submissions')
    .insert({
      sender_phone: smsRequest.sender_phone,
      user_message: smsRequest.prompt,
      timestamp: smsRequest.timestamp,
      status: 'pending'
    });
  
  if (error) {
    console.error('❌ Failed to create SMS request:', error);
    return false;
  }
  
  console.log('✅ SMS request created - the bot will process it shortly');
  console.log('⏱️  Wait for the SMS bot to process (usually within 1 minute)');
  
  return true;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 COMMUNITY DESKTOP DEPLOYMENT (Via SMS Bot)');
  console.log('='.repeat(60));
  
  try {
    // Create the ZAD form HTML
    await createZadSubmissionForm();
    
    // Deploy via SMS bot for proper ZAD setup
    await deployViaSmsBot();
    
    console.log('\n' + '='.repeat(60));
    console.log('📝 Next Steps:');
    console.log('1. Start the SMS bot if not running:');
    console.log('   cd .. && npm run listener');
    console.log('2. Wait for processing (check logs)');
    console.log('3. Your ZAD app will be at:');
    console.log('   https://webtoys.ai/bart/[generated-slug]');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}