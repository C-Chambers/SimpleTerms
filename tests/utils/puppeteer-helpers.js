const path = require('path');

/**
 * Launch browser with SimpleTerms extension loaded
 * @returns {Promise<Object>} Browser and page instances
 */
async function launchBrowserWithExtension() {
  const puppeteer = require('puppeteer');
  const extensionPath = path.resolve(__dirname, '../../');
  
  console.log('Loading extension from:', extensionPath);
  
  const browser = await puppeteer.launch({
    headless: false, // Extension requires non-headless mode
    args: [
      `--load-extension=${extensionPath}`,
      `--disable-extensions-except=${extensionPath}`,
      '--disable-web-security',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    ignoreDefaultArgs: ['--disable-extensions']
  });
  
  // Get the extension page
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  // Set a reasonable viewport size
  await page.setViewport({ width: 1280, height: 720 });
  
  return { browser, page };
}

/**
 * Wait for the SimpleTerms analysis to complete and extract results
 * @param {Object} page - Puppeteer page instance
 * @param {number} timeout - Maximum time to wait for analysis
 * @returns {Promise<Object>} Analysis results
 */
async function waitForAnalysis(page, timeout = 10000) {
  try {
    console.log('Waiting for analysis to complete...');
    
    // Wait for the popup to be opened and results to appear
    // We'll look for either results or error state
    await page.waitForFunction(() => {
      // Check if popup is open and has content
      const popup = document.querySelector('iframe') || 
                   document.querySelector('[data-extension="simpleterms"]') ||
                   document.querySelector('.simpleterms-popup');
      
      if (popup) {
        const results = popup.querySelector('.results-container') ||
                       popup.querySelector('.summary-list') ||
                       popup.querySelector('.error-message');
        return results !== null;
      }
      return false;
    }, { timeout });
    
    // Extract the results from the popup
    const results = await page.evaluate(() => {
      // Find the popup container
      const popup = document.querySelector('iframe') || 
                   document.querySelector('[data-extension="simpleterms"]') ||
                   document.querySelector('.simpleterms-popup');
      
      if (!popup) {
        return { success: false, error: 'Popup not found' };
      }
      
      // Look for summary points
      const summaryItems = popup.querySelectorAll('.summary-list li') ||
                          popup.querySelectorAll('[class*="summary"] li') ||
                          popup.querySelectorAll('li');
      
      // Look for risk score
      const scoreElement = popup.querySelector('.risk-score') ||
                          popup.querySelector('[class*="score"]') ||
                          popup.querySelector('[class*="risk"]');
      
      // Look for error message
      const errorElement = popup.querySelector('.error-message') ||
                          popup.querySelector('[class*="error"]');
      
      const summaryPoints = Array.from(summaryItems)
        .map(li => li.textContent.trim())
        .filter(text => text.length > 0);
      
      return {
        success: !errorElement && summaryPoints.length > 0,
        summaryPoints: summaryPoints,
        riskScore: scoreElement ? parseInt(scoreElement.textContent) : null,
        errorMessage: errorElement ? errorElement.textContent.trim() : null,
        rawHTML: popup.innerHTML // For debugging
      };
    });
    
    console.log('Analysis results:', {
      success: results.success,
      pointsFound: results.summaryPoints.length,
      hasScore: results.riskScore !== null,
      error: results.errorMessage
    });
    
    return results;
    
  } catch (error) {
    console.error('Analysis timeout or error:', error.message);
    
    // Try to get any available error information
    const errorInfo = await page.evaluate(() => {
      const body = document.body.innerHTML;
      return {
        title: document.title,
        url: window.location.href,
        bodyLength: body.length,
        hasExtensionElements: !!(
          document.querySelector('iframe') || 
          document.querySelector('[data-extension]') ||
          document.querySelector('[class*="simpleterms"]')
        )
      };
    }).catch(() => ({}));
    
    return {
      success: false,
      summaryPoints: [],
      riskScore: null,
      errorMessage: `Test timeout - analysis did not complete within ${timeout}ms`,
      debugInfo: errorInfo
    };
  }
}

/**
 * Click the SimpleTerms extension button and trigger analysis
 * @param {Object} page - Puppeteer page instance
 * @returns {Promise<void>}
 */
async function triggerExtensionAnalysis(page) {
  try {
    console.log('Triggering extension analysis...');
    
    // Method 1: Try to click extension icon in toolbar (if visible)
    try {
      await page.click('[data-extension="simpleterms"]', { timeout: 2000 });
      console.log('Clicked extension icon');
      return;
    } catch (e) {
      console.log('Extension icon not found, trying alternative methods...');
    }
    
    // Method 2: Use Chrome extension API if available
    try {
      await page.evaluate(() => {
        if (window.chrome && window.chrome.runtime) {
          // Try to trigger extension via runtime API
          window.chrome.runtime.sendMessage({ action: 'analyze' });
        }
      });
      console.log('Triggered via Chrome API');
      await page.waitForTimeout(1000); // Give it time to process
      return;
    } catch (e) {
      console.log('Chrome API method failed, trying keyboard shortcut...');
    }
    
    // Method 3: Try keyboard shortcut (if defined)
    try {
      await page.keyboard.down('Alt');
      await page.keyboard.press('KeyS'); // Alt+S for SimpleTerms
      await page.keyboard.up('Alt');
      console.log('Triggered via keyboard shortcut');
      return;
    } catch (e) {
      console.log('Keyboard shortcut method failed');
    }
    
    throw new Error('Could not trigger extension analysis - no method succeeded');
    
  } catch (error) {
    console.error('Failed to trigger extension:', error.message);
    throw error;
  }
}

/**
 * Test a single site with the SimpleTerms extension
 * @param {string} url - URL to test
 * @param {number} timeout - Maximum time for analysis
 * @returns {Promise<Object>} Test results
 */
async function testSite(url, timeout = 10000) {
  let browser, page;
  
  try {
    console.log(`\n🧪 Testing site: ${url}`);
    
    // Launch browser with extension
    ({ browser, page } = await launchBrowserWithExtension());
    
    // Navigate to the site
    console.log('Navigating to site...');
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait a moment for page to fully load
    await page.waitForTimeout(2000);
    
    // Trigger extension analysis
    await triggerExtensionAnalysis(page);
    
    // Wait for analysis results
    const results = await waitForAnalysis(page, timeout);
    
    return {
      url,
      timestamp: new Date().toISOString(),
      ...results
    };
    
  } catch (error) {
    console.error(`Error testing ${url}:`, error.message);
    return {
      url,
      timestamp: new Date().toISOString(),
      success: false,
      summaryPoints: [],
      riskScore: null,
      errorMessage: `Test error: ${error.message}`,
      testError: true
    };
  } finally {
    // Clean up
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.warn('Error closing browser:', e.message);
      }
    }
  }
}

module.exports = {
  launchBrowserWithExtension,
  waitForAnalysis,
  triggerExtensionAnalysis,
  testSite
};
