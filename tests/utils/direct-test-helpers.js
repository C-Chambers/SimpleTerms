const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
// Use the browser's fetch in Puppeteer context instead of node-fetch

/**
 * Direct testing approach - inject content script directly instead of relying on extension
 * This is more reliable for automated testing
 */

/**
 * Navigate to a URL with retry logic for problematic sites
 * @param {Object} page - Puppeteer page instance
 * @param {string} url - URL to navigate to
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<void>}
 */
async function navigateWithRetry(page, url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Navigation attempt ${attempt}/${maxRetries} for ${url}`);
      
      // Try different wait strategies based on attempt
      let waitUntil;
      if (attempt === 1) {
        waitUntil = 'networkidle2'; // Wait for network to be idle
      } else if (attempt === 2) {
        waitUntil = 'domcontentloaded'; // Just wait for DOM
      } else {
        waitUntil = 'load'; // Basic load event
      }
      
      await page.goto(url, { 
        waitUntil: waitUntil,
        timeout: 30000 
      });
      
      // Additional wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify page loaded successfully
      const title = await page.title();
      const bodyText = await page.evaluate(() => document.body.textContent.substring(0, 100));
      
      if (title && bodyText.length > 10) {
        console.log(`✅ Navigation successful on attempt ${attempt}`);
        console.log(`   Page title: ${title.substring(0, 50)}...`);
        return; // Success!
      } else {
        throw new Error('Page appears to be empty or not fully loaded');
      }
      
    } catch (error) {
      console.log(`❌ Navigation attempt ${attempt} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        throw new Error(`Navigation failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Wait before retry
      console.log(`⏳ Waiting 3 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Try to recover by creating a new page for the next attempt
      if (attempt < maxRetries) {
        try {
          await page.close();
          page = await page.browser().newPage();
          
          // Reapply settings
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
          
          await page.setRequestInterception(true);
          page.on('request', (request) => {
            const resourceType = request.resourceType();
            const url = request.url();
            
            if (resourceType === 'image' || 
                resourceType === 'media' ||
                resourceType === 'font' ||
                url.includes('ads') ||
                url.includes('analytics') ||
                url.includes('tracking')) {
              request.abort();
            } else {
              request.continue();
            }
          });
          
          console.log(`🔄 Created fresh page for attempt ${attempt + 1}`);
        } catch (recoveryError) {
          console.log(`⚠️  Page recovery failed: ${recoveryError.message}`);
        }
      }
    }
  }
}

/**
 * Test a site by directly injecting the content script
 * @param {string} url - URL to test
 * @param {number} timeout - Maximum time for analysis
 * @returns {Promise<Object>} Test results
 */
