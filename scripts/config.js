// SimpleTerms Configuration
// This file contains configuration values that can be set per environment

// Configuration object
const SimpleTermsConfig = {
    // ExtensionPay Configuration
    extensionpay: {
        // ExtensionPay extension ID - get this from https://extensionpay.com dashboard
        // TODO: Replace with actual ExtensionPay extension ID after registration
        extensionId: 'PLACEHOLDER_EXTENSION_ID'
    },
    
    // Cloud Function Configuration
    cloudFunction: {
        // URL to the analysis cloud function
        url: 'https://us-central1-simpleterms-backend.cloudfunctions.net/analyzePrivacyPolicy'
    },
    
    // Feature Flags
    features: {
        // Enable GDPR compliance analysis (Pro feature)
        gdprAnalysis: true,
        
        // Enable usage limits for free users
        usageLimits: true,
        
        // Daily analysis limit for free users
        dailyAnalysisLimit: 5
    }
};

// Export configuration for use in other modules
if (typeof window !== 'undefined') {
    // Browser context
    window.SimpleTermsConfig = SimpleTermsConfig;
} else if (typeof self !== 'undefined') {
    // Service worker context
    self.SimpleTermsConfig = SimpleTermsConfig;
}

console.log('SimpleTerms: Configuration loaded');