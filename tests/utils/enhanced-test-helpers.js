const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

/**
 * Enhanced testing helpers with improved reliability
 * Addresses common failure patterns found in baseline testing
 */

/**
 * Enhanced privacy policy detection patterns
 */
const enhancedPrivacyPatterns = [
  // Primary patterns
  /privacy[-_\s]?policy/i,
  /privacy[-_\s]?statement/i,
  /privacy[-_\s]?notice/i,
  /privacy[-_\s]?center/i,
  /data[-_\s]?protection/i,
  /data[-_\s]?privacy/i,
  /cookie[-_\s]?policy/i,
  /legal[-_\s]?notice/i,
  /terms[-_\s]?(of[-_\s]?)?use/i,
  /terms[-_\s]?(and[-_\s]?)?conditions/i,
  /terms[-_\s]?(of[-_\s]?)?service/i,
  /user[-_\s]?agreement/i,
  /gdpr/i,
  /ccpa/i,
  
  // URL patterns
  /\/privacy\//i,
  /\/legal\//i,
  /\/terms\//i,
  /\/policies\//i,
  /\/tos\//i,
  /privacy\.html/i,
  /terms\.html/i,
  
  // Abbreviated patterns
  /\bpp\b/i,  // PP for Privacy Policy
  /\btos\b/i, // ToS for Terms of Service
  /\bt&c\b/i, // T&C for Terms & Conditions
];

/**
 * Site-specific configurations for problematic sites
 */
