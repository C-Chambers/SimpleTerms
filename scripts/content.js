// SimpleTerms Content Script
// This script runs on all web pages to detect privacy policy links or analyze current page

(function() {
    'use strict';

    // Prioritized array of regex patterns to find privacy policy links
    const privacyPatterns = [
        /privacy[-_\s]?policy/i,           // Matches privacy-policy, privacy_policy, privacy policy
        /privacy[-_\s]?statement/i,        // Matches privacy-statement, privacy_statement, privacy statement
        /privacy[-_\s]?notice/i,           // Matches privacy-notice, privacy_notice, privacy notice
        /\/privacy\//i,                    // Matches /privacy/ anywhere in URL
        /data[-_\s]?protection/i,          // Matches data-protection, data protection, etc.
        /privacy/i,                        // General privacy match
        /terms[-_\s]?of[-_\s]?service/i,   // Matches terms-of-service, terms of service, etc.
        /terms[-_\s]?and[-_\s]?conditions/i, // Matches terms-and-conditions, terms and conditions, etc.
        /terms[-_\s]?of[-_\s]?use/i,       // Matches terms-of-use, terms of use, etc.
        /\/terms\//i,                      // Matches /terms/ anywhere in URL
        /legal/i,
        /gdpr/i
    ];

    // Enhanced patterns for detecting if current page is a privacy/terms page
    const currentPagePatterns = [
        /privacy[-_\s]?policy/i,           // Matches privacy-policy, privacy_policy, privacy policy
        /privacy[-_\s]?statement/i,        // Matches privacy-statement, privacy_statement, privacy statement
        /privacy[-_\s]?notice/i,           // Matches privacy-notice, privacy_notice, privacy notice
        /\/privacy\//i,                    // Matches /privacy/ anywhere in URL
        /terms[-_\s]?of[-_\s]?service/i,   // Matches terms-of-service, terms of service, etc.
        /terms[-_\s]?and[-_\s]?conditions/i, // Matches terms-and-conditions, terms and conditions, etc.
        /terms[-_\s]?of[-_\s]?use/i,       // Matches terms-of-use, terms of use, etc.
        /\/terms\//i,                      // Matches /terms/ anywhere in URL
        /data[-_\s]?protection/i,          // Matches data-protection, data protection, etc.
        /cookie[-_\s]?policy/i,            // Matches cookie-policy, cookie policy, etc.
        /legal[-_\s]?notice/i,             // Matches legal-notice, legal notice, etc.
        /user[-_\s]?agreement/i,           // Matches user-agreement, user agreement, etc.
        /gdpr/i
    ];

    /**
     * Calculate location-based score - prioritize footer over header/navigation
     * @param {Element} link - The link element to analyze
     * @returns {number} Score modifier (-10 to +15)
     */
    function calculateLocationScore(link) {
        const rect = link.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const linkTop = rect.top;
        
        // Check if link is in footer area (bottom 20% of page)
        if (linkTop > windowHeight * 0.8) {
            return 15; // Strong preference for footer links
        }
        
        // Check if link is in header area (top 15% of page)
        if (linkTop < windowHeight * 0.15) {
            return -5; // Slight penalty for header links
        }
        
        // Check for common footer selectors
        let current = link.parentElement;
        while (current && current !== document.body) {
            const tagName = current.tagName.toLowerCase();
            const className = (current.className || '').toLowerCase();
            const id = (current.id || '').toLowerCase();
            
            // Footer indicators
            if (tagName === 'footer' || 
                className.includes('footer') || 
                id.includes('footer') ||
                className.includes('bottom') ||
                className.includes('site-footer')) {
                return 12;
            }
            
            // Navigation/header penalties
            if (tagName === 'nav' || tagName === 'header' ||
                className.includes('nav') || 
                className.includes('header') ||
                className.includes('menu') ||
                className.includes('dropdown')) {
                return -8;
            }
            
            current = current.parentElement;
        }
        
        return 0; // Neutral score for middle content
    }

    /**
     * Calculate context-based score - avoid hidden elements and dropdowns
     * @param {Element} link - The link element to analyze
     * @returns {number} Score modifier (-15 to +5)
     */
    function calculateContextScore(link) {
        let score = 0;
        
        // Check if element is visible
        const style = window.getComputedStyle(link);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return -15; // Heavy penalty for hidden elements
        }
        
        // Check for dropdown/menu context
        let current = link.parentElement;
        while (current && current !== document.body) {
            const className = (current.className || '').toLowerCase();
            const id = (current.id || '').toLowerCase();
            
            // Dropdown/menu penalties
            if (className.includes('dropdown') || 
                className.includes('submenu') ||
                className.includes('mega-menu') ||
                className.includes('nav-menu') ||
                id.includes('dropdown') ||
                current.hasAttribute('aria-expanded')) {
                score -= 10;
            }
            
            // Legal/footer section bonuses
            if (className.includes('legal') ||
                className.includes('links') ||
                className.includes('policy-links') ||
                id.includes('legal')) {
                score += 5;
            }
            
            current = current.parentElement;
        }
        
        return score;
    }

    /**
     * Calculate quality-based score - prefer specific link text over generic
     * @param {Element} link - The link element to analyze
     * @param {string} text - The link text content
     * @returns {number} Score modifier (-5 to +10)
     */
    function calculateQualityScore(link, text) {
        let score = 0;
        
        // Prefer specific privacy policy text
        if (text === 'privacy policy' || text === 'privacy' || text === 'privacy statement') {
            score += 8;
        }
        
        // Bonus for standalone links (not buried in long text)
        if (text.length < 30 && text.includes('privacy')) {
            score += 5;
        }
        
        // Penalty for very generic text
        if (text.length > 100 || 
            text.includes('more') || 
            text.includes('click here') ||
            text.includes('learn more')) {
            score -= 5;
        }
        
        // Check link styling (footer links often have specific styling)
        const style = window.getComputedStyle(link);
        const fontSize = parseInt(style.fontSize);
        
        // Small footer links often indicate real policy links
        if (fontSize < 14) {
            score += 3;
        }
        
        return score;
    }

    /**
     * Get human-readable location description for debugging
     * @param {Element} link - The link element
     * @returns {string} Location description
     */
    function getElementLocation(link) {
        let current = link.parentElement;
        while (current && current !== document.body) {
            const tagName = current.tagName.toLowerCase();
            const className = (current.className || '').toLowerCase();
            
            if (tagName === 'footer' || className.includes('footer')) return 'footer';
            if (tagName === 'header' || className.includes('header')) return 'header';
            if (tagName === 'nav' || className.includes('nav')) return 'navigation';
            if (className.includes('dropdown')) return 'dropdown';
            
            current = current.parentElement;
        }
        return 'content';
    }

    /**
     * Get element context for debugging
     * @param {Element} link - The link element
     * @returns {string} Context description
     */
    function getElementContext(link) {
        const rect = link.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const position = rect.top > windowHeight * 0.8 ? 'bottom' : 
                        rect.top < windowHeight * 0.15 ? 'top' : 'middle';
        
        const style = window.getComputedStyle(link);
        const visible = style.display !== 'none' && style.visibility !== 'hidden';
        
        return `${position}, ${visible ? 'visible' : 'hidden'}`;
    }

    /**
     * Check if a link points to non-policy content (help articles, support pages, etc.)
     * @param {string} href - The link URL
     * @param {string} text - The link text content
     * @returns {boolean} True if this is non-policy content to skip
     */
    function isNonPolicyContent(href, text) {
        // Only exclude THIRD-PARTY help systems, not company's own help sections
        const thirdPartyHelpPatterns = [
            /zendesk\.com\/hc\//i,           // Zendesk help center (third-party)
            /freshdesk\.com/i,              // Freshdesk support (third-party)
            /intercom\.help/i,              // Intercom help (third-party)
            /confluence\.atlassian/i,       // Confluence docs (third-party)
            /notion\.so/i,                  // Notion help pages (third-party)
            /gitbook\.io/i,                 // GitBook documentation (third-party)
            /helpscout\.net/i,              // HelpScout (third-party)
            /desk\.com/i,                   // Salesforce Desk (third-party)
        ];

        // Check if URL matches third-party help patterns only
        if (thirdPartyHelpPatterns.some(pattern => pattern.test(href))) {
            console.log('SimpleTerms: Skipping third-party help system:', href);
            return true;
        }

        // Only exclude text that's clearly about HOW TO understand privacy, not the policy itself
        const helpAboutPrivacyPatterns = [
            /how to.*privacy/i,
            /understanding.*privacy/i,
            /privacy.*explained/i,
            /privacy.*guide/i,
            /privacy.*questions/i,
            /privacy.*faq/i,
        ];

        // Additional check: if it's clearly help content AND not from the main domain
        const isHelpContent = helpAboutPrivacyPatterns.some(pattern => pattern.test(text));
        const isThirdPartyDomain = !href.includes(window.location.hostname);
        
        if (isHelpContent && isThirdPartyDomain) {
            console.log('SimpleTerms: Skipping third-party help content:', text);
            return true;
        }

        return false;
    }

    /**
     * Check if a URL is definitely a policy page (not a help article about policies)
     * @param {string} href - The link URL
     * @returns {boolean} True if this is definitely a policy page
     */
    function isPolicyPageUrl(href) {
        // Strong indicators this is an actual policy page
        const policyPagePatterns = [
            /\/privacy\/?$/i,               // Ends with /privacy
            /\/privacy-policy\/?$/i,        // Ends with /privacy-policy
            /\/privacy_policy\/?$/i,        // Ends with /privacy_policy
            /\/legal\/privacy/i,            // Legal section privacy
            /\/policies\/privacy/i,         // Policies section
            /\/terms-and-privacy/i,         // Combined terms and privacy
            /\/privacy\.html?$/i,           // Privacy HTML file
            /\/privacy\.php$/i,             // Privacy PHP file
        ];

        // Check for domain patterns that indicate official policy pages
        const officialDomainPatterns = [
            /^https?:\/\/[^\/]*\/(privacy|legal|policies)/i,  // Direct legal/privacy paths
        ];

        return policyPagePatterns.some(pattern => pattern.test(href)) ||
               officialDomainPatterns.some(pattern => pattern.test(href));
    }

    /**
     * Check if a URL is a privacy settings/preferences page rather than a policy
     * @param {string} href - The link URL
     * @param {string} text - The link text content  
     * @returns {boolean} True if this is a settings page, not a policy
     */
    function isPrivacySettingsPage(href, text) {
        // URL patterns that indicate settings/preferences rather than policies
        const settingsPatterns = [
            /privacyprefs/i,                // Privacy preferences
            /privacy[-_]?settings/i,        // Privacy settings
            /privacy[-_]?preferences/i,     // Privacy preferences
            /privacy[-_]?controls/i,        // Privacy controls
            /privacy[-_]?center/i,          // Privacy center/dashboard
            /privacy[-_]?dashboard/i,       // Privacy dashboard
            /data[-_]?controls/i,           // Data controls
            /ad[-_]?preferences/i,          // Ad preferences
            /cookie[-_]?settings/i,         // Cookie settings
        ];

        // Text patterns that indicate settings rather than policies
        const settingsTextPatterns = [
            /privacy settings/i,
            /privacy preferences/i,
            /privacy controls/i,
            /manage.*privacy/i,
            /privacy center/i,
            /ad preferences/i,
            /cookie settings/i,
        ];

        const urlIsSettings = settingsPatterns.some(pattern => pattern.test(href));
        const textIsSettings = settingsTextPatterns.some(pattern => pattern.test(text));

        if (urlIsSettings || textIsSettings) {
            console.log('SimpleTerms: Detected privacy settings page (not policy):', href);
            return true;
        }

        return false;
    }

    function findPrivacyPolicyLink() {
        try {
            // Get all anchor tags on the page
            const links = document.querySelectorAll('a[href]');
            const candidates = [];

            // Score each link based on how well it matches our patterns
            links.forEach(link => {
                const href = link.href.toLowerCase();
                const text = (link.textContent || '').toLowerCase().trim();
                const title = (link.title || '').toLowerCase();
                
                // Skip mailto, tel, and javascript links
                if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
                    return;
                }

                // Skip help center articles, support pages, and other non-policy content
                if (isNonPolicyContent(href, text)) {
                    return;
                }

                // Check URL, text content, and title against patterns
                const urlMatches = privacyPatterns.some(pattern => pattern.test(href));
                const textMatches = privacyPatterns.some(pattern => pattern.test(text));
                const titleMatches = privacyPatterns.some(pattern => pattern.test(title));

                if (urlMatches || textMatches || titleMatches) {
                    let score = 0;
                    
                    // Higher score for URL matches (most reliable)
                    if (urlMatches) score += 10;
                    if (textMatches) score += 5;
                    if (titleMatches) score += 3;
                    
                    // Bonus for exact matches
                    if (href.includes('privacy-policy') || href.includes('privacy_policy')) score += 15;
                    if (text.includes('privacy policy')) score += 10;
                    
                    // BONUS for specific policy language (vs generic privacy text)
                    if (text.includes('privacy notice') || text.includes('privacy statement')) score += 12;
                    
                    // Penalty for terms-only matches (less specific)
                    if (href.includes('terms') && !href.includes('privacy')) score -= 5;
                    
                    // BONUS for URLs that are definitely policy pages (not help articles)
                    if (isPolicyPageUrl(href)) score += 20;
                    
                    // PENALTY for privacy settings/preferences pages (not actual policies)
                    if (isPrivacySettingsPage(href, text)) score -= 25;
                    
                    // LOCATION-BASED SCORING (prioritize footer over navigation)
                    const locationScore = calculateLocationScore(link);
                    score += locationScore;
                    
                    // CONTEXT-BASED SCORING (avoid dropdowns and hidden elements)
                    const contextScore = calculateContextScore(link);
                    score += contextScore;
                    
                    // LINK QUALITY SCORING (prefer standalone links over generic text)
                    const qualityScore = calculateQualityScore(link, text);
                    score += qualityScore;
                    
                    candidates.push({
                        url: link.href,
                        text: text,
                        score: score,
                        element: link,
                        location: getElementLocation(link),
                        context: getElementContext(link)
                    });
                }
            });

            // Sort by score and return the best match
            candidates.sort((a, b) => b.score - a.score);
            
            if (candidates.length > 0) {
                const bestMatch = candidates[0];
                
                // Enhanced logging for debugging link selection
                console.log('SimpleTerms: Found', candidates.length, 'privacy policy candidates');
                console.log('SimpleTerms: Top 3 candidates:');
                candidates.slice(0, 3).forEach((candidate, index) => {
                    console.log(`  ${index + 1}. Score: ${candidate.score}, Text: "${candidate.text}", URL: ${candidate.url}, Location: ${candidate.location}, Context: ${candidate.context}`);
                });
                console.log('SimpleTerms: Selected best match:', bestMatch.url);
                
                // Send the URL to the popup
                chrome.runtime.sendMessage({
                    type: 'POLICY_URL_FOUND',
                    url: bestMatch.url,
                    text: bestMatch.text,
                    score: bestMatch.score
                });
            } else {
                console.log('SimpleTerms: No privacy policy link found');
                chrome.runtime.sendMessage({
                    type: 'NO_POLICY_FOUND'
                });
            }

        } catch (error) {
            console.error('SimpleTerms: Error finding privacy policy link:', error);
            chrome.runtime.sendMessage({
                type: 'ERROR',
                error: 'Failed to scan page for privacy policy links'
            });
        }
    }

    /**
     * Check if the current page is already a privacy policy or terms page
     * @returns {Object|null} Information about the current page if it's a privacy/terms page
     */
    function checkCurrentPageIsPrivacyPage() {
        try {
            const currentUrl = window.location.href.toLowerCase();
            const pageTitle = (document.title || '').toLowerCase();
            const pageContent = document.body ? document.body.textContent.toLowerCase() : '';
            
            console.log('SimpleTerms: Checking current page - URL:', currentUrl);
            console.log('SimpleTerms: Page title:', pageTitle);
            
            // Check URL for privacy/terms patterns (most reliable indicator)
            const urlMatches = currentPagePatterns.some(pattern => pattern.test(currentUrl));
            
            // Check page title for privacy/terms patterns
            const titleMatches = currentPagePatterns.some(pattern => pattern.test(pageTitle));
            
            // Check for privacy/terms keywords in the first 1000 characters of content
            const contentSample = pageContent.substring(0, 1000);
            const contentMatches = currentPagePatterns.some(pattern => pattern.test(contentSample));
            
            // Additional content-based checks for stronger detection
            const strongIndicators = [
                /we collect.*information/i,
                /personal data/i,
                /cookies.*tracking/i,
                /third.?party.*sharing/i,
                /data protection/i,
                /information.*collect.*use/i,
                /privacy.*practices/i,
                /terms.*conditions/i,
                /user.*agreement/i
            ];
            
            const strongContentMatches = strongIndicators.some(pattern => pattern.test(contentSample));
            
            // Calculate confidence score with stronger URL weighting
            let confidence = 0;
            if (urlMatches) confidence += 60;  // Increased from 40 - URL is most reliable
            if (titleMatches) confidence += 30;
            if (contentMatches) confidence += 15;  // Reduced from 20
            if (strongContentMatches) confidence += 20;
            
            console.log('SimpleTerms: Detection scores - URL:', urlMatches ? 60 : 0, 'Title:', titleMatches ? 30 : 0, 'Content:', contentMatches ? 15 : 0, 'Strong:', strongContentMatches ? 20 : 0);
            console.log('SimpleTerms: Total confidence:', confidence);
            
            // Lower threshold and prioritize URL matches
            if (confidence >= 45 || urlMatches) {  // If URL matches, we're confident regardless of other factors
                console.log('SimpleTerms: Current page detected as privacy/terms page (confidence:', confidence + ')');
                return {
                    url: window.location.href,
                    title: document.title || 'Privacy Policy',
                    confidence: confidence,
                    detectionMethod: 'current_page'
                };
            }
            
            console.log('SimpleTerms: Current page not detected as privacy page (confidence too low:', confidence + ')');
            return null;
            
        } catch (error) {
            console.error('SimpleTerms: Error checking current page:', error);
            return null;
        }
    }

    /**
     * Extract text content from the current page for analysis
     * @returns {string} Clean text content of the current page
     */
    function extractCurrentPageContent() {
        try {
            // Create a copy of the page content
            const contentElement = document.body ? document.body.cloneNode(true) : document.documentElement;
            
            // Remove only the most obvious unwanted elements (less aggressive)
            const unwantedSelectors = [
                'script', 'style', 'nav[role="navigation"]', 'aside[role="complementary"]',
                '.menu', '.navigation', '.ads', '.advertisement'
            ];
            
            unwantedSelectors.forEach(selector => {
                const elements = contentElement.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });
            
            // Get clean text content
            let text = contentElement.textContent || contentElement.innerText || '';
            
            // Clean up the text but preserve more content
            text = text
                .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
                .trim();
            
            console.log('SimpleTerms: Extracted current page content length:', text.length);
            
            return text;
            
        } catch (error) {
            console.error('SimpleTerms: Error extracting current page content:', error);
            return '';
        }
    }

    /**
     * Main execution function - checks current page first, then searches for links
     */
    function analyzePageForPrivacyPolicy() {
        try {
            // Skip analysis if this is a SimpleTerms extraction window
            if (window.location.href.includes('simpleTermsExtraction=true')) {
                console.log('SimpleTerms: Skipping analysis in extraction window');
                return;
            }
            
            // First, check if we're already on a privacy/terms page
            const currentPageInfo = checkCurrentPageIsPrivacyPage();
            
            if (currentPageInfo) {
                // We're on a privacy/terms page - analyze current content
                const pageContent = extractCurrentPageContent();
                
                console.log('SimpleTerms: Current page detected as privacy page');
                console.log('SimpleTerms: Extracted content length:', pageContent.length);
                
                if (pageContent && pageContent.length > 100) {  // Lowered from 200 to 100
                    console.log('SimpleTerms: Analyzing current privacy/terms page content');
                    chrome.runtime.sendMessage({
                        type: 'CURRENT_PAGE_IS_POLICY',
                        url: currentPageInfo.url,
                        title: currentPageInfo.title,
                        content: pageContent,
                        confidence: currentPageInfo.confidence,
                        method: 'current_page_analysis'
                    });
                    return;
                } else {
                    console.log('SimpleTerms: Current page detected as privacy page but content too short (' + pageContent.length + ' chars), falling back to link search');
                }
            } else {
                console.log('SimpleTerms: Current page not detected as privacy page, searching for links');
            }
            
            // If not on a privacy page, or content extraction failed, search for privacy policy links
            findPrivacyPolicyLink();
            
        } catch (error) {
            console.error('SimpleTerms: Error in main analysis function:', error);
            chrome.runtime.sendMessage({
                type: 'ERROR',
                error: 'Failed to analyze page for privacy policy'
            });
        }
    }

    // Execute the analysis
    analyzePageForPrivacyPolicy();
})();