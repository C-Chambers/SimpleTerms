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
     * Get regular DOM links (not Shadow DOM)
     * @returns {Array} Array of regular link elements
     */
    function findRegularLinks() {
        return Array.from(document.querySelectorAll('a[href]'));
    }

    /**
     * Score a single link for privacy policy relevance
     * @param {Element} link - The link element to score
     * @param {string} source - Source identifier ('regular-dom' or 'shadow-dom')
     * @returns {Object|null} Candidate object or null if score is 0
     */
    function scoreLinkForPrivacy(link, source) {
        const href = link.href.toLowerCase();
        const text = (link.textContent || '').toLowerCase().trim();
        const title = (link.title || '').toLowerCase();
        
        // Skip invalid links
        if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
            return null;
        }

        // Skip non-policy content
        if (isNonPolicyContent(href, text)) {
            return null;
        }
        
        // CRUCIAL: Only process links that match privacy patterns (like main branch)
        const urlMatches = privacyPatterns.some(pattern => pattern.test(href));
        const textMatches = privacyPatterns.some(pattern => pattern.test(text));
        const titleMatches = privacyPatterns.some(pattern => pattern.test(title));
        
        if (!urlMatches && !textMatches && !titleMatches) {
            return null; // Skip links that don't match any privacy patterns
        }
        
        let score = 0;
        let reasons = [];

        // Test against our priority patterns for detailed scoring
        for (let i = 0; i < privacyPatterns.length; i++) {
            const pattern = privacyPatterns[i];
            let patternScore = 20 - i; // Higher scores for higher priority patterns

            if (pattern.test(href)) {
                score += patternScore + 10; // Bonus for URL match
                reasons.push(`URL matches ${pattern.source}`);
            }
            if (pattern.test(text)) {
                score += patternScore;
                reasons.push(`Text matches ${pattern.source}`);
            }
            if (pattern.test(title)) {
                score += patternScore / 2;
                reasons.push(`Title matches ${pattern.source}`);
            }
        }

        // Additional specific bonuses
        if (href.includes('privacy-policy') || href.includes('privacy_policy')) {
            score += 15;
            reasons.push('Exact URL match');
        }
        if (text.includes('privacy policy')) {
            score += 10;
            reasons.push('Exact text match');
        }

        // Apply various scoring factors
        const locationScore = calculateLocationScore(link);
        score += locationScore;
        if (locationScore > 0) {
            reasons.push(`Good location (${locationScore})`);
        }

        const contextScore = calculateContextScore(link);
        score += contextScore;
        if (contextScore !== 0) {
            reasons.push(`Context (${contextScore})`);
        }

        const qualityScore = calculateQualityScore(link, text);
        score += qualityScore;
        if (qualityScore !== 0) {
            reasons.push(`Quality (${qualityScore})`);
        }

        // Policy-specific checks
        if (isPolicyPageUrl(href)) {
            score += 20;
            reasons.push('Policy page URL');
        }
        
        if (isPrivacySettingsPage(href, text)) {
            score -= 25;
            reasons.push('Privacy settings penalty');
        }

        if (score <= 0) {
            return null;
        }

        return {
            link: link,
            url: href,
            text: text,
            score: score,
            reasons: reasons,
            source: source,
            location: getElementLocation(link),
            context: getElementContext(link)
        };
    }

    /**
     * Recursively find links in Shadow DOM only
     * @param {Document|DocumentFragment} root - The root to search from
     * @returns {Array} Array of shadow DOM link elements found
     */
    function findShadowDOMLinks(root = document) {
        const links = [];
        
        try {
            // Find all elements that might have shadow roots
            const allElements = root.querySelectorAll('*');
            allElements.forEach(element => {
                if (element.shadowRoot) {
                    console.log('SimpleTerms: Found shadow root in:', element.tagName, element.className || 'no-class');
                    
                    // Get links directly in this shadow root
                    const shadowLinks = element.shadowRoot.querySelectorAll('a[href]');
                    shadowLinks.forEach(link => links.push(link));
                    
                    // Recursively search nested shadow roots
                    const nestedShadowLinks = findShadowDOMLinks(element.shadowRoot);
                    nestedShadowLinks.forEach(link => links.push(link));
                }
            });
        } catch (error) {
            console.log('SimpleTerms: Error traversing shadow DOM:', error.message);
        }
        
        return links;
    }

    /**
     * Find and test potential menu triggers that might contain hidden privacy links
     * @returns {Promise<Array>} Array of found privacy links from hidden menus
     */
    async function findHiddenMenuPrivacyLinks() {
        console.log('SimpleTerms: Searching for hidden menu privacy links...');
        const foundLinks = [];
        
        try {
            // Common selectors for menu triggers that might hide privacy links
            const triggerSelectors = [
                'button:not([aria-expanded="true"])',  // Collapsed buttons
                '[aria-expanded="false"]',             // ARIA-expanded false
                '[role="button"]:not([aria-expanded="true"])', // Role buttons
                'button[aria-haspopup]',               // Buttons with popups
                '*[class*="menu"]:not([aria-expanded="true"])', // Menu elements
                '*[class*="dropdown"]:not([aria-expanded="true"])', // Dropdown elements
            ];
            
            for (const selector of triggerSelectors) {
                const triggers = document.querySelectorAll(selector);
                
                for (const trigger of triggers) {
                    const text = (trigger.textContent || '').toLowerCase().trim();
                    const ariaLabel = (trigger.getAttribute('aria-label') || '').toLowerCase();
                    
                    // Look for triggers that might contain privacy links
                    if (text.includes('more') || text.includes('menu') || text.includes('options') ||
                        ariaLabel.includes('more') || ariaLabel.includes('menu') || ariaLabel.includes('options') ||
                        text.includes('⋮') || text.includes('···')) {
                        
                        console.log('SimpleTerms: Testing menu trigger:', text || ariaLabel || 'no text');
                        
                        // Check if trigger is visible
                        const style = window.getComputedStyle(trigger);
                        if (style.display === 'none' || style.visibility === 'hidden') {
                            continue;
                        }
                        
                        try {
                            // Click the trigger
                            trigger.click();
                            
                            // Wait for menu to appear
                            await new Promise(resolve => setTimeout(resolve, 300));
                            
                            // Search for newly appeared privacy links
                            const allLinks = document.querySelectorAll('a[href]');
                            const newPrivacyLinks = [];
                            
                            allLinks.forEach(link => {
                                const href = link.href.toLowerCase();
                                const linkText = (link.textContent || '').toLowerCase().trim();
                                const title = (link.title || '').toLowerCase();
                                
                                if ((href.includes('privacy') || linkText.includes('privacy') || title.includes('privacy') ||
                                     href.includes('legal') || linkText.includes('legal') || title.includes('legal')) &&
                                    window.getComputedStyle(link).display !== 'none') {
                                    
                                    newPrivacyLinks.push(link);
                                }
                            });
                            
                            if (newPrivacyLinks.length > 0) {
                                console.log('SimpleTerms: Found privacy links in hidden menu!');
                                foundLinks.push(...newPrivacyLinks);
                                
                                // Don't click more triggers if we found links
                                return foundLinks;
                            }
                            
                        } catch (error) {
                            console.log('SimpleTerms: Error testing menu trigger:', error.message);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.log('SimpleTerms: Error in hidden menu search:', error.message);
        }
        
        return foundLinks;
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
            /gitbook\.io/i,                 // GitBook documentation (third-party)
            /helpscout\.net/i,              // HelpScout (third-party)
            /desk\.com/i,                   // Salesforce Desk (third-party)
        ];

        // Special case for Notion.so: Only exclude if it's clearly help content, not legal docs
        if (/notion\.so/i.test(href)) {
            // If the link text contains privacy/legal keywords, it's likely a privacy policy
            const legalKeywords = /privacy|terms|legal|policy|gdpr|ccpa|cookie/i;
            if (legalKeywords.test(text)) {
                console.log('SimpleTerms: Notion.so link appears to be legal content, including:', href);
                return false; // Include this link
            } else {
                console.log('SimpleTerms: Skipping Notion.so help content:', href);
                return true; // Exclude help content
            }
        }

        // Check if URL matches other third-party help patterns
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

    /**
     * Normalize URL for duplicate detection
     * @param {string} url - The URL to normalize
     * @returns {string} Normalized URL
     */
    function normalizeUrl(url) {
        try {
            const urlObj = new URL(url);
            // Remove fragments, query params, and normalize trailing slashes
            let normalized = urlObj.origin + urlObj.pathname;
            
            // Remove trailing slash for consistency
            if (normalized.endsWith('/') && normalized.length > urlObj.origin.length + 1) {
                normalized = normalized.slice(0, -1);
            }
            
            return normalized.toLowerCase();
        } catch (error) {
            // If URL parsing fails, return the original URL lowercased
            return url.toLowerCase();
        }
    }

    async function findPrivacyPolicyLink() {
        try {
            // Phase 1: Search regular DOM links first
            const regularLinks = findRegularLinks();
            let candidates = [];
            
            console.log('SimpleTerms: Found', regularLinks.length, 'regular DOM links');

            // Score regular DOM links
            regularLinks.forEach(link => {
                const candidate = scoreLinkForPrivacy(link, 'regular-dom');
                if (candidate) {
                    candidates.push(candidate);
                }
            });

            // Sort by score (highest first)
            candidates.sort((a, b) => b.score - a.score);

            // Phase 2: Only search Shadow DOM if we don't have good candidates
            const highQualityThreshold = 25; // Minimum score for a "good" privacy policy link
            const hasHighQualityCandidates = candidates.length > 0 && candidates[0].score >= highQualityThreshold;

            if (!hasHighQualityCandidates) {
                console.log('SimpleTerms: No high-quality candidates in regular DOM, searching Shadow DOM...');
                const shadowLinks = findShadowDOMLinks();
                console.log('SimpleTerms: Found', shadowLinks.length, 'shadow DOM links');
                
                // Score shadow DOM links and add to candidates
                shadowLinks.forEach(link => {
                    const candidate = scoreLinkForPrivacy(link, 'shadow-dom');
                    if (candidate) {
                        candidates.push(candidate);
                    }
                });
                
                // Re-sort with new shadow DOM candidates
                candidates.sort((a, b) => b.score - a.score);
            } else {
                console.log('SimpleTerms: Found high-quality candidates in regular DOM, skipping Shadow DOM search');
            }
            
            if (candidates.length > 0) {
                // Remove duplicates by normalized URL
                const uniqueCandidates = [];
                const seenUrls = new Set();
                
                for (const candidate of candidates) {
                    // Normalize URL by removing fragments, query params, and trailing slashes
                    const normalizedUrl = normalizeUrl(candidate.url);
                    
                    if (!seenUrls.has(normalizedUrl)) {
                        seenUrls.add(normalizedUrl);
                        uniqueCandidates.push(candidate);
                    } else {
                        console.log('SimpleTerms: Skipping duplicate URL:', candidate.url, '(normalized:', normalizedUrl + ')');
                    }
                }
                
                // Get top 3 unique candidates (or less if fewer are available)
                const topCandidates = uniqueCandidates.slice(0, 3);
                
                // Enhanced logging for debugging link selection
                console.log('SimpleTerms: Found', candidates.length, 'privacy policy candidates,', uniqueCandidates.length, 'unique (including shadow DOM)');
                console.log('SimpleTerms: Top', topCandidates.length, 'unique candidates:');
                topCandidates.forEach((candidate, index) => {
                    console.log(`  ${index + 1}. Score: ${candidate.score}, Text: "${candidate.text}", URL: ${candidate.url}, Location: ${candidate.location}, Context: ${candidate.context}`);
                });
                console.log('SimpleTerms: Sending', topCandidates.length, 'unique candidates to popup');
                
                // Send up to 3 URLs to the popup
                chrome.runtime.sendMessage({
                    type: 'POLICY_URLS_FOUND',
                    policies: topCandidates.map(candidate => ({
                        url: candidate.url,
                        text: candidate.text,
                        score: candidate.score
                    }))
                });
            } else {
                console.log('SimpleTerms: No privacy policy links found in regular/shadow DOM, trying hidden menus...');
                
                // Try to find privacy links in hidden menus
                const hiddenMenuLinks = await findHiddenMenuPrivacyLinks();
                
                if (hiddenMenuLinks.length > 0) {
                    console.log('SimpleTerms: Found privacy links in hidden menus!');
                    
                    // Process hidden menu links the same way as regular links
                    const hiddenCandidates = [];
                    
                    hiddenMenuLinks.forEach(link => {
                        const href = link.href.toLowerCase();
                        const text = (link.textContent || '').toLowerCase().trim();
                        const title = (link.title || '').toLowerCase();
                        
                        // Skip filtering for hidden menu links since they're already filtered
                        const urlMatches = privacyPatterns.some(pattern => pattern.test(href));
                        const textMatches = privacyPatterns.some(pattern => pattern.test(text));
                        const titleMatches = privacyPatterns.some(pattern => pattern.test(title));
                        
                        if (urlMatches || textMatches || titleMatches) {
                            let score = 0;
                            
                            // Higher score for URL matches
                            if (urlMatches) score += 10;
                            if (textMatches) score += 5;
                            if (titleMatches) score += 3;
                            
                            // Bonus for exact matches
                            if (href.includes('privacy-policy') || href.includes('privacy_policy')) score += 15;
                            if (text.includes('privacy policy')) score += 10;
                            
                            // Bonus for being found in hidden menu
                            score += 5;
                            
                            hiddenCandidates.push({
                                url: link.href,
                                text: text,
                                score: score,
                                element: link,
                                location: 'hidden-menu',
                                context: 'found in dropdown menu'
                            });
                        }
                    });
                    
                    if (hiddenCandidates.length > 0) {
                        // Sort by score
                        hiddenCandidates.sort((a, b) => b.score - a.score);
                        
                        console.log('SimpleTerms: Found', hiddenCandidates.length, 'privacy policy candidates in hidden menus');
                        hiddenCandidates.forEach((candidate, index) => {
                            console.log(`  ${index + 1}. Score: ${candidate.score}, Text: "${candidate.text}", URL: ${candidate.url}`);
                        });
                        
                        // Send the best candidates
                        const topHiddenCandidates = hiddenCandidates.slice(0, 3);
                        chrome.runtime.sendMessage({
                            type: 'POLICY_URLS_FOUND',
                            policies: topHiddenCandidates.map(candidate => ({
                                url: candidate.url,
                                text: candidate.text,
                                score: candidate.score
                            }))
                        });
                    } else {
                        console.log('SimpleTerms: No valid privacy policy candidates found in hidden menus');
                        chrome.runtime.sendMessage({
                            type: 'NO_POLICY_FOUND'
                        });
                    }
                } else {
                    console.log('SimpleTerms: No privacy policy link found (searched regular DOM, shadow DOM, and hidden menus)');
                    chrome.runtime.sendMessage({
                        type: 'NO_POLICY_FOUND'
                    });
                }
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
            findPrivacyPolicyLink().catch(error => {
                console.error('SimpleTerms: Error in findPrivacyPolicyLink:', error);
                chrome.runtime.sendMessage({
                    type: 'ERROR',
                    error: 'Failed to search for privacy policy links'
                });
            });
            
        } catch (error) {
            console.error('SimpleTerms: Error in main analysis function:', error);
            chrome.runtime.sendMessage({
                type: 'ERROR',
                error: 'Failed to analyze page for privacy policy'
            });
        }
    }

    // Only run analysis when manually triggered by user clicking the button
    if (window.simpleTermsManualTrigger) {
        console.log('SimpleTerms: Manual trigger detected, running analysis');
        analyzePageForPrivacyPolicy();
    } else {
        console.log('SimpleTerms: Content script loaded but waiting for manual trigger');
    }
})();