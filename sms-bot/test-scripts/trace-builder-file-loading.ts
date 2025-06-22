#!/usr/bin/env node

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 TRACING BUILDER FILE LOADING');
console.log('================================');

console.log(`Current __dirname: ${__dirname}`);

// Test from dist/test-scripts (current context)
const testFromHere = join(__dirname, '..', '..', 'content', 'builder-app.json');
console.log(`\n📂 From test-scripts context:`);
console.log(`Path: ${testFromHere}`);
console.log(`Exists: ${existsSync(testFromHere)}`);

// Test from dist/engine (wtaf-processor context)
const testFromEngine = join(__dirname, '..', 'engine');
console.log(`\n📂 Simulating from engine context:`);
console.log(`Engine dir would be: ${testFromEngine}`);

const pathFromEngine = join(testFromEngine, '..', '..', 'content', 'builder-app.json');
console.log(`Path from engine: ${pathFromEngine}`);
console.log(`Exists: ${existsSync(pathFromEngine)}`);

// Test the actual paths that might be used
const possiblePaths = [
    join(__dirname, '..', '..', 'content', 'builder-app.json'),
    join(__dirname, '..', 'content', 'builder-app.json'),
    join(__dirname, 'content', 'builder-app.json'),
    join(__dirname, '..', '..', '..', 'content', 'builder-app.json'),
];

console.log(`\n🔍 Testing all possible paths:`);
possiblePaths.forEach((path, i) => {
    console.log(`${i + 1}. ${path} - exists: ${existsSync(path)}`);
});

// Check if builder-zad-implementer.json exists too
const zadPath = join(__dirname, '..', '..', 'content', 'builder-zad-implementer.json');
console.log(`\n🤝 ZAD file check:`);
console.log(`Path: ${zadPath}`);
console.log(`Exists: ${existsSync(zadPath)}`); 