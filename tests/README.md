# SimpleTerms Extension - Test Suite v1.0

## Overview

Comprehensive automated testing suite for the SimpleTerms browser extension using Jest and Puppeteer. Version 1.0 includes testing for 50 major websites with automated categorization and targeted testing capabilities.

## 🎯 Current Status

- **Sites Tested**: 50 websites across 10 categories
- **Pass Rate**: 74% (37/50 sites working)
- **Regression Suite**: 36 stable sites
- **Problematic Sites**: 14 sites needing improvements

## Requirements

- Node.js 16+
- Chrome/Chromium browser
- SimpleTerms extension files in project root
- npm dependencies installed

## Installation

```bash
# Install dependencies
npm install

# Verify setup
npm test
```

## 🧪 Test Commands

### Quick Testing
```bash
# Test 3 sites quickly (Amazon, eBay, PayPal)
npm run test:direct

# Test original 8 static sites
npm run test:static
```

### Comprehensive Testing
```bash
# Run full 50-site test suite (15-20 minutes)
npm run test:comprehensive:run

# Categorize results into pass/fail groups
npm run test:categorize

# Test only passing sites (regression)
npm run test:regression

# Focus on failing sites (debugging)
npm run test:problematic:focus
```

### Development Testing
```bash
# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test tests/e2e/specific-test.js
```

## Test Categories

### Comprehensive Suite (50 Sites)
| Category | Sites | Pass Rate |
|----------|-------|-----------|
| E-commerce | 5 | 60% |
| Financial | 5 | 80% |
| Technology | 5 | 80% |
| Media | 5 | 60% |
| Social | 5 | 60% |
| Productivity | 5 | 100% |
| Travel | 5 | 40% |
| Education | 5 | 80% |
| Health | 5 | 60% |
| Gaming | 5 | 60% |

### Test Types

#### Unit Tests (`tests/unit/`)
- Fast, isolated tests for individual functions
- Privacy pattern matching validation
- Content extraction logic
- No browser automation required

#### E2E Tests (`tests/e2e/`)
- Full browser automation with Puppeteer
- Real website testing with actual AI analysis
- Multiple testing strategies
- Regression and problematic site testing

## Test Configuration

### Site Configuration Format
```json
{
  "name": "Amazon",
  "url": "https://amazon.com",
  "category": "e-commerce",
  "expectedPoints": 7,
  "timeout": 15000,
  "status": "stable"
}
```

### Success Criteria
✅ **Pass Conditions:**
- Extension returns exactly 7 summary points
- Risk score is integer between 1-10
- No error messages displayed
- Analysis completes within timeout

❌ **Failure Conditions:**
- Less than 7 summary points
- Invalid risk score
- Error messages shown
- Timeout exceeded

## Testing Strategies

### 1. Standard Testing
- Direct content script injection
- Mimics real extension behavior
- Used for stable sites

### 2. Enhanced Testing
- Site-specific configurations
- Cookie banner handling
- Scroll-to-load content support
- Used for moderately problematic sites

### 3. Multi-Strategy Testing
- Multiple fallback approaches:
  - Direct API testing
  - Google search for privacy policy
  - Sitemap parsing
- Used for very problematic sites

## Automated Categorization

After running comprehensive tests:

```bash
# Categorize results
npm run test:categorize
```

This creates:
- `fixtures/regression-sites.json` - Passing sites for regression testing
- `fixtures/problematic-sites.json` - Failing sites for focused debugging
- `fixtures/test-categorization-summary.json` - Overall statistics

## Debugging Tests

### Enable Browser DevTools
Set `headless: false` in test configuration to watch tests run

### Verbose Logging
Tests include detailed console output:
- Site navigation status
- Extension trigger attempts
- Analysis results
- Performance timings

### Common Issues & Solutions

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

## Performance Expectations

### Test Timing
- **Unit Tests**: < 1 second each
- **Static Site E2E**: < 10 seconds each
- **Comprehensive Suite**: ~15-20 minutes total
- **Regression Suite**: ~10 minutes
- **Problematic Sites**: ~5 minutes

### Resource Usage
- Memory: ~500MB per browser instance
- CPU: Moderate during analysis
- Network: Real API calls to Gemini

## CI/CD Integration

### GitHub Actions Example
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
      - run: npm run test:categorize
```

## Test Development

### Adding New Sites
1. Add site to `fixtures/comprehensive-test-sites.json`
2. Run comprehensive test
3. Use `npm run test:categorize` to update fixtures
4. Verify with `npm run test:regression`

### Creating New Test Strategies
1. Add strategy to `utils/enhanced-test-helpers.js`
2. Update site configuration
3. Test with problematic sites
4. Document in this README

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

## Test Results Archive

Test results are saved in `tests/results/` with timestamps:
- Log files with full output
- JSON summaries with statistics
- Categorization reports

## Contributing to Tests

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

## Version History

### v1.0 (August 2024)
- 50-site comprehensive test suite
- Automated categorization system
- Multiple testing strategies
- 74% pass rate achieved

### Planned Improvements (v1.1)
- Target 90% pass rate
- Add 50 more test sites
- Implement visual regression testing
- Add performance benchmarking

---

*Last Updated: August 2024 - Version 1.0*