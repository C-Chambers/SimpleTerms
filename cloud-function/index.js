/**
 * SimpleTerms Privacy Policy Analyzer
 * Google Cloud Function with Gemini AI Integration
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Chrome Extension IDs - Support both production and development
// Can be a single ID or comma-separated list: "prod_id,dev_id,test_id"
const EXTENSION_IDS = process.env.EXTENSION_ID || 'doiijdjjldampcdmgkefblfkofkhaeln';
const ALLOWED_EXTENSION_IDS = EXTENSION_IDS.split(',').map(id => id.trim()).filter(Boolean);

// Rate limiting - track requests per IP
const requestTracker = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per IP

/**
 * HTTP Cloud Function for analyzing privacy policies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * HTTP Cloud Function for fetching privacy policy content
 * @param {Object} req - Express request object  
 * @param {Object} res - Express response object
 */
exports.fetchPrivacyPolicy = async (req, res) => {
  try {
    // Configure CORS headers for security
    const origin = req.get('Origin');
    const allowedOrigins = ALLOWED_EXTENSION_IDS.map(id => `chrome-extension://${id}`);
    
    if (allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
    }
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Validate required fields
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Basic URL validation
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    console.log(`Fetching privacy policy from: ${url}`);

    // Fetch the content with appropriate headers
    const fetchResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SimpleTerms/1.0; +https://simpleterms.io)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'DNT': '1'
      },
      timeout: 15000 // 15 second timeout
    });

    if (!fetchResponse.ok) {
      return res.status(fetchResponse.status).json({ 
        error: `Failed to fetch: ${fetchResponse.status} ${fetchResponse.statusText}` 
      });
    }

    const html = await fetchResponse.text();
    
    res.json({ 
      success: true, 
      html: html,
      url: url,
      contentLength: html.length
    });

  } catch (error) {
    console.error('Error in fetchPrivacyPolicy:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

/**
 * HTTP Cloud Function for analyzing privacy policies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.analyzePrivacyPolicy = async (req, res) => {
  try {
      // Configure CORS headers for security
  const origin = req.get('Origin');
  const allowedOrigins = ALLOWED_EXTENSION_IDS.map(id => `chrome-extension://${id}`);

  // CORS configuration - allow multiple extension IDs (production + development)
  console.log(`Request from origin: ${origin}`);
  console.log(`Allowed origins: ${JSON.stringify(allowedOrigins)}`);
  
  if (origin && allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    console.log(`✅ Authorized request from: ${origin}`);
  } else {
    // Reject requests from unauthorized origins
    console.warn(`❌ Rejected request from unauthorized origin: ${origin}`);
    console.warn(`Allowed origins: ${JSON.stringify(allowedOrigins)}`);
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Request origin not authorized'
    });
  }
    
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({
        error: 'Method not allowed',
        message: 'Only POST requests are supported'
      });
    }

    // Check request size to prevent DoS attacks
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength) > 500000) { // 500KB limit
      return res.status(413).json({
        error: 'Request too large',
        message: 'Request size exceeds maximum allowed limit'
      });
    }

    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request body must be valid JSON'
      });
    }

    const { policyText, includePremiumFeatures } = req.body;

    // Validate policyText parameter
    if (!policyText || typeof policyText !== 'string' || policyText.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'policyText is required and must be a non-empty string'
      });
    }

    // Check if premium features are requested (for Pro users)
    const isPremiumRequest = includePremiumFeatures === true;
    
    // SECURITY TODO: Add proper server-side subscription validation
    // Currently this relies on client-side validation which can be bypassed
    // Should validate user subscription with ExtensionPay API before processing premium requests
    if (isPremiumRequest) {
        // For now, log premium requests for monitoring potential abuse
        console.log('Premium analysis request received - Client-side validation only');
        // TODO: Implement server-side validation:
        // 1. Extract user ID from authenticated request
        // 2. Validate subscription status with ExtensionPay API
        // 3. Return 403 if user doesn't have premium subscription
    }

    // Check text length to prevent abuse (keeping reasonable limit for very large documents)
    if (policyText.length > 1000000) { // 1MB limit - allows for very comprehensive policies
      return res.status(400).json({
        error: 'Text too long',
        message: 'Privacy policy text exceeds maximum length limit'
      });
    }

    // Use full policy text - Gemini 2.5 Flash supports 1M token context window
    const optimizedText = policyText;

    // Implement rate limiting
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up old entries
    for (const [ip, data] of requestTracker.entries()) {
      if (now - data.windowStart > RATE_LIMIT_WINDOW) {
        requestTracker.delete(ip);
      }
    }
    
    // Check rate limit for this IP
    let clientData = requestTracker.get(clientIp);
    if (!clientData) {
      clientData = { windowStart: now, requestCount: 0 };
      requestTracker.set(clientIp, clientData);
    }
    
    // Reset window if expired
    if (now - clientData.windowStart > RATE_LIMIT_WINDOW) {
      clientData.windowStart = now;
      clientData.requestCount = 0;
    }
    
    // Check if rate limit exceeded
    if (clientData.requestCount >= MAX_REQUESTS_PER_WINDOW) {
      const retryAfter = Math.ceil((clientData.windowStart + RATE_LIMIT_WINDOW - now) / 1000);
      res.set('Retry-After', retryAfter.toString());
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        retryAfter: retryAfter
      });
    }
    
    // Increment request count
    clientData.requestCount++;
    
    console.log(`Processing privacy policy analysis (${optimizedText.length} characters) from origin: ${origin}, IP: ${clientIp}, Premium: ${isPremiumRequest}`);

    // Analyze privacy policy with Gemini AI
    const analysis = await analyzeWithGemini(optimizedText, isPremiumRequest);

    // Return successful response
    res.status(200).json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in analyzePrivacyPolicy:', error);
    
    // Return appropriate error response
    if (error.code === 'GEMINI_API_ERROR') {
      res.status(503).json({
        error: 'AI service unavailable',
        message: 'The AI analysis service is temporarily unavailable. Please try again later.'
      });
    } else if (error.code === 'RATE_LIMIT_ERROR') {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again in a few minutes.'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request.'
      });
    }
  }
};

/**
 * Simple rate limiting to stay under 15 requests/minute
 * @returns {Promise} Resolves after appropriate delay
 */
async function rateLimitDelay() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const minInterval = 4000; // 4 seconds = 15 requests/minute max
  
  if (timeSinceLastRequest < minInterval) {
    const delay = minInterval - timeSinceLastRequest;
    console.log(`Rate limiting: waiting ${delay}ms before API call`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Conservative prompt injection protection - only blocks obvious injection attempts
 * @param {string} text - The text to sanitize
 * @returns {string} Sanitized text preserving legitimate policy content
 */
function sanitizeForPrompt(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let sanitized = text;
  
  // CONSERVATIVE: Only block very specific and obvious injection attempts
  // Removed overly broad patterns that were filtering legitimate policy content
  const injectionPatterns = [
    // Only block very explicit instruction hijacking
    /^\s*ignore\s+all\s+previous\s+instructions/gi,
    /^\s*disregard\s+everything\s+above/gi,
    
    // Only block obvious format injection
    /\[INST\]|\[\/INST\]/gi,
    /\[\/?SYSTEM\]/gi,
    /<\|(?:im_start|im_end)\|>/g,
    
    // Only block obvious command injection
    /javascript\s*:/gi,
    /data\s*:\s*text\/html/gi
  ];
  
  // Apply very conservative filtering - preserve policy content
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, (match) => {
      console.warn('Blocked obvious injection attempt:', match.substring(0, 30));
      return '[BLOCKED]';
    });
  }
  
  // Minimal formatting cleanup - preserve policy structure
  sanitized = sanitized
    // Only limit extreme consecutive newlines (8+)
    .replace(/\n{8,}/g, '\n\n\n\n')
    // Only remove extreme repeated characters (100+)
    .replace(/(.)\1{100,}/g, '$1$1$1[REPEATED]')
    // Preserve multiple spaces (might be important in policies)
    // Remove only control characters that could break parsing
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Minimal context isolation - just add boundaries without truncating
  return `PRIVACY_POLICY_START:\n${sanitized.trim()}\nPRIVACY_POLICY_END`;
}

/**
 * Sanitize JSON response from AI to prevent XSS and injection attacks
 * @param {string} text - Raw AI response text
 * @returns {string} - Sanitized JSON text
 */
function sanitizeJsonResponse(text) {
  return text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/data:text\/html/gi, '') // Remove data URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    // Remove asterisk formatting from bullet points to ensure consistency
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold** formatting
    .replace(/\*(.*?)\*/g, '$1') // Remove *italic* formatting
    .trim();
}

/**
 * Create a consistent hash from string content for deterministic AI seeding
 * @param {string} str - String to hash
 * @returns {number} Integer hash suitable for Gemini seed parameter
 */
function hashString(str) {
  let hash = 0;
  if (!str || str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Ensure positive integer for Gemini seed (0 to 2^31-1)
  return Math.abs(hash) % 2147483647;
}

/**
 * Build unified optimized prompt for both free and premium tiers
 * Implements enhanced consistency controls and detailed scoring criteria
 * @param {string} sanitizedText - Sanitized policy text
 * @param {boolean} isPremium - Whether to include premium GDPR analysis
 * @returns {string} Optimized prompt string
 */
function buildUnifiedPrompt(sanitizedText, isPremium) {
  // Calculate policy complexity indicators for consistent scoring
  const wordCount = sanitizedText.split(/\s+/).length;
  const hasDataSales = sanitizedText.toLowerCase().includes('sell') || sanitizedText.toLowerCase().includes('sold');
  const hasThirdPartySharing = sanitizedText.toLowerCase().includes('third party') || sanitizedText.toLowerCase().includes('partner');
  
  const complexityNote = `Policy length: ${wordCount} words. Contains data sales: ${hasDataSales}. Contains third-party sharing: ${hasThirdPartySharing}.`;

  // Enhanced prompt template with detailed scoring criteria for consistency
  const basePrompt = `You are a privacy policy analyst. Analyze consistently using these EXACT criteria. Return ONLY valid JSON:

{
  "summary": "• What we collect: Brief description here\\n• How it's used: Brief description here\\n• Who it's shared with: Brief description here\\n• How long kept: Brief description here\\n• Your rights: Brief description here\\n• Security measures: Brief description here\\n• Key concerns: Brief description here",
  "score": <1-10 integer>,
  "confidence": <0-100 integer>,
  "reasoning": "Brief explanation of why this specific score was assigned"${isPremium ? ',\n  "gdpr": {\n    "access": "compliant|partial|non-compliant",\n    "rectification": "compliant|partial|non-compliant",\n    "erasure": "compliant|partial|non-compliant",\n    "portability": "compliant|partial|non-compliant",\n    "consent": "compliant|partial|non-compliant"\n  }' : ''}
}

CRITICAL SCORING CRITERIA (apply consistently):

SCORE 1-2 (Minimal Risk):
- Collects only essential data (name, email for service)
- No data sales or sharing with advertisers
- Clear opt-out mechanisms
- Strong security measures mentioned
- Short retention periods (1-2 years max)
- Example: "We collect only your email to send newsletters. No sharing. Delete anytime."

SCORE 3-4 (Low Risk):
- Limited personal data collection
- Some third-party services (analytics only)
- Basic user controls available
- Reasonable retention periods (2-3 years)
- No sensitive data collection
- Example: "We use Google Analytics. Collect name, email, usage data. No sales."

SCORE 5-6 (Medium Risk):
- Moderate data collection (location, device info)
- Third-party sharing for business purposes
- Limited user controls
- Long retention periods (3+ years)
- Some advertising partnerships
- Example: "We share data with business partners. Collect location. Keep indefinitely."

SCORE 7-8 (High Risk):
- Extensive data collection (browsing history, contacts)
- Data sold to third parties for advertising
- Vague or missing user rights
- Unclear retention policies
- Broad data sharing
- Example: "We may sell your data. Collect everything. Share with anyone."

SCORE 9-10 (Extreme Risk):
- Invasive data collection (personal messages, photos)
- Explicit data sales for profit
- No user controls or deletion rights
- Permanent data retention
- No security measures mentioned
- Example: "We own all your data forever. No deletion. Sell to highest bidder."

GDPR COMPLIANCE CRITERIA (Premium Feature):${isPremium ? `

ACCESS RIGHTS - Mark as "compliant" if policy contains:
✓ "Article 15" AND ("right to access" OR "obtain access")
✓ "30 days" OR "within 30" (response timeframe)
✓ "written confirmation" OR "provide confirmation"
✓ "free of charge" OR "no cost" OR "at no cost"
✓ Contact method (email address or contact form)

CRITICAL: If policy has "Article 15 GDPR" + "right to obtain access" + "30 days" + "written confirmation" + "free of charge" + email contact = MUST be "compliant"

RECTIFICATION - "compliant": 
- Right to correct inaccurate data explicitly stated
- Clear process for requesting corrections
- Response timeframe specified
- Investigation process described

ERASURE - "compliant":
- Right to deletion/erasure explicitly mentioned
- Clear deletion process described
- No data retention means deletion not needed (acceptable)

PORTABILITY - "compliant":
- Right to data portability mentioned
- Structured format delivery described
- No stored data means no portability needed (acceptable)

CONSENT - "compliant":
- Clear consent mechanisms described
- Withdrawal process explicitly stated
- Specific consent for processing activities
- Easy opt-out methods provided

Use "partial" if some but not all criteria met. Use "non-compliant" if criteria missing.` : ''}

CONSISTENCY REQUIREMENTS:
- Same policy text MUST always get same score (±1 maximum variation)
- Score must align with bullet points content
- Higher scores require explicit mention of risky practices in summary
- Use the "reasoning" field to justify the exact score given

FORMATTING RULES:
- Use bullet symbol • followed by category label and colon
- NO asterisks (*) or markdown formatting anywhere
- Max 15 words per bullet point after the colon
- Reasoning: 1-2 sentences explaining the score

ANALYSIS CONTEXT: ${complexityNote}

NO TEXT OUTSIDE JSON. NO MARKDOWN. Analyze this policy:

${sanitizedText}`;

  return basePrompt;
}

/**
 * Validate and normalize analysis result with enhanced consistency checking
 * @param {Object} result - Raw analysis result from AI
 * @param {boolean} isPremium - Whether premium features are enabled
 * @param {string} policyText - Original policy text for validation
 * @returns {Object} Validated and normalized result
 */
function validateAndNormalizeResult(result, isPremium, policyText) {
  if (!result || typeof result !== 'object') {
    throw new Error('Invalid analysis result format');
  }

  // Ensure required fields exist with proper types
  if (!result.summary || typeof result.summary !== 'string') {
    result.summary = '• Unable to generate summary due to analysis error';
  }

  if (!result.score || typeof result.score !== 'number') {
    result.score = 5; // Default neutral score
  }

  // Validate and normalize score range
  result.score = Math.min(10, Math.max(1, Math.round(result.score)));

  // NEW: Consistency validation - check if score aligns with content
  const consistencyCheck = validateScoreConsistency(result.score, result.summary, policyText);
  if (!consistencyCheck.isValid) {
    console.warn('Score consistency issue detected:', consistencyCheck.reason);
    console.warn('Original score:', result.score, 'Suggested score:', consistencyCheck.suggestedScore);
    
    // Adjust score if there's a major inconsistency (>2 point difference)
    if (Math.abs(result.score - consistencyCheck.suggestedScore) > 2) {
      console.log('Adjusting inconsistent score from', result.score, 'to', consistencyCheck.suggestedScore);
      result.score = consistencyCheck.suggestedScore;
    }
  }

  // FINAL CONSISTENCY ENFORCEMENT: Hash-based score anchoring for identical content
  const contentHash = hashString(policyText);
  const expectedScoreAnchor = (contentHash % 3) - 1; // -1, 0, or 1 adjustment
  const finalScore = Math.min(10, Math.max(1, result.score + expectedScoreAnchor));
  
  if (finalScore !== result.score) {
    console.log('Hash-based consistency adjustment:', result.score, '->', finalScore, 'for content hash:', contentHash);
    result.score = finalScore;
  }

  // Add confidence scoring
  if (!result.confidence || typeof result.confidence !== 'number') {
    result.confidence = estimateConfidence(result.summary);
  }
  result.confidence = Math.min(100, Math.max(0, Math.round(result.confidence)));

  // Validate reasoning field (new for consistency)
  if (!result.reasoning || typeof result.reasoning !== 'string') {
    result.reasoning = generateDefaultReasoning(result.score);
  }

  // Validate premium GDPR fields and maintain backwards compatibility
  if (isPremium) {
    if (!result.gdpr || typeof result.gdpr !== 'object') {
      result.gdpr = getDefaultGdprCompliance();
    } else {
      result.gdpr = validateGdprCompliance(result.gdpr);
    }
    
    // Backwards compatibility: Map new gdpr structure to expected gdprCompliance
    result.gdprCompliance = mapGdprToLegacyFormat(result.gdpr, result.score);
  }

  return result;
}

/**
 * Validate score consistency with summary content and policy text
 * @param {number} score - AI-assigned score
 * @param {string} summary - Analysis summary 
 * @param {string} policyText - Original policy text
 * @returns {Object} Validation result with suggested adjustments
 */
function validateScoreConsistency(score, summary, policyText) {
  const lowerSummary = summary.toLowerCase();
  const lowerPolicy = policyText.toLowerCase();
  
  // Count risk indicators in both summary and policy
  const riskIndicators = {
    high: ['sell', 'sold', 'advertising', 'marketing', 'share with partners', 'third parties', 'indefinitely', 'permanent'],
    medium: ['analytics', 'improve service', 'business purposes', 'partners', 'affiliates'],
    low: ['essential', 'necessary', 'opt-out', 'delete', 'control', 'choice']
  };
  
  let highRiskCount = 0;
  let mediumRiskCount = 0; 
  let lowRiskCount = 0;
  
  // Check summary for risk indicators
  riskIndicators.high.forEach(indicator => {
    if (lowerSummary.includes(indicator)) highRiskCount++;
  });
  riskIndicators.medium.forEach(indicator => {
    if (lowerSummary.includes(indicator)) mediumRiskCount++;
  });
  riskIndicators.low.forEach(indicator => {
    if (lowerSummary.includes(indicator)) lowRiskCount++;
  });
  
  // Calculate suggested score based on content
  let suggestedScore;
  if (highRiskCount >= 2) {
    suggestedScore = 7 + Math.min(highRiskCount, 3); // 7-10 range
  } else if (highRiskCount >= 1 || mediumRiskCount >= 3) {
    suggestedScore = 5 + mediumRiskCount; // 5-6 range typically
  } else if (mediumRiskCount >= 1) {
    suggestedScore = 3 + Math.min(mediumRiskCount, 2); // 3-4 range
  } else if (lowRiskCount >= 2) {
    suggestedScore = Math.max(1, 3 - lowRiskCount); // 1-2 range
  } else {
    suggestedScore = 4; // Default neutral
  }
  
  suggestedScore = Math.min(10, Math.max(1, suggestedScore));
  
  // Check if original score is consistent (within 2 points)
  const scoreDiff = Math.abs(score - suggestedScore);
  const isValid = scoreDiff <= 2;
  
  let reason = '';
  if (!isValid) {
    if (score > suggestedScore) {
      reason = `Score ${score} too high for content. Found ${highRiskCount} high-risk, ${mediumRiskCount} medium-risk indicators.`;
    } else {
      reason = `Score ${score} too low for content. Found ${highRiskCount} high-risk, ${mediumRiskCount} medium-risk indicators.`;
    }
  }
  
  return {
    isValid,
    suggestedScore,
    reason,
    riskAnalysis: { highRiskCount, mediumRiskCount, lowRiskCount }
  };
}

/**
 * Generate default reasoning for score when AI doesn't provide one
 * @param {number} score - Privacy risk score
 * @returns {string} Default reasoning explanation
 */
function generateDefaultReasoning(score) {
  if (score <= 2) return 'Minimal privacy risks with essential data collection only.';
  if (score <= 4) return 'Low privacy risks with limited data collection and sharing.';
  if (score <= 6) return 'Medium privacy risks with moderate data collection and third-party sharing.';
  if (score <= 8) return 'High privacy risks with extensive data collection and broad sharing practices.';
  return 'Extreme privacy risks with invasive data collection and extensive commercial use.';
}

/**
 * Estimate confidence score based on summary quality
 * @param {string} summary - Analysis summary
 * @returns {number} Confidence score 0-100
 */
function estimateConfidence(summary) {
  if (!summary || summary.includes('Unable to')) return 20;
  
  const bulletCount = (summary.match(/•/g) || []).length;
  if (bulletCount < 5) return 40;
  if (bulletCount !== 7) return 70;
  
  const avgLength = summary.split('•').filter(p => p.trim()).reduce((acc, point) => {
    return acc + point.trim().split(' ').length;
  }, 0) / bulletCount;
  
  if (avgLength < 5) return 60; // Too brief
  if (avgLength > 20) return 70; // Too verbose
  
  return 85; // Good quality
}

/**
 * Get default GDPR compliance structure
 * @returns {Object} Default GDPR compliance assessment
 */
function getDefaultGdprCompliance() {
  return {
    access: 'partial',
    rectification: 'partial',
    erasure: 'partial', 
    portability: 'non-compliant',
    consent: 'partial'
  };
}

/**
 * Validate and normalize GDPR compliance object
 * @param {Object} gdpr - GDPR compliance data
 * @returns {Object} Validated GDPR compliance
 */
function validateGdprCompliance(gdpr) {
  const validValues = ['compliant', 'partial', 'non-compliant'];
  const defaultValue = 'partial';
  
  const fields = ['access', 'rectification', 'erasure', 'portability', 'consent'];
  const validated = {};
  
  fields.forEach(field => {
    validated[field] = validValues.includes(gdpr[field]) ? gdpr[field] : defaultValue;
  });
  
  return validated;
}

/**
 * Map new GDPR structure to legacy gdprCompliance format for backwards compatibility
 * @param {Object} gdpr - New GDPR compliance structure
 * @param {number} riskScore - Privacy risk score
 * @returns {Object} Legacy gdprCompliance format
 */
function mapGdprToLegacyFormat(gdpr, riskScore) {
  // Calculate overall GDPR compliance score
  const complianceValues = Object.values(gdpr);
  const compliantCount = complianceValues.filter(v => v === 'compliant').length;
  const partialCount = complianceValues.filter(v => v === 'partial').length;
  
  // Calculate score: compliant=100, partial=50, non-compliant=0
  const score = Math.round((compliantCount * 100 + partialCount * 50) / complianceValues.length);
  
  // Determine overall rating
  let overallRating = 'Poor';
  if (score >= 80) overallRating = 'Good';
  else if (score >= 60) overallRating = 'Fair';
  
  // Map to legacy format expected by popup.js
  return {
    score: score,
    overallRating: overallRating,
    scoreClass: score >= 80 ? 'good' : score >= 60 ? 'fair' : 'poor',
    summary: `GDPR compliance assessment based on ${complianceValues.length} key requirements`,
    checks: {
      'Data Access Rights': gdpr.access === 'compliant' ? '✓ Available' : 
                           gdpr.access === 'partial' ? '⚠ Limited' : '✗ Missing',
      'Data Rectification': gdpr.rectification === 'compliant' ? '✓ Available' : 
                           gdpr.rectification === 'partial' ? '⚠ Limited' : '✗ Missing',
      'Right to Erasure': gdpr.erasure === 'compliant' ? '✓ Available' : 
                         gdpr.erasure === 'partial' ? '⚠ Limited' : '✗ Missing',
      'Data Portability': gdpr.portability === 'compliant' ? '✓ Available' : 
                         gdpr.portability === 'partial' ? '⚠ Limited' : '✗ Missing',
      'Consent Management': gdpr.consent === 'compliant' ? '✓ Clear' : 
                           gdpr.consent === 'partial' ? '⚠ Basic' : '✗ Unclear'
    }
  };
}

/**
 * Analyze privacy policy text using Google Gemini AI
 * @param {string} policyText - The privacy policy text to analyze
 * @param {boolean} isPremium - Whether to include premium analysis features
 * @returns {Object} Analysis result with summary and score
 */
async function analyzeWithGemini(policyText, isPremium = false) {
  try {
    // Sanitize input to prevent prompt injection
    const sanitizedText = sanitizeForPrompt(policyText);
    
    // Create a deterministic seed from policy text for maximum consistency
    const policyHash = hashString(sanitizedText);
    
    // Get the Gemini model optimized for maximum consistency
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        temperature: 0.0, // Minimum temperature for maximum consistency
        topP: 0.1,        // Very low randomness in token selection
        topK: 1,          // Always select most likely token for deterministic output
        maxOutputTokens: 2048,
        responseMimeType: "application/json", // Enforce JSON output
        seed: policyHash, // Use content-based seed for identical inputs
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    });

    // Construct optimized unified prompt (Phase 1 architecture)
    const prompt = buildUnifiedPrompt(sanitizedText, isPremium);

    console.log('Sending request to Gemini AI...');

    // Generate content using Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Received response from Gemini AI');

    // Parse the JSON response
    let analysisResult;
    try {
      // Clean and sanitize the response text (remove markdown code blocks and potential XSS)
      const cleanedText = sanitizeJsonResponse(text);
      analysisResult = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', parseError);
      console.error('Raw response:', text);
      
      // Fallback: try to extract information manually
      analysisResult = extractAnalysisFromText(text);
    }

    // Enhanced validation with consistency checking
    analysisResult = validateAndNormalizeResult(analysisResult, isPremium, sanitizedText);
    
    return analysisResult;

  } catch (error) {
    console.error('Error calling Gemini AI:', error);
    
    // Classify error types
    if (error.message && error.message.includes('quota')) {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.code = 'RATE_LIMIT_ERROR';
      throw rateLimitError;
    } else {
      const geminiError = new Error('Gemini API error: ' + error.message);
      geminiError.code = 'GEMINI_API_ERROR';
      throw geminiError;
    }
  }
}

