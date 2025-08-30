module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'popup/**/*.js',
    'scripts/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  
  // Test timeout (important for browser automation)
  testTimeout: 120000, // 2 minutes for e2e tests
  
  // Verbose output
  verbose: true,
  
  // Test categories
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testTimeout: 10000
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      testTimeout: 180000 // 3 minutes for e2e tests
    }
  ]
};
