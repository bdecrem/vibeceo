/**
 * Test script - spawns the TUI and sends commands
 */
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function test() {
  const proc = spawn('node', ['--experimental-strip-types', 'src/index.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, TERM: 'xterm-256color', COLUMNS: '80', LINES: '24', TEST_MODE: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let output = '';

  proc.stdout.on('data', (data) => {
    output += data.toString();
  });

  proc.stderr.on('data', (data) => {
    console.error('STDERR:', data.toString());
  });

  // Wait for startup
  await setTimeout(500);

  // Send /short command
  proc.stdin.write('/short\r');

  // Wait for response
  await setTimeout(500);

  // Send quit
  proc.stdin.write('/quit\r');

  await setTimeout(200);

  // Strip ANSI codes for readability
  const clean = output.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\x1b\[\?25[hl]/g, '');

  console.log('=== RAW OUTPUT (ANSI stripped) ===');
  console.log(clean);
  console.log('=== END ===');

  // Look for DEBUG line
  const debugMatch = output.match(/\[DEBUG:.*?\]/);
  if (debugMatch) {
    console.log('\nDEBUG INFO:', debugMatch[0]);
  }

  proc.kill();
}

test().catch(console.error);
