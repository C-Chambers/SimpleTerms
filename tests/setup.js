/**
 * Jest setup file for SimpleTerms extension tests
 */

// Increase timeout for all tests (browser automation takes time)
jest.setTimeout(120000);

// Global test configuration
global.testConfig = {
  // Default timeouts
  defaultTimeout: 60000,
  navigationTimeout: 30000,
  analysisTimeout: 15000,
  
  // Browser configuration
  browserOptions: {
    headless: false, // Extension requires visible browser
    slowMo: 100,     // Slow down for debugging if needed
    devtools: false  // Set to true for debugging
  },
  
  // Test data
  expectedPointsCount: 7,
  validScoreRange: { min: 1, max: 10 }
};

// Console formatting for better test output
const originalConsoleLog = console.log;
console.log = (...args) => {
  const timestamp = new Date().toISOString();
  originalConsoleLog(`[${timestamp}]`, ...args);
};

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Test environment validation
beforeAll(async () => {
  console.log('🧪 SimpleTerms Test Suite Initialization');
  console.log('======================================');
  console.log(`Node Version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Test Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Jest Version: ${require('jest/package.json').version}`);
  console.log(`Puppeteer Version: ${require('puppeteer/package.json').version}`);
  console.log('');
});

afterAll(async () => {
  console.log('');
  console.log('🏁 SimpleTerms Test Suite Complete');
  console.log('==================================');
});
