#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Your production public key (replace with actual key from Chrome Web Store)
const PRODUCTION_PUBLIC_KEY = "REPLACE_WITH_YOUR_ACTUAL_PUBLIC_KEY";

console.log('Building production extension...');

// Read the development manifest
const devManifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));

// Add the production key
const prodManifest = {
  ...devManifest,
  key: PRODUCTION_PUBLIC_KEY
};

// Write production manifest
fs.writeFileSync('manifest.prod.json', JSON.stringify(prodManifest, null, 2));

console.log('✅ Production manifest created: manifest.prod.json');
console.log('📦 Ready to pack with consistent extension ID');
console.log('');
console.log('Next steps:');
console.log('1. Copy manifest.prod.json to manifest.json');
console.log('2. Create your .zip package');
console.log('3. Upload to Chrome Web Store');
console.log('4. Restore original manifest.json for development');
