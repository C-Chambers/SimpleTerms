# SimpleTerms Privacy Policy Analyzer - Cloud Function v1.0

This Google Cloud Function provides AI-powered privacy policy analysis using Google's Gemini AI model for the SimpleTerms Chrome extension.

## 🚀 Production Status

**Version**: 1.0
**Status**: Production Ready
**Endpoint**: `https://us-central1-simpleterms-backend.cloudfunctions.net/analyzePrivacyPolicy`
**Success Rate**: 74% on 50 major websites

## Features

- **HTTP-triggered Cloud Function** with POST endpoint
- **CORS security** configured for Chrome extension and testing
- **Google Gemini 1.5 Flash** for intelligent privacy policy analysis
- **7-point summary generation** with consistent formatting
- **Risk score calculation** (1-10 scale)
- **Comprehensive error handling** with appropriate HTTP status codes
- **Request validation** and rate limiting protection
- **Testing support** with relaxed CORS for Puppeteer

## Setup Instructions

### 1. Prerequisites

- Google Cloud Platform account
- Google Cloud CLI installed and configured
- Node.js 18+ installed locally (for testing)
- Google Gemini API key

### 2. Get API Keys

1. **Gemini API Key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey) to generate your API key
2. **Extension ID**: Load your Chrome extension and find the ID in `chrome://extensions/`

### 3. Environment Configuration

1. Copy the environment template:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` with your actual values:
   ```bash
   GEMINI_API_KEY=your_actual_gemini_api_key
   EXTENSION_ID=your_actual_extension_id
   ```

### 4. Local Development

Install dependencies:
```bash
npm install
```

Start the function locally:
```bash
npm start
```

The function will be available at `http://localhost:8080`

### 5. Deploy to Google Cloud

1. Ensure you're logged into Google Cloud:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. Deploy the function:
   ```bash
   npm run deploy
   ```

   Or manually with environment variables:
   ```bash
   gcloud functions deploy analyzePrivacyPolicy \
     --runtime nodejs20 \
     --trigger-http \
     --allow-unauthenticated \
     --set-env-vars GEMINI_API_KEY=your_key,EXTENSION_ID=your_extension_id \
     --memory 256MB \
     --timeout 60s
   ```

## API Usage

### Endpoint
```
POST https://us-central1-simpleterms-backend.cloudfunctions.net/analyzePrivacyPolicy
```

### Request Format
```json
{
  "policyText": "Your privacy policy text here..."
}
```

### Response Format (v1.0)
```json
{
  "success": true,
  "data": {
    "summary": "• Collects personal information including name and email\n• Uses cookies for analytics\n• Shares data with third-party advertisers\n• Stores data for 2 years\n• Allows opt-out via email request\n• Uses encryption for data protection\n• May update policy without notice",
    "score": 7
  },
  "timestamp": "2024-08-28T12:00:00.000Z"
}
```

### Error Responses
```json
{
  "error": "Invalid input",
  "message": "policyText is required and must be a non-empty string"
}
```

## Security Features

- **CORS Protection**: Allows requests from Chrome extension and testing environments
- **Input Validation**: Validates request format and content
- **Rate Limiting**: Built-in protection against abuse (300KB text limit)
- **Error Handling**: Secure error responses without sensitive information
- **Testing Support**: Allows null origin for automated testing

## Performance Optimization

- Uses `gemini-1.5-flash` model for fast, cost-effective analysis
- Text truncation at 30KB for optimal processing speed
- Efficient prompt engineering for consistent 7-point summaries
- Average response time: 3-5 seconds
- Memory allocation: 256MB
- Timeout: 60 seconds

## Monitoring

Check function logs in Google Cloud Console:
```bash
# View recent logs
gcloud functions logs read analyzePrivacyPolicy --limit 50

# Stream logs in real-time
gcloud functions logs read analyzePrivacyPolicy --follow

# Check function metrics
gcloud functions describe analyzePrivacyPolicy
```

## Testing

### Manual Testing
Test the deployed function:
```bash
curl -X POST https://us-central1-simpleterms-backend.cloudfunctions.net/analyzePrivacyPolicy \
  -H "Content-Type: application/json" \
  -H "Origin: chrome-extension://doiijdjjldampcdmgkefblfkofkhaeln" \
  -d '{"policyText": "Sample privacy policy text..."}'
```

### Automated Testing
The function is tested as part of the extension's comprehensive test suite:
```bash
# Run cloud function tests
npm run test:cloud

# Test with 50 real websites
npm run test:comprehensive:run
```

## Cost Analysis

### Current Usage (v1.0)
- **Model**: Gemini 1.5 Flash
- **Average tokens per request**: ~2,000 input + ~500 output
- **Cost per 1000 requests**: ~$0.50
- **Monthly estimate (10K requests)**: ~$5.00

### Optimization Tips
- Text truncation reduces token usage by 70%
- Caching common policies could reduce API calls
- Batch processing for premium users

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure extension ID matches in environment variables
   - Check Origin header in requests

2. **Timeout Errors**
   - Privacy policy text may be too long
   - Increase timeout setting if needed

3. **Invalid Response Format**
   - Check Gemini API key validity
   - Verify prompt format in code

4. **Rate Limiting**
   - Implement client-side throttling
   - Consider caching responses

## Version History

### v1.0 (August 2024)
- Initial production release
- 7-point summary generation
- Risk score calculation
- CORS support for testing
- 74% success rate on major websites

### Planned Updates (v1.1)
- Response caching for common policies
- Multi-language support
- Enhanced error recovery
- Webhook support for monitoring

## Support

For issues or questions:
- GitHub Issues: [SimpleTerms Repository](https://github.com/C-Chambers/SimpleTerms/issues)
- Cloud Function Logs: Check GCP Console
- API Status: Monitor via Google Cloud Monitoring

---

*Last Updated: August 2024 - Version 1.0*