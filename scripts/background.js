// SimpleTerms Background Script (Service Worker)
// Handles background tasks and extension lifecycle events

chrome.runtime.onInstalled.addListener((details) => {
    console.log('SimpleTerms extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        // Initialize storage with default values
        chrome.storage.local.set({
            summaryCount: 0,
            installDate: Date.now(),
            version: chrome.runtime.getManifest().version
        });
        
        console.log('SimpleTerms: Extension installed successfully');
    } else if (details.reason === 'update') {
        console.log('SimpleTerms: Extension updated to version', chrome.runtime.getManifest().version);
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('SimpleTerms: Extension started');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('SimpleTerms: Background received message:', message.type);
    
    switch (message.type) {
        case 'GET_STORAGE_DATA':
            // Return storage data to requesting script
            chrome.storage.local.get(null, (data) => {
                sendResponse(data);
            });
            return true; // Keep the message channel open for async response
            
        case 'UPDATE_SUMMARY_COUNT':
            // Increment the summary count
            chrome.storage.local.get(['summaryCount'], (data) => {
                const newCount = (data.summaryCount || 0) + 1;
                chrome.storage.local.set({ summaryCount: newCount }, () => {
                    sendResponse({ summaryCount: newCount });
                });
            });
            return true;
            
        case 'RESET_SUMMARY_COUNT':
            // Reset summary count (for premium users)
            chrome.storage.local.set({ summaryCount: 0 }, () => {
                sendResponse({ success: true });
            });
            return true;

        case 'FETCH_POLICY_CONTENT':
            // Fetch privacy policy content (bypasses CSP restrictions)
            fetchPolicyContent(message.url)
                .then(html => {
                    sendResponse({ success: true, html: html });
                })
                .catch(error => {
                    console.error('SimpleTerms: Error fetching policy content:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Keep the message channel open for async response
            
        default:
            console.log('SimpleTerms: Unknown message type:', message.type);
    }
});

// Handle extension icon click (optional - popup handles most interactions)
chrome.action.onClicked.addListener((tab) => {
    console.log('SimpleTerms: Extension icon clicked on tab:', tab.url);
    // The popup will handle the interaction
});

// Cleanup function for when extension is disabled/uninstalled
chrome.runtime.onSuspend.addListener(() => {
    console.log('SimpleTerms: Extension is being suspended');
});

/**
 * Fetch privacy policy content from URL (runs in background context, bypasses CSP)
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} HTML content
 */
async function fetchPolicyContent(url) {
    try {
        console.log('SimpleTerms: Fetching policy content from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        console.log('SimpleTerms: Successfully fetched', html.length, 'characters');
        
        return html;
        
    } catch (error) {
        console.error('SimpleTerms: Fetch error:', error);
        throw new Error(`Failed to fetch policy content: ${error.message}`);
    }
}

console.log('SimpleTerms: Background script loaded successfully');