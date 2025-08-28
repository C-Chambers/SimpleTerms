const { testSiteDirectly } = require('../utils/direct-test-helpers');
const testSites = require('../fixtures/test-sites.json');

describe('SimpleTerms Extension - Static Sites Regression Tests', () => {
  
  // Set longer timeout for these tests since they involve real browser navigation and AI analysis
  const testTimeout = 60000; // 60 seconds per test
  
  beforeAll(() => {
    console.log('\n🚀 Starting Static Sites Regression Tests');
    console.log('📊 Testing sites for 7-point summary responses\n');
  });

  afterAll(() => {
    console.log('\n✅ Static Sites Regression Tests Complete\n');
  });

  // Test each static site individually
  testSites.staticSites.forEach(site => {
    test(`${site.name} (${site.category}) returns ${site.expectedPoints} analysis points`, async () => {
      console.log(`\n🔍 Testing: ${site.name}`);
      console.log(`📍 URL: ${site.url}`);
      console.log(`🏷️  Category: ${site.category}`);
      console.log(`⏱️  Timeout: ${site.timeout}ms`);
      
      const startTime = Date.now();
      const result = await testSiteDirectly(site.url, site.timeout);
      const duration = Date.now() - startTime;
      
      console.log(`⏰ Test completed in ${duration}ms`);
      
      // Log detailed results
      if (result.success) {
        console.log(`✅ SUCCESS: Found ${result.summaryPoints.length} summary points`);
        console.log(`🎯 Risk Score: ${result.riskScore}`);
        console.log(`📝 Summary Points:`);
        result.summaryPoints.forEach((point, index) => {
          console.log(`   ${index + 1}. ${point.substring(0, 80)}${point.length > 80 ? '...' : ''}`);
        });
      } else {
        console.log(`❌ FAILED: ${result.errorMessage}`);
        if (result.debugInfo) {
          console.log(`🔍 Debug Info:`, result.debugInfo);
        }
      }
      
      // Core assertions
      expect(result.success).toBe(true);
      expect(result.summaryPoints).toHaveLength(site.expectedPoints);
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskScore).toBeLessThanOrEqual(10);
      expect(result.errorMessage).toBeNull();
      
      // Performance assertion
      expect(duration).toBeLessThan(site.timeout + 5000); // Add 5s buffer
      
      console.log(`✅ ${site.name} test PASSED`);
      
    }, testTimeout);
  });

  // Summary test that runs all sites and provides overall statistics
  test('Overall regression test summary', async () => {
    console.log('\n📊 OVERALL REGRESSION TEST SUMMARY');
    console.log('=====================================');
    
    const results = [];
    let passCount = 0;
    let failCount = 0;
    
    // This test just logs summary - individual site tests handle the actual validation
    for (const site of testSites.staticSites) {
      console.log(`${site.name.padEnd(15)} | ${site.category.padEnd(12)} | Expected: ${site.expectedPoints} points`);
    }
    
    console.log('\n📈 Expected Results:');
    console.log(`🎯 Total Sites: ${testSites.staticSites.length}`);
    console.log(`📊 Categories: ${[...new Set(testSites.staticSites.map(s => s.category))].join(', ')}`);
    console.log(`⏱️  Timeout Range: ${Math.min(...testSites.staticSites.map(s => s.timeout))}ms - ${Math.max(...testSites.staticSites.map(s => s.timeout))}ms`);
    
    // This test always passes - it's just for reporting
    expect(testSites.staticSites.length).toBeGreaterThan(0);
  }, 10000);

});

// Additional utility tests for the test suite itself
describe('Test Suite Validation', () => {
  
  test('Test configuration is valid', () => {
    expect(testSites.staticSites).toBeDefined();
    expect(testSites.staticSites.length).toBeGreaterThan(0);
    
    testSites.staticSites.forEach(site => {
      expect(site.name).toBeDefined();
      expect(site.url).toMatch(/^https?:\/\//);
      expect(site.expectedPoints).toBe(7);
      expect(site.timeout).toBeGreaterThan(0);
      expect(site.category).toBeDefined();
    });
  });

  test('Test utilities are available', () => {
    expect(testSiteDirectly).toBeDefined();
    expect(typeof testSiteDirectly).toBe('function');
  });

});
