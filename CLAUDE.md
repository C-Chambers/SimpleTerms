# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SimpleTerms is a Chrome browser extension that uses AI to analyze privacy policies and provide instant summaries with risk scores. The extension automatically detects privacy policy links on websites and analyzes them using Google's Gemini AI API through a serverless cloud function.

## Development Commands

### Testing
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit              # Unit tests
npm run test:e2e              # End-to-end tests
npm run test:regression       # Regression tests (36 stable sites)
npm run test:comprehensive    # Full 50-site test suite
npm run test:problematic      # Debug problematic sites
npm run test:cloud           # Test cloud function
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report

# Run comprehensive tests with detailed output
npm run test:comprehensive:run

# Categorize and analyze test results
npm run test:categorize
```

### Build & Deployment
```bash
# Build production version
node builds/build-production.js

# This creates config/manifest.prod.json with production keys
# Manual steps for Chrome Web Store submission are then required
```

## Architecture

### Core Components

**Extension Frontend:**
- `popup/` - Extension popup UI (HTML/CSS/JS)
- `scripts/content.js` - Injected content script for privacy policy detection
- `scripts/background.js` - Service worker for background tasks
- `scripts/logger.js` - Logging utility

**Backend:**
- `cloud-function/` - Google Cloud Function for AI analysis
- Uses Google Gemini 1.5 Flash API for policy summarization

**Testing Infrastructure:**
- `tests/e2e/` - End-to-end browser automation tests using Puppeteer
- `tests/unit/` - Unit tests for core functionality
- `tests/fixtures/` - Test data and site configurations
- `tests/utils/` - Testing utilities and helpers

### Key Features

**Privacy Policy Detection:**
- Multi-strategy approach using regex patterns and DOM traversal
- Supports both direct policy links and current page analysis
- Location-based scoring prioritizes footer links
- Shadow DOM and hidden menu detection for universal compatibility

**AI Analysis:**
- 7-point summary format covering data collection, usage, and sharing
- Privacy Risk Score (1-10 scale)
- Handles multiple policy formats and languages

**Testing:**
- Comprehensive 50-site test suite across 10 categories (e-commerce, financial, tech, etc.)
- Regression testing on 36 stable sites
- Current pass rate: 74% (37/50 sites)

### Extension Permissions

The extension requires:
- `activeTab` - Access current tab content
- `scripting` - Inject content scripts
- `storage` - Store user preferences
- `tabs` - Tab management
- `<all_urls>` - Universal site compatibility

### Configuration Files

- `manifest.json` - Development manifest
- `config/manifest.prod.json` - Production manifest (generated)
- `config/jest.config.js` - Test configuration with 3-minute timeout for e2e tests
- Package supports both unit tests (10s timeout) and e2e tests (180s timeout)

### Cloud Function Integration

The extension communicates with a Google Cloud Function at:
`https://us-central1-simpleterms-backend.cloudfunctions.net/analyzePrivacyPolicy`

For local development, the cloud function needs to be deployed separately with proper CORS configuration for testing.
- When running tests, remember to run the static site test suite (npm run test:static) and not EVERY test (npm test)
- When committing and pushing changes, remember to see if we need to remove any production keys/secrets. If so, copy our production manifest to manifest.prod.json in the config folder, and replace our prod keys with space/nothing