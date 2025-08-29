// SimpleTerms Popup JavaScript

// Initialize ExtensionPay
const extpay = ExtPay(SimpleTermsConfig.extensionpay.extensionId);

document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.getElementById('analyzeButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const tabsContainer = document.getElementById('tabsContainer');
    const tabButtons = document.getElementById('tabButtons');
    
    // Pro tier elements
    const planBadge = document.getElementById('planBadge');
    const subscriptionActions = document.getElementById('subscriptionActions');
    const upgradeButton = document.getElementById('upgradeButton');
    const loginButton = document.getElementById('loginButton');
    const usageCounter = document.getElementById('usageCounter');
    const usageCount = document.getElementById('usageCount');
    const premiumTeaser = document.getElementById('premiumTeaser');
    const teaserUpgradeButton = document.getElementById('teaserUpgradeButton');
    const proFeatureBadge = document.getElementById('proFeatureBadge');
    
    // Store multiple policy results
    let policyResults = [];
    let currentTabIndex = 0;
    let userSubscriptionInfo = { paid: false, plan: 'Free' };
    let dailyUsageCount = 0;
    
    // Load configuration from config.js
    const config = window.SimpleTermsConfig || {
        features: { dailyAnalysisLimit: 5 },
        cloudFunction: { url: 'https://us-central1-simpleterms-backend.cloudfunctions.net/analyzePrivacyPolicy' }
    };
    
    const DAILY_USAGE_LIMIT = config.features.dailyAnalysisLimit;
    const CLOUD_FUNCTION_URL = config.cloudFunction.url;

    // Initialize the extension on load
    initializeExtension();

    // Security: HTML escape function to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Initialize the extension - check subscription status and setup UI
     */
    async function initializeExtension() {
        try {
            // Load subscription info and daily usage
            await loadUserSubscriptionInfo();
            await loadDailyUsage();
            
            // Update UI based on subscription status
            updateSubscriptionUI();
            updateUsageUI();
            
            // Setup event listeners for payment buttons
            setupPaymentEventListeners();
            
        } catch (error) {
            console.error('Error initializing extension:', error);
            // Default to free tier on error
            updateSubscriptionUI();
        }
    }

    /**
     * Load user subscription information from background script
     */
    async function loadUserSubscriptionInfo() {
        try {
            const user = await extpay.getUser();
            userSubscriptionInfo = {
                paid: user.paid || false,
                installedAt: user.installedAt,
                subscriptionStatus: user.subscriptionStatus || (user.paid ? 'active' : 'free'),
                subscriptionCancelAt: user.subscriptionCancelAt || null,
                trialStartedAt: user.trialStartedAt,
                email: user.email || null,
                plan: user.paid ? 'Pro' : 'Free'
            };
            return userSubscriptionInfo;
        } catch (error) {
            console.error('Error loading user subscription info:', error);
            // Default to free tier on error
            userSubscriptionInfo = { paid: false, plan: 'Free' };
            return userSubscriptionInfo;
        }
    }

    /**
     * Load daily usage count from storage
     */
    async function loadDailyUsage() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['summaryCount', 'lastUsageReset'], (data) => {
                const today = new Date().toDateString();
                const lastReset = data.lastUsageReset;
                
                // Reset count if it's a new day
                if (lastReset !== today) {
                    dailyUsageCount = 0;
                    chrome.storage.local.set({
                        summaryCount: 0,
                        lastUsageReset: today
                    });
                } else {
                    dailyUsageCount = data.summaryCount || 0;
                }
                resolve(dailyUsageCount);
            });
        });
    }

    /**
     * Update subscription UI based on current user status
     */
    function updateSubscriptionUI() {
        if (userSubscriptionInfo.paid) {
            // Pro user
            planBadge.textContent = 'Pro';
            planBadge.className = 'plan-badge pro';
            subscriptionActions.style.display = 'none';
            
            // Hide usage counter for pro users
            usageCounter.style.display = 'none';
            
            // Show pro badge if analyzing with premium features
            proFeatureBadge.style.display = 'block';
        } else {
            // Free user
            planBadge.textContent = 'Free';
            planBadge.className = 'plan-badge free';
            subscriptionActions.style.display = 'flex';
            
            // Show usage counter
            usageCounter.style.display = 'block';
            
            // Hide pro badge
            proFeatureBadge.style.display = 'none';
            
            // Show premium teaser occasionally
            if (Math.random() < 0.3) { // 30% chance
                premiumTeaser.style.display = 'block';
            }
        }
    }

    /**
     * Update usage counter UI
     */
    function updateUsageUI() {
        if (!userSubscriptionInfo.paid) {
            usageCount.textContent = `${dailyUsageCount}/${DAILY_USAGE_LIMIT}`;
            
            // Disable analyze button if limit reached
            if (dailyUsageCount >= DAILY_USAGE_LIMIT) {
                analyzeButton.disabled = true;
                analyzeButton.textContent = 'Daily Limit Reached';
                analyzeButton.style.background = '#bdc3c7';
            }
        }
    }

    /**
     * Setup event listeners for payment-related buttons
     */
    function setupPaymentEventListeners() {
        upgradeButton.addEventListener('click', () => openPaymentPage());
        loginButton.addEventListener('click', () => openLoginPage());
        teaserUpgradeButton.addEventListener('click', () => openPaymentPage());
    }

    /**
     * Open ExtensionPay payment page
     */
    async function openPaymentPage() {
        try {
            await extpay.openPaymentPage();
        } catch (error) {
            console.error('Error opening payment page:', error);
        }
    }

    /**
     * Open ExtensionPay login page for existing subscribers
     */
    async function openLoginPage() {
        try {
            await extpay.openLoginPage();
        } catch (error) {
            console.error('Error opening login page:', error);
        }
    }

    /**
     * Check if user can perform analysis (considering limits)
     */
    function canPerformAnalysis() {
        if (userSubscriptionInfo.paid) {
            return true; // No limits for pro users
        }
        return dailyUsageCount < DAILY_USAGE_LIMIT;
    }

    /**
     * Increment usage count and update storage
     */
    async function incrementUsageCount() {
        if (!userSubscriptionInfo.paid) {
            dailyUsageCount++;
            chrome.storage.local.set({ summaryCount: dailyUsageCount });
            updateUsageUI();
        }
    }

    /**
     * Generate GDPR compliance score and details (Pro feature)
     * @param {string} policyText - The privacy policy text
     * @param {number} privacyScore - Base privacy risk score
     * @returns {Object} GDPR compliance analysis
     */
    function generateGDPRCompliance(policyText, privacyScore) {
        if (!userSubscriptionInfo.paid) {
            return null; // Free users don't get GDPR analysis
        }

        const policyLower = policyText.toLowerCase();
        
        // GDPR compliance checks
        const checks = {
            'Right to Access': checkTextForTerms(policyLower, ['access', 'request data', 'view data', 'data subject access']),
            'Right to Rectification': checkTextForTerms(policyLower, ['correct', 'rectify', 'update', 'modify data']),
            'Right to Erasure': checkTextForTerms(policyLower, ['delete', 'remove', 'erase', 'right to be forgotten']),
            'Data Portability': checkTextForTerms(policyLower, ['export', 'download', 'portability', 'transfer data']),
            'Consent Management': checkTextForTerms(policyLower, ['consent', 'withdraw', 'opt-out', 'unsubscribe']),
            'Data Processing Lawfulness': checkTextForTerms(policyLower, ['lawful basis', 'legitimate interest', 'legal basis']),
            'Privacy by Design': checkTextForTerms(policyLower, ['privacy by design', 'data protection', 'minimal data']),
            'Data Protection Officer': checkTextForTerms(policyLower, ['dpo', 'data protection officer', 'privacy officer'])
        };

        // Calculate overall GDPR score
        const complianceValues = Object.values(checks);
        const compliantCount = complianceValues.filter(c => c === 'compliant').length;
        const partialCount = complianceValues.filter(c => c === 'partial').length;
        
        // Score calculation (excellent, good, fair, poor)
        const totalChecks = complianceValues.length;
        const score = (compliantCount * 2 + partialCount) / (totalChecks * 2);
        
        let rating, scoreClass;
        if (score >= 0.8) {
            rating = 'Excellent';
            scoreClass = 'excellent';
        } else if (score >= 0.6) {
            rating = 'Good';
            scoreClass = 'good';
        } else if (score >= 0.4) {
            rating = 'Fair';
            scoreClass = 'fair';
        } else {
            rating = 'Poor';
            scoreClass = 'poor';
        }

        return {
            overallRating: rating,
            scoreClass: scoreClass,
            score: Math.round(score * 100),
            checks: checks,
            summary: `${compliantCount} compliant, ${partialCount} partial, ${totalChecks - compliantCount - partialCount} non-compliant`
        };
    }

    /**
     * Check text for compliance terms and return status
     * @param {string} text - Text to check
     * @param {Array} terms - Terms to look for
     * @returns {string} 'compliant', 'partial', or 'non-compliant'
     */
    function checkTextForTerms(text, terms) {
        const foundTerms = terms.filter(term => text.includes(term));
        
        if (foundTerms.length >= 2) {
            return 'compliant';
        } else if (foundTerms.length === 1) {
            return 'partial';
        } else {
            return 'non-compliant';
        }
    }

    /**
     * Perform analysis with GDPR compliance (Pro feature)
     * @param {string} policyText - The privacy policy text
     * @returns {Promise<Object>} Analysis result with optional GDPR data
     */
    async function analyzeWithGDPR(policyText) {
        const analysisResult = await analyzeWithCloudFunction(policyText);
        
        // Add GDPR compliance for Pro users
        if (userSubscriptionInfo.paid) {
            analysisResult.gdprCompliance = generateGDPRCompliance(policyText, analysisResult.score);
        } else {
            analysisResult.gdprCompliance = null; // Show locked section for free users
        }
        
        return analysisResult;
    }

    /**
     * Generate HTML for GDPR compliance section
     * @param {Object} gdprData - GDPR compliance data
     * @returns {string} HTML string
     */
    function generateGDPRHTML(gdprData) {
        if (!gdprData) {
            // Show locked GDPR section for free users
            return `
                <div class="gdpr-compliance gdpr-locked">
                    <div class="gdpr-title">
                        🛡️ GDPR Compliance Analysis
                    </div>
                    <div class="gdpr-score">
                        Pro Feature
                    </div>
                    <div style="font-size: 12px; color: #666; margin-top: 8px;">
                        Upgrade to Pro to see detailed GDPR compliance analysis
                    </div>
                </div>
            `;
        }

        // Generate details list
        const detailsHTML = Object.entries(gdprData.checks)
            .map(([check, status]) => `
                <li>
                    <span class="compliance-item">${check}</span>
                    <span class="compliance-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                </li>
            `).join('');

        return `
            <div class="gdpr-compliance">
                <div class="gdpr-title">
                    🛡️ GDPR Compliance Analysis
                </div>
                <div class="gdpr-score ${gdprData.scoreClass}">
                    ${gdprData.score}% ${gdprData.overallRating}
                </div>
                <ul class="gdpr-details">
                    ${detailsHTML}
                </ul>
                <div style="font-size: 11px; color: #666; margin-top: 8px; text-align: center;">
                    ${gdprData.summary}
                </div>
            </div>
        `;
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

            // Check usage limits for free users
            if (!canPerformAnalysis()) {
                showError(`Daily limit reached (${DAILY_USAGE_LIMIT} analyses). Upgrade to Pro for unlimited analyses!`);
                premiumTeaser.style.display = 'block';
                return;
            }
            
            // Disable button and show loading state
            analyzeButton.disabled = true;
            analyzeButton.textContent = 'Analyzing...';
            showLoading();

            // Increment usage count for free users
            await incrementUsageCount();

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
            
            let html, policyText;
            
            let shouldTryTabExtraction = false;
            
            try {
                // Fetch the raw HTML content
                html = await fetchPolicyContent(policy.url);
                console.log(`Tab ${tabIndex} - Fetched HTML:`, html.length, 'characters');

                // Extract text content
                policyText = extractTextFromHTML(html);
                console.log(`Tab ${tabIndex} - Extracted text:`, policyText.length, 'characters');
                
                // If content is too short, try tab extraction
                if (!policyText || policyText.length < 100) {
                    shouldTryTabExtraction = true;
                }
                
            } catch (fetchError) {
                console.log(`Tab ${tabIndex} - Fetch failed:`, fetchError.message);
                // If fetch failed, try tab extraction as fallback
                shouldTryTabExtraction = true;
            }

            // Universal fallback: if regular fetch failed OR content too short, try tab extraction
            if (shouldTryTabExtraction) {
                console.log(`Tab ${tabIndex} - Trying tab extraction as fallback...`);
                
                try {
                    const dynamicContent = await tryAdvancedExtraction(policy.url);
                    if (dynamicContent && dynamicContent.length > 100) {
                        console.log(`Tab ${tabIndex} - Tab extraction successful:`, dynamicContent.length, 'characters');
                        const analysisResult = await analyzeWithCloudFunction(dynamicContent);
                        
                        // Add GDPR compliance for Pro users only
                        if (userSubscriptionInfo.paid) {
                            analysisResult.gdprCompliance = generateGDPRCompliance(dynamicContent, analysisResult.score);
                            displayResultsInTab(analysisResult.score, analysisResult.summary, policy.url, tabIndex, policy.text, analysisResult.gdprCompliance);
                        } else {
                            displayResultsInTab(analysisResult.score, analysisResult.summary, policy.url, tabIndex, policy.text);
                        }
                        return;
                    } else {
                        throw new Error('Tab extraction also failed to get sufficient content');
                    }
                } catch (tabError) {
                    console.log(`Tab ${tabIndex} - Tab extraction failed:`, tabError.message);
                    throw new Error('Privacy policy content could not be extracted. This may be a complex dynamic site or require authentication.');
                }
            }

            // Analyze with AI
            const analysisResult = await analyzeWithGDPR(policyText);
            
            // Display results in the specific tab
            displayResultsInTab(analysisResult.score, analysisResult.summary, policy.url, tabIndex, policy.text, analysisResult.gdprCompliance);
            
        } catch (error) {
            console.error(`Error analyzing policy for tab ${tabIndex}:`, error);
            displayErrorInTab(error.message || 'Failed to analyze this privacy policy', tabIndex);
        }
    }

    function displayResultsInTab(score, summary, policyUrl, tabIndex, policyText, gdprCompliance = null) {
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
        const gdprHtml = generateGDPRHTML(gdprCompliance);

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
            ${gdprHtml}
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
        policyResults[tabIndex] = { score, summary, policyUrl, policyText, gdprCompliance };
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
            const analysisResult = await analyzeWithGDPR(message.content);

            // Display results with indication this was current page analysis
            displayCurrentPageResults(analysisResult.score, analysisResult.summary, message.url, message.confidence, analysisResult.gdprCompliance);
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
                // Universal fallback: try tab extraction for any site with insufficient content
                console.log('Content too short, attempting tab extraction...');
                showLoading('Trying advanced content extraction...');
                
                try {
                    const dynamicContent = await tryAdvancedExtraction(policyUrl);
                    if (dynamicContent && dynamicContent.length > 100) {
                        console.log('Tab extraction successful:', dynamicContent.length, 'characters');
                        showLoading('Analyzing privacy policy with AI...');
                        
                        const analysisResult = await analyzeWithCloudFunction(dynamicContent);
                        
                        // Add GDPR compliance for Pro users only
                        if (userSubscriptionInfo.paid) {
                            analysisResult.gdprCompliance = generateGDPRCompliance(dynamicContent, analysisResult.score);
                            displayResults(analysisResult.score, analysisResult.summary, policyUrl, analysisResult.gdprCompliance);
                        } else {
                            displayResults(analysisResult.score, analysisResult.summary, policyUrl);
                        }
                        resetButton();
                        return;
                    }
                } catch (tabError) {
                    console.log('Tab extraction failed:', tabError.message);
                }
                
                throw new Error('Privacy policy content could not be extracted. This may be a complex dynamic site or require authentication.');
            }

            // Step 3: Show loading spinner for AI analysis
            showLoading('Analyzing privacy policy with AI...');

            // Step 4: Send to Google Cloud Function for AI analysis
            const analysisResult = await analyzeWithGDPR(policyText);

            // Step 5: Display the results
            displayResults(analysisResult.score, analysisResult.summary, policyUrl, analysisResult.gdprCompliance);
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
                
                console.log(`Attempt ${attempt} result:`, {
                    contentExists: !!content,
                    contentLength: content?.length || 0,
                    contentPreview: content?.substring(0, 100) + '...'
                });
                
                if (content && content.length > 100) {
                    console.log(`✅ Extraction successful on attempt ${attempt}, content length:`, content.length);
                    return content;
                }
                
                console.log(`❌ Attempt ${attempt} failed: content too short (${content?.length || 0} chars)`);
                
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
                policyText: policyText,
                includePremiumFeatures: userSubscriptionInfo.paid
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

    function displayResults(score, summary, policyUrl, gdprCompliance = null) {
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
        const gdprHtml = generateGDPRHTML(gdprCompliance);

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
            ${gdprHtml}
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
        
        // Reset button after successful analysis
        resetButton();
    }

    function displayCurrentPageResults(score, summary, policyUrl, confidence, gdprCompliance) {
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
        const gdprHtml = generateGDPRHTML(gdprCompliance);

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
            ${gdprHtml}
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
        
        // Reset button after successful analysis
        resetButton();
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