# SimpleTerms Privacy Policy Analyzer - Cloud Function

This Google Cloud Function provides AI-powered privacy policy analysis using Google's Gemini AI model.

## Features

- **HTTP-triggered Cloud Function** with POST endpoint
- **CORS security** configured for Chrome extension integration
- **Google Gemini AI integration** for intelligent privacy policy analysis
- **Comprehensive error handling** with appropriate HTTP status codes
- **Request validation** and rate limiting protection

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
     --set-env-vars GEMINI_API_KEY=your_key,EXTENSION_ID=your_extension_id
   ```

## API Usage

### Endpoint
```
POST https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/analyzePrivacyPolicy
```

### Request Format
```json
{
  "policyText": "Your privacy policy text here..."
}
```

### Response Format
```json
{
  "success": true,
  "data": {
    "summary": "• Collects personal information...\n• Uses data for...",
    "score": 7
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
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

- **CORS Protection**: Only allows requests from your Chrome extension
- **Input Validation**: Validates request format and content
- **Rate Limiting**: Built-in protection against abuse
- **Error Handling**: Secure error responses without sensitive information

## Cost Optimization

- Uses `gemini-1.5-flash` model for cost-effective analysis
- Implements text length limits to prevent abuse
- Efficient error handling to minimize unnecessary API calls

## Monitoring

Check function logs in Google Cloud Console:
```bash
gcloud functions logs read analyzePrivacyPolicy --limit 50
```

## Testing

Test the deployed function:
```bash
curl -X POST https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/analyzePrivacyPolicy \
  -H "Content-Type: application/json" \
  -H "Origin: chrome-extension://your_extension_id" \
  -d '{"policyText": "Sample privacy policy text..."}'
```
