#!/usr/bin/env node

/**
 * Manual categorization based on our comprehensive 50-site test results
 * Success: 39/50 sites (78% pass rate)
 */

const fs = require('fs');
const path = require('path');

// Our test results based on the comprehensive 50-site test output
const testResults = {
  timestamp: new Date().toISOString(),
  totalSites: 50,
  passedSites: 39,
  failedSites: 11,
  passRate: 78.0,
  
  // Sites that PASSED (39 sites)
  regressionSites: [
    // E-commerce (4/5 passed)
    { name: "Amazon", category: "ecommerce", type: "static" },
    { name: "eBay", category: "ecommerce", type: "problematic" },
    { name: "Walmart", category: "ecommerce", type: "static" },
    { name: "Target", category: "ecommerce", type: "static" },
    
    // Financial (5/5 passed - PERFECT)
    { name: "PayPal", category: "financial", type: "static" },
    { name: "Chase Bank", category: "financial", type: "problematic" },
    { name: "Bank of America", category: "financial", type: "static" },
    { name: "Wells Fargo", category: "financial", type: "static" },
    { name: "Venmo", category: "financial", type: "static" },
    
    // Technology (4/5 passed)
    { name: "Microsoft", category: "technology", type: "static" },
    { name: "Google", category: "technology", type: "static" },
    { name: "Apple", category: "technology", type: "static" },
    { name: "GitHub", category: "technology", type: "static" },
    
    // Media (3/5 passed)
    { name: "NY Times", category: "media", type: "static" },
    { name: "Netflix", category: "media", type: "dynamic" },
    { name: "CNN", category: "media", type: "problematic" },
    
    // Social (5/5 passed - PERFECT)
    { name: "Facebook", category: "social", type: "dynamic" },
    { name: "LinkedIn", category: "social", type: "dynamic" },
    { name: "Twitter/X", category: "social", type: "dynamic" },
    { name: "Instagram", category: "social", type: "problematic" },
    { name: "Reddit", category: "social", type: "static" },
    
    // Productivity (5/5 passed - PERFECT)
    { name: "Notion", category: "productivity", type: "dynamic" },
    { name: "Slack", category: "productivity", type: "static" },
    { name: "Zoom", category: "productivity", type: "static" },
    { name: "Dropbox", category: "productivity", type: "static" },
    { name: "Trello", category: "productivity", type: "static" },
    
    // Travel (3/5 passed)
    { name: "Airbnb", category: "travel", type: "dynamic" },
    { name: "Booking.com", category: "travel", type: "static" },
    { name: "Uber", category: "travel", type: "static" },
    
    // Education (3/5 passed)
    { name: "Khan Academy", category: "education", type: "static" },
    { name: "Coursera", category: "education", type: "static" },
    { name: "MIT OpenCourseWare", category: "education", type: "static" },
    
    // Health (4/5 passed)
    { name: "WebMD", category: "health", type: "static" },
    { name: "Mayo Clinic", category: "health", type: "static" },
    { name: "MyFitnessPal", category: "health", type: "static" },
    { name: "Healthline", category: "health", type: "static" },
    
    // Gaming (3/5 passed)
    { name: "Steam", category: "gaming", type: "static" },
    { name: "Discord", category: "gaming", type: "static" },
    { name: "Xbox", category: "gaming", type: "static" }
  ],
  
  // Sites that FAILED (11 sites)
  problematicSites: [
    // E-commerce failures
    { name: "Best Buy", category: "ecommerce", error: "Navigation timeout of 30000 ms exceeded", type: "timeout" },
    
    // Technology failures
    { name: "Stack Overflow", category: "technology", error: "Navigating frame was detached", type: "frame_detached" },
    
    // Media failures
    { name: "Spotify", category: "media", error: "Cloud Function error: 503", type: "api_error" },
    { name: "YouTube", category: "media", error: "No privacy policy found by content script", type: "detection_failure" },
    
    // Travel failures
    { name: "Expedia", category: "travel", error: "No privacy policy found by content script", type: "detection_failure" },
    { name: "TripAdvisor", category: "travel", error: "No privacy policy found by content script", type: "detection_failure" },
    
    // Education failures
    { name: "Udemy", category: "education", error: "Unknown error", type: "unknown" },
    { name: "Duolingo", category: "education", error: "Navigation timeout of 30000 ms exceeded", type: "timeout" },
    
    // Health failures
    { name: "CVS", category: "health", error: "Navigation timeout of 30000 ms exceeded", type: "timeout" },
    
    // Gaming failures
    { name: "Epic Games", category: "gaming", error: "No privacy policy found by content script", type: "detection_failure" },
    { name: "Twitch", category: "gaming", error: "No privacy policy found by content script", type: "detection_failure" }
  ]
};

// Calculate category statistics
const categoryStats = {};
const allSites = [...testResults.regressionSites, ...testResults.problematicSites];

