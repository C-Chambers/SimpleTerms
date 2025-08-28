const { testSiteDirectly } = require('../utils/direct-test-helpers');
const fs = require('fs');
const path = require('path');

/**
 * Regression Test Suite
 * Tests all sites that previously passed to ensure they continue working
 * These sites should have a very high pass rate (95%+)
 */

describe('SimpleTerms Extension - Regression Test Suite', () => {
  
  let regressionSites = { sites: [] };
  const testTimeout = 60000; // 60 seconds per test
  
  // Load regression sites fixture
  beforeAll(() => {
    const fixturePath = path.join(__dirname, '../fixtures/regression-sites.json');
    if (fs.existsSync(fixturePath)) {
      regressionSites = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      console.log('\n🎯 Regression Test Suite');
      console.log('=' .repeat(60));
      console.log(`Testing ${regressionSites.totalSites} previously passing sites`);
      console.log('Expected pass rate: 95%+');
      console.log('=' .repeat(60) + '\n');
    } else {
      console.log('⚠️  No regression sites fixture found.');
      console.log('Run "npm run test:categorize" after comprehensive tests to generate it.\n');
    }
  });

  afterAll(() => {
    if (regressionSites.sites.length === 0) return;
    
    // Calculate results
    const results = global.regressionResults || { passed: 0, failed: 0 };
    const total = results.passed + results.failed;
    const passRate = total > 0 ? (results.passed / total * 100).toFixed(1) : 0;
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 REGRESSION TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`Total Sites: ${total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Pass Rate: ${passRate}%`);
    
    if (passRate >= 95) {
      console.log('🎉 Regression tests PASSED - No regressions detected!');
    } else if (passRate >= 90) {
      console.log('⚠️  Minor regressions detected - Investigation needed');
    } else {
      console.log('❌ Significant regressions detected - Critical fixes needed!');
    }
    console.log('=' .repeat(60) + '\n');
  });

  // Test each regression site
  if (regressionSites.sites && regressionSites.sites.length > 0) {
    regressionSites.sites.forEach(site => {
      test(`${site.name} (${site.category}) - Regression Check`, async () => {
        console.log(`\n🔍 Regression Testing: ${site.name}`);
        console.log(`   URL: ${site.url}`);
        console.log(`   Category: ${site.category}`);
        console.log(`   Last Risk Score: ${site.lastPassedRiskScore || 'N/A'}`);
        
        const startTime = Date.now();
        const result = await testSiteDirectly(site.url, site.timeout);
        const duration = Date.now() - startTime;
        
        // Initialize global results if needed
        if (!global.regressionResults) {
          global.regressionResults = { passed: 0, failed: 0 };
        }
        
        if (result.success && result.summaryPoints && result.summaryPoints.length === 7) {
          console.log(`   ✅ PASSED in ${(duration/1000).toFixed(1)}s`);
          console.log(`   Risk Score: ${result.riskScore}/10`);
          global.regressionResults.passed++;
          
          // Verify it still meets expectations
          expect(result.summaryPoints).toHaveLength(7);
          expect(result.riskScore).toBeGreaterThan(0);
          expect(result.riskScore).toBeLessThanOrEqual(10);
          
          // Check if risk score changed significantly
          if (site.lastPassedRiskScore && Math.abs(result.riskScore - site.lastPassedRiskScore) > 3) {
            console.log(`   ⚠️  Risk score changed significantly: ${site.lastPassedRiskScore} → ${result.riskScore}`);
          }
        } else {
          console.log(`   ❌ FAILED: ${result.errorMessage || 'Unknown error'}`);
          console.log(`   ⚠️  REGRESSION DETECTED - This site was previously passing!`);
          global.regressionResults.failed++;
          
          // Fail the test for regression
          expect(result.success).toBe(true);
        }
        
      }, testTimeout);
    });
  } else {
    test('Generate regression fixture', () => {
      console.log('No regression sites available.');
      console.log('Run comprehensive tests first, then use test:categorize');
      expect(true).toBe(true); // Dummy assertion
    });
  }

});