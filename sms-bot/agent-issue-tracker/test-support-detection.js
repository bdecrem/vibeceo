#!/usr/bin/env node

/**
 * Test script for support question detection
 */

import { isSupportQuestion, categorizeQuestion } from './knowledge-base.js';

const testQuestions = [
  // Support questions
  "How do I create a ZAD app?",
  "What is the stackzad command?",
  "Can you explain how stack commands work?",
  "Where can I find documentation?",
  "Why doesn't my app work?",
  "Is there a limit on how many apps I can create?",
  "Tell me about WEBTOYS features",
  "Help me understand the pricing",
  
  // Not support questions (actionable issues)
  "The gallery page is broken",
  "Add dark mode to the settings",
  "Bug: SMS messages are not being received",
  "Feature request: Add export to PDF",
  "The login button doesn't work",
  "Error 500 when submitting forms",
  "Improve performance of image loading"
];

console.log('Testing Support Question Detection\n');
console.log('='.repeat(50));

testQuestions.forEach(question => {
  const isSupport = isSupportQuestion(question);
  const category = categorizeQuestion(question);
  
  console.log(`\nQuestion: "${question}"`);
  console.log(`  Is Support? ${isSupport ? '✅ YES' : '❌ NO'}`);
  if (isSupport) {
    console.log(`  Category: ${category}`);
  }
});

console.log('\n' + '='.repeat(50));
console.log('Test complete!');