async function testSiteDirectly(url, timeout = 15000) {
  let browser, page;
  
  try {
    console.log(`\n🧪 Direct testing: ${url}`);
    
    // Launch browser with robust settings for problematic sites
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      defaultViewport: null,
      ignoreHTTPSErrors: true
    });
    
    page = await browser.newPage();
    
    // Set realistic user agent to avoid bot detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Block problematic resources that can cause navigation issues
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();
      
      // Block ads, trackers, and heavy resources that can cause issues
      if (resourceType === 'image' || 
          resourceType === 'media' ||
          resourceType === 'font' ||
          url.includes('ads') ||
          url.includes('analytics') ||
          url.includes('tracking') ||
          url.includes('facebook.com/tr') ||
          url.includes('google-analytics.com') ||
          url.includes('googletagmanager.com')) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Navigate with retry logic for problematic sites
    console.log('Navigating to site with retry logic...');
    await navigateWithRetry(page, url, 3);
    
    // Inject our content script directly
    console.log('Injecting content script...');
    const contentScriptPath = path.join(__dirname, '../../scripts/content.js');
    const contentScript = fs.readFileSync(contentScriptPath, 'utf8');
    
    // Inject and run the content script with Chrome API mocking
    const contentScriptResult = await page.evaluate((script) => {
      try {
        // Set up Chrome API mocking
        window.mockMessages = [];
        window.chrome = {
          runtime: {
            sendMessage: (message) => {
              console.log('Mock message sent:', message);
              window.mockMessages.push(message);
              return Promise.resolve();
            }
          }
        };
        
        // Set manual trigger flag
        window.simpleTermsManualTrigger = true;
        
        // Execute the content script
        eval(script);
        
        // Wait a moment for execution
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              messages: window.mockMessages || [],
              logs: window.console ? [] : [] // Can't capture console easily
            });
          }, 3000);
        });
      } catch (error) {
        return {
          success: false,
          error: error.message,
          messages: window.mockMessages || []
        };
      }
    }, contentScript);
    
    console.log('Content script execution result:', contentScriptResult);
    
    // Check if we got a privacy policy link
    const policyMessage = contentScriptResult.messages.find(msg => 
      msg.type === 'POLICY_URL_FOUND'
    );
    
    if (policyMessage) {
      console.log(`✅ Found privacy policy: ${policyMessage.url}`);
      
      // Test the actual Cloud Function call
      const analysisResult = await testCloudFunction(policyMessage.url);
      
      return {
        url,
        timestamp: new Date().toISOString(),
        success: analysisResult.success,
        summaryPoints: analysisResult.summaryPoints || [],
        riskScore: analysisResult.riskScore,
        errorMessage: analysisResult.errorMessage,
        policyUrl: policyMessage.url,
        linkScore: policyMessage.score
      };
    } else {
      // Check for current page analysis
      const currentPageMessage = contentScriptResult.messages.find(msg => 
        msg.type === 'CURRENT_PAGE_IS_POLICY'
      );
      
      if (currentPageMessage) {
        console.log('✅ Current page is a privacy policy');
        
        const analysisResult = await testCloudFunction(null, currentPageMessage.content);
        
        return {
          url,
          timestamp: new Date().toISOString(),
          success: analysisResult.success,
          summaryPoints: analysisResult.summaryPoints || [],
          riskScore: analysisResult.riskScore,
          errorMessage: analysisResult.errorMessage,
          currentPage: true,
          confidence: currentPageMessage.confidence
        };
      } else {
        return {
          url,
          timestamp: new Date().toISOString(),
          success: false,
          summaryPoints: [],
          riskScore: null,
          errorMessage: 'No privacy policy found by content script',
          messages: contentScriptResult.messages
        };
      }
    }
    
  } catch (error) {
    console.error(`Error testing ${url}:`, error.message);
    
    // For navigation failures, try alternative approach
    if (error.message.includes('Navigation failed') || 
        error.message.includes('frame was detached') ||
        error.message.includes('Target closed')) {
      
      console.log(`🔄 Attempting fallback strategy for ${url}...`);
      try {
        const fallbackResult = await tryFallbackApproach(url);
        if (fallbackResult && fallbackResult.success) {
          console.log(`✅ Fallback approach succeeded for ${url}`);
          return fallbackResult;
        }
      } catch (fallbackError) {
        console.log(`❌ Fallback approach also failed: ${fallbackError.message}`);
      }
    }
    
    return {
      url,
      timestamp: new Date().toISOString(),
      success: false,
      summaryPoints: [],
      riskScore: null,
      errorMessage: `Test error: ${error.message}`,
      testError: true,
      suggestedFix: getErrorSuggestion(error.message)
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.warn('Error closing browser:', e.message);
      }
    }
  }
}

/**
 * Test the Cloud Function with policy content
 * @param {string|null} policyUrl - URL to fetch (if needed)
 * @param {string|null} policyContent - Direct content (if available)
 * @returns {Promise<Object>} Analysis results
 */
