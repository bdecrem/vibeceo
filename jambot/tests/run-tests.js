#!/usr/bin/env node
/**
 * Jambot Test Runner
 * Runs all architecture tests. Exit code 1 if any fail.
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const tests = [
  'test-param-roundtrip.js',
  'test-interface-contract.js',
  'test-defaults-consistency.js',
  'test-platform-rules.js',
  'test-analyze.js',
];

let allPassed = true;

for (const test of tests) {
  const testPath = join(__dirname, test);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${test}`);
  console.log('='.repeat(60));

  try {
    execSync(`node ${testPath}`, { stdio: 'inherit', cwd: join(__dirname, '..') });
  } catch (e) {
    allPassed = false;
    console.error(`\n${test}: FAILED`);
  }
}

console.log(`\n${'='.repeat(60)}`);
if (allPassed) {
  console.log('All tests passed.');
} else {
  console.log('Some tests FAILED.');
  process.exit(1);
}
