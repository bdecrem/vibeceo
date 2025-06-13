import * as fs from 'fs';
import * as path from 'path';
import { spawn, exec } from 'child_process';
import chokidar from 'chokidar';

const CODE_DIR = path.join(process.cwd(), 'data', 'code');
const WEBSITE_ROOT = path.join(process.cwd(), '..');

interface DevCommand {
  action: string;
  params: any;
  executed: boolean;
}

// Install chokidar if needed: npm install chokidar @types/node

class RemoteDevExecutor {
  private processedFiles = new Set<string>();

  constructor() {
    this.startWatcher();
  }

  private startWatcher() {
    console.log('🔍 Starting remote development command watcher...');
    console.log(`📁 Monitoring: ${CODE_DIR}`);
    
    // Ensure directory exists
    if (!fs.existsSync(CODE_DIR)) {
      fs.mkdirSync(CODE_DIR, { recursive: true });
    }

    const watcher = chokidar.watch(CODE_DIR, {
      ignored: /^\./, // ignore dotfiles
      persistent: true,
      ignoreInitial: false
    });

    watcher.on('add', (filePath: string) => {
      // Skip already processed files or files that end with _EXECUTED.txt
      if (this.processedFiles.has(filePath) || filePath.includes('_EXECUTED')) {
        return; // Already processed
      }
      this.processedFiles.add(filePath);
      this.processFile(filePath);
    });

    console.log('✅ Remote dev watcher started successfully!');
  }

  private async processFile(filePath: string) {
    try {
      console.log(`\n🚀 New command file detected: ${path.basename(filePath)}`);
      
      const content = fs.readFileSync(filePath, 'utf8').trim();
      console.log(`📝 Command: ${content}`);
      
      const commands = this.parseCommand(content);
      
      for (const command of commands) {
        await this.executeCommand(command);
      }
      
      // Mark file as processed by adding timestamp
      const processedPath = filePath.replace('.txt', '_EXECUTED.txt');
      fs.writeFileSync(processedPath, content + `\n\n--- EXECUTED AT ${new Date().toISOString()} ---`);
      
    } catch (error) {
      console.error(`❌ Error processing file ${filePath}:`, error);
    }
  }

  private parseCommand(content: string): DevCommand[] {
    const commands: DevCommand[] = [];
    const lowerContent = content.toLowerCase();

    // Parse "make a hello world page"
    if (lowerContent.includes('make') && lowerContent.includes('hello world') && lowerContent.includes('page')) {
      commands.push({
        action: 'createHelloWorldPage',
        params: { 
          directory: this.extractDirectory(content) || 'tests',
          type: this.extractPageType(content) || 'html'
        },
        executed: false
      });
    }

    // Parse "add it to our website"
    if (lowerContent.includes('add') && lowerContent.includes('website')) {
      commands.push({
        action: 'addToWebsite',
        params: {
          directory: this.extractDirectory(content) || 'tests'
        },
        executed: false
      });
    }

    // Parse "run it on localhost:3000"
    if (lowerContent.includes('run') && lowerContent.includes('localhost')) {
      const port = this.extractPort(content) || '3000';
      commands.push({
        action: 'startServer',
        params: { port },
        executed: false
      });
    }

    // Parse SMS sending commands
    if (lowerContent.includes('send') && (
        lowerContent.includes('sms') || 
        lowerContent.includes('message') || 
        lowerContent.includes('text')
    )) {
      const message = this.extractSMSMessage(content);
      if (message) {
        commands.push({
          action: 'sendSMS',
          params: { message },
          executed: false
        });
      }
    }

    return commands;
  }

  private extractDirectory(content: string): string | null {
    const match = content.match(/under\s+(\w+\/?)|\bto\s+(\w+\/?)|\bin\s+(\w+\/?)/i);
    return match ? (match[1] || match[2] || match[3]).replace('/', '') : null;
  }

  private extractPageType(content: string): string {
    if (content.toLowerCase().includes('react')) return 'react';
    if (content.toLowerCase().includes('next')) return 'nextjs';
    return 'html';
  }

  private extractPort(content: string): string | null {
    const match = content.match(/localhost:(\d+)/);
    return match ? match[1] : null;
  }

