#!/bin/bash

# Deploy SimpleTerms Cloud Function with Google Secret Manager
# This is the most secure method for production deployments

echo "🔐 Deploying SimpleTerms with Google Secret Manager..."

# Create secrets in Secret Manager (run these once)
echo "Creating secrets in Google Secret Manager..."
echo -n "your_gemini_api_key_here" | gcloud secrets create gemini-api-key --data-file=-
echo -n "your_extension_id_here" | gcloud secrets create extension-id --data-file=-

# Deploy function with secret access
echo "Deploying Cloud Function with secret access..."
gcloud functions deploy analyzePrivacyPolicy \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY_SECRET=projects/YOUR_PROJECT_ID/secrets/gemini-api-key/versions/latest \
  --set-env-vars EXTENSION_ID_SECRET=projects/YOUR_PROJECT_ID/secrets/extension-id/versions/latest

echo "✅ Deployment complete with secure secret management!"
echo "Remember to replace YOUR_PROJECT_ID with your actual Google Cloud project ID"
