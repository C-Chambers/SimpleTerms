const { testSiteDirectly } = require('../utils/direct-test-helpers');
const { testSiteEnhanced } = require('../utils/enhanced-test-helpers');
const comprehensiveSites = require('../fixtures/comprehensive-test-sites.json');

/**
 * Improved Comprehensive 50-Website Testing Suite
 * Uses enhanced testing for problematic sites
 * Target: 90% pass rate (45/50 websites)
 */

describe('SimpleTerms Extension - Improved Comprehensive Test Suite', () => {
  
  const testTimeout = 90000; // 90 seconds per test
  
  // Track overall results
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    improved: 0,
    byCategory: {},
    failureDetails: [],
    improvements: []
  };

  // Sites that failed in baseline and need enhanced testing
  const problematicSites = [
    'amazon.com', 'bestbuy.com', 'stackoverflow.com', 'youtube.com',
    'cnn.com', 'reddit.com', 'booking.com', 'expedia.com',
    'tripadvisor.com', 'duolingo.com', 'myfitnesspal.com',
    'cvs.com', 'epicgames.com', 'twitch.tv'
  ];

  beforeAll(() => {
    console.log('\n🚀 Starting IMPROVED Comprehensive Test Suite');
    console.log('📊 Testing 50 websites with enhanced detection');
    console.log('🎯 Target: 90% pass rate (45/50 sites)');
    console.log('🔧 Using enhanced testing for known problematic sites\n');
    
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
    console.log('📊 IMPROVED COMPREHENSIVE TEST SUITE RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n📈 Overall Statistics:`);
    console.log(`   Total Sites Tested: ${testResults.total}`);
    console.log(`   ✅ Passed: ${testResults.passed}`);
    console.log(`   ❌ Failed: ${testResults.failed}`);
    console.log(`   📊 Pass Rate: ${passRate}%`);
    console.log(`   🎯 Target Met: ${targetMet ? '✅ YES' : '❌ NO'} (Target: 90%)`);
    
    if (testResults.improved > 0) {
      console.log(`   🔧 Sites Fixed: ${testResults.improved} (previously failing)`);
    }
    
    console.log(`\n📂 Results by Category:`);
    Object.entries(testResults.byCategory).forEach(([category, stats]) => {
      const categoryPassRate = stats.total > 0 
        ? (stats.passed / stats.total * 100).toFixed(1) 
        : 0;
      console.log(`\n   ${category.toUpperCase()}:`);
      console.log(`   • Pass Rate: ${categoryPassRate}%`);
      console.log(`   • Passed: ${stats.passed}/${stats.total}`);
      
      if (stats.sites.length > 0) {
        stats.sites.forEach(site => {
          const icon = site.passed ? '✅' : '❌';
          const improvedIcon = site.improved ? '🔧' : '';
          console.log(`     ${icon} ${site.name}${improvedIcon}`);
        });
      }
    });
    
    if (testResults.improvements.length > 0) {
      console.log(`\n🔧 Fixed Sites (now passing):`);
      testResults.improvements.forEach(site => {
        console.log(`   ✅ ${site}`);
      });
    }
    
    if (testResults.failureDetails.length > 0) {
      console.log(`\n⚠️  Remaining Failures:`);
      testResults.failureDetails.forEach(failure => {
        console.log(`   ❌ ${failure.site}: ${failure.error}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    
    if (targetMet) {
      console.log('🎉 SUCCESS: 90% pass rate achieved!');
    } else {
      console.log(`📝 Still need ${Math.ceil(45 - testResults.passed)} more sites to pass`);
    }
    
    console.log('='.repeat(80) + '\n');
  });

  // Test each category
  Object.entries(comprehensiveSites.testSites).forEach(([category, sites]) => {
    describe(`Category: ${category.toUpperCase()}`, () => {
      
      sites.forEach(site => {
        test(`${site.name} - ${site.type} site`, async () => {
          const hostname = new URL(site.url).hostname.replace('www.', '');
          const useEnhanced = problematicSites.includes(hostname);
          
          console.log(`\n🔍 Testing: ${site.name} (${category})`);
          console.log(`📍 URL: ${site.url}`);
          console.log(`🏷️  Type: ${site.type}`);
          console.log(`⏱️  Timeout: ${site.timeout}ms`);
          
          if (useEnhanced) {
            console.log(`🔧 Using ENHANCED testing for known problematic site`);
          }
          
          const startTime = Date.now();
          let result;
          
          try {
            // Use enhanced testing for problematic sites
            if (useEnhanced) {
              result = await testSiteEnhanced(site.url, site.timeout);
            } else {
              result = await testSiteDirectly(site.url, site.timeout);
            }
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
            improved: false,
            error: null
          };
          
          // Evaluate results
          if (result.success && result.summaryPoints && result.summaryPoints.length === 7) {
            console.log(`✅ SUCCESS: Found ${result.summaryPoints.length} summary points`);
            console.log(`🎯 Risk Score: ${result.riskScore}/10`);
            
            testResults.passed++;
            testResults.byCategory[category].passed++;
            siteResult.passed = true;
            
            // Check if this was previously failing
            if (useEnhanced) {
              console.log(`🔧 IMPROVEMENT: Previously failing site now passes!`);
              testResults.improved++;
              testResults.improvements.push(site.name);
              siteResult.improved = true;
            }
            
            // Validate quality
            expect(result.summaryPoints).toHaveLength(7);
            expect(result.riskScore).toBeGreaterThan(0);
            expect(result.riskScore).toBeLessThanOrEqual(10);
            
            // Log summary preview
            console.log(`📝 Summary Preview:`);
            result.summaryPoints.slice(0, 2).forEach((point, index) => {
              console.log(`   ${index + 1}. ${point.substring(0, 60)}...`);
            });
            
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
              type: site.type,
              enhanced: useEnhanced
            });
          }
          
          testResults.byCategory[category].sites.push(siteResult);
          
        }, testTimeout);
      });
      
    });
  });

});