allSites.forEach(site => {
  if (!categoryStats[site.category]) {
    categoryStats[site.category] = { total: 0, passed: 0, failed: 0, passRate: 0 };
  }
  categoryStats[site.category].total++;
  
  const isPassed = testResults.regressionSites.some(s => s.name === site.name);
  if (isPassed) {
    categoryStats[site.category].passed++;
  } else {
    categoryStats[site.category].failed++;
  }
});

// Calculate pass rates
Object.keys(categoryStats).forEach(category => {
  const stats = categoryStats[category];
  stats.passRate = ((stats.passed / stats.total) * 100).toFixed(1);
});

// Error type analysis
const errorAnalysis = {};
testResults.problematicSites.forEach(site => {
  const errorType = site.type || 'unknown';
  if (!errorAnalysis[errorType]) {
    errorAnalysis[errorType] = { count: 0, sites: [] };
  }
  errorAnalysis[errorType].count++;
  errorAnalysis[errorType].sites.push(site.name);
});

// Generate detailed report
console.log('🎯 COMPREHENSIVE TEST CATEGORIZATION REPORT');
console.log('=' * 60);
console.log(`📊 Overall Results: ${testResults.passedSites}/${testResults.totalSites} sites passed (${testResults.passRate}%)`);
console.log('');

console.log('🏆 PERFECT PERFORMANCE CATEGORIES (100% Success):');
Object.entries(categoryStats)
  .filter(([category, stats]) => stats.passRate === '100.0')
  .forEach(([category, stats]) => {
    console.log(`   ✅ ${category.toUpperCase()}: ${stats.passed}/${stats.total} (${stats.passRate}%)`);
  });

console.log('');
console.log('📈 CATEGORY PERFORMANCE BREAKDOWN:');
Object.entries(categoryStats)
  .sort(([,a], [,b]) => parseFloat(b.passRate) - parseFloat(a.passRate))
  .forEach(([category, stats]) => {
    const emoji = stats.passRate === '100.0' ? '🥇' : stats.passRate >= '80.0' ? '🥈' : '🥉';
    console.log(`   ${emoji} ${category.toUpperCase()}: ${stats.passed}/${stats.total} (${stats.passRate}%)`);
  });

console.log('');
console.log('🔍 FAILURE ANALYSIS BY ERROR TYPE:');
Object.entries(errorAnalysis)
  .sort(([,a], [,b]) => b.count - a.count)
  .forEach(([errorType, data]) => {
    console.log(`   ❌ ${errorType.toUpperCase()}: ${data.count} sites`);
    data.sites.forEach(site => {
      console.log(`      • ${site}`);
    });
  });

console.log('');
console.log('🎯 REGRESSION TEST SITES (39 sites for stable testing):');
testResults.regressionSites.forEach(site => {
  console.log(`   ✅ ${site.name} (${site.category})`);
});

console.log('');
console.log('⚠️  PROBLEMATIC SITES (11 sites needing fixes):');
testResults.problematicSites.forEach(site => {
  console.log(`   ❌ ${site.name} (${site.category}) - ${site.error}`);
});

// Save categorization to files
const regressionSitesOutput = {
  description: "Sites that consistently pass testing - used for regression testing",
  lastUpdated: testResults.timestamp,
  totalSites: testResults.regressionSites.length,
  sites: testResults.regressionSites
};

const problematicSitesOutput = {
  description: "Sites that currently fail testing - need fixes or enhanced strategies",
  lastUpdated: testResults.timestamp,
  totalSites: testResults.problematicSites.length,
  sites: testResults.problematicSites
};

const categoryStatsOutput = {
  regression: regressionSitesOutput,
  problematic: problematicSitesOutput,
  statistics: {
    totalTested: testResults.totalSites,
    passed: testResults.passedSites,
    failed: testResults.failedSites,
    passRate: testResults.passRate + '%'
  },
  categoryBreakdown: categoryStats,
  errorAnalysis: errorAnalysis
};

// Write files
fs.writeFileSync(
  path.join(__dirname, '../fixtures/regression-sites-updated.json'),
  JSON.stringify(regressionSitesOutput, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, '../fixtures/problematic-sites-updated.json'),
  JSON.stringify(problematicSitesOutput, null, 2)
);

fs.writeFileSync(
  path.join(__dirname, '../fixtures/test-categorization-summary-updated.json'),
  JSON.stringify(categoryStatsOutput, null, 2)
);

console.log('');
console.log('💾 CATEGORIZATION FILES UPDATED:');
console.log('   📁 regression-sites-updated.json (39 stable sites)');
console.log('   📁 problematic-sites-updated.json (11 sites needing fixes)');
console.log('   📁 test-categorization-summary-updated.json (complete analysis)');
console.log('');
console.log('🎉 Categorization complete! Use regression sites for stable testing.');
