const puppeteer = require('puppeteer');
const { testSiteDirectly, testCloudFunction } = require('./direct-test-helpers');
const { testSiteEnhanced } = require('./enhanced-test-helpers');

/**
 * Multi-strategy testing approach
 * Tries multiple methods to ensure maximum success rate
 */

/**
 * Strategy 1: Direct API approach - fetch privacy policy directly
 */
async function strategyDirectAPI(url) {
  try {
    console.log('Strategy 1: Direct API approach');
    
    // Common privacy policy URLs based on domain
    const domain = new URL(url).hostname.replace('www.', '');
    const possibleUrls = [
      `https://${domain}/privacy`,
      `https://${domain}/privacy-policy`,
      `https://${domain}/privacy.html`,
      `https://${domain}/legal/privacy`,
      `https://${domain}/policies/privacy`,
      `https://${domain}/terms`,
      `https://${domain}/legal`,
      `https://www.${domain}/privacy`,
      `https://www.${domain}/privacy-policy`
    ];
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    for (const testUrl of possibleUrls) {
      try {
        console.log(`Trying: ${testUrl}`);
        const response = await page.goto(testUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        
        if (response && response.status() === 200) {
          const content = await page.evaluate(() => {
            document.querySelectorAll('script, style').forEach(el => el.remove());
            return document.body.textContent.replace(/\s+/g, ' ').trim();
          });
          
          if (content && content.length > 500) {
            console.log(`Found privacy policy at: ${testUrl}`);
            await browser.close();
            
            const analysisResult = await testCloudFunction(null, content);
            return {
              success: analysisResult.success,
              summaryPoints: analysisResult.summaryPoints || [],
              riskScore: analysisResult.riskScore,
              errorMessage: analysisResult.errorMessage,
              url: testUrl,
              strategy: 'direct-api'
            };
          }
        }
      } catch (e) {
        // Try next URL
      }
    }
    
    await browser.close();
    return null;
    
  } catch (error) {
    console.log(`Strategy 1 failed: ${error.message}`);
    return null;
  }
}

/**
 * Strategy 2: Google search for privacy policy
 */
async function strategyGoogleSearch(url) {
  try {
    console.log('Strategy 2: Google search approach');
    
    const domain = new URL(url).hostname.replace('www.', '');
    const searchQuery = `site:${domain} privacy policy OR terms of service`;
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Search Google
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, {
      waitUntil: 'domcontentloaded'
    });
    
    // Get first result
    const firstResult = await page.evaluate(() => {
      const link = document.querySelector('h3')?.parentElement?.href;
      return link;
    });
    
    if (firstResult) {
      console.log(`Google found: ${firstResult}`);
      
      // Navigate to the privacy policy
      await page.goto(firstResult, { waitUntil: 'domcontentloaded', timeout: 15000 });
      
      const content = await page.evaluate(() => {
        document.querySelectorAll('script, style').forEach(el => el.remove());
        return document.body.textContent.replace(/\s+/g, ' ').trim();
      });
      
      await browser.close();
      
      if (content && content.length > 500) {
        const analysisResult = await testCloudFunction(null, content);
        return {
          success: analysisResult.success,
          summaryPoints: analysisResult.summaryPoints || [],
          riskScore: analysisResult.riskScore,
          errorMessage: analysisResult.errorMessage,
          url: firstResult,
          strategy: 'google-search'
        };
      }
    }
    
    await browser.close();
    return null;
    
  } catch (error) {
    console.log(`Strategy 2 failed: ${error.message}`);
    return null;
  }
}

/**
 * Strategy 3: Sitemap approach
 */
async function strategySitemap(url) {
  try {
    console.log('Strategy 3: Sitemap approach');
    
    const domain = new URL(url).origin;
    const sitemapUrls = [
      `${domain}/sitemap.xml`,
      `${domain}/sitemap_index.xml`,
      `${domain}/sitemap`
    ];
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    for (const sitemapUrl of sitemapUrls) {
      try {
        await page.goto(sitemapUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        
        const privacyUrl = await page.evaluate(() => {
          const text = document.body.textContent;
          const privacyMatch = text.match(/https?:\/\/[^\s<>"]+(?:privacy|terms|legal)[^\s<>"]*/i);
          return privacyMatch ? privacyMatch[0] : null;
        });
        
        if (privacyUrl) {
          console.log(`Found in sitemap: ${privacyUrl}`);
          
          await page.goto(privacyUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          
          const content = await page.evaluate(() => {
            document.querySelectorAll('script, style').forEach(el => el.remove());
            return document.body.textContent.replace(/\s+/g, ' ').trim();
          });
          
          await browser.close();
          
          if (content && content.length > 500) {
            const analysisResult = await testCloudFunction(null, content);
            return {
              success: analysisResult.success,
              summaryPoints: analysisResult.summaryPoints || [],
              riskScore: analysisResult.riskScore,
              errorMessage: analysisResult.errorMessage,
              url: privacyUrl,
              strategy: 'sitemap'
            };
          }
        }
      } catch (e) {
        // Try next sitemap URL
      }
    }
    
    await browser.close();
    return null;
    
  } catch (error) {
    console.log(`Strategy 3 failed: ${error.message}`);
    return null;
  }
}

/**
 * Multi-strategy test executor
 * Tries multiple strategies in sequence until one succeeds
 */
async function testWithMultipleStrategies(url, timeout = 60000) {
  console.log(`\n🎯 Multi-strategy testing for: ${url}`);
  
  const strategies = [
    { name: 'Standard', fn: () => testSiteDirectly(url, timeout) },
    { name: 'Enhanced', fn: () => testSiteEnhanced(url, timeout) },
    { name: 'Direct API', fn: () => strategyDirectAPI(url) },
    { name: 'Google Search', fn: () => strategyGoogleSearch(url) },
    { name: 'Sitemap', fn: () => strategySitemap(url) }
  ];
  
  for (const strategy of strategies) {
    console.log(`\n🔄 Attempting ${strategy.name} strategy...`);
    
    try {
      const result = await strategy.fn();
      
      if (result && result.success && result.summaryPoints && result.summaryPoints.length === 7) {
        console.log(`✅ Success with ${strategy.name} strategy!`);
        return {
          ...result,
          strategyUsed: strategy.name
        };
      }
    } catch (error) {
      console.log(`❌ ${strategy.name} strategy failed: ${error.message}`);
    }
  }
  
  // All strategies failed
  return {
    success: false,
    errorMessage: 'All testing strategies failed',
    summaryPoints: [],
    riskScore: null,
    url: url
  };
}

/**
 * Batch test runner with multi-strategy
 */
async function batchTestWithStrategies(urls, concurrency = 2) {
  const results = [];
  
  // Process in batches for efficiency
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map(url => testWithMultipleStrategies(url));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    console.log(`\n📊 Progress: ${results.length}/${urls.length} sites tested`);
  }
  
  return results;
}

module.exports = {
  strategyDirectAPI,
  strategyGoogleSearch,
  strategySitemap,
  testWithMultipleStrategies,
  batchTestWithStrategies
};