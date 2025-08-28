# Chrome Web Store Listing Information

## Extension Name
SimpleTerms - AI Privacy Policy Analyzer

## Short Description (132 characters max)
Instantly understand any privacy policy with AI. Get clear summaries and risk scores to know exactly how your data is being used.

## Detailed Description

### 🔍 What is SimpleTerms?

SimpleTerms is your personal privacy assistant that uses advanced AI to instantly analyze and summarize complex privacy policies. No more reading through pages of legal jargon - get the information you need in seconds.

### ✨ Key Features

**🤖 AI-Powered Analysis**
- Powered by Google's Gemini AI for accurate, reliable summaries
- Analyzes policies in real-time with no data storage
- Provides clear, jargon-free explanations anyone can understand

**📊 Privacy Risk Score**
- Get an instant 1-10 risk score for any privacy policy
- Understand at a glance how much data is being collected
- Make informed decisions about which services to trust

**🎯 Smart Detection**
- Automatically finds privacy policy links on any website
- Analyzes multiple policies if a site has several
- Works on the current page or linked policies

**🔒 Privacy-First Design**
- We don't collect or store your personal data
- No tracking, no cookies, no user profiles
- Open source code you can verify yourself

### 📋 What You'll Learn

Each analysis reveals:
- What personal data is collected
- How your information is used
- Who it's shared with (third parties, advertisers, etc.)
- Your rights and control options
- Data retention periods
- Security measures in place
- Any concerning practices to watch out for

### 🎯 Perfect For

- **Privacy-Conscious Users**: Take control of your digital footprint
- **Parents**: Understand what data apps and websites collect from your family
- **Professionals**: Quickly assess business tools and services
- **Students**: Research privacy practices for academic projects
- **Anyone**: Who values their privacy but doesn't have time to read legal documents

### 🚀 How It Works

1. **Click the SimpleTerms icon** in your browser toolbar
2. **Click "Analyze"** on any website
3. **Get instant results** with a clear summary and risk score
4. **Make informed decisions** about your privacy

### 🌟 Why Choose SimpleTerms?

- **Fast**: Get results in 3-5 seconds
- **Accurate**: Powered by advanced AI technology
- **Private**: We practice what we preach - minimal data collection
- **Free**: Core features available at no cost
- **Transparent**: Open source code on GitHub
- **User-Friendly**: Designed for everyone, not just tech experts

### 💡 Use Cases

- **Before signing up** for a new service
- **Comparing** privacy practices between competitors
- **Understanding** what data your favorite apps collect
- **Teaching** others about digital privacy
- **Researching** privacy trends and practices

### 🛡️ Our Privacy Promise

SimpleTerms is built on a privacy-first foundation:
- No user accounts required
- No personal data collection
- No browsing history tracking
- No selling or sharing of any information
- Fully transparent, open-source code

### 📖 Open Source

SimpleTerms is open source! Visit our GitHub repository to:
- Review the code
- Report issues
- Contribute improvements
- Verify our privacy practices

GitHub: https://github.com/C-Chambers/SimpleTerms

### 🆘 Support

Need help or have questions?
- Check our GitHub for documentation
- Report issues on GitHub
- Email support: [To be provided]

### 🔄 Regular Updates

We continuously improve SimpleTerms with:
- Enhanced AI analysis accuracy
- Support for more privacy policy formats
- Performance optimizations
- User-requested features

### ⚡ Get Started

Install SimpleTerms today and take the first step toward understanding and protecting your digital privacy. Because everyone deserves to know how their data is being used - in plain English.

---

**Note**: SimpleTerms requires an active internet connection to analyze privacy policies using our secure cloud function.

## Categories
- Productivity
- Privacy & Security

## Primary Category
Productivity

## Language
English

## Permissions Justification

### Host Permissions: `<all_urls>`

**Why we need this permission:**
SimpleTerms needs to analyze privacy policies on any website you visit. Privacy policies can be hosted on any domain, and we need to:

1. **Detect privacy policy links** on the current page you're viewing
2. **Access privacy policy content** when it's on a different domain than the main site
3. **Extract text content** from privacy policy pages for analysis

This broad permission is essential because:
- Privacy policies are often hosted on third-party domains (like TrustArc, OneTrust, etc.)
- Many sites use different subdomains for their legal pages
- We can't predict which websites users will want to analyze

**User Control:**
- The extension only activates when you explicitly click "Analyze"
- No automatic scanning or background processing occurs
- You have complete control over when the extension accesses page content

**Privacy Protection:**
- We only read privacy policy content when you request it
- No browsing history is collected or tracked
- Content is only temporarily processed for analysis and immediately discarded

### Other Permissions

**activeTab**: Only accesses the current tab when you click the extension
**scripting**: Needed to extract privacy policy text from web pages
**storage**: Stores only a local count of analyses performed (no personal data)
**tabs**: Required to identify the current page for analysis

## Tags
- privacy
- security
- AI
- privacy policy
- data protection
- GDPR
- terms of service
- productivity
- analysis
- summarizer

## Website
https://github.com/C-Chambers/SimpleTerms

## Support Email
[To be provided]

## Privacy Policy URL
[To be hosted - see PRIVACY_POLICY.md file]

## Screenshots Required
1. **Main popup interface** - showing the analyze button
2. **Analysis in progress** - loading state
3. **Results display** - showing summary and risk score
4. **Multiple policies** - tab interface when multiple policies found
5. **Error state** - helpful error message

## Promotional Images Needed
- Small tile: 440x280px
- Large tile: 920x680px
- Marquee: 1400x560px

## Demo Video (Optional but Recommended)
A 30-60 second video showing:
1. User visiting a website
2. Clicking SimpleTerms icon
3. Clicking Analyze
4. Viewing the summary and risk score
5. Understanding the results

## Pricing
Free with optional premium features planned

## Version Notes for 1.0.2
- Enhanced security with rate limiting
- Improved prompt injection protection
- Better error handling
- Performance optimizations
- Updated privacy policy
- Production-ready configuration