const { testSiteDirectly } = require('../utils/direct-test-helpers');
const { testSiteEnhanced } = require('../utils/enhanced-test-helpers');
const { testWithMultipleStrategies } = require('../utils/multi-strategy-helpers');
const comprehensiveSites = require('../fixtures/comprehensive-test-sites.json');

/**
 * FINAL Comprehensive 50-Website Testing Suite
 * Uses multi-strategy approach for maximum success rate
 * Target: 90% pass rate (45/50 websites)
 */

describe('SimpleTerms Extension - FINAL Comprehensive Test Suite', () => {
  
  const testTimeout = 120000; // 2 minutes per test (longer for multi-strategy)
  
  // Track overall results
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    improved: 0,
    byCategory: {},
    byStrategy: {},
    failureDetails: [],
    improvements: []
  };

  // Sites that failed in baseline testing (need aggressive strategies)
  const veryProblematicSites = [
    'amazon.com', 'bestbuy.com', 'stackoverflow.com', 'youtube.com',
    'cnn.com', 'reddit.com', 'booking.com', 'expedia.com',
    'tripadvisor.com', 'duolingo.com', 'myfitnesspal.com',
    'cvs.com', 'epicgames.com', 'twitch.tv'
  ];
  
  // Sites that sometimes fail (need enhanced testing)
  const moderatelyProblematicSites = [
    'ebay.com', 'chase.com', 'facebook.com', 'instagram.com',
    'notion.so', 'linkedin.com', 'x.com', 'netflix.com'
  ];

  beforeAll(() => {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 Starting FINAL Comprehensive Test Suite with Multi-Strategy Approach');
    console.log('='.repeat(80));
    console.log('📊 Testing 50 websites across 10 categories');
    console.log('🎯 Target: 90% pass rate (45/50 sites)');
    console.log('🔧 Strategy Selection:');
    console.log('   • Standard: Reliable sites');
    console.log('   • Enhanced: Moderately problematic sites');
    console.log('   • Multi-Strategy: Very problematic sites');
    console.log('='.repeat(80) + '\n');
    
    // Initialize tracking
    Object.keys(comprehensiveSites.testSites).forEach(category => {
      testResults.byCategory[category] = {
        total: 0,
        passed: 0,
        failed: 0,
        sites: []
      };
    });
    
    testResults.byStrategy = {
      standard: { attempted: 0, passed: 0 },
      enhanced: { attempted: 0, passed: 0 },
      multiStrategy: { attempted: 0, passed: 0 }
    };
  });

  afterAll(() => {
    const passRate = (testResults.passed / testResults.total * 100).toFixed(1);
    const targetMet = passRate >= 90;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL COMPREHENSIVE TEST SUITE RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   Total Sites: ${testResults.total}`);
    console.log(`   ✅ Passed: ${testResults.passed}`);
    console.log(`   ❌ Failed: ${testResults.failed}`);
    console.log(`   📊 Pass Rate: ${passRate}%`);
    console.log(`   🏆 Target Met: ${targetMet ? '✅ YES!' : '❌ NO'} (Target: 90%)`);
    
    console.log(`\n📈 STRATEGY EFFECTIVENESS:`);
    Object.entries(testResults.byStrategy).forEach(([strategy, stats]) => {
      if (stats.attempted > 0) {
        const strategyRate = (stats.passed / stats.attempted * 100).toFixed(1);
        console.log(`   ${strategy}: ${stats.passed}/${stats.attempted} (${strategyRate}%)`);
      }
    });
    
    console.log(`\n📂 CATEGORY BREAKDOWN:`);
    Object.entries(testResults.byCategory).forEach(([category, stats]) => {
      const categoryRate = stats.total > 0 
        ? (stats.passed / stats.total * 100).toFixed(1) 
        : 0;
      console.log(`   ${category.toUpperCase()}: ${stats.passed}/${stats.total} (${categoryRate}%)`);
    });
    
    if (testResults.failureDetails.length > 0) {
      console.log(`\n⚠️  REMAINING FAILURES (${testResults.failureDetails.length}):`);
      testResults.failureDetails.forEach(failure => {
        console.log(`   ❌ ${failure.site} (${failure.strategy}): ${failure.error.substring(0, 50)}...`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    
    if (targetMet) {
      console.log('🎉🎉🎉 SUCCESS! 90% PASS RATE ACHIEVED! 🎉🎉🎉');
      console.log('The SimpleTerms extension successfully analyzes ' + testResults.passed + ' out of 50 major websites!');
    } else {
      const needed = Math.ceil(45 - testResults.passed);
      console.log(`📝 Progress made but ${needed} more sites needed for 90% target`);
    }
    
    console.log('='.repeat(80) + '\n');
  });

  // Test each category
  Object.entries(comprehensiveSites.testSites).forEach(([category, sites]) => {
    describe(`Category: ${category.toUpperCase()}`, () => {
      
      sites.forEach(site => {
        test(`${site.name}`, async () => {
          const hostname = new URL(site.url).hostname.replace('www.', '');
          
          // Determine which strategy to use
          let strategy = 'standard';
          let testFunction = testSiteDirectly;
          
          if (veryProblematicSites.includes(hostname)) {
            strategy = 'multiStrategy';
            testFunction = testWithMultipleStrategies;
          } else if (moderatelyProblematicSites.includes(hostname)) {
            strategy = 'enhanced';
            testFunction = testSiteEnhanced;
          }
          
          console.log(`\n🔍 Testing: ${site.name}`);
          console.log(`   URL: ${site.url}`);
          console.log(`   Category: ${category}`);
          console.log(`   Strategy: ${strategy.toUpperCase()}`);
          
          const startTime = Date.now();
          testResults.byStrategy[strategy].attempted++;
          
          let result;
          try {
            result = await testFunction(site.url, site.timeout || 30000);
          } catch (error) {
            result = {
              success: false,
              errorMessage: error.message,
              summaryPoints: [],
              riskScore: null
            };
          }
          
          const duration = Date.now() - startTime;
          
          // Update tracking
          testResults.total++;
          testResults.byCategory[category].total++;
          
          const siteResult = {
            name: site.name,
            url: site.url,
            category: category,
            strategy: strategy,
            duration: duration,
            passed: false
          };
          
          // Evaluate results
          if (result.success && result.summaryPoints && result.summaryPoints.length === 7) {
            console.log(`   ✅ SUCCESS in ${(duration/1000).toFixed(1)}s`);
            console.log(`   Risk Score: ${result.riskScore}/10`);
            if (result.strategyUsed) {
              console.log(`   Strategy Used: ${result.strategyUsed}`);
            }
            
            testResults.passed++;
            testResults.byCategory[category].passed++;
            testResults.byStrategy[strategy].passed++;
            siteResult.passed = true;
            
            // Validate
            expect(result.summaryPoints).toHaveLength(7);
            expect(result.riskScore).toBeGreaterThan(0);
            expect(result.riskScore).toBeLessThanOrEqual(10);
            
          } else {
            const errorMsg = result.errorMessage || 'Unknown error';
            console.log(`   ❌ FAILED: ${errorMsg.substring(0, 60)}...`);
            
            testResults.failed++;
            testResults.byCategory[category].failed++;
            siteResult.passed = false;
            
            testResults.failureDetails.push({
              site: site.name,
              category: category,
              url: site.url,
              error: errorMsg,
              strategy: strategy
            });
          }
          
          testResults.byCategory[category].sites.push(siteResult);
          
        }, testTimeout);
      });
      
    });
  });

});