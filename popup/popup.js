// SimpleTerms Popup JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.getElementById('analyzeButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const tabsContainer = document.getElementById('tabsContainer');
    const tabButtons = document.getElementById('tabButtons');
    
    // Store multiple policy results
    let policyResults = [];
    let currentTabIndex = 0;
    
    // Configuration for Cloud Function endpoint
    const CLOUD_FUNCTION_URL = 'https://us-central1-simpleterms-backend.cloudfunctions.net/analyzePrivacyPolicy';

    // Security: HTML escape function to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Format URL for display - show hostname + path, truncate if too long
    function formatUrlForDisplay(url) {
        try {
            const urlObj = new URL(url);
            let displayUrl = urlObj.hostname + urlObj.pathname;
            
            // Remove trailing slash
            if (displayUrl.endsWith('/')) {
                displayUrl = displayUrl.slice(0, -1);
            }
            
            // Truncate if too long (keep it readable in the UI)
            if (displayUrl.length > 40) {
                displayUrl = displayUrl.substring(0, 37) + '...';
            }
            
            return displayUrl;
        } catch (error) {
            // Fallback to just hostname if URL parsing fails
            return url.includes('://') ? url.split('://')[1].split('/')[0] : url;
        }
    }

    /**
     * Fetch policy content using background script to bypass CSP restrictions
     * @param {string} policyUrl - URL of the privacy policy to fetch
     * @returns {Promise<string>} HTML content of the policy page
     */
    async function fetchPolicyContent(policyUrl) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'FETCH_POLICY_CONTENT',
                url: policyUrl
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response.success) {
                    resolve(response.html);
                } else {
                    reject(new Error(response.error || 'Failed to fetch policy content'));
                }
            });
        });
    }

    // Add event listener to the analyze button
    analyzeButton.addEventListener('click', async function() {
        try {
            // Check if offline
            if (!navigator.onLine) {
                showError('You are offline. Please connect to the internet and try again.');
                return;
            }
            
            // Disable button and show loading state
            analyzeButton.disabled = true;
            analyzeButton.textContent = 'Analyzing...';
            showLoading();

            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Inject content script but with a flag to prevent auto-execution
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // Set a flag to indicate this is a manual trigger
                    window.simpleTermsManualTrigger = true;
                }
            });

            // Now inject the content script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['scripts/content.js']
            });

        } catch (error) {
            // Check if offline
            if (!navigator.onLine) {
                showError('No internet connection. Please check your network and try again.');
            } else {
                showError('Failed to analyze the page. Please try again.');
            }
            resetButton();
        }
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'POLICY_URL_FOUND') {
            handlePolicyFound(message.url);
        } else if (message.type === 'POLICY_URLS_FOUND') {
            handleMultiplePoliciesFound(message.policies);
        } else if (message.type === 'CURRENT_PAGE_IS_POLICY') {
            handleCurrentPageAnalysis(message);
        } else if (message.type === 'NO_POLICY_FOUND') {
            handleNoPolicyFound();
        } else if (message.type === 'ERROR') {
            showError(message.error);
            resetButton();
        }
    });

    function showLoading(message = 'Analyzing...') {
        resultsContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <div style="margin-top: 10px; color: #6c757d; font-size: 14px;">
                    ${message}
                </div>
            </div>
        `;
    }

    function showError(message) {
        resultsContainer.innerHTML = `
            <div class="error-message">
                <strong>Error:</strong> ${message}
            </div>
        `;
    }

    function handleNoPolicyFound() {
        resultsContainer.innerHTML = `
            <div class="no-policy-message">
                <strong>No Privacy Policy Found</strong><br>
                This page doesn't appear to have a privacy policy link.
            </div>
        `;
        resetButton();
    }

    async function handleMultiplePoliciesFound(policies) {
        try {
            console.log('Multiple privacy policies found:', policies.length);
            
            // Reset state
            policyResults = [];
            currentTabIndex = 0;
            tabButtons.innerHTML = '';
            resultsContainer.innerHTML = '';
            
            // Show tabs if more than one policy
            if (policies.length > 1) {
                tabsContainer.style.display = 'block';
                
                // Process each policy
                for (let i = 0; i < policies.length; i++) {
                    const policy = policies[i];
                    
                    // Create tab button
                    const tabButton = document.createElement('button');
                    tabButton.className = 'tab-button' + (i === 0 ? ' active' : '');
                    tabButton.textContent = policy.text || `Policy ${i + 1}`;
                    tabButton.title = policy.text || `Policy ${i + 1}`;
                    tabButton.dataset.index = i;
                    tabButton.addEventListener('click', () => switchTab(i));
                    tabButtons.appendChild(tabButton);
                    
                    // Create result container for this policy
                    const resultDiv = document.createElement('div');
                    resultDiv.className = 'tab-content' + (i === 0 ? ' active' : '');
                    resultDiv.id = `tab-content-${i}`;
                    resultDiv.innerHTML = `
                        <div class="loading">
                            <div class="spinner"></div>
                            <div style="margin-top: 10px; color: #6c757d; font-size: 14px;">
                                Analyzing ${policy.text || 'privacy policy'}...
                            </div>
                        </div>
                    `;
                    resultsContainer.appendChild(resultDiv);
                    
                    // Analyze this policy
                    analyzePolicyForTab(policy, i);
                }
            } else {
                // Single policy - use existing flow
                tabsContainer.style.display = 'none';
                handlePolicyFound(policies[0].url);
            }
        } catch (error) {
            console.error('Error handling multiple policies:', error);
            showError('Failed to analyze privacy policies');
            resetButton();
        }
    }

    function switchTab(index) {
        currentTabIndex = index;
        
        // Update tab buttons
        const buttons = tabButtons.querySelectorAll('.tab-button');
        buttons.forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });
        
        // Update content visibility
        const contents = resultsContainer.querySelectorAll('.tab-content');
        contents.forEach((content, i) => {
            content.classList.toggle('active', i === index);
        });
    }

    async function analyzePolicyForTab(policy, tabIndex) {
        try {
            console.log(`Analyzing policy for tab ${tabIndex}:`, policy.url);
            
            // Fetch the raw HTML content
            const html = await fetchPolicyContent(policy.url);
            console.log(`Tab ${tabIndex} - Fetched HTML:`, html.length, 'characters');

            // Extract text content
            const policyText = extractTextFromHTML(html);
            console.log(`Tab ${tabIndex} - Extracted text:`, policyText.length, 'characters');

            if (!policyText || policyText.length < 100) {
                // Try advanced extraction for dynamic sites
                if (policy.url.includes('facebook.com') || policy.url.includes('instagram.com') || 
                    policy.url.includes('twitter.com') || policy.url.includes('linkedin.com') ||
                    policy.url.includes('tiktok.com') || policy.url.includes('snapchat.com') ||
                    policy.url.includes('notion.so') || policy.url.includes('epicgames.com')) {
                    
                    console.log(`Tab ${tabIndex} - Detected dynamic content site, attempting advanced extraction...`);
                    
                    const dynamicContent = await tryAdvancedExtraction(policy.url);
                    if (dynamicContent && dynamicContent.length > 100) {
                        console.log(`Tab ${tabIndex} - Advanced extraction successful:`, dynamicContent.length, 'characters');
                        const analysisResult = await analyzeWithCloudFunction(dynamicContent);
                        displayResultsInTab(analysisResult.score, analysisResult.summary, policy.url, tabIndex, policy.text);
                        return;
                    }
                }
                throw new Error('Privacy policy content appears to be too short or empty');
            }

            // Analyze with AI
            const analysisResult = await analyzeWithCloudFunction(policyText);
            
            // Display results in the specific tab
            displayResultsInTab(analysisResult.score, analysisResult.summary, policy.url, tabIndex, policy.text);
            
        } catch (error) {
            console.error(`Error analyzing policy for tab ${tabIndex}:`, error);
            displayErrorInTab(error.message || 'Failed to analyze this privacy policy', tabIndex);
        }
    }

    function displayResultsInTab(score, summary, policyUrl, tabIndex, policyText) {
        const tabContent = document.getElementById(`tab-content-${tabIndex}`);
        if (!tabContent) return;
        
        let scoreClass = 'score-low';
        let scoreDescription = 'Low Risk';
        
        if (score >= 4 && score <= 6) {
            scoreClass = 'score-medium';
            scoreDescription = 'Medium Risk';
        } else if (score >= 7) {
            scoreClass = 'score-high';
            scoreDescription = 'High Risk';
        }

        const summaryHtml = summary.map(point => `<li>${escapeHtml(point)}</li>`).join('');

        tabContent.innerHTML = `
            <div class="document-title">
                <div style="font-size: 14px; font-weight: 600; color: #495057; text-align: center; margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #667eea;">
                    📄 ${escapeHtml(policyText || 'Privacy Policy')}
                </div>
            </div>
            <div class="score-container">
                <div class="score-label">Privacy Risk Score</div>
                <div class="score-value ${scoreClass}">${score}/10</div>
                <div class="score-description ${scoreClass}">${scoreDescription}</div>
            </div>
            <div class="summary-container">
                <div class="summary-title">Key Points:</div>
                <ul class="summary-list">
                    ${summaryHtml}
                </ul>
            </div>
            <div style="margin-top: 10px; font-size: 12px; color: #6c757d; text-align: center;">
                Analyzed: <a href="${escapeHtml(policyUrl)}" target="_blank" rel="noopener noreferrer" style="color: #667eea;" title="${escapeHtml(policyUrl)}">${escapeHtml(formatUrlForDisplay(policyUrl))}</a>
            </div>
        `;
        
        // Store result
        policyResults[tabIndex] = { score, summary, policyUrl, policyText };
    }

    function displayErrorInTab(errorMessage, tabIndex) {
        const tabContent = document.getElementById(`tab-content-${tabIndex}`);
        if (!tabContent) return;
        
        tabContent.innerHTML = `
            <div class="error-message">
                <strong>Error:</strong> ${errorMessage}
            </div>
        `;
    }

    async function handleCurrentPageAnalysis(message) {
        try {
            console.log('Analyzing current page as privacy policy:', message.url);
            console.log('Detection confidence:', message.confidence);
            
            // Show loading with specific message for current page analysis
            showLoading('Analyzing current page privacy policy...');

            // Validate the extracted content
            if (!message.content || message.content.length < 100) {
                throw new Error('Current page content appears to be too short or empty for analysis');
            }

            console.log('Current page content length:', message.content.length, 'characters');

            // Send the current page content directly to AI analysis
            const analysisResult = await analyzeWithCloudFunction(message.content);

            // Display results with indication this was current page analysis
            displayCurrentPageResults(analysisResult.score, analysisResult.summary, message.url, message.confidence);
            resetButton();

        } catch (error) {
            console.error('Error analyzing current page:', error);
            
            // Provide specific error messages
            if (error.message.includes('too short or empty')) {
                showError('The current page content appears to be too short for meaningful analysis.');
            } else if (error.message.includes('Cloud Function')) {
                showError('AI analysis service is temporarily unavailable. Please try again later.');
            } else {
                showError('An error occurred while analyzing the current page content.');
            }
            resetButton();
        }
    }

    async function handlePolicyFound(policyUrl) {
        try {
            console.log('Analyzing privacy policy:', policyUrl);
            
            // Hide tabs for single policy
            tabsContainer.style.display = 'none';
            
            // Show loading spinner while processing
            showLoading('Fetching privacy policy...');

            // Step 1: Fetch the raw HTML content from the policy URL using background script
            // This bypasses CSP restrictions that might block fetch in popup context
            const html = await fetchPolicyContent(policyUrl);
            console.log('Fetched HTML content:', html.length, 'characters');

            // Step 2: Extract human-readable text content
            const policyText = extractTextFromHTML(html);
            console.log('Extracted text content:', policyText.length, 'characters');

            if (!policyText || policyText.length < 100) {
                // For dynamic content sites, try advanced extraction
                if (policyUrl.includes('facebook.com') || policyUrl.includes('instagram.com') || 
                    policyUrl.includes('twitter.com') || policyUrl.includes('linkedin.com') ||
                    policyUrl.includes('tiktok.com') || policyUrl.includes('snapchat.com') ||
                    policyUrl.includes('notion.so')) {
                    
                    console.log('Detected dynamic content site, attempting advanced extraction...');
                    showLoading('Trying advanced content extraction...');
                    
                    const dynamicContent = await tryAdvancedExtraction(policyUrl);
                    if (dynamicContent && dynamicContent.length > 100) {
                        console.log('Advanced extraction successful:', dynamicContent.length, 'characters');
                        showLoading('Analyzing privacy policy with AI...');
                        const analysisResult = await analyzeWithCloudFunction(dynamicContent);
                        displayResults(analysisResult.score, analysisResult.summary, policyUrl);
                        resetButton();
                        return;
                    }
                    
                    throw new Error('Dynamic content detected: This site loads content with JavaScript. Navigate to the privacy policy page first, then click the extension button on that page.');
                }
                throw new Error('Privacy policy content appears to be too short or empty');
            }

            // Step 3: Show loading spinner for AI analysis
            showLoading('Analyzing privacy policy with AI...');

            // Step 4: Send to Google Cloud Function for AI analysis
            const analysisResult = await analyzeWithCloudFunction(policyText);

            // Step 5: Display the results
            displayResults(analysisResult.score, analysisResult.summary, policyUrl);
            resetButton();

        } catch (error) {
            console.error('Error in handlePolicyFound:', error);
            
            // Provide specific error messages based on error type
            if (error.message.includes('Failed to fetch policy')) {
                showError('Could not access the privacy policy. The page may require authentication or have CORS restrictions.');
            } else if (error.message.includes('too short or empty')) {
                showError('The privacy policy content appears to be empty or too short to analyze. The page may use dynamic loading or require authentication.');
            } else if (error.message.includes('Dynamic content detected')) {
                showError(error.message); // Use the specific dynamic content message
            } else if (error.message.includes('Cloud Function')) {
                showError('AI analysis service is temporarily unavailable. Please try again later.');
            } else {
                showError('An unexpected error occurred while analyzing the privacy policy.');
            }
            resetButton();
        }
    }

    function extractTextFromHTML(html) {
        try {
            // Create a temporary DOM element to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // Remove unwanted elements that don't contain policy content
            const unwantedElements = tempDiv.querySelectorAll(
                'script, style, nav, header, footer, aside, .menu, .navigation, .sidebar, .ads, .advertisement'
            );
            unwantedElements.forEach(el => el.remove());

            // Get text content and clean it up
            let text = tempDiv.textContent || tempDiv.innerText || '';
            
            // Clean up whitespace and normalize text
            text = text
                .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
                .replace(/\n\s*\n/g, '\n')  // Remove empty lines
                .trim();
            
            // Remove common navigation/footer text patterns
            text = text.replace(/\b(home|about|contact|sitemap|terms|privacy|cookie|legal)\s*\|/gi, '');
            
            return text;
        } catch (error) {
            console.error('Error extracting text from HTML:', error);
            return '';
        }
    }

    /**
     * Try advanced content extraction for dynamic sites by opening in new tab with retry logic
     * @param {string} policyUrl - URL of the privacy policy
     * @returns {Promise<string>} Extracted content or null if failed
     */
    async function tryAdvancedExtraction(policyUrl) {
        const maxRetries = 3;
        const initialWaitTime = 2000; // 2 seconds for fast connections
        const retryDelay = 2000; // 2 seconds between retries
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`Advanced extraction attempt ${attempt}/${maxRetries} for:`, policyUrl);
            
            try {
                const content = await attemptExtraction(policyUrl, initialWaitTime);
                
                if (content && content.length > 100) {
                    console.log(`Extraction successful on attempt ${attempt}, content length:`, content.length);
                    return content;
                }
                
                console.log(`Attempt ${attempt} failed: content too short (${content?.length || 0} chars)`);
                
                // If not the last attempt, wait before retrying
                if (attempt < maxRetries) {
                    console.log(`Waiting ${retryDelay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
                
            } catch (error) {
                console.error(`Extraction attempt ${attempt} error:`, error);
                
                // If not the last attempt, wait before retrying
                if (attempt < maxRetries) {
                    console.log(`Waiting ${retryDelay}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }
        
        console.log('All extraction attempts failed');
        return null;
    }

    /**
     * Single extraction attempt
     * @param {string} policyUrl - URL of the privacy policy
     * @param {number} waitTime - Time to wait for content to load
     * @returns {Promise<string>} Extracted content or null if failed
     */
    async function attemptExtraction(policyUrl, waitTime) {
        return new Promise((resolve, reject) => {
            // Create background tab for extraction
            chrome.tabs.create({ 
                url: policyUrl + (policyUrl.includes('?') ? '&' : '?') + 'simpleTermsExtraction=true',
                active: false  // Opens in background
            }, async (tab) => {
                if (!tab || !tab.id) {
                    reject(new Error('Failed to create extraction tab'));
                    return;
                }
                
                console.log(`Created extraction tab: ${tab.id}, waiting ${waitTime}ms...`);
                
                // Wait for page to load, then extract content
                setTimeout(async () => {
                    try {
                        console.log('Extracting content from tab:', tab.id);
                        
                        // Inject content script to extract page content
                        const results = await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: () => {
                                // Remove unwanted elements
                                const unwantedSelectors = [
                                    'script', 'style', 'nav', 'header', 'footer', 'aside',
                                    '.menu', '.navigation', '.sidebar', '.ads', '.advertisement',
                                    '.social-share', '.comments', '.related-articles'
                                ];
                                
                                unwantedSelectors.forEach(selector => {
                                    document.querySelectorAll(selector).forEach(el => el.remove());
                                });
                                
                                // Extract main content
                                const mainContent = document.querySelector('main') || 
                                                   document.querySelector('[role="main"]') || 
                                                   document.querySelector('.content') ||
                                                   document.querySelector('#content') ||
                                                   document.body;
                                
                                let text = mainContent ? mainContent.textContent : document.body.textContent;
                                
                                // Clean up the text
                                text = text
                                    .replace(/\s+/g, ' ')
                                    .replace(/\n\s*\n/g, '\n')
                                    .trim();
                                
                                return text;
                            }
                        });
                        
                        // Close the tab
                        chrome.tabs.remove(tab.id);
                        
                        // Return the extracted content
                        const extractedText = results[0]?.result || null;
                        console.log('Extraction result length:', extractedText?.length || 0);
                        resolve(extractedText);
                        
                    } catch (error) {
                        console.error('Error in content extraction:', error);
                        chrome.tabs.remove(tab.id).catch(() => {});
                        reject(error);
                    }
                }, waitTime);
            });
        });
    }

    /**
     * Analyze privacy policy text using the Google Cloud Function via background script
     * @param {string} policyText - The extracted privacy policy text
     * @returns {Promise<Object>} Analysis result with score and summary
     */
    async function analyzeWithCloudFunction(policyText) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'ANALYZE_WITH_CLOUD_FUNCTION',
                policyText: policyText
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (response.success) {
                    resolve(response.result);
                } else {
                    reject(new Error(response.error || 'Failed to analyze with Cloud Function'));
                }
            });
        });
    }

    function displayResults(score, summary, policyUrl) {
        let scoreClass = 'score-low';
        let scoreDescription = 'Low Risk';
        
        if (score >= 4 && score <= 6) {
            scoreClass = 'score-medium';
            scoreDescription = 'Medium Risk';
        } else if (score >= 7) {
            scoreClass = 'score-high';
            scoreDescription = 'High Risk';
        }

        const summaryHtml = summary.map(point => `<li>${escapeHtml(point)}</li>`).join('');

        resultsContainer.innerHTML = `
            <div class="document-title">
                <div style="font-size: 14px; font-weight: 600; color: #495057; text-align: center; margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #667eea;">
                    📄 Privacy Policy
                </div>
            </div>
            <div class="score-container">
                <div class="score-label">Privacy Risk Score</div>
                <div class="score-value ${scoreClass}">${score}/10</div>
                <div class="score-description ${scoreClass}">${scoreDescription}</div>
            </div>
            <div class="summary-container">
                <div class="summary-title">Key Points:</div>
                <ul class="summary-list">
                    ${summaryHtml}
                </ul>
            </div>
            <div style="margin-top: 10px; font-size: 12px; color: #6c757d; text-align: center;">
                Analyzed: <a href="${escapeHtml(policyUrl)}" target="_blank" rel="noopener noreferrer" style="color: #667eea;" title="${escapeHtml(policyUrl)}">${escapeHtml(formatUrlForDisplay(policyUrl))}</a>
            </div>
        `;
    }

    function displayCurrentPageResults(score, summary, policyUrl, confidence) {
        let scoreClass = 'score-low';
        let scoreDescription = 'Low Risk';
        
        if (score >= 4 && score <= 6) {
            scoreClass = 'score-medium';
            scoreDescription = 'Medium Risk';
        } else if (score >= 7) {
            scoreClass = 'score-high';
            scoreDescription = 'High Risk';
        }

        const summaryHtml = summary.map(point => `<li>${escapeHtml(point)}</li>`).join('');

        // Add a visual indicator that this was analyzed from the current page
        const currentPageBadge = `
            <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; padding: 8px; margin-bottom: 15px; text-align: center;">
                <span style="color: #1976d2; font-weight: 500; font-size: 12px;">
                    📄 Current Page Analysis
                </span>
                <div style="color: #666; font-size: 11px; margin-top: 2px;">
                    Detection confidence: ${confidence}%
                </div>
            </div>
        `;

        resultsContainer.innerHTML = `
            ${currentPageBadge}
            <div class="score-container">
                <div class="score-label">Privacy Risk Score</div>
                <div class="score-value ${scoreClass}">${score}/10</div>
                <div class="score-description ${scoreClass}">${scoreDescription}</div>
            </div>
            <div class="summary-container">
                <div class="summary-title">Key Points:</div>
                <ul class="summary-list">
                    ${summaryHtml}
                </ul>
            </div>
            <div style="margin-top: 10px; font-size: 12px; color: #6c757d; text-align: center;">
                Current Page: <a href="${escapeHtml(policyUrl)}" target="_blank" rel="noopener noreferrer" style="color: #667eea;" title="${escapeHtml(policyUrl)}">${escapeHtml(formatUrlForDisplay(policyUrl))}</a>
            </div>
        `;
    }

    function resetButton() {
        analyzeButton.disabled = false;
        analyzeButton.innerHTML = '<span class="btn-icon">🔍</span>Analyze Policy';
        // Reset tab state
        policyResults = [];
        currentTabIndex = 0;
        tabsContainer.style.display = 'none';
        tabButtons.innerHTML = '';
    }
});