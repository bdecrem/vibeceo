#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';

const lockPath = path.join(process.cwd(), '.agent.lock');

function main() {
  try {
    if (!fs.existsSync(lockPath)) {
      console.log('No lock file found (.agent.lock) — nothing to kill.');
      process.exit(0);
    }
    const raw = fs.readFileSync(lockPath, 'utf8');
    let data = {};
    try { data = JSON.parse(raw); } catch (_) {}
    const pid = data.pid;
    if (!pid) {
      console.log('Lock file present but no PID recorded. Removing lock.');
      fs.unlinkSync(lockPath);
      process.exit(0);
    }
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`Sent SIGTERM to edit-agent PID ${pid}`);
    } catch (e) {
      console.log(`Could not signal PID ${pid}: ${e.message}`);
    }
    // Remove lock file regardless
    try { fs.unlinkSync(lockPath); } catch (_) {}
    console.log('Cleared .agent.lock');
  } catch (e) {
    console.error('Kill failed:', e.message);
    process.exit(1);
  }
}

main();

