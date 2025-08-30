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
 * Enhanced prompt injection protection for Phase 1 security improvements
 * @param {string} text - The text to sanitize
 * @returns {string} Sanitized text with improved protection
 */
function sanitizeForPrompt(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let sanitized = text;
  
  // Phase 1 enhancement: More comprehensive injection pattern detection
  const injectionPatterns = [
    // Basic instruction hijacking
    /ignore.*(?:previous|above|earlier).*instructions?/gi,
    /disregard.*(?:above|previous|system)/gi,
    /forget.*(?:everything|instructions|context)/gi,
    /override.*(?:instructions|system|prompt)/gi,
    
    // Role manipulation attempts  
    /(?:you|assistant).*(?:are|now).*(?:a|an|now)/gi,
    /act.*as.*(?:if|a|an|though)/gi,
    /pretend.*(?:you|to)/gi,
    /roleplay.*as/gi,
    /imagine.*you.*are/gi,
    
    // System prompt injection
    /system.*(?:prompt|instruction|message):/gi,
    /new.*(?:instructions?|prompt|task):/gi,
    /\\n\\n#+.*instruction/gi,
    
    // Format manipulation
    /\[INST\]|\[\/INST\]/gi,
    /\[\/?SYSTEM\]/gi,
    /\[\/?USER\]/gi,
    /\[\/?ASSISTANT\]/gi,
    /<\|(?:im_start|im_end)\|>/g,
    /#{2,}.*(?:instruction|prompt|task)/gi,
    
    // JSON injection attempts
    /["']\s*}\s*,?\s*{/g,
    /}\s*,?\s*{\s*["']/g,
    
    // Command injection
    /(?:exec|eval|system|cmd|shell)\s*\(/gi,
    /javascript:/gi,
    /data:text\/html/gi
  ];
  
  // Apply pattern filtering with context preservation
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, (match) => {
      // Log attempts for monitoring (in production, you might want to send alerts)
      console.warn('Blocked potential prompt injection:', match.substring(0, 50));
      return '[FILTERED_INJECTION]';
    });
  }
  
  // Enhanced format manipulation protection
  sanitized = sanitized
    // Limit consecutive newlines (prevent prompt structure breaking)
    .replace(/\n{4,}/g, '\n\n\n')
    // Remove code blocks (prevent command injection)
    .replace(/```[\s\S]*?```/g, '[CODE_BLOCK_REMOVED]')
    // Remove excessive repeated characters (prevent format flooding)
    .replace(/(.)\1{50,}/g, '$1$1$1[REPEATED]')
    // Clean up multiple spaces but preserve readability
    .replace(/  +/g, ' ')
    // Remove control characters except common ones
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Context isolation: Ensure content stays within policy context
  // This helps prevent context switching attacks
  sanitized = isolateUserContent(sanitized);
  
  return sanitized.trim();
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
 * Isolate user content to prevent context switching
 * @param {string} content - Content to isolate
 * @returns {string} Context-isolated content
 */
function isolateUserContent(content) {
  // Prevent context switching by adding clear boundaries
  // This makes it harder for injection to break out of the policy context
  const maxLength = 50000; // Reasonable limit for privacy policies
  
  if (content.length > maxLength) {
    content = content.substring(0, maxLength) + '\n[TRUNCATED FOR SAFETY]';
  }
  
  // Add semantic boundaries to maintain context
  return `PRIVACY_POLICY_START:\n${content}\nPRIVACY_POLICY_END`;
}

/**
 * Build unified optimized prompt for both free and premium tiers
 * Implements Phase 1 token optimization and structured output enforcement
 * @param {string} sanitizedText - Sanitized policy text
 * @param {boolean} isPremium - Whether to include premium GDPR analysis
 * @returns {string} Optimized prompt string
 */
function buildUnifiedPrompt(sanitizedText, isPremium) {
  // Enhanced prompt template with explicit formatting constraints to prevent asterisk formatting
  const basePrompt = `Privacy policy analyst. Return ONLY valid JSON with consistent bullet formatting:

{
  "summary": "• What we collect: Brief description here\\n• How it's used: Brief description here\\n• Who it's shared with: Brief description here\\n• How long kept: Brief description here\\n• Your rights: Brief description here\\n• Security measures: Brief description here\\n• Key concerns: Brief description here",
  "score": <1-10 integer>,
  "confidence": <0-100 integer>${isPremium ? ',\n  "gdpr": {\n    "access": "compliant|partial|non-compliant",\n    "rectification": "compliant|partial|non-compliant",\n    "erasure": "compliant|partial|non-compliant",\n    "portability": "compliant|partial|non-compliant",\n    "consent": "compliant|partial|non-compliant"\n  }' : ''}
}

CRITICAL FORMATTING RULES:
- Use bullet symbol • followed by category label and colon
- NO asterisks (*) or markdown formatting anywhere
- NO bold (**text**) or italic (*text*) formatting
- Plain text only with simple punctuation
- Example format: "• What we collect: Personal info like email and location"
- Max 15 words per bullet point after the colon
- Use exactly these 7 categories in order:
  1. What we collect: [data types]
  2. How it's used: [purposes]  
  3. Who it's shared with: [third parties]
  4. How long kept: [retention period]
  5. Your rights: [user controls]
  6. Security measures: [protection methods]
  7. Key concerns: [privacy risks]

SCORING GUIDELINES:
- Score: 1-3=low risk, 4-6=medium, 7-10=high privacy risk
- Confidence: Based on policy completeness and clarity (0-100)${isPremium ? '\n- GDPR: Evaluate explicit rights, consent mechanisms, data protection measures' : ''}

NO TEXT OUTSIDE JSON. NO MARKDOWN. Analyze this policy:

${sanitizedText}`;

  return basePrompt;
}

/**
 * Validate and normalize analysis result with enhanced Phase 1 structure
 * @param {Object} result - Raw analysis result from AI
 * @param {boolean} isPremium - Whether premium features are enabled
 * @returns {Object} Validated and normalized result
 */
function validateAndNormalizeResult(result, isPremium) {
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

  // Add confidence scoring (new Phase 1 feature)
  if (!result.confidence || typeof result.confidence !== 'number') {
    result.confidence = estimateConfidence(result.summary);
  }
  result.confidence = Math.min(100, Math.max(0, Math.round(result.confidence)));

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
    
    // Get the Gemini model optimized for enhanced reasoning and performance
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
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

    // Enhanced validation for Phase 1 structured output
    analysisResult = validateAndNormalizeResult(analysisResult, isPremium);
    
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
    
    // Try to find score and confidence numbers
    const scoreMatch = text.match(/(?:score|rating).*?(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;
    
    const confidenceMatch = text.match(/(?:confidence).*?(\d+)/i);
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 70;
    
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
