# Privacy Policy for SimpleTerms

**Last Updated: December 30, 2024**

## Introduction

SimpleTerms ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how our browser extension collects, uses, and safeguards your information when you use our service.

## Information We Collect

### Minimal Data Collection
SimpleTerms is designed with privacy-first principles. We collect only the minimum data necessary to provide our service:

1. **Usage Statistics**: We store a local count of how many privacy policies you've analyzed. This data is stored locally on your device and is never transmitted to our servers.

2. **Privacy Policy Content**: When you analyze a privacy policy, the text content is temporarily sent to our secure cloud function for AI analysis. This content is:
   - Processed in real-time
   - Not stored or logged on our servers
   - Immediately discarded after analysis
   - Never associated with any user identifier

### Data We Do NOT Collect
- Personal identification information (name, email, etc.)
- Browsing history
- IP addresses (beyond standard web server logs which are automatically purged)
- Device identifiers
- Location data
- Cookies or tracking pixels
- Any form of user profile or behavioral data

## How We Use Information

The limited information we process is used solely to:
- Analyze privacy policies using AI to provide you with summaries and risk scores
- Maintain a local count of analyses performed (stored only on your device)
- Improve the accuracy of our AI analysis through aggregated, anonymous feedback (future feature)

## Data Processing and Security

### Cloud Function Processing
- Privacy policy text is sent to our Google Cloud Function using HTTPS encryption
- The cloud function uses Google's Gemini AI API to analyze the text
- Analysis is performed in real-time with no data retention
- Results are immediately returned to your browser

### Security Measures
- All data transmission uses HTTPS encryption
- Cloud functions are secured with authentication and rate limiting
- No user data is stored in databases or logs
- Extension follows Chrome's security best practices and Manifest V3 specifications

## Third-Party Services

### Google Gemini AI
We use Google's Gemini AI API to analyze privacy policies. When you analyze a policy:
- The policy text is sent to Google's API for processing
- Google processes this data according to their [AI/ML Privacy Policy](https://policies.google.com/privacy)
- We do not share any personal information with Google
- The analysis is performed without creating user profiles

### Google Cloud Platform
Our cloud function runs on Google Cloud Platform:
- Subject to [Google Cloud Privacy Policy](https://cloud.google.com/terms/cloud-privacy-notice)
- Data is processed in Google's secure data centers
- No persistent storage of user data

## Data Retention

- **Local Storage**: Summary count is stored indefinitely on your device until you clear extension data
- **Server Processing**: Privacy policy text is processed in memory only and immediately discarded
- **Logs**: Standard web server logs (containing no personal data) are automatically purged after 30 days

## Your Rights and Controls

You have complete control over your data:

### Extension Permissions
- You can revoke extension permissions at any time through Chrome settings
- The extension only accesses websites when you explicitly click "Analyze"

### Data Deletion
- Clear local storage by removing the extension or clearing Chrome's extension data
- No server-side data deletion is necessary as we don't store your data

### Opt-Out
- Simply stop using the extension to prevent any data processing
- Uninstall the extension to remove all local data

## Children's Privacy

SimpleTerms is not intended for use by children under 13 years of age. We do not knowingly collect information from children under 13.

## International Data Transfers

If you use SimpleTerms from outside the United States, please note that data is processed by Google Cloud Platform, which may involve transferring data across international borders. Google Cloud Platform complies with applicable data protection frameworks.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify users of any material changes by:
- Updating the "Last Updated" date
- Posting a notice in the extension (for significant changes)
- Updating the version number in the Chrome Web Store

## Contact Information

For privacy-related questions or concerns about SimpleTerms, please:
- Email: [Contact email to be provided]

## Legal Basis for Processing (GDPR)

For users in the European Economic Area (EEA), we process data based on:
- **Legitimate Interests**: To provide the privacy policy analysis service you request
- **Consent**: By installing and using the extension, you consent to the processing described in this policy

## Data Protection Rights (GDPR)

If you are in the EEA, you have rights including:
- Access to your data (though we store none)
- Rectification of inaccurate data
- Erasure of your data
- Restriction of processing
- Data portability
- Objection to processing

## California Privacy Rights (CCPA)

California residents have specific rights under the CCPA:
- Right to know what information is collected
- Right to delete information (not applicable as we don't store personal information)
- Right to opt-out of sale of information (we never sell any information)
- Right to non-discrimination

## Compliance

SimpleTerms complies with:
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)
- Chrome Web Store Developer Program Policies
- Applicable data protection laws

---

**Remember**: SimpleTerms is designed to help you understand other companies' privacy policies while respecting your own privacy. We practice what we preach - minimal data collection, maximum transparency.
