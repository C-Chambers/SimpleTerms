// SimpleTerms Content Script
// This script runs on all web pages to detect privacy policy links or analyze current page

(function() {
    'use strict';

    // Prioritized array of regex patterns to find privacy policy links
    const privacyPatterns = [
        /privacy[-_]?policy/i,
        /privacy[-_]?statement/i,
        /privacy[-_]?notice/i,
        /\/privacy\/?$/i,  // Matches /privacy/ or /privacy (simple privacy paths)
        /data[-_]?protection/i,
        /privacy/i,
        /terms[-_]?of[-_]?service/i,
        /terms[-_]?and[-_]?conditions/i,
        /terms[-_]?of[-_]?use/i,
        /\/terms\/?$/i,    // Matches /terms/ or /terms (simple terms paths)
        /legal/i,
        /gdpr/i
    ];

    // Enhanced patterns for detecting if current page is a privacy/terms page
    const currentPagePatterns = [
        /privacy[-_]?policy/i,
        /privacy[-_]?statement/i,
        /privacy[-_]?notice/i,
        /\/privacy\/?$/i,  // Matches /privacy/ or /privacy (simple privacy paths)
        /terms[-_]?of[-_]?service/i,
        /terms[-_]?and[-_]?conditions/i,
        /terms[-_]?of[-_]?use/i,
        /\/terms\/?$/i,    // Matches /terms/ or /terms (simple terms paths)
        /data[-_]?protection/i,
        /cookie[-_]?policy/i,
        /legal[-_]?notice/i,
        /user[-_]?agreement/i,
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
            
            // Check URL for privacy/terms patterns
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
            
            // Calculate confidence score
            let confidence = 0;
            if (urlMatches) confidence += 40;
            if (titleMatches) confidence += 30;
            if (contentMatches) confidence += 20;
            if (strongContentMatches) confidence += 20;
            
            // Require minimum confidence threshold
            if (confidence >= 50) {
                console.log('SimpleTerms: Current page detected as privacy/terms page (confidence:', confidence + ')');
                return {
                    url: window.location.href,
                    title: document.title || 'Privacy Policy',
                    confidence: confidence,
                    detectionMethod: 'current_page'
                };
            }
            
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
            
            // Remove unwanted elements
            const unwantedSelectors = [
                'script', 'style', 'nav', 'header', 'footer', 'aside',
                '.menu', '.navigation', '.sidebar', '.ads', '.advertisement',
                '.social-media', '.related-links', '.breadcrumb', '.pagination'
            ];
            
            unwantedSelectors.forEach(selector => {
                const elements = contentElement.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });
            
            // Get clean text content
            let text = contentElement.textContent || contentElement.innerText || '';
            
            // Clean up the text
            text = text
                .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
                .replace(/\n\s*\n/g, '\n')  // Remove empty lines
                .trim();
            
            // Remove common navigation patterns
            text = text.replace(/\b(home|about|contact|sitemap|terms|privacy|cookie|legal)\s*[\|\/]/gi, '');
            
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
                
                if (pageContent && pageContent.length > 200) {
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
                    console.log('SimpleTerms: Current page detected as privacy page but content too short, falling back to link search');
                }
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