const siteConfigurations = {
  'amazon.com': {
    waitStrategy: 'domcontentloaded',
    additionalWait: 3000,
    privacySelectors: ['a[href*="privacy"]', 'a[href*="privacyNotice"]', '[data-action*="privacy"]'],
    scrollToBottom: true
  },
  'youtube.com': {
    waitStrategy: 'networkidle0',
    additionalWait: 5000,
    privacySelectors: ['a[href*="t/privacy"]', 'a[href*="policies"]'],
    clickAcceptCookies: true
  },
  'reddit.com': {
    waitStrategy: 'domcontentloaded',
    additionalWait: 4000,
    privacySelectors: ['a[href*="policies/privacy"]', 'a[href*="redditinc.com"]'],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  'booking.com': {
    waitStrategy: 'networkidle2',
    additionalWait: 3000,
    scrollToBottom: true,
    privacySelectors: ['a[href*="privacy"]', 'a[href*="terms"]']
  },
  'expedia.com': {
    waitStrategy: 'load',
    additionalWait: 4000,
    privacySelectors: ['a[href*="privacy"]', 'a[href*="support"]']
  },
  'tripadvisor.com': {
    waitStrategy: 'domcontentloaded',
    additionalWait: 3000,
    privacySelectors: ['a[href*="Privacy"]', 'a[href*="terms"]']
  },
  'twitch.tv': {
    waitStrategy: 'networkidle0',
    additionalWait: 5000,
    privacySelectors: ['a[href*="privacy"]', 'a[href*="legal"]']
  },
  'epicgames.com': {
    waitStrategy: 'networkidle2',
    additionalWait: 4000,
    privacySelectors: ['a[href*="privacy"]', 'a[href*="tos"]'],
    scrollToBottom: true
  },
  'stackoverflow.com': {
    waitStrategy: 'domcontentloaded',
    additionalWait: 2000,
    privacySelectors: ['a[href*="privacy"]', 'a[href*="legal"]', '.js-footer-link']
  },
  'cnn.com': {
    waitStrategy: 'domcontentloaded',
    additionalWait: 5000,
    privacySelectors: ['a[href*="privacy"]', 'a[href*="terms"]'],
    blockAds: true
  }
};

/**
 * Get site-specific configuration
 */
function getSiteConfig(url) {
  const hostname = new URL(url).hostname.replace('www.', '');
  return siteConfigurations[hostname] || {};
}

/**
 * Enhanced navigation with site-specific handling
 */
async function enhancedNavigate(page, url, timeout = 30000) {
  const config = getSiteConfig(url);
  
  try {
    console.log(`Enhanced navigation to ${url}`);
    console.log(`Using config:`, config);
    
    // Set custom user agent if specified
    if (config.userAgent) {
      await page.setUserAgent(config.userAgent);
    }
    
    // Navigate with appropriate wait strategy
    await page.goto(url, {
      waitUntil: config.waitStrategy || 'networkidle2',
      timeout: timeout
    });
    
    // Additional wait if configured
    if (config.additionalWait) {
      await new Promise(resolve => setTimeout(resolve, config.additionalWait));
    }
    
    // Handle cookie acceptance if needed
    if (config.clickAcceptCookies) {
      try {
        await page.evaluate(() => {
          // Common cookie accept button selectors
          const selectors = [
            'button[id*="accept"]',
            'button[class*="accept"]',
            'button[aria-label*="accept"]',
            'button:has-text("Accept")',
            'button:has-text("OK")',
            'button:has-text("Got it")',
            'button:has-text("I agree")'
          ];
          
          for (const selector of selectors) {
            const buttons = document.querySelectorAll(selector);
            if (buttons.length > 0) {
              buttons[0].click();
              return true;
            }
          }
          return false;
        });
      } catch (e) {
        // Cookie banner might not exist, continue
      }
    }
    
    // Scroll to bottom if configured (helps load lazy content)
    if (config.scrollToBottom) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
    }
    
    return true;
  } catch (error) {
    console.log(`Enhanced navigation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Enhanced privacy policy link detection
 */
async function findPrivacyPolicyEnhanced(page, url) {
  const config = getSiteConfig(url);
  
  try {
    // Try site-specific selectors first
    if (config.privacySelectors) {
      for (const selector of config.privacySelectors) {
        try {
          const links = await page.evaluate((sel) => {
            const elements = document.querySelectorAll(sel);
            return Array.from(elements).map(el => ({
              href: el.href,
              text: el.textContent.trim()
            })).filter(link => link.href);
          }, selector);
          
          if (links.length > 0) {
            console.log(`Found privacy link with selector ${selector}:`, links[0].href);
            return links[0].href;
          }
        } catch (e) {
          // Selector might not exist, continue
        }
      }
    }
    
    // Fall back to pattern matching
    const privacyLink = await page.evaluate((patterns) => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      
      // Score each link
      const scoredLinks = links.map(link => {
        let score = 0;
        const href = link.href.toLowerCase();
        const text = link.textContent.toLowerCase();
        
        // Check patterns
        for (const pattern of patterns) {
          if (pattern.test(href)) score += 10;
          if (pattern.test(text)) score += 8;
        }
        
        // Prefer footer links
        let parent = link.parentElement;
        while (parent) {
          if (parent.tagName === 'FOOTER' || 
              parent.className.includes('footer') ||
              parent.id.includes('footer')) {
            score += 5;
            break;
          }
          parent = parent.parentElement;
        }
        
        return { href: link.href, text: link.textContent.trim(), score };
      });
      
      // Sort by score and return best match
      scoredLinks.sort((a, b) => b.score - a.score);
      
      const bestMatch = scoredLinks.find(link => link.score > 0);
      return bestMatch ? bestMatch.href : null;
      
    }, enhancedPrivacyPatterns.map(p => p.toString()));
    
    if (privacyLink) {
      console.log(`Found privacy link via pattern matching: ${privacyLink}`);
      return privacyLink;
    }
    
    // Last resort: check if current page might be privacy policy
    const isPrivacyPage = await page.evaluate((patterns) => {
      const url = window.location.href.toLowerCase();
      const title = document.title.toLowerCase();
      const h1 = document.querySelector('h1')?.textContent.toLowerCase() || '';
      
      for (const pattern of patterns) {
        if (pattern.test(url) || pattern.test(title) || pattern.test(h1)) {
          return true;
        }
      }
      return false;
    }, enhancedPrivacyPatterns.map(p => p.toString()));
    
    if (isPrivacyPage) {
      console.log('Current page appears to be privacy policy');
      return url;
    }
    
    return null;
    
  } catch (error) {
    console.log(`Error finding privacy policy: ${error.message}`);
    return null;
  }
}

/**
 * Enhanced test function with retry and fallback strategies
 */
async function testSiteEnhanced(url, timeout = 30000) {
  let browser, page;
  
  try {
    console.log(`\n🧪 Enhanced testing: ${url}`);
    
    // Launch browser with optimized settings
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-background-timer-throttling'
      ],
      defaultViewport: null,
      ignoreHTTPSErrors: true
    });
    
    page = await browser.newPage();
    
    // Block ads and trackers for faster loading
    const config = getSiteConfig(url);
    if (config.blockAds !== false) {
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        const reqUrl = request.url();
        
        if (resourceType === 'image' || 
            resourceType === 'media' ||
            resourceType === 'font' ||
            reqUrl.includes('doubleclick') ||
            reqUrl.includes('googletagmanager') ||
            reqUrl.includes('google-analytics') ||
            reqUrl.includes('facebook.com/tr') ||
            reqUrl.includes('amazon-adsystem')) {
          request.abort();
        } else {
          request.continue();
        }
      });
    }
    
    // Enhanced navigation
    await enhancedNavigate(page, url, timeout);
    
    // Find privacy policy with enhanced detection
    const privacyUrl = await findPrivacyPolicyEnhanced(page, url);
    
    if (!privacyUrl) {
      return {
        success: false,
        errorMessage: 'No privacy policy found with enhanced detection',
        url: url
      };
    }
    
    // Navigate to privacy policy if different page
    if (privacyUrl !== url) {
      console.log(`Navigating to privacy policy: ${privacyUrl}`);
      await enhancedNavigate(page, privacyUrl, timeout);
    }
    
    // Extract privacy policy content
    const content = await page.evaluate(() => {
      // Remove scripts and styles
      document.querySelectorAll('script, style, noscript').forEach(el => el.remove());
      
      // Try to find main content area
      const contentSelectors = [
        'main',
        '[role="main"]',
        '.main-content',
        '#main-content',
        '.content',
        '#content',
        'article',
        '.privacy-content',
        '.legal-content'
      ];
      
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.length > 500) {
          return element.textContent.replace(/\s+/g, ' ').trim();
        }
      }
      
      // Fall back to body
      return document.body.textContent.replace(/\s+/g, ' ').trim();
    });
    
    if (!content || content.length < 100) {
      return {
        success: false,
        errorMessage: 'Privacy policy content too short or empty',
        url: privacyUrl
      };
    }
    
    console.log(`Extracted ${content.length} characters of privacy content`);
    
    // Call Cloud Function for analysis
    const { testCloudFunction } = require('./direct-test-helpers');
    const analysisResult = await testCloudFunction(null, content);
    
    return {
      success: analysisResult.success,
      summaryPoints: analysisResult.summaryPoints || [],
      riskScore: analysisResult.riskScore,
      errorMessage: analysisResult.errorMessage,
      url: privacyUrl,
      originalUrl: url
    };
    
  } catch (error) {
    console.error(`Enhanced test error: ${error.message}`);
    return {
      success: false,
      errorMessage: error.message,
      url: url
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

module.exports = {
  testSiteEnhanced,
  enhancedNavigate,
  findPrivacyPolicyEnhanced,
  getSiteConfig,
  enhancedPrivacyPatterns
};