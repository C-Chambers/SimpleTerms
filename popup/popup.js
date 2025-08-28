// SimpleTerms Popup JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.getElementById('analyzeButton');
    const resultsContainer = document.getElementById('resultsContainer');
    
    // Configuration for Cloud Function endpoint
    const CLOUD_FUNCTION_URL = 'https://us-central1-simpleterms-backend.cloudfunctions.net/analyzePrivacyPolicy';

    // Security: HTML escape function to prevent XSS
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Add event listener to the analyze button
    analyzeButton.addEventListener('click', async function() {
        try {
            // Disable button and show loading state
            analyzeButton.disabled = true;
            analyzeButton.textContent = 'Analyzing...';
            showLoading();

            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Inject and execute the content script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['scripts/content.js']
            });

        } catch (error) {
            console.error('Error executing content script:', error);
            showError('Failed to analyze the page. Please try again.');
            resetButton();
        }
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'POLICY_URL_FOUND') {
            handlePolicyFound(message.url);
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
            
            // Show loading spinner while processing
            showLoading('Fetching privacy policy...');

            // Step 1: Fetch the raw HTML content from the policy URL
            const response = await fetch(policyUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch policy: ${response.status} ${response.statusText}`);
            }

            const html = await response.text();
            console.log('Fetched HTML content:', html.length, 'characters');

            // Step 2: Extract human-readable text content
            const policyText = extractTextFromHTML(html);
            console.log('Extracted text content:', policyText.length, 'characters');

            if (!policyText || policyText.length < 100) {
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
                showError('The privacy policy content appears to be empty or too short to analyze.');
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
     * Analyze privacy policy text using the Google Cloud Function
     * @param {string} policyText - The extracted privacy policy text
     * @returns {Promise<Object>} Analysis result with score and summary
     */
    async function analyzeWithCloudFunction(policyText) {
        try {
            console.log('Sending request to Cloud Function...');
            
            // Make POST request to Google Cloud Function
            const response = await fetch(CLOUD_FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': chrome.runtime.getURL('')  // Extension origin for CORS
                },
                body: JSON.stringify({
                    policyText: policyText
                })
            });

            // Check if request was successful
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Cloud Function error response:', errorText);
                throw new Error(`Cloud Function request failed: ${response.status} ${response.statusText}`);
            }

            // Parse JSON response
            const result = await response.json();
            console.log('Cloud Function response:', result);

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
                .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
                .map(line => line.replace(/^[•\-]\s*/, '').trim())
                .filter(line => line.length > 0);

            return {
                score: Math.min(10, Math.max(1, score)), // Ensure score is between 1-10
                summary: summaryArray.length > 0 ? summaryArray : ['Analysis completed successfully']
            };

        } catch (error) {
            console.error('Error calling Cloud Function:', error);
            
            // Re-throw with more specific error message
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                throw new Error('Cloud Function network error: Unable to connect to analysis service');
            } else if (error.message.includes('CORS')) {
                throw new Error('Cloud Function CORS error: Extension not authorized');
            } else {
                throw new Error('Cloud Function error: ' + error.message);
            }
        }
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
                Analyzed: <a href="${escapeHtml(policyUrl)}" target="_blank" style="color: #667eea;">Privacy Policy</a>
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
                Current Page: <a href="${escapeHtml(policyUrl)}" target="_blank" style="color: #667eea;">${escapeHtml(new URL(policyUrl).hostname)}</a>
            </div>
        `;
    }

    function resetButton() {
        analyzeButton.disabled = false;
        analyzeButton.innerHTML = '<span class="btn-icon">🔍</span>Analyze Policy';
    }
});