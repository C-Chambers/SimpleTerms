// SimpleTerms Content Script
// This script runs on all web pages to detect privacy policy links

(function() {
    'use strict';

    // Prioritized array of regex patterns to find privacy policy links
    const privacyPatterns = [
        /privacy[-_]?policy/i,
        /privacy[-_]?statement/i,
        /privacy[-_]?notice/i,
        /data[-_]?protection/i,
        /privacy/i,
        /terms[-_]?of[-_]?service/i,
        /terms[-_]?and[-_]?conditions/i,
        /terms[-_]?of[-_]?use/i,
        /legal/i,
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

    // Execute the search
    findPrivacyPolicyLink();
})();