  private extractSMSMessage(content: string): string | null {
    // Extract text between quotes
    const quotedMatch = content.match(/['"`]([^'"`]+)['"`]/);
    if (quotedMatch) return quotedMatch[1];
    
    // Extract after "says"
    const saysMatch = content.match(/says\s+(.+?)(?:\s+to|\s*$)/i);
    if (saysMatch) return saysMatch[1].replace(/['"]/g, '');
    
    // Extract after "It should say"
    const shouldSayMatch = content.match(/it should say\s+['"`]?([^'"`\n]+)['"`]?/i);
    if (shouldSayMatch) return shouldSayMatch[1].trim();
    
    // Extract after "that says"
    const thatSaysMatch = content.match(/that says\s+['"`]?([^'"`\n]+)['"`]?/i);
    if (thatSaysMatch) return thatSaysMatch[1].trim();
    
    return null;
  }

  private async executeCommand(command: DevCommand): Promise<void> {
    console.log(`⚡ Executing: ${command.action}`, command.params);

    try {
      switch (command.action) {
        case 'createHelloWorldPage':
          await this.createHelloWorldPage(command.params);
          break;
        case 'addToWebsite':
          await this.addToWebsite(command.params);
          break;
        case 'startServer':
          await this.startServer(command.params);
          break;
        case 'sendSMS':
          await this.sendSMS(command.params);
          break;
        default:
          console.log(`❓ Unknown command: ${command.action}`);
      }
      command.executed = true;
    } catch (error) {
      console.error(`❌ Failed to execute ${command.action}:`, error);
    }
  }

  private async createHelloWorldPage(params: any): Promise<void> {
    const { directory, type } = params;
    const targetDir = path.join(WEBSITE_ROOT, directory);
    
    // Ensure directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`📁 Created directory: ${directory}/`);
    }

    let content = '';
    let filename = '';

    if (type === 'react' || type === 'nextjs') {
      filename = 'hello-world.tsx';
      content = `export default function HelloWorld() {
  return (
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center', 
      fontFamily: 'sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          🌍 Hello World! 
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
          Remote development command executed successfully! ✨
        </p>
        <p style={{ fontSize: '0.9rem', marginTop: '2rem', opacity: 0.7 }}>
          Generated at: {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}`;
    } else {
      filename = 'hello-world.html';
      content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World - Remote Dev Test</title>
    <style>
        body {
            margin: 0;
            padding: 2rem;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        h1 { font-size: 3rem; margin-bottom: 1rem; }
        p { font-size: 1.2rem; opacity: 0.9; }
        .timestamp { font-size: 0.9rem; margin-top: 2rem; opacity: 0.7; }
    </style>
</head>
<body>
    <div>
        <h1>🌍 Hello World!</h1>
        <p>Remote development command executed successfully! ✨</p>
        <p class="timestamp">Generated at: ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;
    }

    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created: ${directory}/${filename}`);
  }

  private async addToWebsite(params: any): Promise<void> {
    // This would integrate with your Next.js app structure
    console.log(`🔗 Added to website under ${params.directory}/`);
    // Additional integration logic could go here
  }

  private async startServer(params: any): Promise<void> {
    const { port } = params;
    console.log(`🚀 Starting server on localhost:${port}...`);
    
    // Navigate to website root and start development server
    const serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: WEBSITE_ROOT,
      stdio: 'inherit',
      env: { ...process.env, PORT: port }
    });

    console.log(`✅ Development server started on http://localhost:${port}`);
  }

  private async sendSMS(params: any): Promise<void> {
    const { message } = params;
    console.log(`📱 Sending SMS: "${message}"`);
    
    try {
      // Import Twilio and environment setup
      const twilio = await import('twilio');
      const dotenv = await import('dotenv');
      
      // Load environment variables
      const envPath = process.cwd() + '/.env.local';
      dotenv.default.config({ path: envPath });
      
      // Initialize Twilio client
      const twilioClient = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      // Send SMS to admin phone number
      const adminPhone = '+16508989508';
      await twilioClient.messages.create({
        body: message,
        to: adminPhone,
        from: process.env.TWILIO_PHONE_NUMBER
      });
      
      console.log(`✅ SMS actually sent to ${adminPhone}: ${message}`);
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
    }
  }
}

// Start the remote dev watcher
console.log('🎯 VibeCEO Remote Development System');
console.log('💬 Text commands using: CODE [your instruction]');
console.log('🔥 Commands will be executed automatically!\n');

new RemoteDevExecutor(); 