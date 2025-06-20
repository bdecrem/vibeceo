#!/usr/bin/env node

/**
 * Entry point for the WTAF engine microservices
 * This replaces the old Python monitor.py
 */

import { mainControllerLoop } from '../engine/controller.js';

console.log('🚀 Starting WTAF Engine...');

// Start the main controller loop
mainControllerLoop().catch(error => {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
}); 