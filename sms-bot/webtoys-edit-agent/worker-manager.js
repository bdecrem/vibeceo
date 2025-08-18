#!/usr/bin/env node

/**
 * Webtoys Edit Agent Worker Manager
 * Spawns and monitors multiple worker processes
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const NUM_WORKERS = parseInt(process.env.EDIT_AGENT_WORKERS || '2', 10);
const WORKER_SCRIPT = path.join(__dirname, 'worker.js');
const RESTART_DELAY = 5000; // Wait 5 seconds before restarting crashed worker

// Track active workers
const workers = new Map();

/**
 * Spawn a new worker process
 */
function spawnWorker(id) {
  console.log(`🚀 Starting worker ${id}...`);
  
  const worker = spawn('node', [WORKER_SCRIPT, id], {
    cwd: __dirname,
    env: { ...process.env },
    stdio: 'inherit' // Workers output directly to console
  });
  
  // Track the worker
  workers.set(id, {
    process: worker,
    pid: worker.pid,
    startTime: Date.now(),
    restarts: 0
  });
  
  console.log(`✅ Worker ${id} started (PID: ${worker.pid})`);
  
  // Handle worker exit
  worker.on('exit', (code, signal) => {
    const workerInfo = workers.get(id);
    const runtime = ((Date.now() - workerInfo.startTime) / 1000).toFixed(1);
    
    if (signal) {
      console.log(`⚠️  Worker ${id} killed by signal ${signal} after ${runtime}s`);
    } else {
      console.log(`⚠️  Worker ${id} exited with code ${code} after ${runtime}s`);
    }
    
    // Remove from tracking
    workers.delete(id);
    
    // Restart if not shutting down
    if (!shuttingDown) {
      workerInfo.restarts++;
      
      if (workerInfo.restarts < 10) {
        console.log(`🔄 Restarting worker ${id} in ${RESTART_DELAY / 1000} seconds (attempt ${workerInfo.restarts})...`);
        setTimeout(() => spawnWorker(id), RESTART_DELAY);
      } else {
        console.error(`❌ Worker ${id} crashed too many times, not restarting`);
      }
    }
  });
  
  // Handle worker errors
  worker.on('error', (error) => {
    console.error(`❌ Worker ${id} error: ${error.message}`);
  });
  
  return worker;
}

/**
 * Start all workers
 */
function startWorkers() {
  console.log('🎨 Webtoys Edit Agent Worker Manager');
  console.log('=' + '='.repeat(50));
  console.log(`📊 Configuration:`);
  console.log(`   Workers: ${NUM_WORKERS}`);
  console.log(`   Script: ${WORKER_SCRIPT}`);
  console.log(`   Database: ${process.env.SUPABASE_URL?.substring(0, 30)}...`);
  console.log('=' + '='.repeat(50));
  
  // Spawn workers
  for (let i = 1; i <= NUM_WORKERS; i++) {
    spawnWorker(i);
  }
  
  console.log(`\n✅ All ${NUM_WORKERS} workers started`);
  console.log('📡 Workers are now polling for edit requests...\n');
}

/**
 * Graceful shutdown
 */
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  
  console.log(`\n🛑 Received ${signal}, shutting down workers...`);
  
  // Kill all workers
  for (const [id, workerInfo] of workers) {
    console.log(`   Stopping worker ${id} (PID: ${workerInfo.pid})...`);
    workerInfo.process.kill('SIGTERM');
  }
  
  // Wait for workers to exit gracefully
  let waitTime = 0;
  const maxWait = 10000; // 10 seconds
  
  while (workers.size > 0 && waitTime < maxWait) {
    await new Promise(resolve => setTimeout(resolve, 100));
    waitTime += 100;
  }
  
  if (workers.size > 0) {
    console.log('⚠️  Some workers did not exit gracefully, forcing shutdown');
    for (const [id, workerInfo] of workers) {
      workerInfo.process.kill('SIGKILL');
    }
  }
  
  console.log('✅ All workers stopped');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Monitor worker health
setInterval(() => {
  if (!shuttingDown) {
    const status = [];
    for (const [id, workerInfo] of workers) {
      const runtime = ((Date.now() - workerInfo.startTime) / 1000 / 60).toFixed(1);
      status.push(`W${id}:${runtime}m`);
    }
    
    if (status.length > 0) {
      console.log(`💚 Workers healthy: [${status.join(', ')}]`);
    }
  }
}, 60000); // Log status every minute

// Check environment
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  console.error('   Check .env.local or .env file');
  process.exit(1);
}

// Start the manager
startWorkers();