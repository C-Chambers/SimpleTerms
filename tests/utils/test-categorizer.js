const fs = require('fs');
const path = require('path');

/**
 * Test Result Categorizer
 * Automatically categorizes websites based on test results
 * Maintains regression (passing) and problematic (failing) lists
 */

/**
 * Parse test results from log file
 */
function parseTestResults(logFile) {
  const logContent = fs.readFileSync(logFile, 'utf8');
  const results = {
    passed: [],
    failed: []
  };
  
  // Parse successful tests
  const successPattern = /🔍 Testing: ([^(]+) \(([^)]+)\)[\s\S]*?✅ SUCCESS.*?Risk Score: (\d+)/g;
  let match;
  while ((match = successPattern.exec(logContent)) !== null) {
    const [, name, category, riskScore] = match;
    results.passed.push({
      name: name.trim(),
      category: category.trim(),
      riskScore: parseInt(riskScore)
    });
  }
  
  // Parse failed tests
  const failPattern = /🔍 Testing: ([^(]+) \(([^)]+)\)[\s\S]*?❌ FAILED: ([^\n]+)/g;
  while ((match = failPattern.exec(logContent)) !== null) {
    const [, name, category, error] = match;
    results.failed.push({
      name: name.trim(),
      category: category.trim(),
      error: error.trim()
    });
  }
  
  return results;
}

/**
 * Categorize sites from comprehensive test results
 */
