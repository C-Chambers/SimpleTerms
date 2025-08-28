const { testSiteDirectly } = require('../utils/direct-test-helpers');
const { testSiteEnhanced } = require('../utils/enhanced-test-helpers');
const { testWithMultipleStrategies } = require('../utils/multi-strategy-helpers');
const fs = require('fs');
const path = require('path');

/**
 * Problematic Sites Focused Test Suite
 * Tests only the sites that are currently failing
 * Used for iterative development and debugging
 */

describe('SimpleTerms Extension - Problematic Sites Focus', () => {
  
  let problematicSites = { sites: [] };
  const testTimeout = 90000; // 90 seconds per test (longer for problematic sites)
  
  // Load problematic sites fixture
  beforeAll(() => {
    const fixturePath = path.join(__dirname, '../fixtures/problematic-sites.json');
    if (fs.existsSync(fixturePath)) {
      problematicSites = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      console.log('\n🔧 Problematic Sites Focus Test');
      console.log('=' .repeat(60));
      console.log(`Testing ${problematicSites.totalSites} currently failing sites`);
      console.log('Using enhanced and multi-strategy approaches');
      console.log('=' .repeat(60) + '\n');
      
      // Group by issue type
      const byIssue = {};
      problematicSites.sites.forEach(site => {
        if (!byIssue[site.issueType]) {
          byIssue[site.issueType] = [];
        }
        byIssue[site.issueType].push(site.name);
      });
      
      console.log('📊 Sites by Issue Type:');
      Object.entries(byIssue).forEach(([type, sites]) => {
        console.log(`   ${type}: ${sites.length} sites`);
      });
      console.log('');
    } else {
      console.log('⚠️  No problematic sites fixture found.');
      console.log('Run "npm run test:categorize" after comprehensive tests to generate it.\n');
    }
  });

  afterAll(() => {
    if (problematicSites.sites.length === 0) return;
    
    // Calculate results
    const results = global.problematicResults || { 
      passed: 0, 
      failed: 0, 
      improved: [],
      byStrategy: {}
    };
    const total = results.passed + results.failed;
    const passRate = total > 0 ? (results.passed / total * 100).toFixed(1) : 0;
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 PROBLEMATIC SITES TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`Total Sites: ${total}`);
    console.log(`✅ Now Passing: ${results.passed}`);
    console.log(`❌ Still Failing: ${results.failed}`);
    console.log(`📊 Success Rate: ${passRate}%`);
    
    if (results.improved.length > 0) {
      console.log(`\n🎉 IMPROVEMENTS (${results.improved.length} sites now passing):`);
      results.improved.forEach(site => {
        console.log(`   ✅ ${site.name} (${site.strategy})`);
      });
    }
    
    if (Object.keys(results.byStrategy).length > 0) {
      console.log('\n📈 Strategy Effectiveness:');
      Object.entries(results.byStrategy).forEach(([strategy, stats]) => {
        const rate = stats.attempted > 0 ? (stats.passed / stats.attempted * 100).toFixed(1) : 0;
        console.log(`   ${strategy}: ${stats.passed}/${stats.attempted} (${rate}%)`);
      });
    }
    
    console.log('=' .repeat(60) + '\n');
  });

  // Test each problematic site with appropriate strategy
  if (problematicSites.sites && problematicSites.sites.length > 0) {
    problematicSites.sites.forEach(site => {
      test(`${site.name} (${site.category}) - ${site.issueType}`, async () => {
        console.log(`\n🔧 Testing Problematic Site: ${site.name}`);
        console.log(`   URL: ${site.url}`);
        console.log(`   Issue: ${site.issueType}`);
        console.log(`   Last Error: ${site.lastError?.substring(0, 50)}...`);
        
        // Initialize global results if needed
        if (!global.problematicResults) {
          global.problematicResults = { 
            passed: 0, 
            failed: 0, 
            improved: [],
            byStrategy: {}
          };
        }
        
        // Choose strategy based on issue type
        let strategy = 'enhanced';
        let result;
        
        if (site.issueType === 'privacy_not_found' || site.issueType === 'content_extraction') {
          // Use multi-strategy for sites where privacy policy can't be found
          console.log(`   Strategy: MULTI-STRATEGY (comprehensive)`);
          strategy = 'multi';
          result = await testWithMultipleStrategies(site.url, site.timeout);
        } else if (site.issueType === 'navigation_timeout' || site.issueType === 'frame_detachment') {
          // Use enhanced for navigation issues
          console.log(`   Strategy: ENHANCED (site-specific)`);
          strategy = 'enhanced';
          result = await testSiteEnhanced(site.url, site.timeout);
        } else {
          // Try standard first, then enhanced
          console.log(`   Strategy: STANDARD → ENHANCED fallback`);
          strategy = 'standard';
          result = await testSiteDirectly(site.url, site.timeout);
          
          if (!result.success) {
            console.log(`   Falling back to ENHANCED strategy...`);
            strategy = 'enhanced';
            result = await testSiteEnhanced(site.url, site.timeout);
          }
        }
        
        // Track strategy usage
        if (!global.problematicResults.byStrategy[strategy]) {
          global.problematicResults.byStrategy[strategy] = { attempted: 0, passed: 0 };
        }
        global.problematicResults.byStrategy[strategy].attempted++;
        
        // Evaluate results
        if (result.success && result.summaryPoints && result.summaryPoints.length === 7) {
          console.log(`   ✅ SUCCESS! Site is now passing!`);
          console.log(`   Risk Score: ${result.riskScore}/10`);
          if (result.strategyUsed) {
            console.log(`   Successful Strategy: ${result.strategyUsed}`);
          }
          
          global.problematicResults.passed++;
          global.problematicResults.byStrategy[strategy].passed++;
          global.problematicResults.improved.push({
            name: site.name,
            strategy: result.strategyUsed || strategy
          });
          
          // This is now a candidate for regression testing
          console.log(`   🎯 This site can be moved to regression testing!`);
          
          // Validate
          expect(result.summaryPoints).toHaveLength(7);
          expect(result.riskScore).toBeGreaterThan(0);
          expect(result.riskScore).toBeLessThanOrEqual(10);
          
        } else {
          console.log(`   ❌ Still failing: ${result.errorMessage || 'Unknown error'}`);
          global.problematicResults.failed++;
          
          // Provide debugging hints
          console.log(`   💡 Debugging hints:`);
          if (site.issueType === 'privacy_not_found') {
            console.log(`      - Privacy policy might be behind login/paywall`);
            console.log(`      - Check if site uses non-standard terminology`);
            console.log(`      - May need custom selector for this site`);
          } else if (site.issueType === 'navigation_timeout') {
            console.log(`      - Site may be blocking automated browsers`);
            console.log(`      - Try different user agents or browser args`);
            console.log(`      - Consider headless vs non-headless mode`);
          } else if (site.issueType === 'frame_detachment') {
            console.log(`      - Site uses complex iframe structure`);
            console.log(`      - May need to wait for specific elements`);
            console.log(`      - Consider frame-specific navigation`);
          }
        }
        
      }, testTimeout);
    });
  } else {
    test('Generate problematic fixture', () => {
      console.log('No problematic sites available.');
      console.log('Run comprehensive tests first, then use test:categorize');
      expect(true).toBe(true); // Dummy assertion
    });
  }

});