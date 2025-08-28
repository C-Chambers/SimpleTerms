#!/usr/bin/env node

/**
 * Categorize Test Results Script
 * Automatically categorizes sites into regression and problematic lists
 * based on the most recent comprehensive test results
 */

const { categorizeTestResults } = require('./utils/test-categorizer');
const path = require('path');

console.log('🔄 Categorizing Test Results');
console.log('=' .repeat(60));

// Get log file from command line or use most recent
const logFile = process.argv[2];

if (logFile) {
  console.log(`Using specified log file: ${logFile}`);
} else {
  console.log('Using most recent comprehensive test log...');
}

// Run categorization
categorizeTestResults(logFile)
  .then(() => {
    console.log('\n✅ Categorization complete!');
    console.log('\nNext steps:');
    console.log('1. Run regression tests: npm run test:regression');
    console.log('2. Debug problematic sites: npm run test:problematic');
    console.log('3. After fixes, run comprehensive again: npm run test:comprehensive');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Categorization failed:', error.message);
    process.exit(1);
  });