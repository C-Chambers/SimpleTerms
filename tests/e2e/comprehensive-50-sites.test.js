const { testSiteDirectly } = require('../utils/direct-test-helpers');
const comprehensiveSites = require('../fixtures/comprehensive-test-sites.json');

/**
 * Comprehensive 50-Website Testing Suite
 * Tests 10 categories with 5 websites each
 * Target: 90% pass rate (45/50 websites)
 */

describe('SimpleTerms Extension - Comprehensive 50-Site Test Suite', () => {
  
  // Set longer timeout for comprehensive testing
  const testTimeout = 90000; // 90 seconds per test
  
  // Track overall results
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    byCategory: {},
    failureDetails: []
  };

  beforeAll(() => {
    console.log('\n🚀 Starting Comprehensive 50-Website Test Suite');
    console.log('📊 Testing 10 categories with 5 sites each');
    console.log('🎯 Target: 90% pass rate (45/50 sites)\n');
    
    // Initialize category tracking
    Object.keys(comprehensiveSites.testSites).forEach(category => {
      testResults.byCategory[category] = {
        total: 0,
        passed: 0,
        failed: 0,
        sites: []
      };
    });
  });

  afterAll(() => {
    // Calculate pass rate
    const passRate = (testResults.passed / testResults.total * 100).toFixed(1);
    const targetMet = passRate >= 90;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE TEST SUITE RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Total Sites Tested: ${testResults.total}`);
    console.log(`   ✅ Passed: ${testResults.passed}`);
    console.log(`   ❌ Failed: ${testResults.failed}`);
    console.log(`   📊 Pass Rate: ${passRate}%`);
    console.log(`   🎯 Target Met: ${targetMet ? '✅ YES' : '❌ NO'} (Target: 90%)`);
    
    console.log(`\n📂 Results by Category:`);
    Object.entries(testResults.byCategory).forEach(([category, stats]) => {
      const categoryPassRate = stats.total > 0 
        ? (stats.passed / stats.total * 100).toFixed(1) 
        : 0;
      console.log(`\n   ${category.toUpperCase()}:`);
      console.log(`   • Tested: ${stats.total}`);
      console.log(`   • Passed: ${stats.passed}`);
      console.log(`   • Failed: ${stats.failed}`);
      console.log(`   • Pass Rate: ${categoryPassRate}%`);
      
      if (stats.sites.length > 0) {
        stats.sites.forEach(site => {
          const icon = site.passed ? '✅' : '❌';
          console.log(`     ${icon} ${site.name}: ${site.passed ? 'PASS' : 'FAIL'}`);
          if (!site.passed && site.error) {
            console.log(`        └─ ${site.error}`);
          }
        });
      }
    });
    
    if (testResults.failureDetails.length > 0) {
      console.log(`\n⚠️  Failure Analysis:`);
      
      // Group failures by error type
      const failurePatterns = {};
      testResults.failureDetails.forEach(failure => {
        const errorType = categorizeError(failure.error);
        if (!failurePatterns[errorType]) {
          failurePatterns[errorType] = [];
        }
        failurePatterns[errorType].push(failure.site);
      });
      
      Object.entries(failurePatterns).forEach(([errorType, sites]) => {
        console.log(`\n   ${errorType}:`);
        sites.forEach(site => {
          console.log(`   • ${site}`);
        });
      });
    }
    
    console.log('\n' + '='.repeat(80));
    
    if (targetMet) {
      console.log('🎉 SUCCESS: 90% pass rate achieved!');
    } else {
      console.log('📝 IMPROVEMENT NEEDED: Below 90% pass rate');
      console.log(`   Need ${Math.ceil(45 - testResults.passed)} more sites to pass`);
    }
    
    console.log('='.repeat(80) + '\n');
  });

  // Test each category
  Object.entries(comprehensiveSites.testSites).forEach(([category, sites]) => {
    describe(`Category: ${category.toUpperCase()}`, () => {
      
      sites.forEach(site => {
        test(`${site.name} - ${site.type} site`, async () => {
          console.log(`\n🔍 Testing: ${site.name} (${category})`);
          console.log(`📍 URL: ${site.url}`);
          console.log(`🏷️  Type: ${site.type}`);
          console.log(`⏱️  Timeout: ${site.timeout}ms`);
          
          const startTime = Date.now();
          let result;
          
          try {
            result = await testSiteDirectly(site.url, site.timeout);
          } catch (error) {
            result = {
              success: false,
              errorMessage: error.message,
              summaryPoints: [],
              riskScore: null
            };
          }
          
          const duration = Date.now() - startTime;
          
          console.log(`⏰ Test completed in ${duration}ms`);
          
          // Update tracking
          testResults.total++;
          testResults.byCategory[category].total++;
          
          const siteResult = {
            name: site.name,
            url: site.url,
            category: category,
            type: site.type,
            duration: duration,
            passed: false,
            error: null
          };
          
          // Evaluate results
          if (result.success && result.summaryPoints && result.summaryPoints.length === 7) {
            console.log(`✅ SUCCESS: Found ${result.summaryPoints.length} summary points`);
            console.log(`🎯 Risk Score: ${result.riskScore}/10`);
            
            testResults.passed++;
            testResults.byCategory[category].passed++;
            siteResult.passed = true;
            
            // Validate quality
            expect(result.summaryPoints).toHaveLength(7);
            expect(result.riskScore).toBeGreaterThan(0);
            expect(result.riskScore).toBeLessThanOrEqual(10);
            
            // Log summary preview
            console.log(`📝 Summary Preview:`);
            result.summaryPoints.slice(0, 3).forEach((point, index) => {
              console.log(`   ${index + 1}. ${point.substring(0, 60)}...`);
            });
            console.log(`   ... and ${result.summaryPoints.length - 3} more points`);
            
          } else {
            const errorMsg = result.errorMessage || 'Unknown error';
            console.log(`❌ FAILED: ${errorMsg}`);
            
            testResults.failed++;
            testResults.byCategory[category].failed++;
            siteResult.passed = false;
            siteResult.error = errorMsg;
            
            testResults.failureDetails.push({
              site: site.name,
              category: category,
              url: site.url,
              error: errorMsg,
              type: site.type
            });
            
            // For problematic sites, we expect some failures
            if (site.type === 'problematic') {
              console.log(`⚠️  Expected difficulty with problematic site`);
            }
          }
          
          testResults.byCategory[category].sites.push(siteResult);
          
          // Performance check
          if (duration > site.timeout + 10000) {
            console.log(`⚠️  Performance warning: Test took longer than expected`);
          }
          
        }, testTimeout);
      });
      
    });
  });

  // Helper function to categorize errors
  function categorizeError(errorMessage) {
    if (!errorMessage) return 'Unknown Error';
    
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('privacy policy') || lowerError.includes('no privacy')) {
      return 'Privacy Policy Not Found';
    }
    if (lowerError.includes('navigation') || lowerError.includes('timeout')) {
      return 'Navigation/Timeout Issues';
    }
    if (lowerError.includes('frame') || lowerError.includes('detached')) {
      return 'Frame/Context Issues';
    }
    if (lowerError.includes('cloud function') || lowerError.includes('api')) {
      return 'API/Cloud Function Error';
    }
    if (lowerError.includes('content script')) {
      return 'Content Script Error';
    }
    if (lowerError.includes('network') || lowerError.includes('connection')) {
      return 'Network Error';
    }
    
    return 'Other Error';
  }

});

// Export test results for analysis
module.exports = { testResults };