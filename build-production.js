#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Production configuration - these should be set via environment variables
const PRODUCTION_CONFIG = {
    PUBLIC_KEY: process.env.CHROME_EXTENSION_PUBLIC_KEY || "REPLACE_WITH_YOUR_ACTUAL_PUBLIC_KEY",
    EXTENSIONPAY_ID: process.env.EXTENSIONPAY_EXTENSION_ID || "PLACEHOLDER_EXTENSION_ID",
    CLOUD_FUNCTION_URL: process.env.CLOUD_FUNCTION_URL || "https://us-central1-simpleterms-backend.cloudfunctions.net/analyzePrivacyPolicy"
};

console.log('Building production extension...');

// Read the development manifest
const devManifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

// Add the production key
const prodManifest = {
  ...devManifest,
  key: PRODUCTION_CONFIG.PUBLIC_KEY
};

// Write production manifest
fs.writeFileSync('manifest.prod.json', JSON.stringify(prodManifest, null, 2));

// Read and update configuration file
const configPath = 'scripts/config.js';
let configContent = fs.readFileSync(configPath, 'utf8');

// Replace placeholder values with environment variables
configContent = configContent.replace(
    /'PLACEHOLDER_EXTENSION_ID'/g, 
    `'${PRODUCTION_CONFIG.EXTENSIONPAY_ID}'`
);

configContent = configContent.replace(
    /'https:\/\/us-central1-simpleterms-backend\.cloudfunctions\.net\/analyzePrivacyPolicy'/g,
    `'${PRODUCTION_CONFIG.CLOUD_FUNCTION_URL}'`
);

// Write production config
fs.writeFileSync('scripts/config.prod.js', configContent);

console.log('✅ Production manifest created: manifest.prod.json');
console.log('✅ Production config created: scripts/config.prod.js');
console.log('📦 Ready to pack with consistent extension ID');
console.log('');
console.log('Environment variables used:');
console.log(`  EXTENSIONPAY_EXTENSION_ID: ${PRODUCTION_CONFIG.EXTENSIONPAY_ID}`);
console.log(`  CLOUD_FUNCTION_URL: ${PRODUCTION_CONFIG.CLOUD_FUNCTION_URL}`);
console.log(`  CHROME_EXTENSION_PUBLIC_KEY: ${PRODUCTION_CONFIG.PUBLIC_KEY.substring(0, 20)}...`);
console.log('');
console.log('Next steps:');
console.log('1. Copy manifest.prod.json to manifest.json');
console.log('2. Copy scripts/config.prod.js to scripts/config.js');
console.log('3. Create your .zip package');
console.log('4. Upload to Chrome Web Store');
console.log('5. Restore original files for development');
