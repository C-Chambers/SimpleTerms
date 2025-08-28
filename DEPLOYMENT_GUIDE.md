# SimpleTerms Deployment Guide

## Prerequisites

1. **Chrome Web Store Developer Account**
   - Register at https://chrome.google.com/webstore/devconsole/
   - One-time $5 registration fee

2. **Google Cloud Platform Account**
   - Create project at https://console.cloud.google.com/
   - Enable billing (Cloud Function costs are minimal)
   - Enable required APIs:
     - Cloud Functions API
     - Generative Language API (Gemini)

3. **Gemini API Key**
   - Get from https://makersuite.google.com/app/apikey
   - Free tier includes 60 queries per minute

## Step 1: Deploy Cloud Function

### 1.1 Set up Google Cloud Project

```bash
# Install Google Cloud CLI
# Visit: https://cloud.google.com/sdk/docs/install

# Login to Google Cloud
gcloud auth login

# Create new project
gcloud projects create simpleterms-backend --name="SimpleTerms Backend"

# Set as active project
gcloud config set project simpleterms-backend

# Enable required APIs
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 1.2 Configure Environment Variables

Create `.env.yaml` file in `/cloud-function/`:

```yaml
GEMINI_API_KEY: "YOUR_GEMINI_API_KEY_HERE"
EXTENSION_ID: "YOUR_CHROME_EXTENSION_ID_HERE"
```

**Important**: Add `.env.yaml` to `.gitignore` to prevent committing secrets

### 1.3 Deploy the Cloud Function

```bash
cd cloud-function

# Deploy with environment variables
gcloud functions deploy analyzePrivacyPolicy \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --env-vars-file .env.yaml \
  --memory 256MB \
  --timeout 30s \
  --max-instances 100 \
  --region us-central1
```

### 1.4 Note the Function URL

After deployment, note your function URL:
```
https://us-central1-simpleterms-backend.cloudfunctions.net/analyzePrivacyPolicy
```

## Step 2: Prepare Extension for Chrome Web Store

### 2.1 Update Extension ID

1. First, load the extension as unpacked in Chrome to get a temporary ID:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory
   - Copy the generated Extension ID

2. Update the Cloud Function with this ID:
   ```bash
   gcloud functions deploy analyzePrivacyPolicy \
     --update-env-vars EXTENSION_ID=YOUR_ACTUAL_EXTENSION_ID
   ```

### 2.2 Create Production Build

1. Remove development files:
   ```bash
   # Create a clean copy for submission
   cp -r . ../simpleterms-production
   cd ../simpleterms-production
   
   # Remove development files
   rm -rf tests/ node_modules/ .git/ .github/
   rm -f jest.config.js package-lock.json
   rm -f TESTING_*.md BUGFIX_LOG.md
   ```

2. Update manifest.json version if needed

3. Ensure all console.log statements are removed or use the logger utility

### 2.3 Create Extension Package

```bash
# In the production directory
zip -r simpleterms-v1.0.2.zip . \
  -x "*.git*" \
  -x "*node_modules*" \
  -x "*.env*" \
  -x "*test*" \
  -x "*.md" \
  -x "cloud-function/*"
```

## Step 3: Chrome Web Store Submission

### 3.1 Prepare Store Assets

Create the following in a `store-assets/` folder:

1. **Screenshots** (Required):
   - screenshot1.png (1280x800 or 640x400)
   - screenshot2.png (1280x800 or 640x400)
   - screenshot3.png (1280x800 or 640x400)
   - screenshot4.png (1280x800 or 640x400)
   - screenshot5.png (1280x800 or 640x400)

2. **Promotional Images** (Optional but recommended):
   - small_tile.png (440x280)
   - large_tile.png (920x680)
   - marquee.png (1400x560)

3. **Icons** (Already included in extension):
   - icon16.png ✓
   - icon48.png ✓
   - icon128.png ✓

### 3.2 Host Privacy Policy

1. Host the privacy policy on a public URL:
   - GitHub Pages: Create a repository and enable Pages
   - Or use any web hosting service
   - URL example: `https://yourusername.github.io/simpleterms-privacy/`

