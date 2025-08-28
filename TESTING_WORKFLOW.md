# SimpleTerms Testing Workflow

## Overview

The SimpleTerms extension now has a comprehensive testing infrastructure that supports iterative development and continuous improvement. The system automatically categorizes websites into passing (regression) and failing (problematic) groups, allowing focused testing and debugging.

## Quick Start

### 1. Run Comprehensive Test (50 Sites)
```bash
# Run the full 50-site test suite
npm run test:comprehensive:run

# This takes ~15-20 minutes and tests 50 major websites across 10 categories
```

### 2. Categorize Results
```bash
# After comprehensive test completes, categorize the results
npm run test:categorize

# This automatically creates:
# - regression-sites.json (passing sites)
# - problematic-sites.json (failing sites)
```

### 3. Run Targeted Tests
```bash
# Test only passing sites (should have 95%+ pass rate)
npm run test:regression

# Focus on failing sites with enhanced strategies
npm run test:problematic:focus
```

## Testing Commands

| Command | Description | Duration |
|---------|-------------|----------|
| `npm run test:comprehensive` | Test all 50 sites (basic) | ~15-20 min |
| `npm run test:comprehensive:run` | Test all 50 sites (with logging) | ~15-20 min |
| `npm run test:categorize` | Categorize results into pass/fail | Instant |
| `npm run test:regression` | Test passing sites only | ~10 min |
| `npm run test:problematic:focus` | Debug failing sites | ~5 min |
| `npm run test:static` | Test original 8 sites | ~2 min |
| `npm run test:direct` | Test 3 quick sites | ~1 min |

## Current Status

### Pass Rate: 72-74% (36-37/50 sites)

### ✅ Regression Sites (36 passing)
Sites that reliably pass testing:
- **E-commerce**: Walmart, Target, eBay
- **Financial**: PayPal, Bank of America, Wells Fargo, Venmo, Chase
- **Technology**: Microsoft, Google, Apple, GitHub
- **Media**: Spotify, NY Times, Netflix
- **Social**: Facebook, LinkedIn, Twitter/X, Instagram
- **Productivity**: Notion, Slack, Zoom, Dropbox, Trello
- **Travel**: Airbnb, Uber
- **Education**: Khan Academy, Coursera, Udemy, MIT OCW
- **Health**: WebMD, Mayo Clinic, Healthline
- **Gaming**: Steam, Discord, Xbox

### ❌ Problematic Sites (14 failing)
Sites that need fixes:

**Privacy Policy Not Found (7 sites)**
- Amazon, Stack Overflow, YouTube, Reddit, Expedia, Duolingo, Epic Games

**Navigation Timeouts (5 sites)**
- Best Buy, Booking.com, TripAdvisor, MyFitnessPal, Twitch

**Other Issues (2 sites)**
- CNN (frame detachment)
- CVS (API error)

## Development Workflow

### Iterative Improvement Process

1. **Baseline Testing**
   ```bash
   npm run test:comprehensive:run
   npm run test:categorize
   ```

2. **Fix Problematic Sites**
   ```bash
   # Focus on specific failures
   npm run test:problematic:focus
   
   # Make fixes to content script or helpers
   # Test individual problematic sites
   ```

3. **Verify No Regressions**
   ```bash
   # Ensure passing sites still work
   npm run test:regression
   ```

4. **Re-test Comprehensive**
   ```bash
   # Run full suite again
   npm run test:comprehensive:run
   npm run test:categorize
   ```

## File Structure

```
tests/
├── fixtures/
│   ├── comprehensive-test-sites.json  # All 50 sites
│   ├── regression-sites.json         # Passing sites (auto-generated)
│   ├── problematic-sites.json        # Failing sites (auto-generated)
│   └── test-categorization-summary.json
├── e2e/
│   ├── comprehensive-50-sites.test.js
│   ├── regression-sites.test.js      # Test passing sites
│   ├── problematic-sites-focused.test.js # Debug failing sites
│   └── ...
├── utils/
│   ├── test-categorizer.js           # Categorization logic
│   ├── enhanced-test-helpers.js      # Enhanced detection
│   └── multi-strategy-helpers.js     # Fallback strategies
└── results/                          # Test logs and reports
```

## Testing Strategies

The test suite uses multiple strategies to maximize success:

1. **Standard**: Direct content script injection (mimics real extension)
2. **Enhanced**: Site-specific configurations and enhanced detection
3. **Multi-Strategy**: Multiple fallback approaches (Direct API, Google Search, Sitemap)

## Tips for Improving Pass Rate

### For "Privacy Not Found" Issues:
- Update content script regex patterns
- Add site-specific selectors
- Handle dynamic content loading
- Check for cookie consent walls

### For Navigation Timeouts:
- Adjust timeout values
- Use different wait strategies
- Handle bot detection
- Try headless vs non-headless mode

### For Frame/Context Issues:
- Wait for specific elements
- Handle iframe navigation
- Improve error recovery

## Expected Results

- **Comprehensive Test**: 72-74% pass rate (current)
- **Regression Test**: 95%+ pass rate (stable sites)
- **Problematic Test**: Variable (used for debugging)

## Next Steps to Reach 90%

Need 9 more sites to pass (45/50 total):

1. Fix privacy detection for Amazon, YouTube, Reddit
2. Handle navigation timeouts for Booking.com, TripAdvisor
3. Improve dynamic content handling for CNN
4. Add site-specific configurations for remaining failures

## Continuous Integration

The test suite is designed for CI/CD integration:

```yaml
# Example GitHub Actions workflow
- name: Run Regression Tests
  run: npm run test:regression
  
- name: Check for Regressions
  run: |
    if [ $? -ne 0 ]; then
      echo "Regression detected!"
      exit 1
    fi
```

## Troubleshooting

### Tests Hanging
- Check for browser windows left open
- Kill any zombie Chrome processes
- Reduce parallel execution

### Categorization Issues
- Ensure comprehensive test completed fully
- Check log file format matches parser
- Manually edit fixture files if needed

### False Failures
- Some sites may have intermittent issues
- Re-run failed tests individually
- Check internet connection and API status

---

The comprehensive testing suite provides a robust foundation for continuous improvement of the SimpleTerms extension. Focus on the problematic sites while ensuring regression tests continue to pass!