async function categorizeSites(logFilePath) {
  console.log('📊 Analyzing test results...\n');
  
  // Read the comprehensive test fixture
  const comprehensivePath = path.join(__dirname, '../fixtures/comprehensive-test-sites.json');
  const comprehensive = JSON.parse(fs.readFileSync(comprehensivePath, 'utf8'));
  
  // Parse test results
  const results = parseTestResults(logFilePath);
  
  // Create categorized structure
  const categorized = {
    regression: {
      description: "Sites that consistently pass testing - used for regression testing",
      lastUpdated: new Date().toISOString(),
      totalSites: 0,
      sites: []
    },
    problematic: {
      description: "Sites that currently fail testing - need fixes or enhanced strategies",
      lastUpdated: new Date().toISOString(),
      totalSites: 0,
      sites: []
    },
    statistics: {
      totalTested: results.passed.length + results.failed.length,
      passed: results.passed.length,
      failed: results.failed.length,
      passRate: ((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1)
    }
  };
  
  // Build site lookup map from comprehensive fixture
  const siteMap = {};
  Object.entries(comprehensive.testSites).forEach(([category, sites]) => {
    sites.forEach(site => {
      siteMap[site.name] = {
        ...site,
        category
      };
    });
  });
  
  // Categorize passing sites for regression testing
  results.passed.forEach(result => {
    const siteInfo = siteMap[result.name];
    if (siteInfo) {
      categorized.regression.sites.push({
        name: result.name,
        url: siteInfo.url,
        category: siteInfo.category,
        expectedPoints: 7,
        timeout: siteInfo.timeout || 15000,
        lastPassedRiskScore: result.riskScore,
        status: 'stable'
      });
    }
  });
  
  // Categorize failing sites as problematic
  results.failed.forEach(result => {
    const siteInfo = siteMap[result.name];
    if (siteInfo) {
      // Determine failure category
      let issueType = 'unknown';
      const errorLower = result.error.toLowerCase();
      
      if (errorLower.includes('privacy policy') || errorLower.includes('no privacy')) {
        issueType = 'privacy_not_found';
      } else if (errorLower.includes('timeout') || errorLower.includes('navigation')) {
        issueType = 'navigation_timeout';
      } else if (errorLower.includes('frame') || errorLower.includes('detached')) {
        issueType = 'frame_detachment';
      } else if (errorLower.includes('cloud') || errorLower.includes('api')) {
        issueType = 'api_error';
      } else if (errorLower.includes('content') || errorLower.includes('empty')) {
        issueType = 'content_extraction';
      }
      
      categorized.problematic.sites.push({
        name: result.name,
        url: siteInfo.url,
        category: siteInfo.category,
        expectedPoints: 7,
        timeout: siteInfo.timeout || 20000,
        lastError: result.error,
        issueType: issueType,
        requiresEnhancement: true,
        status: 'failing'
      });
    }
  });
  
  // Update counts
  categorized.regression.totalSites = categorized.regression.sites.length;
  categorized.problematic.totalSites = categorized.problematic.sites.length;
  
  // Sort sites alphabetically within each category
  categorized.regression.sites.sort((a, b) => a.name.localeCompare(b.name));
  categorized.problematic.sites.sort((a, b) => a.name.localeCompare(b.name));
  
  return categorized;
}

/**
 * Write categorized results to fixture files
 */
async function writeCategorizedFixtures(categorized) {
  const fixturesDir = path.join(__dirname, '../fixtures');
  
  // Write regression sites fixture
  const regressionPath = path.join(fixturesDir, 'regression-sites.json');
  const regressionFixture = {
    description: categorized.regression.description,
    lastUpdated: categorized.regression.lastUpdated,
    totalSites: categorized.regression.totalSites,
    sites: categorized.regression.sites
  };
  
  fs.writeFileSync(regressionPath, JSON.stringify(regressionFixture, null, 2));
  console.log(`✅ Written ${categorized.regression.totalSites} sites to: regression-sites.json`);
  
  // Write problematic sites fixture
  const problematicPath = path.join(fixturesDir, 'problematic-sites.json');
  const problematicFixture = {
    description: categorized.problematic.description,
    lastUpdated: categorized.problematic.lastUpdated,
    totalSites: categorized.problematic.totalSites,
    sites: categorized.problematic.sites
  };
  
  fs.writeFileSync(problematicPath, JSON.stringify(problematicFixture, null, 2));
  console.log(`❌ Written ${categorized.problematic.totalSites} sites to: problematic-sites.json`);
  
  // Write summary report
  const summaryPath = path.join(fixturesDir, 'test-categorization-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(categorized, null, 2));
  console.log(`📊 Written summary to: test-categorization-summary.json`);
  
  return {
    regression: regressionPath,
    problematic: problematicPath,
    summary: summaryPath
  };
}

/**
 * Main categorization function
 */
async function categorizeTestResults(logFilePath) {
  try {
    if (!logFilePath) {
      // Find the most recent test log
      const resultsDir = path.join(__dirname, '../results');
      if (fs.existsSync(resultsDir)) {
        const files = fs.readdirSync(resultsDir)
          .filter(f => f.startsWith('comprehensive-test-') && f.endsWith('.log'))
          .sort()
          .reverse();
        
        if (files.length > 0) {
          logFilePath = path.join(resultsDir, files[0]);
          console.log(`Using most recent test log: ${files[0]}`);
        }
      }
    }
    
    if (!logFilePath || !fs.existsSync(logFilePath)) {
      throw new Error('No test log file found. Run comprehensive tests first.');
    }
    
    // Categorize sites
    const categorized = await categorizeSites(logFilePath);
    
    // Display results
    console.log('\n📈 Categorization Results:');
    console.log('=' .repeat(50));
    console.log(`Total Sites Tested: ${categorized.statistics.totalTested}`);
    console.log(`✅ Regression (Passing): ${categorized.regression.totalSites}`);
    console.log(`❌ Problematic (Failing): ${categorized.problematic.totalSites}`);
    console.log(`📊 Pass Rate: ${categorized.statistics.passRate}%`);
    console.log('=' .repeat(50));
    
    // Show category breakdown
    console.log('\n📂 Regression Sites by Category:');
    const regressionByCategory = {};
    categorized.regression.sites.forEach(site => {
      if (!regressionByCategory[site.category]) {
        regressionByCategory[site.category] = [];
      }
      regressionByCategory[site.category].push(site.name);
    });
    
    Object.entries(regressionByCategory).forEach(([category, sites]) => {
      console.log(`  ${category}: ${sites.length} sites`);
    });
    
    console.log('\n⚠️  Problematic Sites by Issue Type:');
    const problemsByType = {};
    categorized.problematic.sites.forEach(site => {
      if (!problemsByType[site.issueType]) {
        problemsByType[site.issueType] = [];
      }
      problemsByType[site.issueType].push(site.name);
    });
    
    Object.entries(problemsByType).forEach(([type, sites]) => {
      console.log(`  ${type}: ${sites.length} sites`);
      sites.slice(0, 3).forEach(site => {
        console.log(`    - ${site}`);
      });
      if (sites.length > 3) {
        console.log(`    ... and ${sites.length - 3} more`);
      }
    });
    
    // Write fixtures
    const paths = await writeCategorizedFixtures(categorized);
    
    console.log('\n✅ Categorization complete!');
    console.log('You can now run:');
    console.log('  npm run test:regression  - Test all passing sites');
    console.log('  npm run test:problematic - Test all failing sites');
    
    return categorized;
    
  } catch (error) {
    console.error('Error categorizing test results:', error.message);
    process.exit(1);
  }
}

// Allow running as script
if (require.main === module) {
  const logFile = process.argv[2];
  categorizeTestResults(logFile);
}

module.exports = {
  parseTestResults,
  categorizeSites,
  writeCategorizedFixtures,
  categorizeTestResults
};