# SimpleTerms Extension - Test Suite

## Overview

Automated testing suite for the SimpleTerms browser extension using Jest and Puppeteer for regression testing and quality assurance.

## Requirements

- Node.js 16+
- Chrome/Chromium browser
- SimpleTerms extension files in project root

## Installation

```bash
# Install dependencies
npm install

# Run tests
npm test
```

## Test Categories

### Unit Tests (`tests/unit/`)
- Fast, isolated tests for individual functions
- Privacy pattern matching validation
- Content extraction logic
- No browser automation required

### E2E Tests (`tests/e2e/`)
- Full browser automation with extension loaded
- Real website testing with actual AI analysis
- Regression testing for major sites

## Test Commands

```bash
# Run all tests
npm test

# Run only unit tests (fast)
npm run test:unit

# Run only e2e tests (comprehensive)
npm run test:e2e

# Run regression tests (static sites only)
npm run test:regression

# Run tests in watch mode (for development)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Test Configuration

### Static Sites (8 sites)
- Amazon, eBay, PayPal, Chase, Microsoft, Google, Spotify, NY Times
- Expected: 7 summary points, valid risk score (1-10)
- Timeout: 10 seconds per site

### Test Criteria
✅ **Success Criteria:**
- Extension returns exactly 7 summary bullet points
- Risk score is integer between 1-10
- No error messages displayed
- Analysis completes within timeout

❌ **Failure Conditions:**
- Less than 7 summary points
- Invalid risk score
- Error messages shown
- Timeout exceeded

## Test Site Configuration

Edit `tests/fixtures/test-sites.json` to modify test sites:

```json
{
  "staticSites": [
    {
      "name": "Amazon",
      "url": "https://amazon.com",
      "expectedPoints": 7,
      "timeout": 10000,
      "category": "e-commerce"
    }
  ]
}
```

## Debugging Tests

### Browser Debugging
Set `devtools: true` in `tests/setup.js` to open Chrome DevTools during tests.

### Verbose Logging
Tests include detailed console output:
- Site navigation status
- Extension trigger attempts
- Analysis results
- Performance timings

### Test Failures
When tests fail, check:
1. Browser console for extension errors
2. Network tab for API call failures
3. Extension popup for error messages
4. Test logs for detailed failure information

## CI/CD Integration

### GitHub Actions (Future)
```yaml
name: Extension Testing
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:regression
```

## Performance Expectations

### Test Timing
- **Unit Tests**: < 1 second each
- **Static Site E2E**: < 10 seconds each
- **Full Regression Suite**: < 5 minutes total

### Resource Usage
- Memory: ~500MB per browser instance
- CPU: Moderate during analysis
- Network: Real API calls to Gemini

## Troubleshooting

### Common Issues

**Extension not loading:**
- Verify extension files are in project root
- Check manifest.json is valid
- Ensure Chrome allows local extensions

**Tests timing out:**
- Increase timeout in test configuration
- Check internet connection speed
- Verify Gemini API key is valid

**Inconsistent results:**
- AI responses may vary slightly
- Focus on 7-point count, not exact content
- Retry failed tests before investigating

**Browser automation failures:**
- Update Puppeteer version
- Check Chrome/Chromium installation
- Run in non-headless mode for debugging

## Test Development

### Adding New Sites
1. Add site to `test-sites.json`
2. Verify manually with extension
3. Run regression test
4. Update documentation

### Modifying Test Logic
1. Update helper functions in `utils/`
2. Run unit tests to verify changes
3. Run e2e tests for integration
4. Update this README

## Maintenance

### Regular Tasks
- Update test sites if URLs change
- Verify AI API responses remain consistent
- Update browser and dependency versions
- Review and update timeout values

### Quarterly Reviews
- Analyze test failure patterns
- Update site list based on popularity
- Performance optimization
- Coverage analysis
