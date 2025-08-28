SimpleTerms - AI Privacy Policy Summarizer
A browser extension that uses AI to instantly summarize complex privacy policies and assign a "Privacy Risk Score," empowering you to understand how your data is being used.

The Problem
Privacy policies are dense, filled with legal jargon, and designed to be difficult for the average person to understand. This creates a significant information imbalance, forcing users to agree to terms they haven't read and can't comprehend. SimpleTerms bridges this "readability gap," giving you the clarity you need to make informed decisions about your data.

✨ Core Features
Free Features (MVP)
🔍 Automatic Policy Detection: Scans any webpage to automatically find the link to the privacy policy.

🖱️ One-Click Analysis: A single button initiates the entire analysis process.

🤖 AI-Powered Summaries: Generates a simple, bulleted summary focusing on three key areas:

What personal data is collected.

How that data is used.

Whether your data is shared with or sold to third parties.

Premium Features (Planned)
🚦 AI-Generated Privacy Risk Score: A simple letter grade (A-F) or color-coded score that gives you an at-a-glance assessment of the policy's risk level.

🔔 Policy Change Monitoring: Get alerts when a website you frequent makes significant changes to its privacy policy.

♾️ Unlimited Summaries: Analyze as many policies as you want, whenever you want.

🛠️ How to Install & Run Locally (For Developers)
To test the extension on your local machine, follow these steps:

Clone the repository:

git clone https://github.com/your-username/SimpleTerms.git

Open Chrome and navigate to the Extensions page:

Go to chrome://extensions in your address bar.

Enable Developer Mode:

Click the toggle switch in the top-right corner.

Load the extension:

Click the "Load unpacked" button.

Select the SimpleTerms folder that you cloned.

The SimpleTerms icon should now appear in your browser's toolbar!

🚀 How to Use
Navigate to any website that has a privacy policy.

Click the SimpleTerms icon in your browser toolbar to open the popup.

Click the "Analyze Policy" button.

The extension will find the policy, send it for analysis, and display the summary and risk score directly in the popup.

💻 Technology Stack
Frontend: HTML5, CSS3, JavaScript (ES6)

Backend: Serverless via Google Cloud Functions (Node.js)

AI Model: Google Gemini API

Monetization: ExtensionPay

📂 Project Structure
The repository is structured as a standard Chrome Extension:

/
|-- manifest.json        # The core configuration file for the extension
|-- icons/               # Extension icons (16x16, 48x48, 128x128)
|-- popup/
|   |-- popup.html       # The HTML structure of the extension's popup
|   |-- popup.css        # Styles for the popup
|   |-- popup.js         # Logic for the popup UI and user interaction
|-- scripts/
|   |-- content.js       # Injected into web pages to find the policy link
|   |-- background.js    # (If needed for future background tasks)