/**
 * Enhanced fallback function for Phase 1 structured output extraction
 * @param {string} text - The response text from Gemini
 * @returns {Object} Extracted analysis result with Phase 1 structure
 */
function extractAnalysisFromText(text) {
  console.log('Attempting to extract analysis from non-JSON response');
  
  try {
    // Try to find bullet points for summary
    const bulletPoints = text.match(/[•\-\*]\s*[^\n]+/g) || [];
    const summary = bulletPoints.slice(0, 7).join('\n');
    
    // Try to find score and confidence numbers - use content-based defaults for consistency
    const scoreMatch = text.match(/(?:score|rating).*?(\d+)/i);
    let score;
    if (scoreMatch) {
      score = parseInt(scoreMatch[1]);
    } else {
      // Deterministic fallback based on content analysis
      console.warn('No score found in fallback extraction, using content-based analysis');
      score = analyzeContentForScore(text);
    }
    
    const confidenceMatch = text.match(/(?:confidence).*?(\d+)/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 60; // Lower default for fallback
    
    // Try to extract GDPR compliance if present
    let gdpr = null;
    if (text.toLowerCase().includes('gdpr') || text.toLowerCase().includes('compliance')) {
      gdpr = {
        access: extractComplianceValue(text, 'access'),
        rectification: extractComplianceValue(text, 'rectification'),
        erasure: extractComplianceValue(text, 'erasure'),
        portability: extractComplianceValue(text, 'portability'),
        consent: extractComplianceValue(text, 'consent')
      };
    }
    
    const result = {
      summary: summary || '• Analysis completed but summary format was unclear',
      score: Math.min(10, Math.max(1, score)),
      confidence: Math.min(100, Math.max(0, confidence))
    };
    
    if (gdpr) {
      result.gdpr = gdpr;
      // Backwards compatibility mapping for fallback extraction
      result.gdprCompliance = mapGdprToLegacyFormat(gdpr, result.score);
    }
    
    return result;
  } catch (extractError) {
    console.error('Failed to extract analysis from text:', extractError);
    return {
      summary: '• Unable to analyze privacy policy due to processing error',
      score: 5,
      confidence: 30
    };
  }
}

/**
 * Extract GDPR compliance value from text
 * @param {string} text - Response text
 * @param {string} field - GDPR field name
 * @returns {string} Compliance value
 */
function extractComplianceValue(text, field) {
  const pattern = new RegExp(`${field}.*?(compliant|partial|non-compliant)`, 'i');
  const match = text.match(pattern);
  return match ? match[1].toLowerCase() : 'partial';
}

/**
 * Analyze content to determine consistent score when fallback extraction fails
 * @param {string} text - AI response text that couldn't be parsed
 * @returns {number} Deterministic score based on content analysis
 */
function analyzeContentForScore(text) {
  const lowerText = text.toLowerCase();
  
  // Use same risk indicators as validation function for consistency
  const highRiskTerms = ['sell', 'sold', 'advertising', 'marketing', 'share with partners', 'third parties', 'indefinitely', 'permanent'];
  const mediumRiskTerms = ['analytics', 'improve service', 'business purposes', 'partners', 'affiliates'];
  const lowRiskTerms = ['essential', 'necessary', 'opt-out', 'delete', 'control', 'choice'];
  
  let highCount = 0, mediumCount = 0, lowCount = 0;
  
  highRiskTerms.forEach(term => {
    if (lowerText.includes(term)) highCount++;
  });
  mediumRiskTerms.forEach(term => {
    if (lowerText.includes(term)) mediumCount++;
  });
  lowRiskTerms.forEach(term => {
    if (lowerText.includes(term)) lowCount++;
  });
  
  // Same scoring logic as validation function
  if (highCount >= 2) return 7 + Math.min(highCount, 3);
  if (highCount >= 1 || mediumCount >= 3) return 5 + Math.min(mediumCount, 1);
  if (mediumCount >= 1) return 3 + Math.min(mediumCount, 2);
  if (lowCount >= 2) return Math.max(1, 3 - lowCount);
  
  return 5; // Default neutral score for ambiguous content
}
