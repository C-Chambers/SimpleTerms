#!/bin/bash

# SimpleTerms Cloud Function Deployment Script
# This script deploys both the analyze and fetch functions with environment variables

echo "Deploying SimpleTerms Cloud Functions..."

# Deploy the analyzePrivacyPolicy function
echo "Deploying analyzePrivacyPolicy function..."
gcloud functions deploy analyzePrivacyPolicy \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --env-vars-file env-vars.yaml \
  --memory 256MB \
  --timeout 30s \
  --source . \
  --entry-point analyzePrivacyPolicy

# Deploy the fetchPrivacyPolicy function
echo "Deploying fetchPrivacyPolicy function..."
gcloud functions deploy fetchPrivacyPolicy \
  --runtime nodejs18 \
  --trigger-http \
  --allow-unauthenticated \
  --env-vars-file env-vars.yaml \
  --memory 128MB \
  --timeout 15s \
  --source . \
  --entry-point fetchPrivacyPolicy

echo "✅ Cloud Functions deployed successfully!"
echo ""
echo "Function URLs:"
echo "Analyze: https://us-central1-[PROJECT-ID].cloudfunctions.net/analyzePrivacyPolicy"
echo "Fetch: https://us-central1-[PROJECT-ID].cloudfunctions.net/fetchPrivacyPolicy"