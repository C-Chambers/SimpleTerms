// SimpleTerms Popup JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.getElementById('analyzeButton');
    const resultsContainer = document.getElementById('resultsContainer');

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
        } else if (message.type === 'NO_POLICY_FOUND') {
            handleNoPolicyFound();
        } else if (message.type === 'ERROR') {
            showError(message.error);
            resetButton();
        }
    });

    function showLoading() {
        resultsContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
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

    async function handlePolicyFound(policyUrl) {
        try {
            // Fetch the privacy policy content
            const response = await fetch(policyUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch policy: ${response.status}`);
            }

            const html = await response.text();
            const policyText = extractTextFromHTML(html);

            // TODO: Send to AI backend for analysis
            // For now, show a placeholder result
            showMockResults(policyUrl);

        } catch (error) {
            console.error('Error fetching policy:', error);
            showError('Failed to fetch the privacy policy. The link might be broken or require authentication.');
            resetButton();
        }
    }

    function extractTextFromHTML(html) {
        // Create a temporary DOM element to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Remove script and style elements
        const scripts = tempDiv.querySelectorAll('script, style, nav, header, footer');
        scripts.forEach(el => el.remove());

        // Get text content and clean it up
        let text = tempDiv.textContent || tempDiv.innerText || '';
        
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    }

    function showMockResults(policyUrl) {
        // Mock results for demonstration (will be replaced with real AI analysis)
        const mockScore = Math.floor(Math.random() * 10) + 1;
        const mockSummary = [
            "Collects personal information including name, email, and browsing data",
            "Uses data for service improvement and targeted advertising",
            "Shares information with third-party partners and advertisers",
            "Data may be transferred internationally",
            "Users can request data deletion but some information may be retained"
        ];

        displayResults(mockScore, mockSummary, policyUrl);
        resetButton();
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

        const summaryHtml = summary.map(point => `<li>${point}</li>`).join('');

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
                Analyzed: <a href="${policyUrl}" target="_blank" style="color: #667eea;">Privacy Policy</a>
            </div>
        `;
    }

    function resetButton() {
        analyzeButton.disabled = false;
        analyzeButton.innerHTML = '<span class="btn-icon">🔍</span>Analyze Policy';
    }
});