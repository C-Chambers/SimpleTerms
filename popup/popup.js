// SimpleTerms Popup JavaScript

// Initialize ExtensionPay
const extpay = ExtPay(SimpleTermsConfig.extensionpay.extensionId);

document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.getElementById('analyzeButton');
    const resultsContainer = document.getElementById('resultsContainer');
    const tabsContainer = document.getElementById('tabsContainer');
    const tabButtons = document.getElementById('tabButtons');
    
    // Analysis type selector elements
    const analysisTypeContainer = document.getElementById('analysisTypeContainer');
    const analysisTypeSelect = document.getElementById('analysisTypeSelect');
    
    // Theme toggle elements
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleSwitch = themeToggle.querySelector('.theme-toggle-switch');
    
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
    let currentTheme = 'light'; // Default theme
    
    // Unified analysis interface state
    let currentAnalysisType = 'standard';
    let currentPolicyData = null; // Store current policy text/URL for re-analysis
    let lastAnalysisResult = null; // Store last analysis result
    
    // Multi-tab analysis state
    let tabPolicyData = []; // Store policy data for each tab separately
    
    // Load configuration from config.js
    const config = window.SimpleTermsConfig || {
        features: { dailyAnalysisLimit: 5 },
        cloudFunction: { url: 'https://us-central1-simpleterms-backend.cloudfunctions.net/analyzePrivacyPolicy' },
        development: { freeProFeatures: false } // Default to false if config not loaded
    };
    
    const DAILY_USAGE_LIMIT = config.features.dailyAnalysisLimit;
    const CLOUD_FUNCTION_URL = config.cloudFunction.url;
    
    // Debug: Log config state
    console.log('SimpleTerms Config loaded:', {
        freeProFeatures: config.development?.freeProFeatures,
        configSource: window.SimpleTermsConfig ? 'loaded' : 'fallback'
    });

    // Initialize the extension on load
    initializeExtension();

    /**
     * Theme Management Functions
     */
    
    /**
     * Load saved theme preference from storage
     */
    async function loadThemePreference() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['themePreference'], (data) => {
                const savedTheme = data.themePreference || 'light';
                currentTheme = savedTheme;
                applyTheme(savedTheme);
                updateThemeToggleUI(savedTheme);
                resolve(savedTheme);
            });
        });
    }

    /**
     * Save theme preference to storage
     */
    async function saveThemePreference(theme) {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ themePreference: theme }, () => {
                resolve();
            });
        });
    }

    /**
     * Apply theme to the document
     */
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        currentTheme = theme;
    }

    /**
     * Update theme toggle button UI
     */
    function updateThemeToggleUI(theme) {
        if (theme === 'dark') {
            themeToggleSwitch.textContent = '☀️';
            themeToggle.title = 'Switch to Light Mode';
        } else {
            themeToggleSwitch.textContent = '🌙';
            themeToggle.title = 'Switch to Dark Mode';
        }
    }

    /**
     * Toggle between light and dark themes
     */
    function toggleTheme() {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        updateThemeToggleUI(newTheme);
        saveThemePreference(newTheme);
        
        // Add a subtle animation feedback
        themeToggle.style.transform = 'scale(0.95)';
        setTimeout(() => {
            themeToggle.style.transform = 'scale(1)';
        }, 150);
    }

    // Theme toggle event listener
    themeToggle.addEventListener('click', toggleTheme);
    
    // Analysis type change event listener
    analysisTypeSelect.addEventListener('change', handleAnalysisTypeChange);

    /**
     * Handle analysis type change - re-analyze when switching types
     */
    async function handleAnalysisTypeChange() {
        const newAnalysisType = analysisTypeSelect.value;
        
        if (newAnalysisType === currentAnalysisType) {
            return; // No change
        }
        
        currentAnalysisType = newAnalysisType;
        
        // SECURITY: Check if user has access to GDPR analysis
        if (currentAnalysisType === 'gdpr') {
            // Double-check subscription status to prevent console manipulation
            const isReallyPro = userSubscriptionInfo && userSubscriptionInfo.paid === true;
            const isDevelopmentMode = config.development && config.development.freeProFeatures === true;
            
            if (!isReallyPro && !isDevelopmentMode) {
                // Reset selection and show locked message
                analysisTypeSelect.value = 'standard';
                currentAnalysisType = 'standard';
                showLockedGDPRAnalysis();
                return;
            }
        }
        
        // Check if we have multi-tab data (tabs are visible)
        const isMultiTab = tabsContainer.style.display !== 'none' && tabPolicyData.length > 0;
        
        if (isMultiTab) {
            // Multi-tab scenario: re-analyze ALL tabs with the new analysis type
            try {
                // Show loading in all tabs
                for (let i = 0; i < tabPolicyData.length; i++) {
                    if (tabPolicyData[i]) {
                        showLoadingInTab(i, `Switching to ${newAnalysisType === 'standard' ? 'Standard' : 'GDPR'} analysis...`);
                    }
                }
                
                // Re-analyze all tabs in parallel
                const reanalysisPromises = [];
                for (let i = 0; i < tabPolicyData.length; i++) {
                    if (tabPolicyData[i]) {
                        reanalysisPromises.push(reanalyzeTabWithType(i, tabPolicyData[i], currentAnalysisType));
                    }
                }
                
                await Promise.all(reanalysisPromises);
            } catch (error) {
                console.error('Error re-analyzing tabs with new type:', error);
                // Show error in currently active tab
                displayErrorInTab('Failed to switch analysis type. Please try again.', currentTabIndex);
            }
        } else {
            // Single policy scenario: use existing logic
            if (!currentPolicyData) {
                return; // No data to re-analyze
            }
            
            try {
                showLoading(`Switching to ${newAnalysisType === 'standard' ? 'Standard' : 'GDPR'} analysis...`);
                await performAnalysisWithType(currentPolicyData, currentAnalysisType);
            } catch (error) {
                console.error('Error re-analyzing with new type:', error);
                showError('Failed to switch analysis type. Please try again.');
            }
        }
    }
    
    /**
     * Show loading message in specific tab
     */
    function showLoadingInTab(tabIndex, message = 'Analyzing...') {
        const tabContent = document.getElementById(`tab-content-${tabIndex}`);
        if (tabContent) {
            tabContent.innerHTML = `
                <div class="loading">
                    <div class="spinner"></div>
                    <div style="margin-top: 10px; color: #6c757d; font-size: 14px;">
                        ${message}
                    </div>
                </div>
            `;
        }
    }
    
    /**
     * Re-analyze a specific tab with the given analysis type
     */
    async function reanalyzeTabWithType(tabIndex, policyData, analysisType) {
        const policyText = policyData.text;
        const policyUrl = policyData.url;
        const policyTitle = policyData.title;
        
        if (analysisType === 'standard') {
            // Standard analysis
            const analysisResult = await analyzeWithCloudFunction(policyText);
            displayResultsInTab(analysisResult.score, analysisResult.summary, policyUrl, tabIndex, policyTitle, null);
        } else if (analysisType === 'gdpr') {
            // GDPR analysis (already security-checked in handleAnalysisTypeChange)
            const analysisResult = await analyzeWithCloudFunction(policyText);
            const gdprCompliance = generateGDPRCompliance(policyText, analysisResult.score);
            displayGDPRResultsInTab(analysisResult.score, analysisResult.summary, policyUrl, tabIndex, policyTitle, gdprCompliance);
        }
    }
    
    /**
     * Display GDPR analysis results in a specific tab
     */
    function displayGDPRResultsInTab(score, summary, policyUrl, tabIndex, policyText, gdprCompliance) {
        const tabContent = document.getElementById(`tab-content-${tabIndex}`);
        if (!tabContent) return;
        
        if (gdprCompliance) {
            const detailsHTML = Object.entries(gdprCompliance.checks)
                .map(([check, status]) => `
                    <li>
                        <span class="compliance-item">${check}</span>
                        <span class="compliance-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    </li>
                `).join('');

            tabContent.innerHTML = `
                <div class="gdpr-compliance">
                    <div class="gdpr-title">
                        🛡️ ${escapeHtml(policyText || 'GDPR Analysis')}
                    </div>
                    <div class="gdpr-score ${gdprCompliance.scoreClass}">
                        ${gdprCompliance.score}% ${gdprCompliance.overallRating}
                    </div>
                    <ul class="gdpr-details">
                        ${detailsHTML}
                    </ul>
                    <div style="font-size: 11px; color: #666; margin-top: 8px; text-align: center;">
                        ${gdprCompliance.summary}
                    </div>
                </div>
                <div style="margin-top: 10px; font-size: 12px; color: #6c757d; text-align: center;">
                    Analyzed: <a href="${escapeHtml(policyUrl)}" target="_blank" rel="noopener noreferrer" style="color: #667eea;" title="${escapeHtml(policyUrl)}">${escapeHtml(formatUrlForDisplay(policyUrl))}</a>
                </div>
            `;
        } else {
            // Show locked GDPR for non-pro users
            tabContent.innerHTML = generateGDPRHTML(null);
        }
    }
    
    /**
     * Show locked GDPR analysis for free users
     */
    function showLockedGDPRAnalysis() {
        const gdprHtml = generateGDPRHTML(null); // null triggers locked state
        resultsContainer.innerHTML = gdprHtml;
        premiumTeaser.style.display = 'block';
    }
    
    /**
     * Perform analysis with the specified type
     */
    async function performAnalysisWithType(policyData, analysisType) {
        const policyText = policyData.text || policyData.content;
        const policyUrl = policyData.url;
        const isCurrentPage = policyData.content !== undefined; // Current page if has content property
        
        if (analysisType === 'standard') {
            // Standard analysis only
            const analysisResult = await analyzeWithCloudFunction(policyText);
            
            if (isCurrentPage && policyData.confidence) {
                displayCurrentPageUnifiedResults(analysisResult.score, analysisResult.summary, policyUrl, policyData.confidence, analysisType);
            } else {
                displayUnifiedResults(analysisResult.score, analysisResult.summary, policyUrl, null, analysisType);
            }
        } else if (analysisType === 'gdpr') {
            // GDPR analysis
            if (userSubscriptionInfo.paid) {
                const analysisResult = await analyzeWithCloudFunction(policyText);
                const gdprCompliance = generateGDPRCompliance(policyText, analysisResult.score);
                
                if (isCurrentPage && policyData.confidence) {
                    displayCurrentPageUnifiedResults(analysisResult.score, analysisResult.summary, policyUrl, policyData.confidence, analysisType);
                } else {
                    displayUnifiedResults(analysisResult.score, analysisResult.summary, policyUrl, gdprCompliance, analysisType);
                }
            } else {
                showLockedGDPRAnalysis();
            }
        }
    }

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
            // Load theme preference first (for immediate UI update)
            await loadThemePreference();
            
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
            // Still load theme preference even if other initialization fails
            try {
                await loadThemePreference();
            } catch (themeError) {
                console.error('Error loading theme preference:', themeError);
            }
        }
    }

    /**
     * Load user subscription information from background script
     */
    async function loadUserSubscriptionInfo() {
        try {
            const user = await extpay.getUser();
            // Check development mode to simulate Pro features for free
            const isPro = user.paid || (config.development && config.development.freeProFeatures);
            
            userSubscriptionInfo = {
                paid: isPro,
                installedAt: user.installedAt,
                subscriptionStatus: user.subscriptionStatus || (isPro ? 'active' : 'free'),
                subscriptionCancelAt: user.subscriptionCancelAt || null,
                trialStartedAt: user.trialStartedAt,
                email: user.email || null,
                plan: isPro ? 'Pro' : 'Free'
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
     * Display unified results using GDPR-style design for all analysis types
     */
    function displayUnifiedResults(score, summary, policyUrl, gdprCompliance, analysisType) {
        let scoreClass = 'score-low';
        let scoreDescription = 'Low Risk';
        
        if (score >= 4 && score <= 6) {
            scoreClass = 'score-medium';
            scoreDescription = 'Medium Risk';
        } else if (score >= 7) {
            scoreClass = 'score-high';
            scoreDescription = 'High Risk';
        }

        let contentHtml = '';
        
        if (analysisType === 'standard') {
            // Standard analysis in GDPR-style box
            const summaryHtml = summary.map(point => `<li style="font-size: 12px; padding: 4px 0; margin-bottom: 8px; line-height: 1.4;">${escapeHtml(point)}</li>`).join('');
            
            contentHtml = `
                <div class="gdpr-compliance">
                    <div class="gdpr-title">
                        📄 Privacy Policy Analysis
                    </div>
                    <div class="gdpr-score ${scoreClass}">
                        ${score}/10 ${scoreDescription}
                    </div>
                    <div class="gdpr-details">
                        <div style="font-size: 13px; font-weight: 600; color: var(--text-tertiary); margin: 10px 0 8px 0;">Key Points:</div>
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            ${summaryHtml}
                        </ul>
                    </div>
                </div>
            `;
        } else if (analysisType === 'gdpr') {
            // GDPR analysis
            if (gdprCompliance) {
                const detailsHTML = Object.entries(gdprCompliance.checks)
                    .map(([check, status]) => `
                        <li>
                            <span class="compliance-item">${check}</span>
                            <span class="compliance-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        </li>
                    `).join('');

                contentHtml = `
                    <div class="gdpr-compliance">
                        <div class="gdpr-title">
                            🛡️ GDPR Compliance Analysis
                        </div>
                        <div class="gdpr-score ${gdprCompliance.scoreClass}">
                            ${gdprCompliance.score}% ${gdprCompliance.overallRating}
                        </div>
                        <ul class="gdpr-details">
                            ${detailsHTML}
                        </ul>
                        <div style="font-size: 11px; color: #666; margin-top: 8px; text-align: center;">
                            ${gdprCompliance.summary}
                        </div>
                    </div>
                `;
            } else {
                // Locked GDPR for free users
                contentHtml = generateGDPRHTML(null);
            }
        }

        resultsContainer.innerHTML = `
            ${contentHtml}
            <div style="margin-top: 10px; font-size: 12px; color: #6c757d; text-align: center;">
                Analyzed: <a href="${escapeHtml(policyUrl)}" target="_blank" rel="noopener noreferrer" style="color: #667eea;" title="${escapeHtml(policyUrl)}">${escapeHtml(formatUrlForDisplay(policyUrl))}</a>
            </div>
        `;
    }

    /**
     * Display unified current page results with confidence indicator
     */
    function displayCurrentPageUnifiedResults(score, summary, policyUrl, confidence, analysisType) {
        let scoreClass = 'score-low';
        let scoreDescription = 'Low Risk';
        
        if (score >= 4 && score <= 6) {
            scoreClass = 'score-medium';
            scoreDescription = 'Medium Risk';
        } else if (score >= 7) {
            scoreClass = 'score-high';
            scoreDescription = 'High Risk';
        }

        let contentHtml = '';
        
        if (analysisType === 'standard') {
            // Standard analysis in GDPR-style box with current page indicator
            const summaryHtml = summary.map(point => `<li style="font-size: 12px; padding: 4px 0; margin-bottom: 8px; line-height: 1.4;">${escapeHtml(point)}</li>`).join('');
            
            contentHtml = `
                <div class="gdpr-compliance">
                    <div class="gdpr-title">
                        📄 Current Page Analysis
                    </div>
                    <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
                        Detection confidence: ${confidence}%
                    </div>
                    <div class="gdpr-score ${scoreClass}">
                        ${score}/10 ${scoreDescription}
                    </div>
                    <div class="gdpr-details">
                        <div style="font-size: 13px; font-weight: 600; color: var(--text-tertiary); margin: 10px 0 8px 0;">Key Points:</div>
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            ${summaryHtml}
                        </ul>
                    </div>
                </div>
            `;
        } else if (analysisType === 'gdpr') {
            // GDPR analysis for current page
            if (userSubscriptionInfo.paid) {
                const gdprCompliance = generateGDPRCompliance(currentPolicyData.content, score);
                if (gdprCompliance) {
                    const detailsHTML = Object.entries(gdprCompliance.checks)
                        .map(([check, status]) => `
                            <li>
                                <span class="compliance-item">${check}</span>
                                <span class="compliance-status ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                            </li>
                        `).join('');

                    contentHtml = `
                        <div class="gdpr-compliance">
                            <div class="gdpr-title">
                                🛡️ Current Page GDPR Analysis
                            </div>
                            <div style="font-size: 11px; color: #666; margin-bottom: 8px;">
                                Detection confidence: ${confidence}%
                            </div>
                            <div class="gdpr-score ${gdprCompliance.scoreClass}">
                                ${gdprCompliance.score}% ${gdprCompliance.overallRating}
                            </div>
                            <ul class="gdpr-details">
                                ${detailsHTML}
                            </ul>
                            <div style="font-size: 11px; color: #666; margin-top: 8px; text-align: center;">
                                ${gdprCompliance.summary}
                            </div>
                        </div>
                    `;
                }
            } else {
                // Locked GDPR for free users
                contentHtml = generateGDPRHTML(null);
            }
        }

        resultsContainer.innerHTML = `
            ${contentHtml}
            <div style="margin-top: 10px; font-size: 12px; color: #6c757d; text-align: center;">
                Current Page: <a href="${escapeHtml(policyUrl)}" target="_blank" rel="noopener noreferrer" style="color: #667eea;" title="${escapeHtml(policyUrl)}">${escapeHtml(formatUrlForDisplay(policyUrl))}</a>
            </div>
        `;
    }

    /**
     * Generate GDPR compliance score and details (Pro feature)
     * @param {string} policyText - The privacy policy text
     * @param {number} privacyScore - Base privacy risk score
     * @returns {Object} GDPR compliance analysis
     */
    function generateGDPRCompliance(policyText, privacyScore) {
        // SECURITY: Detect if function is being called directly from console
        const stack = new Error().stack;
        const isDirectCall = !stack.includes('handleAnalysisTypeChange') && 
                           !stack.includes('analyzeWithGDPR') && 
                           !stack.includes('performAnalysisWithType');
        
        if (isDirectCall) {
            console.warn('SECURITY: Direct call to generateGDPRCompliance detected - potential bypass attempt');
        }
        // SECURITY: Enhanced validation to prevent bypass attempts
        const isReallyPro = userSubscriptionInfo && userSubscriptionInfo.paid === true;
        const isDevelopmentMode = config.development && config.development.freeProFeatures === true;
        
        if (!isReallyPro && !isDevelopmentMode) {
            console.warn('SECURITY: Unauthorized attempt to access GDPR analysis');
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
        
        // SECURITY: Add GDPR compliance only for verified Pro users
        const isReallyPro = userSubscriptionInfo && userSubscriptionInfo.paid === true;
        const isDevelopmentMode = config.development && config.development.freeProFeatures === true;
        
        if (isReallyPro || isDevelopmentMode) {
            analysisResult.gdprCompliance = generateGDPRCompliance(policyText, analysisResult.score);
        } else {
            console.warn('SECURITY: Unauthorized attempt to access GDPR analysis via analyzeWithGDPR');
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
            
            // Reset unified analysis state at the start of new analysis
            currentPolicyData = null;
            lastAnalysisResult = null;
            currentAnalysisType = 'standard';
            analysisTypeSelect.value = 'standard';
            analysisTypeContainer.style.display = 'none';
            tabPolicyData = []; // Reset tab policy data

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
            tabPolicyData = []; // Reset tab policy data
            
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
                        
                        // Store policy data for re-analysis
                        tabPolicyData[tabIndex] = {
                            text: dynamicContent,
                            url: policy.url,
                            title: policy.text
                        };
                        
                        // Add GDPR compliance for Pro users only
                        if (userSubscriptionInfo.paid) {
                            analysisResult.gdprCompliance = generateGDPRCompliance(dynamicContent, analysisResult.score);
                            displayResultsInTab(analysisResult.score, analysisResult.summary, policy.url, tabIndex, policy.text, analysisResult.gdprCompliance);
                        } else {
                            displayResultsInTab(analysisResult.score, analysisResult.summary, policy.url, tabIndex, policy.text);
                        }
                        
                        // Show dropdown after first tab analysis completes (for Pro users or testing)
                        if (tabIndex === 0) {
                            const isProUser = userSubscriptionInfo.paid;
                            const isTestingMode = config.development && config.development.freeProFeatures;
                            console.log('Multi-tab first analysis (dynamic content) dropdown check:', { 
                                isProUser, 
                                isTestingMode, 
                                development: config.development,
                                userInfo: userSubscriptionInfo 
                            });
                            if (isProUser || isTestingMode) {
                                analysisTypeContainer.style.display = 'block';
                                console.log('Multi-tab dropdown shown (dynamic content)');
                                
                                // Store data for re-analysis
                                currentPolicyData = { text: dynamicContent, url: policy.url };
                                lastAnalysisResult = analysisResult;
                            } else {
                                console.log('Multi-tab dropdown hidden (dynamic content)');
                            }
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

            // Store policy data for re-analysis
            tabPolicyData[tabIndex] = {
                text: policyText,
                url: policy.url,
                title: policy.text
            };
            
            // Analyze with AI
            const analysisResult = await analyzeWithGDPR(policyText);
            
            // Display results in the specific tab
            displayResultsInTab(analysisResult.score, analysisResult.summary, policy.url, tabIndex, policy.text, analysisResult.gdprCompliance);
            
            // Show dropdown after first tab analysis completes (for Pro users or testing)
            if (tabIndex === 0) {
                const isProUser = userSubscriptionInfo.paid;
                const isTestingMode = config.development && config.development.freeProFeatures;
                console.log('Multi-tab first analysis dropdown check:', { 
                    isProUser, 
                    isTestingMode, 
                    development: config.development,
                    userInfo: userSubscriptionInfo 
                });
                if (isProUser || isTestingMode) {
                    analysisTypeContainer.style.display = 'block';
                    console.log('Multi-tab dropdown shown');
                    
                    // Store data for re-analysis
                    currentPolicyData = { text: policyText, url: policy.url };
                    lastAnalysisResult = analysisResult;
                } else {
                    console.log('Multi-tab dropdown hidden');
                }
            }
            
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

        // Use unified GDPR-style design for tabs too
        const summaryHtml = summary.map(point => `<li style="font-size: 12px; padding: 4px 0; margin-bottom: 8px; line-height: 1.4;">${escapeHtml(point)}</li>`).join('');
        
        tabContent.innerHTML = `
            <div class="gdpr-compliance">
                <div class="gdpr-title">
                    📄 ${escapeHtml(policyText || 'Privacy Policy')}
                </div>
                <div class="gdpr-score ${scoreClass}">
                    ${score}/10 ${scoreDescription}
                </div>
                <div class="gdpr-details">
                    <div style="font-size: 13px; font-weight: 600; color: var(--text-tertiary); margin: 10px 0 8px 0;">Key Points:</div>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        ${summaryHtml}
                    </ul>
                </div>
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

            // Store policy data for unified interface including confidence
            currentPolicyData = { content: message.content, url: message.url, confidence: message.confidence };
            lastAnalysisResult = analysisResult;
            
            // Show analysis type selector (for Pro users or during testing)
            const isProUser = userSubscriptionInfo.paid;
            const isTestingMode = config.development && config.development.freeProFeatures;
            console.log('Dropdown visibility check:', { 
                isProUser, 
                isTestingMode, 
                development: config.development,
                userInfo: userSubscriptionInfo 
            });
            if (isProUser || isTestingMode) {
                analysisTypeContainer.style.display = 'block';
                console.log('Dropdown shown');
            } else {
                console.log('Dropdown hidden');
            }
            
            // Display results with current page indication
            displayCurrentPageUnifiedResults(analysisResult.score, analysisResult.summary, message.url, message.confidence, 'standard');
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
                        
                        // Store policy data and display unified results
                        currentPolicyData = { text: dynamicContent, url: policyUrl };
                        lastAnalysisResult = analysisResult;
                        
                        // Show analysis type selector (for Pro users or during testing)
                        const isProUser = userSubscriptionInfo.paid;
                        const isTestingMode = config.development && config.development.freeProFeatures;
                        console.log('Multi-tab dropdown visibility check:', { 
                            isProUser, 
                            isTestingMode, 
                            development: config.development,
                            userInfo: userSubscriptionInfo 
                        });
                        if (isProUser || isTestingMode) {
                            analysisTypeContainer.style.display = 'block';
                            console.log('Multi-tab dropdown shown');
                        } else {
                            console.log('Multi-tab dropdown hidden');
                        }
                        
                        // Display results using unified interface
                        displayUnifiedResults(analysisResult.score, analysisResult.summary, policyUrl, null, 'standard');
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

            // Step 5: Store policy data and display unified results
            currentPolicyData = { text: policyText, url: policyUrl };
            lastAnalysisResult = analysisResult;
            
            // Show analysis type selector (for Pro users or during testing)
            const isProUser = userSubscriptionInfo.paid;
            const isTestingMode = config.development && config.development.freeProFeatures;
            if (isProUser || isTestingMode) {
                analysisTypeContainer.style.display = 'block';
            }
            
            // Display results using unified interface
            displayUnifiedResults(analysisResult.score, analysisResult.summary, policyUrl, null, 'standard');
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
        // Note: We don't reset unified analysis state or tabPolicyData here since we want to keep the dropdown and re-analysis functionality after analysis
    }
});