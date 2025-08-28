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
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage'
    ],
    ignoreDefaultArgs: ['--disable-extensions'],
    defaultViewport: null
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
    
    // Wait for the extension analysis to complete
    // Look for our actual extension elements
    await page.waitForFunction(() => {
      // Look for the results container (this should match our actual popup HTML)
      const resultsContainer = document.querySelector('#resultsContainer');
      const summaryList = document.querySelector('.summary-list');
      const errorMessage = document.querySelector('.error-message');
      const loadingSpinner = document.querySelector('.loading-spinner');
      
      // Analysis is complete when we have results or an error, and no loading spinner
      return (resultsContainer && (summaryList || errorMessage)) && !loadingSpinner;
    }, { timeout });
    
    // Extract the results from the extension popup
    const results = await page.evaluate(() => {
      // Look for our actual extension elements (based on popup.html structure)
      const resultsContainer = document.querySelector('#resultsContainer');
      const summaryList = document.querySelector('.summary-list');
      const scoreElement = document.querySelector('#riskScore');
      const errorElement = document.querySelector('.error-message');
      
      if (!resultsContainer) {
        return { success: false, error: 'Results container not found' };
      }
      
      // Extract summary points
      const summaryItems = summaryList ? summaryList.querySelectorAll('li') : [];
      const summaryPoints = Array.from(summaryItems)
        .map(li => li.textContent.trim())
        .filter(text => text.length > 0);
      
      // Extract risk score
      let riskScore = null;
      if (scoreElement) {
        const scoreText = scoreElement.textContent;
        const scoreMatch = scoreText.match(/\d+/);
        riskScore = scoreMatch ? parseInt(scoreMatch[0]) : null;
      }
      
      return {
        success: !errorElement && summaryPoints.length > 0,
        summaryPoints: summaryPoints,
        riskScore: riskScore,
        errorMessage: errorElement ? errorElement.textContent.trim() : null,
        rawHTML: resultsContainer.innerHTML // For debugging
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
    
    // Method 1: Try to navigate to extensions page and click the extension
    // This is the most reliable way to trigger an extension in automated testing
    const extensionId = await getExtensionId(page);
    if (extensionId) {
      console.log(`Found extension ID: ${extensionId}`);
      
      // Open the extension popup
      const extensionUrl = `chrome-extension://${extensionId}/popup/popup.html`;
      const popupPage = await page.browser().newPage();
      await popupPage.goto(extensionUrl);
      
      // Click the analyze button in the popup
      await popupPage.click('#analyzeButton', { timeout: 5000 });
      console.log('Clicked analyze button in extension popup');
      
      // Keep the popup page open for result extraction
      return popupPage;
    }
    
    // Method 2: Fallback - simulate keyboard shortcut
    console.log('Extension ID not found, trying keyboard shortcut...');
    await page.keyboard.down('Alt');
    await page.keyboard.press('KeyS'); 
    await page.keyboard.up('Alt');
    console.log('Triggered via keyboard shortcut');
    
    return null;
    
  } catch (error) {
    console.error('Failed to trigger extension:', error.message);
    // Don't throw here - let the test continue and check for results
    return null;
  }
}

/**
 * Get the extension ID for the SimpleTerms extension
 * @param {Object} page - Puppeteer page instance
 * @returns {Promise<string|null>} Extension ID or null if not found
 */
async function getExtensionId(page) {
  try {
    // First, try to get extension ID from the browser context
    const extensionId = await page.evaluate(() => {
      return new Promise((resolve) => {
        if (window.chrome && window.chrome.management) {
          chrome.management.getAll((extensions) => {
            const simpleTerms = extensions.find(ext => 
              ext.name.includes('SimpleTerms') && ext.enabled
            );
            resolve(simpleTerms ? simpleTerms.id : null);
          });
        } else {
          resolve(null);
        }
      });
    });
    
    if (extensionId) {
      console.log('Found extension ID via chrome.management:', extensionId);
      return extensionId;
    }
    
    // Fallback: Navigate to chrome://extensions
    console.log('Trying chrome://extensions method...');
    await page.goto('chrome://extensions/');
    
    // Enable developer mode first
    await page.evaluate(() => {
      const devModeToggle = document.querySelector('extensions-manager')
        ?.shadowRoot?.querySelector('#devMode');
      if (devModeToggle && !devModeToggle.checked) {
        devModeToggle.click();
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Look for SimpleTerms extension
    const fallbackId = await page.evaluate(() => {
      const manager = document.querySelector('extensions-manager');
      if (manager && manager.shadowRoot) {
        const items = manager.shadowRoot.querySelectorAll('extensions-item');
        for (const item of items) {
          if (item.shadowRoot) {
            const nameEl = item.shadowRoot.querySelector('#name');
            if (nameEl && nameEl.textContent.includes('SimpleTerms')) {
              return item.id;
            }
          }
        }
      }
      return null;
    });
    
    return fallbackId;
  } catch (error) {
    console.log('Could not get extension ID:', error.message);
    return null;
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
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Trigger extension analysis
    const popupPage = await triggerExtensionAnalysis(page);
    
    // Wait for analysis results
    const results = await waitForAnalysis(popupPage || page, timeout);
    
    // Clean up popup page if it was created
    if (popupPage) {
      try {
        await popupPage.close();
      } catch (e) {
        console.warn('Could not close popup page:', e.message);
      }
    }
    
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
  getExtensionId,
  testSite
};
