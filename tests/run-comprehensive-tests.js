#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Executes the 50-website test suite and provides detailed analytics
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 SimpleTerms Comprehensive Testing Suite');
console.log('=' .repeat(60));
console.log('Testing 50 websites across 10 categories');
console.log('Target: 90% pass rate (45/50 sites)');
console.log('=' .repeat(60) + '\n');

// Create results directory
const resultsDir = path.join(__dirname, 'results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir);
}

// Timestamp for this test run
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(resultsDir, `comprehensive-test-${timestamp}.log`);

console.log(`📝 Logging results to: ${logFile}\n`);

// Run the comprehensive test
const testProcess = spawn('npx', [
  'jest',
  'tests/e2e/comprehensive-50-sites.test.js',
  '--verbose',
  '--no-coverage',
  '--forceExit',
  '--detectOpenHandles'
], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

// Create write stream for logging
const logStream = fs.createWriteStream(logFile);

// Capture and display output
testProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  logStream.write(output);
});

testProcess.stderr.on('data', (data) => {
  const output = data.toString();
  process.stderr.write(output);
  logStream.write(output);
});

// Handle test completion
testProcess.on('close', (code) => {
  logStream.end();
  
  console.log('\n' + '=' .repeat(60));
  
  if (code === 0) {
    console.log('✅ Test suite completed successfully');
  } else {
    console.log(`⚠️  Test suite exited with code ${code}`);
  }
  
  console.log(`📁 Full results saved to: ${logFile}`);
  console.log('=' .repeat(60) + '\n');
  
  // Parse results and create summary
  generateSummary(logFile);
});

/**
 * Generate a summary report from the test log
 */
function generateSummary(logFile) {
  try {
    const logContent = fs.readFileSync(logFile, 'utf8');
    const summaryFile = logFile.replace('.log', '-summary.json');
    
    // Extract key metrics using regex patterns
    const passedMatch = logContent.match(/✅ Passed: (\d+)/);
    const failedMatch = logContent.match(/❌ Failed: (\d+)/);
    const passRateMatch = logContent.match(/📊 Pass Rate: ([\d.]+)%/);
    
    const summary = {
      timestamp: new Date().toISOString(),
      testRun: path.basename(logFile),
      results: {
        total: 50,
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        passRate: passRateMatch ? parseFloat(passRateMatch[1]) : 0
      },
      targetMet: false,
      categories: extractCategoryResults(logContent)
    };
    
    summary.targetMet = summary.results.passRate >= 90;
    
    // Save summary
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`📊 Summary report saved to: ${summaryFile}\n`);
    
    // Display quick summary
    console.log('📈 Quick Summary:');
    console.log(`   • Pass Rate: ${summary.results.passRate}%`);
    console.log(`   • Target Met: ${summary.targetMet ? '✅ YES' : '❌ NO'}`);
    console.log(`   • Sites Passed: ${summary.results.passed}/50`);
    
    if (!summary.targetMet) {
      const needed = Math.ceil(45 - summary.results.passed);
      console.log(`   • Sites needed for 90%: ${needed}`);
    }
    
  } catch (error) {
    console.error('Error generating summary:', error.message);
  }
}

/**
 * Extract category-specific results from log content
 */
function extractCategoryResults(logContent) {
  const categories = {};
  const categoryPattern = /(\w+):\s+•\s+Tested:\s+(\d+)\s+•\s+Passed:\s+(\d+)\s+•\s+Failed:\s+(\d+)/g;
  
  let match;
  while ((match = categoryPattern.exec(logContent)) !== null) {
    const [, category, tested, passed, failed] = match;
    categories[category.toLowerCase()] = {
      tested: parseInt(tested),
      passed: parseInt(passed),
      failed: parseInt(failed),
      passRate: tested > 0 ? (parseInt(passed) / parseInt(tested) * 100).toFixed(1) : 0
    };
  }
  
  return categories;
}

// Handle interruption
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  testProcess.kill();
  process.exit(1);
});