async function testCloudFunction(policyUrl, policyContent = null) {
  try {
    let content = policyContent;
    
    if (!content && policyUrl) {
      console.log('Fetching policy content from:', policyUrl);
      
      // Use a simple browser page to fetch content (avoids CORS issues)
      const browser = await puppeteer.launch({ headless: true });
      const fetchPage = await browser.newPage();
      
      try {
        await fetchPage.goto(policyUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Extract text content
        content = await fetchPage.evaluate(() => {
          // Remove scripts and styles
          document.querySelectorAll('script, style').forEach(el => el.remove());
          
          // Get main content
          const main = document.querySelector('main') || 
                      document.querySelector('[role="main"]') || 
                      document.querySelector('.content') ||
                      document.querySelector('#content') ||
                      document.body;
          
          return main.textContent.replace(/\s+/g, ' ').trim();
        });
        
      } finally {
        await browser.close();
      }
    }
    
    if (!content || content.length < 100) {
      return {
        success: false,
        error: 'Policy content too short or empty'
      };
    }
    
    console.log(`Sending ${content.length} characters to Cloud Function...`);
    
    // Use Puppeteer to call our Cloud Function (avoids fetch issues)
    const browser = await puppeteer.launch({ headless: true });
    const apiPage = await browser.newPage();
    
    let result;
    try {
      // Make the API call using page.evaluate
      result = await apiPage.evaluate(async (policyText) => {
        const response = await fetch('https://us-central1-simpleterms-backend.cloudfunctions.net/analyzePrivacyPolicy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            policyText: policyText
          })
        });
        
        if (!response.ok) {
          throw new Error(`Cloud Function error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
      }, content);
      
    } finally {
      await browser.close();
    }
    
    if (!result.success || !result.data) {
      throw new Error('Invalid response from Cloud Function');
    }
    
    // Parse the summary into array
    const summaryArray = result.data.summary.split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.startsWith('•') || 
               trimmed.startsWith('-') || 
               /^\d+\./.test(trimmed) ||
               trimmed.startsWith('*');
      })
      .map(line => line.replace(/^[•\-*\d\.]+\s*/, '').trim())
      .filter(line => line.length > 0);
    
    return {
      success: true,
      summaryPoints: summaryArray,
      riskScore: result.data.score,
      rawSummary: result.data.summary,
      errorMessage: null
    };
    
  } catch (error) {
    console.error('Cloud Function test error:', error.message);
    return {
      success: false,
      errorMessage: error.message
    };
  }
}

/**
 * Try fallback approach for sites that fail normal navigation
 * @param {string} url - URL to test with fallback method
 * @returns {Promise<Object>} Test results or null
 */
async function tryFallbackApproach(url) {
  try {
    console.log(`🛠️  Trying headless approach for problematic site: ${url}`);
    
    // Use headless mode which sometimes works better for problematic sites
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    try {
      // Minimal approach - just try to get to the site and extract privacy links
      await page.goto(url, { waitUntil: 'load', timeout: 20000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Look for privacy policy links using simple DOM queries
      const privacyLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return links
          .filter(link => {
            const text = link.textContent.toLowerCase();
            const href = link.href.toLowerCase();
            return text.includes('privacy') || href.includes('privacy');
          })
          .map(link => ({
            url: link.href,
            text: link.textContent.trim(),
            score: 50 // Default score
          }))
          .slice(0, 1); // Just take the first one
      });
      
      if (privacyLinks.length > 0) {
        console.log(`📋 Found ${privacyLinks.length} privacy links via fallback method`);
        
        // Try to analyze the first privacy policy found
        const analysisResult = await testCloudFunction(privacyLinks[0].url);
        
        if (analysisResult.success) {
          return {
            url,
            timestamp: new Date().toISOString(),
            success: true,
            summaryPoints: analysisResult.summaryPoints,
            riskScore: analysisResult.riskScore,
            policyUrl: privacyLinks[0].url,
            method: 'fallback_headless',
            linkScore: privacyLinks[0].score
          };
        }
      }
      
      return null;
      
    } finally {
      await browser.close();
    }
    
  } catch (error) {
    console.log(`🚫 Fallback approach failed: ${error.message}`);
    return null;
  }
}

/**
 * Get error suggestion based on error message
 * @param {string} errorMessage - The error message
 * @returns {string} Suggested fix or investigation approach
 */
function getErrorSuggestion(errorMessage) {
  if (errorMessage.includes('frame was detached')) {
    return 'Site has aggressive JavaScript or anti-bot protection. Try: 1) Different user agent, 2) Slower navigation, 3) Headless mode';
  } else if (errorMessage.includes('Navigation timeout')) {
    return 'Site is slow to load. Try: 1) Increased timeout, 2) Different wait strategy, 3) Check internet connection';
  } else if (errorMessage.includes('Target closed')) {
    return 'Browser/page crashed. Try: 1) Different browser args, 2) Restart browser, 3) Check system resources';
  } else if (errorMessage.includes('net::ERR_')) {
    return 'Network error. Try: 1) Check URL validity, 2) VPN/proxy issues, 3) DNS resolution';
  } else {
    return 'General automation error. Try: 1) Manual verification, 2) Different approach, 3) Site-specific handling';
  }
}

module.exports = {
  testSiteDirectly,
  testCloudFunction,
  navigateWithRetry,
  tryFallbackApproach,
  getErrorSuggestion
};
