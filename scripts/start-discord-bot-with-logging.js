import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Create log file with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `bot-log-${timestamp}.txt`);

// Write initial timestamp
fs.writeFileSync(logFile, `=== Bot Started at ${new Date().toISOString()} ===\n\n`);

// Start the bot process
const botProcess = spawn('node', ['dist/scripts/start-discord-bot.js'], {
    stdio: ['ignore', 'pipe', 'pipe']
});

// Handle stdout
botProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    fs.appendFileSync(logFile, output);
});

// Handle stderr
botProcess.stderr.on('data', (data) => {
    const error = data.toString();
    console.error(error);
    fs.appendFileSync(logFile, `ERROR: ${error}`);
});

// Handle process exit
botProcess.on('exit', (code) => {
    const exitMessage = `\n=== Bot Exited with code ${code} at ${new Date().toISOString()} ===\n`;
    console.log(exitMessage);
    fs.appendFileSync(logFile, exitMessage);
}); 