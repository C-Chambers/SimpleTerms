// SimpleTerms Content Script
// This script runs on all web pages to detect privacy policy links or analyze current page

(function() {
    'use strict';

    // Prioritized array of regex patterns to find privacy policy links
    const privacyPatterns = [
        /privacy[-_\s]?policy/i,           // Matches privacy-policy, privacy_policy, privacy policy
        /privacy[-_\s]?statement/i,        // Matches privacy-statement, privacy_statement, privacy statement
        /privacy[-_\s]?notice/i,           // Matches privacy-notice, privacy_notice, privacy notice
        /\/privacy\/?$/i,                  // Matches /privacy/ or /privacy (simple privacy paths)
        /data[-_\s]?protection/i,          // Matches data-protection, data protection, etc.
        /privacy/i,                        // General privacy match
        /terms[-_\s]?of[-_\s]?service/i,   // Matches terms-of-service, terms of service, etc.
        /terms[-_\s]?and[-_\s]?conditions/i, // Matches terms-and-conditions, terms and conditions, etc.
        /terms[-_\s]?of[-_\s]?use/i,       // Matches terms-of-use, terms of use, etc.
        /\/terms\/?$/i,                    // Matches /terms/ or /terms (simple terms paths)
        /legal/i,
        /gdpr/i
    ];

    // Enhanced patterns for detecting if current page is a privacy/terms page
    const currentPagePatterns = [
        /privacy[-_\s]?policy/i,           // Matches privacy-policy, privacy_policy, privacy policy
        /privacy[-_\s]?statement/i,        // Matches privacy-statement, privacy_statement, privacy statement
        /privacy[-_\s]?notice/i,           // Matches privacy-notice, privacy_notice, privacy notice
        /\/privacy\/?$/i,                  // Matches /privacy/ or /privacy (simple privacy paths)
        /terms[-_\s]?of[-_\s]?service/i,   // Matches terms-of-service, terms of service, etc.
        /terms[-_\s]?and[-_\s]?conditions/i, // Matches terms-and-conditions, terms and conditions, etc.
        /terms[-_\s]?of[-_\s]?use/i,       // Matches terms-of-use, terms of use, etc.
        /\/terms\/?$/i,                    // Matches /terms/ or /terms (simple terms paths)
        /data[-_\s]?protection/i,          // Matches data-protection, data protection, etc.
        /cookie[-_\s]?policy/i,            // Matches cookie-policy, cookie policy, etc.
        /legal[-_\s]?notice/i,             // Matches legal-notice, legal notice, etc.
        /user[-_\s]?agreement/i,           // Matches user-agreement, user agreement, etc.
        /gdpr/i
    ];

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
                    
                    // Penalty for terms-only matches (less specific)
                    if (href.includes('terms') && !href.includes('privacy')) score -= 5;
                    
                    candidates.push({
                        url: link.href,
                        text: text,
                        score: score,
                        element: link
                    });
                }
            });

            // Sort by score and return the best match
            candidates.sort((a, b) => b.score - a.score);
            
            if (candidates.length > 0) {
                const bestMatch = candidates[0];
                console.log('SimpleTerms: Found privacy policy link:', bestMatch.url);
                
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