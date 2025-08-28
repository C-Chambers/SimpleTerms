// SimpleTerms Background Script (Service Worker)
// Handles background tasks and extension lifecycle events

// Import logger utility
importScripts('logger.js');
const logger = new SimpleTermsLogger('Background');

chrome.runtime.onInstalled.addListener((details) => {
    logger.info('Extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        // Initialize storage with default values
        chrome.storage.local.set({
            summaryCount: 0,
            installDate: Date.now(),
            version: chrome.runtime.getManifest().version
        });
        
        logger.info('Extension installed successfully');
    } else if (details.reason === 'update') {
        logger.info('Extension updated to version', chrome.runtime.getManifest().version);
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    logger.debug('Extension started');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.debug('Background received message:', message.type);
    
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
                    logger.error('Error fetching policy content:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Keep the message channel open for async response

        case 'ANALYZE_WITH_CLOUD_FUNCTION':
            // Analyze policy text with Cloud Function (bypasses CSP restrictions)
            analyzeWithCloudFunction(message.policyText)
                .then(result => {
                    sendResponse({ success: true, result: result });
                })
                .catch(error => {
                    logger.error('Error analyzing with Cloud Function:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true; // Keep the message channel open for async response
            
        default:
            logger.warn('Unknown message type:', message.type);
    }
});

// Handle extension icon click (optional - popup handles most interactions)
chrome.action.onClicked.addListener((tab) => {
    logger.debug('Extension icon clicked on tab:', tab.url);
    // The popup will handle the interaction
});

// Cleanup function for when extension is disabled/uninstalled
chrome.runtime.onSuspend.addListener(() => {
    logger.debug('Extension is being suspended');
});

/**
 * Fetch with retry logic
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Add exponential backoff for retries
            if (attempt > 0) {
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                logger.debug(`Retry attempt ${attempt} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            const response = await fetch(url, options);
            
            // If successful or client error (4xx), don't retry
            if (response.ok || (response.status >= 400 && response.status < 500)) {
                return response;
            }
            
            // Server error (5xx), retry
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
            
        } catch (error) {
            lastError = error;
            // Network errors, retry
            if (attempt === maxRetries) {
                break;
            }
        }
    }
    
    throw lastError;
}

/**
 * Fetch privacy policy content from URL (runs in background context, bypasses CSP)
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} HTML content
 */
async function fetchPolicyContent(url) {
    try {
        // Check if offline
        if (!navigator.onLine) {
            throw new Error('No internet connection. Please check your network and try again.');
        }
        
        logger.debug('Fetching policy content from:', url);
        
        const response = await fetchWithRetry(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        logger.debug('Successfully fetched', html.length, 'characters');
        
        return html;
        
    } catch (error) {
        logger.error('Fetch error:', error);
        throw new Error(`Failed to fetch policy content: ${error.message}`);
    }
}

/**
 * Analyze privacy policy text using Google Cloud Function (runs in background context, bypasses CSP)
 * @param {string} policyText - The privacy policy text to analyze
 * @returns {Promise<Object>} Analysis result with score and summary
 */
async function analyzeWithCloudFunction(policyText) {
    try {
        // Check if offline
        if (!navigator.onLine) {
            throw new Error('No internet connection. SimpleTerms requires an internet connection to analyze privacy policies.');
        }
        
        logger.debug('Sending request to Cloud Function...');
        
        const response = await fetchWithRetry('https://us-central1-simpleterms-backend.cloudfunctions.net/analyzePrivacyPolicy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': `chrome-extension://${chrome.runtime.id}`  // Dynamic extension origin for CORS
            },
            body: JSON.stringify({
                policyText: policyText
            })
        }, 2); // Max 2 retries for Cloud Function

        // Check if request was successful
        if (!response.ok) {
            const errorText = await response.text();
            logger.error('Cloud Function error response:', errorText);
            throw new Error(`Cloud Function request failed: ${response.status} ${response.statusText}`);
        }

        // Parse JSON response
        const result = await response.json();
        logger.debug('Cloud Function response received');

        // Validate response structure
        if (!result.success || !result.data) {
            throw new Error('Invalid response format from Cloud Function');
        }

        const { summary, score } = result.data;

        // Validate analysis data
        if (!summary || typeof score !== 'number') {
            throw new Error('Invalid analysis data from Cloud Function');
        }

        // Convert markdown summary to array format for display
        const summaryArray = summary.split('\n')
            .filter(line => {
                const trimmed = line.trim();
                return trimmed.startsWith('•') || 
                       trimmed.startsWith('-') || 
                       trimmed.startsWith('*') || 
                       /^\d+\./.test(trimmed); // Also handle numbered lists
            })
            .map(line => line.replace(/^[•\-\*]?\s*\d*\.?\s*/, '').trim())
            .filter(line => line.length > 0);

        return {
            score: Math.min(10, Math.max(1, score)), // Ensure score is between 1-10
            summary: summaryArray.length > 0 ? summaryArray : [
                'Analysis completed but formatting issue detected',
                'Raw response: ' + summary.substring(0, 200) + (summary.length > 200 ? '...' : '')
            ]
        };

    } catch (error) {
        logger.error('Error calling Cloud Function:', error);
        
        // Re-throw with more specific error message
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            // Check if offline
            if (!navigator.onLine) {
                throw new Error('You are offline. Please connect to the internet and try again.');
            }
            throw new Error('Network error: Unable to connect to analysis service. Please check your connection.');
        } else if (error.message.includes('CORS')) {
            throw new Error('Cloud Function CORS error: Extension not authorized');
        } else {
            throw new Error('Cloud Function error: ' + error.message);
        }
    }
}

console.log('SimpleTerms: Background script loaded successfully');