### 3.3 Submit to Chrome Web Store

1. Go to https://chrome.google.com/webstore/devconsole/

2. Click "New Item"

3. Upload the `simpleterms-v1.0.2.zip` file

4. Fill in the listing information:
   - Use content from `CHROME_STORE_LISTING.md`
   - Upload screenshots
   - Add privacy policy URL
   - Select categories: Productivity (primary), Privacy & Security

5. Answer compliance questions:
   - Does your extension collect user data? No
   - Does it use remote code? No (AI processing is server-side)
   - Single purpose: Analyze and summarize privacy policies

6. Submit for review

## Step 4: Post-Submission

### 4.1 Update Production Extension ID

Once published, you'll receive the final Extension ID:

1. Update Cloud Function:
   ```bash
   gcloud functions deploy analyzePrivacyPolicy \
     --update-env-vars EXTENSION_ID=FINAL_CHROME_STORE_ID
   ```

2. Update repository for future releases

### 4.2 Monitor Cloud Function

Set up monitoring in Google Cloud Console:
- Set up alerts for errors
- Monitor usage and costs
- Check logs for issues

```bash
# View logs
gcloud functions logs read analyzePrivacyPolicy --limit 50

# Monitor metrics
gcloud monitoring metrics-descriptors list --filter="metric.type:cloudfunctions.googleapis.com"
```

## Step 5: Production Checklist

Before going live, verify:

- [ ] Cloud Function deployed with production configuration
- [ ] Extension ID updated in Cloud Function environment variables
- [ ] Rate limiting enabled (10 requests/minute per IP)
- [ ] Prompt injection protection active
- [ ] All console.log statements removed or using logger
- [ ] Privacy policy hosted and accessible
- [ ] LICENSE file included
- [ ] Offline error handling implemented
- [ ] Retry mechanisms working
- [ ] CORS configured for production only

## Maintenance

### Updating the Extension

1. Increment version in `manifest.json`
2. Make necessary changes
3. Test thoroughly
4. Create new zip package
5. Upload update to Chrome Web Store

### Updating Cloud Function

```bash
cd cloud-function
gcloud functions deploy analyzePrivacyPolicy --source .
```

### Monitoring Costs

Estimated monthly costs (1000 daily users):
- Cloud Functions: ~$5-10
- Gemini API: Free tier (60 QPM)
- Total: < $10/month

### Backup and Recovery

1. Keep backups of:
   - Gemini API key
   - Extension signing key (from Chrome Web Store)
   - Cloud Function deployment configuration

2. Document any custom configurations

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify Extension ID in Cloud Function matches actual ID
   - Check Cloud Function logs for rejected origins

2. **Rate Limiting Issues**
   - Adjust `MAX_REQUESTS_PER_WINDOW` if needed
   - Consider implementing user-based quotas

3. **Gemini API Errors**
   - Check API key validity
   - Monitor quota usage
   - Implement fallback for API outages

### Debug Commands

```bash
# Test Cloud Function locally
cd cloud-function
npm install @google-cloud/functions-framework
npx functions-framework --target=analyzePrivacyPolicy

# Check function status
gcloud functions describe analyzePrivacyPolicy

# View recent errors
gcloud functions logs read analyzePrivacyPolicy --filter="severity>=ERROR"
```

## Security Reminders

1. **Never commit secrets** to the repository
2. **Rotate API keys** regularly
3. **Monitor for suspicious activity** in Cloud Function logs
4. **Keep dependencies updated** for security patches
5. **Review user feedback** for security concerns

## Support Resources

- Chrome Extension Documentation: https://developer.chrome.com/docs/extensions/
- Google Cloud Functions: https://cloud.google.com/functions/docs
- Gemini API: https://ai.google.dev/
- Issue Tracker: https://github.com/C-Chambers/SimpleTerms/issues